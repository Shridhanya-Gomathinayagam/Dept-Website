from app.models import ActivityLog
from tests.conftest import login, make_admin

API = "/api/v1"


def test_login_sets_httponly_cookie_and_me_works(client, db):
    make_admin(db)
    r = login(client)
    assert r.status_code == 200
    assert r.json()["email"] == "admin@dept.edu"
    set_cookie = ",".join(r.headers.get_list("set-cookie"))
    assert "access_token=" in set_cookie and "HttpOnly" in set_cookie.split("access_token=")[1].split(",")[0]
    assert "password" not in r.text
    assert client.get(f"{API}/auth/me").json()["full_name"] == "Department Admin"


def test_wrong_password_rejected_and_logged(client, db):
    make_admin(db)
    r = login(client, password="wrong-password")
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid email or password"
    assert db.query(ActivityLog).filter_by(action="LOGIN_FAILED").count() == 1


def test_unknown_email_same_error(client, db):
    r = login(client, email="nobody@dept.edu")
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid email or password"


def test_inactive_admin_cannot_login(client, db):
    make_admin(db, active=False)
    assert login(client).status_code == 401


def test_login_rate_limited(client, db):
    make_admin(db)
    for _ in range(5):
        assert login(client, password="bad-password").status_code == 401
    r = login(client)  # even correct password is blocked during the window
    assert r.status_code == 429


def test_admin_endpoints_require_auth(public_client):
    for path in ("/admin/faculty", "/admin/stats", "/admin/activity-logs", "/auth/me", "/admin/department"):
        assert public_client.get(f"{API}{path}").status_code == 401, path
    r = public_client.post(f"{API}/admin/faculty", json={"name": "x"},
                           headers={"X-CSRF-Token": "a"}, cookies={"csrf_token": "a"})
    assert r.status_code == 401


def test_csrf_required_for_writes(admin_client):
    token = admin_client.headers.pop("X-CSRF-Token")
    r = admin_client.post(f"{API}/admin/faculty", json={"name": "A", "designation": "B"})
    assert r.status_code == 403
    r = admin_client.post(f"{API}/admin/faculty", json={"name": "A", "designation": "B"},
                          headers={"X-CSRF-Token": "forged"})
    assert r.status_code == 403
    admin_client.headers["X-CSRF-Token"] = token
    r = admin_client.post(f"{API}/admin/faculty", json={"name": "A", "designation": "B"})
    assert r.status_code == 201


def test_tampered_token_rejected(client, db):
    make_admin(db)
    login(client)
    client.cookies.set("access_token", client.cookies["access_token"][:-4] + "abcd")
    assert client.get(f"{API}/auth/me").status_code == 401


def test_logout_clears_session(admin_client, db):
    assert admin_client.post(f"{API}/auth/logout").status_code == 204
    assert admin_client.get(f"{API}/auth/me").status_code == 401
    assert db.query(ActivityLog).filter_by(action="LOGOUT").count() == 1


def test_superadmin_only_admin_management(client, db):
    make_admin(db, email="staff@dept.edu", superadmin=False)
    login(client, email="staff@dept.edu")
    assert client.get(f"{API}/admin/admins").status_code == 403
    assert client.get(f"{API}/admin/faculty").status_code == 200


def test_superadmin_creates_admin(admin_client):
    r = admin_client.post(f"{API}/admin/admins", json={"email": "new@dept.edu", "full_name": "New",
                                                       "password": "a-long-password"})
    assert r.status_code == 201
    assert "password" not in r.text
    r = admin_client.post(f"{API}/admin/admins", json={"email": "new@dept.edu", "full_name": "Dup",
                                                       "password": "a-long-password"})
    assert r.status_code == 409


def test_change_password(admin_client):
    r = admin_client.post(f"{API}/auth/change-password",
                          json={"current_password": "wrong", "new_password": "another-long-pass"})
    assert r.status_code == 400
    r = admin_client.post(f"{API}/auth/change-password",
                          json={"current_password": "correct-horse-battery", "new_password": "another-long-pass"})
    assert r.status_code == 204
