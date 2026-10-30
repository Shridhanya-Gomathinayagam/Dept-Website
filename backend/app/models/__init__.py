from app.models.academics import AcademicDocument, Program
from app.models.achievements import FacultyAchievement, StudentAchievement
from app.models.admin import ActivityLog, Admin, ImportSession, SystemStatus
from app.models.content import GalleryAlbum, GalleryImage, News, Project, Video
from app.models.department import Department, Highlight, Mou
from app.models.events import Event, Opportunity
from app.models.people import Alumnus, Faculty, Student
from app.models.placements import Internship, Placement, PlacementYear, Recruiter
from app.models.research import Laboratory, Patent, Publication, ResearchProject

__all__ = [
    "AcademicDocument", "ActivityLog", "Admin", "Alumnus", "Department", "Event", "Faculty",
    "FacultyAchievement", "GalleryAlbum", "GalleryImage", "Highlight", "ImportSession", "Internship",
    "Laboratory", "Mou", "News", "Opportunity", "Patent", "Placement", "PlacementYear", "Program", "Project",
    "Publication", "Recruiter", "ResearchProject", "Student", "StudentAchievement", "SystemStatus", "Video",
]
