from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.document import DocumentChunk, ProjectDocument
from app.models.project import Project
from app.models.user import User
from app.modules.audit.service import audit_logger
from app.modules.documents import storage
from app.modules.documents.tasks import enqueue_or_run_project
from app.schemas import DocumentOut

router = APIRouter(prefix="/api/projects", tags=["documents"])

TYPE_MAP = {
    "application/pdf": "pdf",
    "image/jpeg": "image",
    "image/png": "image",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel",
    "text/csv": "csv",
}


def _detect_type(file: UploadFile) -> str:
    file_type = TYPE_MAP.get(file.content_type or "")
    if file_type:
        return file_type
    name = (file.filename or "").lower()
    if name.endswith(".pdf"):
        return "pdf"
    if name.endswith((".jpg", ".jpeg", ".png")):
        return "image"
    if name.endswith((".xlsx", ".xls")):
        return "excel"
    if name.endswith(".csv"):
        return "csv"
    raise HTTPException(status_code=400, detail="Unsupported file type")


@router.post("/{project_id}/documents", response_model=DocumentOut, status_code=201)
def upload_document(
    project_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("customer", "admin")),
):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role != "admin" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    file_type = _detect_type(file)
    data = file.file.read()
    suffix = f".{(file.filename or 'bin').split('.')[-1]}"
    try:
        key = storage.upload_bytes(data, content_type=file.content_type or "application/octet-stream", suffix=suffix)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"Storage unavailable: {exc}") from exc
    doc = ProjectDocument(
        project_id=project.id,
        file_name=file.filename or "upload",
        file_type=file_type,
        storage_path=key,
        status="pending",
    )
    db.add(doc)
    db.flush()
    audit_logger.log_event(
        db,
        actor_type="human",
        action="document.upload",
        entity_type="project_documents",
        entity_id=doc.id,
        user_id=user.id,
        project_id=project.id,
        after={"file_name": doc.file_name, "file_type": doc.file_type},
    )
    if project.status == "draft":
        project.status = "analyzing"
    db.commit()
    db.refresh(doc)
    enqueue_or_run_project(str(doc.id))
    db.expire_all()
    doc = db.get(ProjectDocument, doc.id)
    return doc


@router.get("/{project_id}/documents", response_model=list[DocumentOut])
def list_documents(
    project_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role != "admin" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return db.scalars(
        select(ProjectDocument)
        .where(ProjectDocument.project_id == project_id)
        .order_by(ProjectDocument.uploaded_at.desc())
    ).all()


@router.get("/{project_id}/documents/{doc_id}", response_model=DocumentOut)
def get_document(
    project_id: UUID,
    doc_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = db.get(ProjectDocument, doc_id)
    if doc is None or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found")
    project = db.get(Project, project_id)
    if project is None or (user.role != "admin" and project.owner_id != user.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    return doc


@router.get("/{project_id}/documents/{doc_id}/chunks")
def list_chunks(
    project_id: UUID,
    doc_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = db.get(ProjectDocument, doc_id)
    if doc is None or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found")
    project = db.get(Project, project_id)
    if project is None or (user.role != "admin" and project.owner_id != user.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    chunks = db.scalars(
        select(DocumentChunk).where(DocumentChunk.document_id == doc_id).order_by(DocumentChunk.chunk_index)
    ).all()
    return [
        {
            "id": c.id,
            "chunk_index": c.chunk_index,
            "content": c.content,
            "metadata": c.chunk_metadata,
            "has_embedding": c.embedding is not None,
        }
        for c in chunks
    ]
