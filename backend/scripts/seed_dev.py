"""Load SAMPLE content for local development and demos.

    python -m scripts.seed_dev            # adds sample data (only into an empty database)

Everything created here is fictional sample data and is labelled as such. It is validated
through the same schemas the API uses. Never run against production (refused when ENV=production).
"""
import sys
from datetime import date, datetime, timedelta

from sqlalchemy import func, select

from app import models as M
from app.core.config import get_settings
from app.crud.resource import save_record
from app.db.session import SessionLocal
from app.resources import BY_KEY
from app.schemas.modules import DepartmentIn

TODAY = date.today()


def add(db, key: str, **data):
    res = BY_KEY[key]
    payload = res.schema_in.model_validate({"status": "PUBLISHED", **data}).model_dump()
    return save_record(db, res, None, payload, None)


def main() -> None:
    if get_settings().is_production:
        sys.exit("Refusing to load sample data in production.")
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(M.Faculty)):
            sys.exit("Database already has content; sample data not loaded.")

        dept = DepartmentIn(
            name="Department of Computer Science and Engineering (Sample)",
            short_name="CSE",
            college_name="Sample Institute of Technology",
            tagline="Sample data: replace from Admin → Department",
            intro="This is placeholder content loaded by the development seed script. "
                  "Edit everything from the admin dashboard.",
            overview="The department offers undergraduate and postgraduate programmes in computer science "
                     "with a focus on strong fundamentals, research and industry readiness.",
            vision="To be a centre of excellence in computing education and research.",
            mission=["Provide quality education in computer science",
                     "Foster research, innovation and entrepreneurship",
                     "Develop ethical professionals who serve society"],
            peos=["Graduates will excel in professional careers or higher studies.",
                  "Graduates will engage in lifelong learning and research."],
            pos=["Engineering knowledge", "Problem analysis", "Design/development of solutions"],
            psos=["Apply software engineering practices to build reliable systems."],
            year_established=2001,
            accreditation="NBA accredited (sample)",
            facilities=["Central computing facility", "Department library", "Seminar hall"],
            hod_name="Dr. Sample HOD",
            hod_designation="Professor & Head",
            hod_message="Welcome to the department. (Sample message: replace from the admin dashboard.)",
            address="Department of CSE\nSample Institute of Technology\nSample City 600000",
            email="cse@example.edu",
            phone="+91 00000 00000",
            social_links=[{"label": "LinkedIn", "url": "https://www.linkedin.com"}],
            important_links=[{"label": "Academic Calendar", "url": "https://example.edu/calendar"}],
        )
        db.add(M.Department(**dept.model_dump(mode="json")))

        f1 = add(db, "faculty", name="Dr. Sample Professor", designation="Professor & Head", qualification="Ph.D.",
                 specialization="Machine Learning", experience_years=20, email="hod@example.edu",
                 research_interests=["Machine Learning", "Computer Vision"], display_order=1,
                 bio="Sample faculty profile.")
        f2 = add(db, "faculty", name="Dr. Sample Associate", designation="Associate Professor", qualification="Ph.D.",
                 specialization="Cyber Security", experience_years=12, email="assoc@example.edu",
                 research_interests=["Network Security", "Blockchain"], display_order=2)
        add(db, "faculty", name="Ms. Sample Assistant", designation="Assistant Professor", qualification="M.E.",
            specialization="Data Science", experience_years=5, email="asst@example.edu", display_order=3)

        for i, (name, skills) in enumerate([("Sample Student A", ["Python", "React"]),
                                            ("Sample Student B", ["Java", "Spring"]),
                                            ("Sample Student C", ["C++", "Machine Learning"])]):
            add(db, "students", name=name, register_no=f"SAMPLE{i + 1:03}", batch="2023-2027", academic_year="III",
                section="A", skills=skills, interests=["Artificial Intelligence"])

        add(db, "student-achievements", participants="Sample Student A, Sample Student B", team_name="Team Sample",
            title="Winner: Smart India Hackathon (sample)", event_name="SIH", organizer="Government of India",
            position="Winner", date=TODAY - timedelta(days=40), category="Smart India Hackathon", level="National")
        add(db, "student-achievements", participants="Sample Student C", title="Best Paper Award (sample)",
            event_name="National Conference", organizer="Sample University", position="Best Paper",
            date=TODAY - timedelta(days=90), category="Paper Presentations", level="State")
        add(db, "faculty-achievements", faculty_id=f1.id, title="Keynote on Responsible AI (sample)",
            category="Keynote / Invited Talks", date=TODAY - timedelta(days=30), organization="Sample Conference",
            level="International")
        add(db, "faculty-achievements", faculty_id=f2.id, title="Funded project on IoT security (sample)",
            category="Funded Projects", date=TODAY - timedelta(days=120), organization="DST", level="National",
            research_domain="Cyber Security")

        add(db, "events", title="Workshop on Generative AI (sample)", event_type="Workshop",
            start_at=datetime.combine(TODAY + timedelta(days=12), datetime.min.time()).replace(hour=10),
            venue="Seminar Hall", speaker="Industry expert", organizer="Department of CSE", is_featured=True)
        add(db, "events", title="Guest Lecture on Cloud Computing (sample)", event_type="Guest Lecture",
            start_at=datetime.combine(TODAY - timedelta(days=20), datetime.min.time()).replace(hour=14),
            venue="Auditorium", event_status="COMPLETED")
        add(db, "opportunities", title="Sample National Hackathon", organizer="Sample Organizer",
            institution="Sample University", city="Chennai", state="Tamil Nadu", mode="OFFLINE", category="Hackathon",
            start_date=TODAY + timedelta(days=25), end_date=TODAY + timedelta(days=26),
            registration_deadline=TODAY + timedelta(days=15), eligibility="UG students", team_size="2-4",
            prize_info="Prizes worth ₹1,00,000 (sample)", registration_url="https://example.org/register",
            source_url="https://example.org", last_verified_at=TODAY)

        add(db, "placement-years", academic_year="2025-26", eligible_students=120, students_placed=110,
            highest_package_lpa=18, average_package_lpa=6.5, companies_visited=45)
        add(db, "placements", academic_year="2025-26", student_name="Sample Student X", company="Sample Corp",
            role="Software Engineer", package_lpa=12)
        add(db, "recruiters", name="Sample Corp")
        add(db, "publications", title="A sample study on deep learning", authors="Sample Professor, Sample Student C",
            faculty_id=f1.id, pub_type="JOURNAL", venue="Sample Journal", year=TODAY.year, domain="Machine Learning",
            indexing="Scopus")
        add(db, "laboratories", name="AI & Machine Learning Laboratory", description="Sample lab description.",
            software=["Python", "TensorFlow", "PyTorch", "CUDA", "Jupyter"], equipment=["GPU workstations"],
            incharge_faculty_id=f1.id, is_research_lab=True, research_domains=["Machine Learning"])
        add(db, "projects", title="Smart Attendance System (sample)", students="Sample Student A, Sample Student B",
            guide_faculty_id=f2.id, domain="Computer Vision", technologies=["Python", "OpenCV"],
            academic_year="2025-26", github_url="https://github.com")
        add(db, "alumni", name="Sample Alumnus", graduation_year=2020, organization="Sample Tech",
            designation="Senior Engineer", testimonial="Sample testimonial.")
        add(db, "news", title="Students win national hackathon (sample)", summary="Sample news summary.",
            content="This is **sample** news content.", published_on=TODAY - timedelta(days=35),
            category="Achievement")
        add(db, "gallery", title="Sample Album", event_date=TODAY - timedelta(days=35), category="Events")
        add(db, "videos", title="Department tour (sample)", video_url="https://www.youtube.com/watch?v=aqz-KE-bpKQ",
            category="Laboratory & Infrastructure", event_date=TODAY - timedelta(days=20))
        add(db, "programs", name="B.E. Computer Science and Engineering (AI & ML) (sample)", level="UG",
            duration="4 years", intake=60, description="Sample programme description.")
        add(db, "academic-documents", title="Curriculum and Syllabus R2024 (sample)", category="Curriculum & Syllabus",
            regulation="R2024", external_url="https://example.com/curriculum.pdf")
        add(db, "academic-documents", title="Academic Calendar (sample)", category="Academic Calendar",
            academic_year="2025-26", external_url="https://example.com/calendar.pdf")
        add(db, "highlights", title="NBA Accredited (sample)", description="Sample highlight.")
        add(db, "mous", organization="Sample Technologies Pvt. Ltd.", signed_on=TODAY - timedelta(days=200),
            valid_until=TODAY + timedelta(days=900), purpose="Sample MOU: internships, guest lectures and joint projects.",
            website_url="https://example.com")
        db.commit()
        print("Sample data loaded. Replace it from the admin dashboard before going live.")


if __name__ == "__main__":
    main()
