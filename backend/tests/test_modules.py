from datetime import date, timedelta

import pytest

from app.models import ActivityLog
from tests import factories as F

API = F.API


# ------------------------------------------------------------------ department
def test_department_profile_flow(admin_client, public_client):
    assert public_client.get(f"{API}/department").status_code == 404
    payload = {"name": "Department of Computer Science and Engineering", "short_name": "CSE",
               "vision": "To excel", "mission": "Teach well\nResearch well", "email": "cse@college.edu",
               "social_links": [{"label": "LinkedIn", "url": "https://linkedin.com/school/x"}]}
    r = admin_client.put(f"{API}/admin/department", json=payload)
    assert r.status_code == 200, r.text
    assert r.json()["mission"] == ["Teach well", "Research well"]
    pub = public_client.get(f"{API}/department").json()
    assert pub["name"].startswith("Department of Computer")
    r = admin_client.put(f"{API}/admin/department", json={**payload, "college_website": "javascript:alert(1)"})
    assert r.status_code == 422


# ------------------------------------------------------------------ faculty
def test_faculty_crud_and_publish_visibility(admin_client, public_client, db):
    fac = F.create(admin_client, "faculty", F.faculty(status="DRAFT"))
    assert fac["slug"] == "dr-asha-raman"
    assert fac["research_interests"] == ["Deep Learning", "NLP"]
    # drafts are invisible publicly
    assert public_client.get(f"{API}/faculty").json()["total"] == 0
    assert public_client.get(f"{API}/faculty/{fac['slug']}").status_code == 404
    # publish via bulk
    r = admin_client.post(f"{API}/admin/faculty/bulk", json={"ids": [fac["id"]], "action": "publish"})
    assert r.json() == {"updated": 1}
    listing = public_client.get(f"{API}/faculty").json()
    assert listing["total"] == 1 and listing["items"][0]["name"] == "Dr. Asha Raman"
    # designation change reflects publicly without code changes
    r = admin_client.put(f"{API}/admin/faculty/{fac['id']}", json=F.faculty(designation="Associate Professor"))
    assert r.status_code == 200
    detail = public_client.get(f"{API}/faculty/{fac['slug']}").json()
    assert detail["designation"] == "Associate Professor"
    # archive hides it again; nothing is deleted
    admin_client.post(f"{API}/admin/faculty/bulk", json={"ids": [fac["id"]], "action": "archive"})
    assert public_client.get(f"{API}/faculty").json()["total"] == 0
    assert admin_client.get(f"{API}/admin/faculty?status=ARCHIVED").json()["total"] == 1
    actions = {a.action for a in db.query(ActivityLog).filter_by(module="faculty")}
    assert {"CREATE", "PUBLISH", "UPDATE", "ARCHIVE"} <= actions


def test_faculty_hidden_email(admin_client, public_client):
    fac = F.create(admin_client, "faculty", F.faculty(show_email=False))
    assert public_client.get(f"{API}/faculty/{fac['id']}").json()["email"] is None
    assert admin_client.get(f"{API}/admin/faculty/{fac['id']}").json()["email"] == "asha@dept.edu"


def test_faculty_validation(admin_client):
    r = admin_client.post(f"{API}/admin/faculty", json={"name": "", "designation": "Prof"})
    assert r.status_code == 422
    assert any(e["field"] == "name" for e in r.json()["errors"])
    r = admin_client.post(f"{API}/admin/faculty", json=F.faculty(email="not-an-email"))
    assert r.status_code == 422
    r = admin_client.post(f"{API}/admin/faculty", json=F.faculty(unknown_field=1))
    assert r.status_code == 422


def test_unique_email_conflict(admin_client):
    F.create(admin_client, "faculty", F.faculty())
    r = admin_client.post(f"{API}/admin/faculty", json=F.faculty(name="Other Person"))
    assert r.status_code == 409


def test_hard_delete_requires_confirmation(admin_client):
    fac = F.create(admin_client, "faculty", F.faculty())
    assert admin_client.delete(f"{API}/admin/faculty/{fac['id']}").status_code == 400
    assert admin_client.delete(f"{API}/admin/faculty/{fac['id']}?confirm=true").status_code == 204
    assert admin_client.get(f"{API}/admin/faculty/{fac['id']}").status_code == 404


def test_slug_uniqueness(admin_client):
    a = F.create(admin_client, "faculty", F.faculty(email="a@x.edu"))
    b = F.create(admin_client, "faculty", F.faculty(email="b@x.edu"))
    assert a["slug"] != b["slug"] and b["slug"].startswith("dr-asha-raman")


