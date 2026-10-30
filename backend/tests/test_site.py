import io

from PIL import Image

from tests import factories as F

API = F.API


def _png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), "blue").save(buf, "PNG")
    return buf.getvalue()


def test_home_and_stats_are_database_driven(admin_client, public_client):
    empty = public_client.get(f"{API}/home").json()
    assert empty["department"] is None and empty["stats"]["faculty"] == 0
    F.create(admin_client, "faculty", F.faculty())
    F.create(admin_client, "faculty", F.faculty(name="Draft Person", email="d@x.edu", status="DRAFT"))
    F.create(admin_client, "events", F.event())
    F.create(admin_client, "student-achievements", F.student_achievement())
    home = public_client.get(f"{API}/home").json()
    assert home["stats"]["faculty"] == 1  # drafts are not counted
    assert home["stats"]["achievements"] == 1
    assert len(home["upcoming_events"]) == 1 and len(home["student_achievements"]) == 1


def test_global_search(admin_client, public_client):
    F.create(admin_client, "faculty", F.faculty())
    F.create(admin_client, "projects", {"title": "Machine vision rover", "students": "A", "academic_year": "2025-26",
                                        "status": "PUBLISHED"})
    F.create(admin_client, "news", {"title": "Draft machine news", "summary": "s", "published_on": "2026-01-01",
                                    "category": "General", "status": "DRAFT"})
    res = public_client.get(f"{API}/search?q=machine").json()
    keys = {g["key"] for g in res["groups"]}
    assert keys == {"faculty", "projects"}
    assert public_client.get(f"{API}/search?q=a").status_code == 422


def test_upload_image_and_reject_fakes(admin_client, public_client):
    r = admin_client.post(f"{API}/admin/uploads", data={"kind": "image", "folder": "faculty"},
                          files={"file": ("photo.png", _png(), "image/png")})
    assert r.status_code == 200, r.text
    url = r.json()["url"]
    assert url.startswith("/media/faculty/") and url.endswith(".png")
    assert public_client.get(url).status_code == 200
    r = admin_client.post(f"{API}/admin/uploads", data={"kind": "image", "folder": "faculty"},
                          files={"file": ("evil.png", b"<script>alert(1)</script>", "image/png")})
    assert r.status_code == 400
    r = admin_client.post(f"{API}/admin/uploads", data={"kind": "document", "folder": "faculty"},
                          files={"file": ("doc.pdf", b"MZ fake exe", "application/pdf")})
    assert r.status_code == 400
    r = admin_client.post(f"{API}/admin/uploads", data={"kind": "image", "folder": "../etc"},
                          files={"file": ("photo.png", _png(), "image/png")})
    assert r.status_code == 400
    big = b"%PDF-" + b"0" * (11 * 1024 * 1024)
    r = admin_client.post(f"{API}/admin/uploads", data={"kind": "document", "folder": "research"},
                          files={"file": ("big.pdf", big, "application/pdf")})
    assert r.status_code == 413
    assert public_client.post(f"{API}/admin/uploads", files={"file": ("p.png", _png(), "image/png")}).status_code == 403


def test_placements_and_research_summary(admin_client, public_client):
    F.create(admin_client, "placements", {"academic_year": "2025-26", "student_name": "A", "company": "Zoho",
                                          "package_lpa": 8, "status": "PUBLISHED"})
    F.create(admin_client, "placements", {"academic_year": "2025-26", "student_name": "B", "company": "Zoho",
                                          "package_lpa": 12, "status": "PUBLISHED"})
    s = public_client.get(f"{API}/placements-summary").json()
    assert s["companies"] == [{"company": "Zoho", "offers": 2, "highest_package_lpa": 12.0}]
    F.create(admin_client, "publications", {"title": "T", "authors": "A", "pub_type": "JOURNAL", "year": 2026,
                                            "domain": "AI", "status": "PUBLISHED"})
    r = public_client.get(f"{API}/research-summary").json()
    assert r["publications"] == 1 and r["domains"] == ["AI"]


def test_dashboard_and_activity_logs(admin_client):
    F.create(admin_client, "faculty", F.faculty())
    stats = admin_client.get(f"{API}/admin/stats").json()
    assert stats["counts"]["faculty"]["total"] == 1
    logs = admin_client.get(f"{API}/admin/activity-logs?module=faculty").json()
    assert logs["total"] == 1 and logs["items"][0]["action"] == "CREATE"
    assert logs["items"][0]["admin_name"] == "Department Admin"


def test_options_and_errors_are_clean(public_client):
    opts = public_client.get(f"{API}/meta/options").json()
    assert "Smart India Hackathon" in opts["student_achievement_categories"]
    r = public_client.get(f"{API}/faculty/does-not-exist")
    assert r.status_code == 404 and r.json() == {"detail": "Faculty not found"}


def test_home_placement_rate(admin_client, public_client):
    assert public_client.get(f"{API}/home").json()["placement_rate"] is None
    F.create(admin_client, "placement-years", {"academic_year": "2024-25", "eligible_students": 100,
                                               "students_placed": 80, "status": "PUBLISHED"})
    F.create(admin_client, "placement-years", {"academic_year": "2025-26", "eligible_students": 120,
                                               "students_placed": 114, "status": "PUBLISHED"})
    assert public_client.get(f"{API}/home").json()["placement_rate"] == 95.0
