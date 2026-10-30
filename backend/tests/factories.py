"""Minimal valid payloads for each module (used by tests)."""
from datetime import date, datetime, timedelta

API = "/api/v1"


def faculty(**kw):
    return {"name": "Dr. Asha Raman", "designation": "Assistant Professor", "qualification": "Ph.D.",
            "specialization": "Machine Learning", "email": "asha@dept.edu", "status": "PUBLISHED",
            "research_interests": "Deep Learning, NLP", **kw}


def student(**kw):
    return {"name": "Karthik S", "register_no": "21CS001", "batch": "2021-2025", "academic_year": "IV",
            "section": "A", "skills": ["Python", "React"], "interests": ["AI"], "email": "karthik@student.edu",
            "phone": "9999999999", "photo_url": "https://example.com/p.jpg", "status": "PUBLISHED", **kw}


def faculty_achievement(faculty_id, **kw):
    return {"faculty_id": faculty_id, "title": "Best Paper Award", "category": "Awards & Honors",
            "date": "2026-03-10", "level": "International", "organization": "IEEE", "status": "PUBLISHED", **kw}


def student_achievement(**kw):
    return {"participants": "Karthik S, Priya M", "title": "Winner - Smart India Hackathon",
            "event_name": "SIH 2026", "organizer": "Govt. of India", "position": "1st",
            "date": "2026-08-20", "category": "Smart India Hackathon", "level": "National",
            "status": "PUBLISHED", **kw}


def event(**kw):
    start = (datetime.now() + timedelta(days=10)).replace(microsecond=0)
    return {"title": "Workshop on Generative AI", "event_type": "Workshop", "start_at": start.isoformat(),
            "venue": "Seminar Hall", "speaker": "Dr. X", "status": "PUBLISHED", **kw}


def opportunity(**kw):
    today = date.today()
    return {"title": "National Hackathon", "organizer": "IIT Madras", "city": "Chennai", "state": "Tamil Nadu",
            "mode": "OFFLINE", "category": "Hackathon", "start_date": (today + timedelta(days=30)).isoformat(),
            "registration_deadline": (today + timedelta(days=20)).isoformat(),
            "registration_url": "https://example.org/register", "source_url": "https://example.org",
            "last_verified_at": today.isoformat(), "status": "PUBLISHED", **kw}


def create(client, key, payload):
    r = client.post(f"{API}/admin/{key}", json=payload)
    assert r.status_code == 201, r.text
    return r.json()
