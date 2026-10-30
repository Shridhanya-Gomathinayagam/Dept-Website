"""Controlled vocabularies used by validation, admin forms and public filters.

Served to the frontend via GET /api/v1/meta/options so there is one source of truth.
"""

FACULTY_ACHIEVEMENT_CATEGORIES = (
    "Awards & Honors", "Research Publications", "Patents", "Keynote / Invited Talks", "Funded Projects",
    "Books / Book Chapters", "International Conferences", "Best Faculty Awards", "Certifications",
    "Research Collaborations",
)
STUDENT_ACHIEVEMENT_CATEGORIES = (
    "Hackathons", "Smart India Hackathon", "Paper Presentations", "Project Competitions",
    "Coding Competitions", "Sports", "Cultural", "Entrepreneurship", "Certifications", "Research", "Patents",
)
# Public achievement groups (website menu links) -> categories they include.
STUDENT_ACHIEVEMENT_GROUPS = {
    "competitions": ("Hackathons", "Smart India Hackathon", "Coding Competitions", "Project Competitions",
                     "Paper Presentations"),
}
LEVELS = ("College", "District", "State", "National", "International")
EVENT_TYPES = (
    "Workshop", "FDP", "Guest Lecture", "Seminar", "Conference", "Symposium", "Club Activity", "Training",
    "Industrial Visit", "Alumni Meet", "Other",
)
# Public event categories (website tabs) -> event types they include.
EVENT_GROUPS = {
    "workshops-seminars": ("Workshop", "Seminar", "FDP", "Guest Lecture"),
    "symposiums-conferences": ("Symposium", "Conference"),
    "club-activities": ("Club Activity",),
    "training": ("Training", "Industrial Visit"),
}
EVENT_STATUSES = ("UPCOMING", "ONGOING", "COMPLETED", "CANCELLED")
OPPORTUNITY_CATEGORIES = (
    "Hackathon", "Coding Competition", "Project Competition", "Workshop", "Conference", "Symposium",
    "Paper Presentation", "Ideathon", "Internship", "Technical Competition", "Scholarship",
)
MODES = ("ONLINE", "OFFLINE", "HYBRID")
PUBLICATION_TYPES = ("JOURNAL", "CONFERENCE", "BOOK", "BOOK_CHAPTER", "OTHER")
PATENT_STATUSES = ("FILED", "PUBLISHED", "GRANTED")
PROJECT_STATUSES = ("ONGOING", "COMPLETED")
INTERNSHIP_KINDS = ("OPENING", "STUDENT")
NEWS_CATEGORIES = (
    "Achievement", "Research", "Placement", "Internship", "Workshop", "Guest Lecture", "Award", "Event",
    "Announcement", "General",
)
STUDENT_YEARS = ("I", "II", "III", "IV")
GALLERY_CATEGORIES = ("Events", "Workshops & Symposiums", "Student Activities", "Laboratory & Infrastructure")
PROGRAM_LEVELS = ("UG", "PG", "PhD")
ACADEMIC_DOCUMENT_CATEGORIES = (
    "Curriculum & Syllabus", "Academic Regulations", "Academic Calendar", "Timetable", "Other Documents",
)
REGISTRATION_STATUSES = ("OPEN", "CLOSING_SOON", "CLOSED")

ALL_OPTIONS = {
    "faculty_achievement_categories": FACULTY_ACHIEVEMENT_CATEGORIES,
    "student_achievement_categories": STUDENT_ACHIEVEMENT_CATEGORIES,
    "levels": LEVELS,
    "event_types": EVENT_TYPES,
    "event_statuses": EVENT_STATUSES,
    "opportunity_categories": OPPORTUNITY_CATEGORIES,
    "modes": MODES,
    "publication_types": PUBLICATION_TYPES,
    "patent_statuses": PATENT_STATUSES,
    "project_statuses": PROJECT_STATUSES,
    "internship_kinds": INTERNSHIP_KINDS,
    "news_categories": NEWS_CATEGORIES,
    "student_years": STUDENT_YEARS,
    "gallery_categories": GALLERY_CATEGORIES,
    "program_levels": PROGRAM_LEVELS,
    "academic_document_categories": ACADEMIC_DOCUMENT_CATEGORIES,
    "registration_statuses": REGISTRATION_STATUSES,
}
