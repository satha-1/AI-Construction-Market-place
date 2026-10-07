from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.agent import AgentRun, AgentToolCall
from app.models.project import Project
from app.models.user import User
from app.modules.agent.orchestrator import agent_orchestrator
from app.schemas import AgentMessageRequest, AgentRunOut

router = APIRouter(tags=["agent"])


@router.post("/api/projects/{project_id}/agent/message", response_model=AgentRunOut)
def send_agent_message(
    project_id: UUID,
    payload: AgentMessageRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role != "admin" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return agent_orchestrator.run(db, project_id=project_id, user_id=user.id, message=payload.message)


@router.get("/api/agent/runs/{run_id}", response_model=AgentRunOut)
def get_run(run_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    run = db.get(AgentRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    project = db.get(Project, run.project_id)
    if project is None or (user.role != "admin" and project.owner_id != user.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    return run


@router.get("/api/agent/runs/{run_id}/tools")
def get_run_tools(run_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    run = db.get(AgentRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    project = db.get(Project, run.project_id)
    if project is None or (user.role != "admin" and project.owner_id != user.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    calls = db.scalars(select(AgentToolCall).where(AgentToolCall.run_id == run_id).order_by(AgentToolCall.called_at)).all()
    return [
        {
            "id": c.id,
            "tool_name": c.tool_name,
            "input_args": c.input_args,
            "output_result": c.output_result,
            "latency_ms": c.latency_ms,
            "called_at": c.called_at,
        }
        for c in calls
    ]


@router.get("/api/projects/{project_id}/agent/runs")
def list_project_runs(project_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role != "admin" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    runs = db.scalars(select(AgentRun).where(AgentRun.project_id == project_id).order_by(AgentRun.started_at.desc())).all()
    return [
        {
            "id": r.id,
            "user_message": r.user_message,
            "final_response": r.final_response,
            "status": r.status,
            "started_at": r.started_at,
            "completed_at": r.completed_at,
        }
        for r in runs
    ]
