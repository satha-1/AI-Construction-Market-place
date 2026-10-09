from uuid import uuid4

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password


def test_password_roundtrip():
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)


def test_jwt_contains_subject_and_role_claims():
    uid = uuid4()
    token = create_access_token(user_id=uid, role="customer", email="demo@conapp.local")
    payload = decode_access_token(token)
    assert payload["sub"] == str(uid)
    assert payload["role"] == "customer"
    assert payload["email"] == "demo@conapp.local"