# ------------------------------------------------------------------ students
def test_student_privacy(admin_client, public_client):
    st = F.create(admin_client, "students", F.student())
    pub = public_client.get(f"{API}/students/{st['id']}").json()
    assert pub["register_no"] is None and pub["email"] is None and pub["photo_url"] is None
    assert "phone" not in pub
    # register number is not publicly searchable or filterable
    assert public_client.get(f"{API}/students?q=21CS001").json()["total"] == 0
    assert public_client.get(f"{API}/students?register_no=21CS001").json()["total"] == 1  # filter ignored
    assert admin_client.get(f"{API}/admin/students?q=21CS001").json()["total"] == 1
    admin_client.put(f"{API}/admin/students/{st['id']}", json=F.student(show_contact=True, show_photo=True))
    pub = public_client.get(f"{API}/students/{st['id']}").json()
    assert pub["email"] == "karthik@student.edu" and pub["photo_url"]


def test_student_filters_and_facets(admin_client, public_client):
    F.create(admin_client, "students", F.student())
    F.create(admin_client, "students", F.student(name="Priya M", register_no="22CS010", batch="2022-2026",
                                                 section="B", skills=["Java"]))
    assert public_client.get(f"{API}/students?batch=2022-2026").json()["total"] == 1
    assert public_client.get(f"{API}/students?skill=python").json()["total"] == 1
    assert public_client.get(f"{API}/students?section=B&skill=python").json()["total"] == 0
    facets = public_client.get(f"{API}/students/facets").json()
    assert facets["batch"] == ["2021-2025", "2022-2026"]
    assert set(facets["skills"]) == {"Java", "Python", "React"}
    r = admin_client.post(f"{API}/admin/students", json=F.student(register_no="X1", batch="2021"))
    assert r.status_code == 422


def test_pagination(admin_client, public_client):
    for i in range(30):
        F.create(admin_client, "students", F.student(register_no=f"R{i:03}", name=f"Student {i:02}"))
    page = public_client.get(f"{API}/students?page=2&page_size=12").json()
    assert page["total"] == 30 and page["pages"] == 3 and len(page["items"]) == 12
    assert public_client.get(f"{API}/students?page_size=1000").status_code == 422


# ------------------------------------------------------------------ achievements
def test_faculty_achievement_crud(admin_client, public_client):
    fac = F.create(admin_client, "faculty", F.faculty())
    ach = F.create(admin_client, "faculty-achievements", F.faculty_achievement(fac["id"]))
    assert ach["year"] == 2026  # derived from date
    assert ach["faculty"]["name"] == "Dr. Asha Raman"
    r = admin_client.post(f"{API}/admin/faculty-achievements", json=F.faculty_achievement(99999))
    assert r.status_code == 422
    r = admin_client.post(f"{API}/admin/faculty-achievements",
                          json=F.faculty_achievement(fac["id"], category="Not a category"))
    assert r.status_code == 422
    assert public_client.get(f"{API}/faculty-achievements?faculty_id={fac['id']}&year=2026").json()["total"] == 1
    assert public_client.get(f"{API}/faculty-achievements?year=2020").json()["total"] == 0
    assert public_client.get(f"{API}/faculty-achievements?year=abc").status_code == 422


def test_student_achievement_filters(admin_client, public_client):
    F.create(admin_client, "student-achievements", F.student_achievement())
    F.create(admin_client, "student-achievements",
             F.student_achievement(title="Cricket", category="Sports", level="District", date="2025-01-05"))
    assert public_client.get(f"{API}/student-achievements?level=National").json()["total"] == 1
    assert public_client.get(f"{API}/student-achievements?category=Sports&year=2025").json()["total"] == 1
    assert public_client.get(f"{API}/student-achievements?student=priya").json()["total"] == 2
    assert public_client.get(f"{API}/student-achievements?q=hackathon").json()["total"] == 1
    # "Hackathons & Competitions" menu link groups several categories
    assert public_client.get(f"{API}/student-achievements?group=competitions").json()["total"] == 1
    assert public_client.get(f"{API}/student-achievements?group=unknown").json()["total"] == 0
    facets = public_client.get(f"{API}/student-achievements/facets").json()
    assert facets["year"] == [2026, 2025]


