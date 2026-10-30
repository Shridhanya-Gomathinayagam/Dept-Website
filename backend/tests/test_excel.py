import io

from openpyxl import Workbook, load_workbook

from app.models import ActivityLog
from tests import factories as F

API = F.API
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _xlsx(headers, rows) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _preview(client, entity, content, status="PUBLISHED"):
    return client.post(f"{API}/admin/excel/{entity}/preview", data={"default_status": status},
                       files={"file": (f"{entity}.xlsx", content, XLSX)})


STUDENT_HEADERS = ["Name", "Register No", "Batch", "Year", "Section", "Skills"]


def test_template_download(admin_client):
    r = admin_client.get(f"{API}/admin/excel/templates/students")
    assert r.status_code == 200
    wb = load_workbook(io.BytesIO(r.content))
    assert [c.value for c in wb.active[1]][:3] == ["Name", "Register No", "Batch"]
    assert "Instructions" in wb.sheetnames
    assert admin_client.get(f"{API}/admin/excel/templates/unknown").status_code == 404


def test_import_preview_then_commit(admin_client, public_client, db):
    content = _xlsx(STUDENT_HEADERS, [
        ["Anu", "21CS001", "2021-2025", "IV", "A", "Python, SQL"],
        ["Bala", "21CS002", "2021-2025", "IV", "A", None],
        ["Bala again", "21CS002", "2021-2025", "IV", "B", None],      # duplicate in file
        ["Chitra", None, "2021-2025", "IV", "A", None],               # missing register no
        ["Deepa", "21CS004", "21-25", "IV", "A", None],               # bad batch format
    ])
    r = _preview(admin_client, "students", content)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["summary"] == {"new": 2, "update": 0, "unchanged": 0, "invalid": 2, "duplicate": 1, "total": 5}
    invalid = [row for row in body["rows"] if row["action"] == "invalid"]
    assert invalid[0]["row"] == 5 and "Register No" in invalid[0]["errors"][0]
    # nothing written before confirmation
    assert admin_client.get(f"{API}/admin/students").json()["total"] == 0

    r = admin_client.post(f"{API}/admin/excel/imports/{body['import_id']}/commit")
    assert r.json() == {"created": 2, "updated": 0}
    assert public_client.get(f"{API}/students").json()["total"] == 2
    assert admin_client.post(f"{API}/admin/excel/imports/{body['import_id']}/commit").status_code == 409
    assert db.query(ActivityLog).filter_by(action="IMPORT").count() == 1


def test_import_detects_updates_and_keeps_unlisted_columns(admin_client):
    F.create(admin_client, "students", F.student(register_no="21CS001", name="Anu", section="A"))
    content = _xlsx(["Name", "Register No", "Batch", "Section"], [
        ["Anu", "21CS001", "2021-2025", "C"],
    ])
    body = _preview(admin_client, "students", content).json()
    assert body["summary"]["update"] == 1
    assert body["rows"][0]["changes"] == ["Section"]
    admin_client.post(f"{API}/admin/excel/imports/{body['import_id']}/commit")
    st = admin_client.get(f"{API}/admin/students").json()["items"][0]
    assert st["section"] == "C"
    assert st["email"] == "karthik@student.edu"  # column absent from sheet -> untouched
    assert st["skills"] == ["Python", "React"]
    body = _preview(admin_client, "students", content).json()
    assert body["summary"]["unchanged"] == 1


def test_import_resolves_faculty_lookup(admin_client):
    F.create(admin_client, "faculty", F.faculty())
    content = _xlsx(["Faculty Email", "Title", "Category", "Date"], [
        ["asha@dept.edu", "Keynote at ICML", "Keynote / Invited Talks", "2026-02-01"],
        ["ghost@dept.edu", "Unknown", "Patents", "2026-02-01"],
    ])
    body = _preview(admin_client, "faculty_achievements", content).json()
    assert body["summary"]["new"] == 1 and body["summary"]["invalid"] == 1
    assert "no faculty member found" in body["rows"][1]["errors"][0]


def test_import_rejects_bad_files(admin_client):
    r = admin_client.post(f"{API}/admin/excel/students/preview",
                          files={"file": ("students.xlsx", b"not a workbook", XLSX)})
    assert r.status_code == 400
    r = _preview(admin_client, "students", _xlsx(["Name"], [["x"]]))
    assert r.status_code == 400 and "Missing required column" in r.json()["detail"]


def test_export_with_filters(admin_client, db):
    F.create(admin_client, "student-achievements", F.student_achievement())
    F.create(admin_client, "student-achievements",
             F.student_achievement(title="Cricket", category="Sports", level="District"))
    r = admin_client.get(f"{API}/admin/excel/student_achievements/export?category=Smart%20India%20Hackathon"
                         "&level=National&year=2026")
    assert r.status_code == 200
    ws = load_workbook(io.BytesIO(r.content)).active
    rows = list(ws.iter_rows(values_only=True))
    assert len(rows) == 2 and rows[1][4] == "Winner - Smart India Hackathon"
    assert db.query(ActivityLog).filter_by(action="EXPORT").count() == 1


def test_export_neutralises_formulas(admin_client):
    F.create(admin_client, "alumni", {"name": "=HYPERLINK(\"http://evil\")", "graduation_year": 2020})
    r = admin_client.get(f"{API}/admin/excel/alumni/export")
    cell = load_workbook(io.BytesIO(r.content)).active["A2"]
    assert cell.data_type == "s"


def test_excel_requires_admin(public_client):
    assert public_client.get(f"{API}/admin/excel/templates/students").status_code == 401
    assert public_client.get(f"{API}/admin/excel/students/export").status_code == 401
