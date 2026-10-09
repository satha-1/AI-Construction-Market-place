import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas import CatalogItemCreate, UserStatusUpdate, VendorStatusUpdate

PATHS = app.openapi()["paths"]


@pytest.mark.parametrize(
    ("path", "method"),
    [
        ("/api/marketplace/catalog", "get"),
        ("/api/marketplace/categories", "get"),
        ("/api/marketplace/locations", "get"),
        ("/api/marketplace/vendors", "get"),
        ("/api/marketplace/vendors/{vendor_id}", "get"),
        ("/api/notifications", "get"),
        ("/api/notifications/read-all", "post"),
        ("/api/dashboard/customer", "get"),
        ("/api/dashboard/vendor", "get"),
        ("/api/admin/vendors", "get"),
        ("/api/admin/vendors/{vendor_id}/status", "patch"),
        ("/api/admin/users/{user_id}/status", "patch"),
        ("/api/admin/audit-log", "get"),
        ("/api/rfqs/{rfq_id}", "get"),
        ("/api/quotations/{quotation_id}/select", "post"),
        ("/api/vendors/{vendor_id}", "patch"),
        ("/api/vendors/{vendor_id}/catalog-items", "post"),
        ("/api/vendors/{vendor_id}/quotations", "get"),
        ("/api/vendors/catalog-items/{item_id}/unpublish", "post"),
        ("/api/vendors/catalog-items/{item_id}", "delete"),
        ("/api/rfqs/{rfq_id}/comparison", "get"),
        ("/api/projects/{project_id}/agent/runs", "get"),
        ("/api/agent/runs/{run_id}/tools", "get"),
        ("/api/verification/{flag_id}/correct", "post"),
        ("/api/projects/{project_id}/audit-log", "get"),
        ("/api/projects/{project_id}/estimate/calculate", "post"),
    ],
)
def test_route_is_registered(path: str, method: str):
    assert path in PATHS, f"{path} missing"
    assert method in PATHS[path]


@pytest.mark.parametrize(
    "path",
    [
        "/api/dashboard/customer",
        "/api/dashboard/vendor",
        "/api/notifications",
        "/api/admin/vendors",
        "/api/admin/audit-log",
        "/api/rfqs/00000000-0000-0000-0000-000000000000",
    ],
)
def test_protected_routes_reject_anonymous(path: str):
    client = TestClient(app)
    assert client.get(path).status_code in (401, 403)


def test_vendor_status_validation():
    assert VendorStatusUpdate(status="approved").status == "approved"
    with pytest.raises(ValidationError):
        VendorStatusUpdate(status="banned")


def test_user_status_and_catalog_item_schemas():
    assert UserStatusUpdate(is_active=False).is_active is False
    with pytest.raises(ValidationError):
        CatalogItemCreate(item_name="x")  # min length 2
    assert CatalogItemCreate(item_name="Cement 50kg", unit_price=9.5, publish=True).publish is True