# ------------------------------------------------------------------ events & opportunities
def test_event_crud_and_upcoming_filter(admin_client, public_client):
    ev = F.create(admin_client, "events", F.event())
    past = F.event(title="Old Seminar", event_type="Seminar", event_status="COMPLETED",
                   start_at="2024-01-10T10:00:00")
    F.create(admin_client, "events", past)
    assert ev["slug"] == "workshop-on-generative-ai"
    up = public_client.get(f"{API}/events?when=upcoming").json()
    assert [e["title"] for e in up["items"]] == ["Workshop on Generative AI"]
    assert public_client.get(f"{API}/events?when=past").json()["total"] == 1
    assert public_client.get(f"{API}/events?event_type=Seminar").json()["total"] == 1
    # website category tabs group several event types
    F.create(admin_client, "events", F.event(title="Tech Symposium", event_type="Symposium"))
    F.create(admin_client, "events", F.event(title="Aptitude Training", event_type="Training"))
    assert public_client.get(f"{API}/events?group=workshops-seminars").json()["total"] == 2
    assert public_client.get(f"{API}/events?group=symposiums-conferences").json()["total"] == 1
    assert public_client.get(f"{API}/events?group=training").json()["total"] == 1
    assert public_client.get(f"{API}/events?group=unknown").json()["total"] == 0
    bad = F.event(end_at="2000-01-01T00:00:00")
    assert admin_client.post(f"{API}/admin/events", json=bad).status_code == 422


def test_opportunity_filters(admin_client, public_client):
    today = date.today()
    F.create(admin_client, "opportunities", F.opportunity())
    F.create(admin_client, "opportunities", F.opportunity(
        title="Closed Contest", state="Karnataka", city="Bengaluru", category="Coding Competition", mode="ONLINE",
        registration_deadline=(today - timedelta(days=1)).isoformat()))
    month = (today + timedelta(days=30)).strftime("%Y-%m")
    q = f"{API}/opportunities?state=Tamil%20Nadu&category=Hackathon&registration=OPEN&month={month}"
    res = public_client.get(q).json()
    assert res["total"] == 1 and res["items"][0]["registration_status"] == "OPEN"
    assert public_client.get(f"{API}/opportunities?registration=CLOSED").json()["total"] == 1
    assert public_client.get(f"{API}/opportunities?mode=ONLINE").json()["total"] == 1
    assert public_client.get(f"{API}/opportunities?city=chen").json()["total"] == 1
    # verification fields are mandatory
    r = admin_client.post(f"{API}/admin/opportunities", json=F.opportunity(source_url=None))
    assert r.status_code == 422


# ------------------------------------------------------------------ other modules (smoke CRUD)
@pytest.mark.parametrize("key,payload", [
    ("placement-years", {"academic_year": "2025-26", "eligible_students": 100, "students_placed": 95,
                         "highest_package_lpa": 24, "average_package_lpa": 6.5, "status": "PUBLISHED"}),
    ("placements", {"academic_year": "2025-26", "student_name": "A", "company": "Zoho", "package_lpa": 8,
                    "status": "PUBLISHED"}),
    ("recruiters", {"name": "Zoho", "status": "PUBLISHED"}),
    ("internships", {"company": "Google", "role": "SWE Intern", "apply_url": "https://careers.google.com",
                     "status": "PUBLISHED"}),
    ("publications", {"title": "A study", "authors": "A, B", "pub_type": "JOURNAL", "year": 2026,
                      "doi": "10.1/abc", "status": "PUBLISHED"}),
    ("patents", {"title": "Device", "inventors": "A", "patent_status": "FILED", "year": 2025,
                 "status": "PUBLISHED"}),
    ("research-projects", {"title": "AI for agri", "year": 2025, "project_status": "ONGOING",
                           "funding_agency": "DST", "status": "PUBLISHED"}),
    ("laboratories", {"name": "AI & ML Laboratory", "software": "Python, TensorFlow, PyTorch",
                      "status": "PUBLISHED"}),
    ("projects", {"title": "Smart Attendance", "students": "A, B", "academic_year": "2025-26",
                  "technologies": "Python, OpenCV", "status": "PUBLISHED"}),
    ("alumni", {"name": "Ravi", "graduation_year": 2020, "organization": "Microsoft", "status": "PUBLISHED"}),
    ("news", {"title": "We won SIH", "summary": "Team won", "content": "**Great** news",
              "published_on": "2026-09-01", "category": "Achievement", "status": "PUBLISHED"}),
    ("gallery", {"title": "AI Workshop 2026", "status": "PUBLISHED"}),
    ("highlights", {"title": "NBA Accredited", "status": "PUBLISHED"}),
    ("mous", {"organization": "Infosys Ltd.", "signed_on": "2025-06-10", "valid_until": "2028-06-09",
              "purpose": "Internships and joint workshops", "status": "PUBLISHED"}),
    ("videos", {"title": "Symposium highlights", "video_url": "https://www.youtube.com/watch?v=abc123",
                "category": "Workshops & Symposiums", "status": "PUBLISHED"}),
    ("programs", {"name": "B.E. Computer Science and Engineering (AI & ML)", "level": "UG",
                  "duration": "4 years", "intake": 120, "status": "PUBLISHED"}),
    ("academic-documents", {"title": "R2024 Curriculum", "category": "Curriculum & Syllabus",
                            "regulation": "R2024", "file_url": "https://res.cloudinary.com/x/r2024.pdf",
                            "status": "PUBLISHED"}),
])
def test_module_crud_roundtrip(admin_client, public_client, key, payload):
    rec = F.create(admin_client, key, payload)
    assert admin_client.get(f"{API}/admin/{key}/{rec['id']}").status_code == 200
    assert public_client.get(f"{API}/{key}").json()["total"] == 1
    assert public_client.get(f"{API}/{key}/{rec.get('slug') or rec['id']}").status_code == 200
    r = admin_client.put(f"{API}/admin/{key}/{rec['id']}", json={**payload, "status": "DRAFT"})
    assert r.status_code == 200, r.text
    assert public_client.get(f"{API}/{key}").json()["total"] == 0


