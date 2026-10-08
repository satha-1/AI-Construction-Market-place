from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import SessionLocal
from app.modules.admin.router import router as admin_router
from app.modules.agent.router import router as agent_router
from app.modules.audit.router import router as audit_router
from app.modules.auth.router import router as auth_router
from app.modules.boq.router import router as boq_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.documents.router import router as documents_router
from app.modules.marketplace.router import router as marketplace_router
from app.modules.notifications.router import router as notifications_router
from app.modules.projects.router import router as projects_router
from app.modules.rfq.router import router as rfq_router
from app.modules.vendors.router import router as vendors_router
from app.modules.auth.bootstrap import ensure_admin
from app.modules.verification.router import router as verification_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db = SessionLocal()
    try:
        ensure_admin(db)
    except Exception:
        db.rollback()
    finally:
        db.close()
    yield


app = FastAPI(title="Conapp API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(projects_router)
app.include_router(documents_router)
app.include_router(vendors_router)
app.include_router(agent_router)
app.include_router(boq_router)
app.include_router(rfq_router)
app.include_router(verification_router)
app.include_router(audit_router)
app.include_router(notifications_router)
app.include_router(marketplace_router)
app.include_router(dashboard_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
