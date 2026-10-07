from celery import Celery

from app.core.config import settings

celery_app = Celery("conapp", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(task_track_started=True, task_serializer="json", accept_content=["json"])

celery_app.autodiscover_tasks(["app.modules.documents"])

from app.modules.documents import tasks as _document_tasks  # noqa: E402, F401
