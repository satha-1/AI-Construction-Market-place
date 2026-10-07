from app.celery_app import celery_app
from app.db.session import SessionLocal
from app.modules.documents.pipeline import process_project_document_sync, process_vendor_document_sync


@celery_app.task(name="documents.process_project_document")
def process_project_document(document_id: str) -> None:
    db = SessionLocal()
    try:
        process_project_document_sync(db, document_id)
    finally:
        db.close()


@celery_app.task(name="documents.process_vendor_document")
def process_vendor_document(document_id: str) -> None:
    db = SessionLocal()
    try:
        process_vendor_document_sync(db, document_id)
    finally:
        db.close()


def enqueue_or_run_project(document_id: str) -> None:
    try:
        process_project_document.delay(document_id)
    except Exception:
        db = SessionLocal()
        try:
            process_project_document_sync(db, document_id)
        finally:
            db.close()


def enqueue_or_run_vendor(document_id: str) -> None:
    try:
        process_vendor_document.delay(document_id)
    except Exception:
        db = SessionLocal()
        try:
            process_vendor_document_sync(db, document_id)
        finally:
            db.close()
