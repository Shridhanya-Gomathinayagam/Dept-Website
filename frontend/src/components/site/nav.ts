export interface NavItem {
  label: string;
  href: string;
  /** Sub-links shown in a dropdown; omit for a plain link. */
  children?: { label: string; href: string }[];
}

const enc = encodeURIComponent;

// Site structure (routes), not department content.
export const NAV: NavItem[] = [
  {
    label: "Home",
    href: "/",
    // Sections on the home page, in page order (Highlights and MOUs appear once published).
    children: [
      { label: "About the Department", href: "/#about" },
      { label: "Vision & Mission", href: "/#vision" },
      { label: "Programme Objectives & Outcomes", href: "/#outcomes" },
      { label: "Department Highlights", href: "/#highlights" },
      { label: "MOUs & Partnerships", href: "/#mous" },
    ],
  },
  {
    label: "Faculty",
    href: "/faculty",
  },
  {
    label: "Achievements",
    href: "/student-achievements",
    children: [
      { label: "Student Achievements", href: "/student-achievements" },
      { label: "Faculty Achievements", href: "/faculty-achievements" },
      { label: "Awards & Recognitions", href: `/faculty-achievements?category=${enc("Awards & Honors")}` },
      { label: "Hackathons & Competitions", href: "/student-achievements?group=competitions" },
      { label: "Certifications", href: "/student-achievements?category=Certifications" },
      { label: "Patents & Publications", href: "/research?tab=patents" },
    ],
  },
  {
    label: "Research & Projects",
    href: "/research",
    children: [
      { label: "Research Areas", href: "/research#areas" },
      { label: "Faculty Research", href: "/research?tab=publications&student=false" },
      { label: "Student Projects", href: "/projects" },
      { label: "Funded Projects", href: "/research?tab=projects" },
      { label: "Publications & Patents", href: "/research?tab=publications" },
      { label: "Industry Collaboration", href: "/research?tab=projects&industry=true" },
    ],
  },
  {
    label: "Events & Opportunities",
    href: "/events",
    children: [
      { label: "Upcoming Events", href: "/events" },
      { label: "Workshops & Seminars", href: "/events?group=workshops-seminars&when=all" },
      { label: "Symposiums & Conferences", href: "/events?group=symposiums-conferences&when=all" },
      { label: "Club Activities", href: "/events?group=club-activities&when=all" },
      { label: "Internships & Training", href: "/internships" },
      { label: "Hackathons & Competitions", href: "/opportunities" },
    ],
  },
  {
    label: "Placements",
    href: "/placements",
    children: [
      { label: "Placement Statistics", href: "/placements#statistics" },
      { label: "Recruiters & Partner Companies", href: "/placements#recruiters" },
      { label: "Students Placed", href: "/placements#students-placed" },
      { label: "Placement Highlights", href: "/placements#highlights" },
      { label: "Internship Highlights", href: "/internships?kind=STUDENT" },
      { label: "Career Preparation & Training", href: "/events?group=training&when=all" },
    ],
  },
  {
    label: "Gallery",
    href: "/gallery",
    children: [
      { label: "Event Photos", href: `/gallery?category=${enc("Events")}` },
      { label: "Workshop & Symposium Photos", href: `/gallery?category=${enc("Workshops & Symposiums")}` },
      { label: "Student Activities", href: `/gallery?category=${enc("Student Activities")}` },
      { label: "Laboratory & Infrastructure", href: `/gallery?category=${enc("Laboratory & Infrastructure")}` },
      { label: "Videos", href: "/gallery?tab=videos" },
    ],
  },
  {
    label: "Academics",
    href: "/academics",
    children: [
      { label: "Programs Offered", href: "/academics#programs" },
      { label: "Curriculum & Syllabus", href: "/academics#curriculum" },
      { label: "Academic Regulations", href: "/academics#regulations" },
      { label: "Academic Calendar", href: "/academics#calendar" },
      { label: "Timetable", href: "/academics#timetable" },
      { label: "Laboratory Details", href: "/laboratories" },
      { label: "Downloadable Documents", href: "/academics#documents" },
    ],
  },
];

/** Path part of a nav href (without query or hash). */
export function navPath(href: string): string {
  return href.split(/[?#]/)[0] || "/";
}