def test_placement_percentage_and_average_privacy(admin_client, public_client):
    F.create(admin_client, "placement-years", {"academic_year": "2025-26", "eligible_students": 120,
                                               "students_placed": 114, "average_package_lpa": 6.2,
                                               "status": "PUBLISHED"})
    y = public_client.get(f"{API}/placement-years").json()["items"][0]
    assert y["placement_percentage"] == 95.0 and y["average_package_lpa"] is None
    r = admin_client.post(f"{API}/admin/placement-years", json={"academic_year": "2024-25", "eligible_students": 1,
                                                                 "students_placed": 5})
    assert r.status_code == 422


def test_gallery_images(admin_client, public_client):
    album = F.create(admin_client, "gallery", {"title": "Symposium 2026", "status": "PUBLISHED"})
    r = admin_client.post(f"{API}/admin/gallery/{album['id']}/images",
                          json={"images": [{"image_url": "https://res.cloudinary.com/x/a.jpg"},
                                           {"image_url": "https://res.cloudinary.com/x/b.jpg", "caption": "B"}]})
    assert r.status_code == 201
    detail = public_client.get(f"{API}/gallery/{album['slug']}").json()
    assert len(detail["images"]) == 2
    listing = public_client.get(f"{API}/gallery").json()["items"][0]
    assert listing["image_count"] == 2 and listing["cover_image_url"].endswith("a.jpg")
    img_id = detail["images"][0]["id"]
    assert admin_client.delete(f"{API}/admin/gallery/images/{img_id}").status_code == 204


def test_gallery_and_video_categories(admin_client, public_client):
    F.create(admin_client, "gallery", {"title": "Lab Tour", "category": "Laboratory & Infrastructure",
                                       "status": "PUBLISHED"})
    F.create(admin_client, "gallery", {"title": "Uncategorised", "status": "PUBLISHED"})
    res = public_client.get(f"{API}/gallery?category=Laboratory%20%26%20Infrastructure").json()
    assert [a["title"] for a in res["items"]] == ["Lab Tour"] and res["items"][0]["category"] == "Laboratory & Infrastructure"
    assert public_client.get(f"{API}/gallery/facets").json()["category"] == ["Laboratory & Infrastructure"]
    r = admin_client.post(f"{API}/admin/gallery", json={"title": "X", "category": "Not a category"})
    assert r.status_code == 422
    r = admin_client.post(f"{API}/admin/videos", json={"title": "X", "video_url": "javascript:alert(1)"})
    assert r.status_code == 422


def test_academic_documents_need_a_file_or_link(admin_client, public_client):
    base = {"title": "Academic Calendar 2026-27", "category": "Academic Calendar", "academic_year": "2026-27",
            "status": "PUBLISHED"}
    assert admin_client.post(f"{API}/admin/academic-documents", json=base).status_code == 422
    F.create(admin_client, "academic-documents", {**base, "external_url": "https://college.edu/calendar"})
    F.create(admin_client, "academic-documents", {**base, "title": "Timetable", "category": "Timetable",
                                                  "file_url": "https://res.cloudinary.com/x/tt.pdf"})
    res = public_client.get(f"{API}/academic-documents?category=Timetable").json()
    assert [d["title"] for d in res["items"]] == ["Timetable"]


def test_mou_dates_validated(admin_client):
    r = admin_client.post(f"{API}/admin/mous", json={"organization": "X", "signed_on": "2026-01-01",
                                                      "valid_until": "2025-01-01"})
    assert r.status_code == 422
    r = admin_client.post(f"{API}/admin/mous", json={"organization": "X", "website_url": "javascript:alert(1)"})
    assert r.status_code == 422
