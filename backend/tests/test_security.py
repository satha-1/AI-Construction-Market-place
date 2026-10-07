from app.core.security import hash_password, verify_password


def test_password_roundtrip():
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)


def test_health_app_imports():
    from app.main import app

    assert app.title == "Conapp API"
