import { facultyHref } from "@/lib/links";

// Admin module definitions: drive the generic list table and create/edit form.
// Field names must match the backend "In" schemas (backend/app/schemas/modules.py) exactly,
// because updates replace the whole record.

export type FieldType =
  | "text" | "textarea" | "markdown" | "email" | "url" | "number" | "date" | "datetime"
  | "select" | "checkbox" | "list" | "image" | "document" | "images" | "faculty" | "student";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  max?: number;
  min?: number;
  step?: number;
  options?: string[];
  optionsKey?: string; // key in GET /meta/options
  help?: string;
  placeholder?: string;
  folder?: string; // upload folder for image/document
  wide?: boolean; // span both columns
  pattern?: { regex: RegExp; message: string };
  defaultValue?: unknown;
}

export interface Section {
  title: string;
  description?: string;
  fields: FieldDef[];
}

export interface Column {
  field: string;
  label: string;
  render?: "status" | "date" | "datetime" | "image" | "bool" | "faculty" | "ref" | "lpa";
  className?: string;
}

export interface TableFilter {
  name: string;
  label: string;
  options?: string[];
  optionsKey?: string;
}

export interface ResourceConfig {
  key: string; // API resource key
  label: string;
  singular: string;
  titleField: string;
  sections: Section[];
  columns: Column[];
  filters?: TableFilter[];
  excelEntity?: string;
  publicHref?: (item: Record<string, unknown>) => string;
  searchPlaceholder?: string;
}

const ACADEMIC_YEAR = { regex: /^\d{4}-\d{2}$/, message: "Use the format 2025-26" };
const BATCH = { regex: /^\d{4}-\d{4}$/, message: "Use the format 2023-2027" };

export const RESOURCES: ResourceConfig[] = [
  {
    key: "faculty",
    label: "Faculty",
    singular: "Faculty member",
    titleField: "name",
    excelEntity: "faculty",
    publicHref: (i) => facultyHref(String(i.slug)),
    searchPlaceholder: "Search name, designation, specialization",
    columns: [
      { field: "photo_url", label: "", render: "image", className: "w-14" },
      { field: "name", label: "Name" },
      { field: "designation", label: "Designation" },
      { field: "specialization", label: "Specialization" },
      { field: "status", label: "Status", render: "status" },
    ],
    sections: [
      {
        title: "Profile",
        fields: [
          { name: "name", label: "Full name", type: "text", required: true, max: 150, placeholder: "Dr. A. Kumar" },
          { name: "designation", label: "Designation", type: "text", required: true, max: 150, placeholder: "Associate Professor" },
          { name: "qualification", label: "Qualification", type: "text", max: 250, placeholder: "Ph.D., M.E." },
          { name: "specialization", label: "Specialization", type: "text", max: 250 },
          { name: "experience_years", label: "Experience (years)", type: "number", min: 0, max: 60 },
          { name: "display_order", label: "Display order", type: "number", min: 0, max: 10000, defaultValue: 100, help: "Lower numbers appear first (e.g. HOD = 1)." },
          { name: "email", label: "Email", type: "email" },
          { name: "show_email", label: "Show email on public profile", type: "checkbox", defaultValue: true },
          { name: "photo_url", label: "Profile photo", type: "image", folder: "faculty" },
          { name: "bio", label: "About / Bio", type: "textarea", wide: true },
          { name: "research_interests", label: "Research interests", type: "list", wide: true, help: "One per line (or comma-separated)." },
        ],
      },
      {
        title: "Academic record",
        description: "Leave blank anything that does not apply; empty sections are hidden on the website.",
        fields: [
          { name: "publications_summary", label: "Publications", type: "textarea", wide: true },
          { name: "patents_summary", label: "Patents", type: "textarea", wide: true },
          { name: "certifications", label: "Certifications", type: "textarea", wide: true },
          { name: "workshops", label: "Workshops / Conferences", type: "textarea", wide: true },
          { name: "fdps", label: "FDPs", type: "textarea", wide: true },
          { name: "awards", label: "Awards", type: "textarea", wide: true },
          { name: "projects_guided", label: "Projects guided", type: "textarea", wide: true },
        ],
      },
      {
        title: "Profiles & links",
        fields: [
          { name: "google_scholar_url", label: "Google Scholar URL", type: "url" },
          { name: "orcid_url", label: "ORCID URL", type: "url" },
          { name: "linkedin_url", label: "LinkedIn URL", type: "url" },
        ],
      },
    ],
  },
  {
    key: "students",
    label: "Students",
    singular: "Student",
    titleField: "name",
    excelEntity: "students",
    searchPlaceholder: "Search name, register no, email, skill",
    columns: [
      { field: "name", label: "Name" },
      { field: "register_no", label: "Register No" },
      { field: "batch", label: "Batch" },
      { field: "academic_year", label: "Year" },
      { field: "section", label: "Sec" },
      { field: "status", label: "Status", render: "status" },
    ],
    filters: [{ name: "academic_year", label: "Year", optionsKey: "student_years" }],
    sections: [
      {
        title: "Academic details",
        fields: [
          { name: "name", label: "Full name", type: "text", required: true, max: 150 },
          { name: "register_no", label: "Register number", type: "text", required: true, max: 50 },
          { name: "batch", label: "Batch", type: "text", required: true, pattern: BATCH, placeholder: "2023-2027" },
          { name: "academic_year", label: "Current year", type: "select", optionsKey: "student_years" },
          { name: "section", label: "Section", type: "text", max: 10 },
          { name: "skills", label: "Skills", type: "list", wide: true },
          { name: "interests", label: "Areas of interest", type: "list", wide: true },
          { name: "projects_summary", label: "Projects", type: "textarea", wide: true },
          { name: "achievements_summary", label: "Achievements", type: "textarea", wide: true },
          { name: "certifications", label: "Certifications", type: "textarea", wide: true },
        ],
      },
      {
        title: "Contact & privacy",
        description: "Contact details and photos are private unless you enable the matching switch.",
        fields: [
          { name: "photo_url", label: "Photo", type: "image", folder: "students" },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Phone (never shown publicly)", type: "text", max: 30 },
          { name: "linkedin_url", label: "LinkedIn URL", type: "url" },
          { name: "github_url", label: "GitHub URL", type: "url" },
          { name: "show_photo", label: "Show photo publicly", type: "checkbox" },
          { name: "show_contact", label: "Show email / LinkedIn / GitHub publicly", type: "checkbox" },
          { name: "show_register_no", label: "Show register number publicly", type: "checkbox" },
        ],
      },
    ],
  },
  {
    key: "faculty-achievements",
    label: "Faculty Achievements",
    singular: "Faculty achievement",
    titleField: "title",
    excelEntity: "faculty_achievements",
    columns: [
      { field: "title", label: "Title" },
      { field: "faculty", label: "Faculty", render: "ref" },
      { field: "category", label: "Category" },
      { field: "year", label: "Year" },
      { field: "status", label: "Status", render: "status" },
    ],
    filters: [{ name: "category", label: "Category", optionsKey: "faculty_achievement_categories" }],
    sections: [
      {
        title: "Achievement",
        fields: [
          { name: "faculty_id", label: "Faculty member", type: "faculty", required: true },
          { name: "category", label: "Category", type: "select", optionsKey: "faculty_achievement_categories", required: true },
          { name: "title", label: "Title", type: "text", required: true, max: 300, wide: true },
          { name: "description", label: "Description", type: "textarea", wide: true },
          { name: "date", label: "Date", type: "date" },
          { name: "year", label: "Year", type: "number", min: 1950, max: 2100, help: "Filled from the date if left blank." },
          { name: "organization", label: "Organization", type: "text", max: 250 },
          { name: "level", label: "Level", type: "select", optionsKey: "levels" },
          { name: "research_domain", label: "Research domain", type: "text", max: 150 },
        ],
      },
      {
        title: "Evidence",
        fields: [
          { name: "image_url", label: "Image", type: "image", folder: "achievements" },
          { name: "document_url", label: "Document (PDF)", type: "document", folder: "achievements" },
          { name: "external_url", label: "External link", type: "url" },
        ],
      },
    ],
  },
  {
    key: "student-achievements",
    label: "Student Achievements",
    singular: "Student achievement",
    titleField: "title",
    excelEntity: "student_achievements",
    columns: [
      { field: "title", label: "Title" },
      { field: "participants", label: "Student / Team" },
      { field: "category", label: "Category" },
      { field: "level", label: "Level" },
      { field: "year", label: "Year" },
      { field: "status", label: "Status", render: "status" },
    ],
    filters: [
      { name: "category", label: "Category", optionsKey: "student_achievement_categories" },
      { name: "level", label: "Level", optionsKey: "levels" },
    ],
    sections: [
      {
        title: "Who",
        fields: [
          { name: "participants", label: "Student(s) / team members", type: "text", required: true, max: 500, wide: true, placeholder: "Priya M, Karthik S" },
          { name: "team_name", label: "Team name", type: "text", max: 150 },
          { name: "batch", label: "Batch", type: "text", pattern: BATCH, placeholder: "2022-2026" },
          { name: "student_id", label: "Link to student record (optional)", type: "student" },
        ],
      },
      {
        title: "Achievement",
        fields: [
          { name: "title", label: "Achievement title", type: "text", required: true, max: 300, wide: true },
          { name: "category", label: "Category", type: "select", optionsKey: "student_achievement_categories", required: true },
          { name: "level", label: "Level", type: "select", optionsKey: "levels", required: true },
          { name: "event_name", label: "Event", type: "text", max: 250 },
          { name: "organizer", label: "Organizer", type: "text", max: 250 },
          { name: "position", label: "Position / prize", type: "text", max: 100, placeholder: "Winner, 1st prize, ₹50,000" },
          { name: "date", label: "Date", type: "date" },
          { name: "year", label: "Year", type: "number", min: 1950, max: 2100, help: "Filled from the date if left blank." },
          { name: "description", label: "Description", type: "textarea", wide: true },
        ],
      },
      {
        title: "Evidence",
        fields: [
          { name: "image_url", label: "Photo", type: "image", folder: "achievements" },
          { name: "certificate_url", label: "Certificate (image link or PDF)", type: "document", folder: "achievements" },
          { name: "external_url", label: "External link", type: "url" },
        ],
      },
    ],
  },
  {
    key: "events",
    label: "Events",
    singular: "Event",
    titleField: "title",
    excelEntity: "events",
    publicHref: (i) => `/events/${i.slug}`,
    columns: [
      { field: "title", label: "Title" },
      { field: "event_type", label: "Type" },
      { field: "start_at", label: "Starts", render: "datetime" },
      { field: "event_status", label: "Event status" },
      { field: "status", label: "Status", render: "status" },
    ],
    filters: [
      { name: "event_type", label: "Type", optionsKey: "event_types" },
      { name: "event_status", label: "Event status", optionsKey: "event_statuses" },
    ],
    sections: [
      {
        title: "Event details",
        fields: [
          { name: "title", label: "Event name", type: "text", required: true, max: 250, wide: true },
          { name: "event_type", label: "Type", type: "select", optionsKey: "event_types", required: true },
          { name: "event_status", label: "Event status", type: "select", optionsKey: "event_statuses", required: true, defaultValue: "UPCOMING" },
          { name: "start_at", label: "Starts", type: "datetime", required: true },
          { name: "end_at", label: "Ends", type: "datetime" },
          { name: "venue", label: "Venue", type: "text", max: 250 },
          { name: "speaker", label: "Speaker", type: "text", max: 250 },
          { name: "organizer", label: "Organizer", type: "text", max: 250 },
          { name: "contact_info", label: "Contact information", type: "text", max: 300 },
          { name: "registration_url", label: "Registration link", type: "url" },
          { name: "is_featured", label: "Feature on the home page", type: "checkbox" },
          { name: "description", label: "Description", type: "textarea", wide: true },
          { name: "poster_url", label: "Poster", type: "image", folder: "events" },
        ],
      },
    ],
  },
  {
    key: "opportunities",
    label: "Opportunities",
    singular: "Opportunity",
    titleField: "title",
    excelEntity: "opportunities",
    columns: [
      { field: "title", label: "Title" },
      { field: "category", label: "Category" },
      { field: "state", label: "State" },
      { field: "registration_deadline", label: "Deadline", render: "date" },
      { field: "last_verified_at", label: "Verified", render: "date" },
      { field: "status", label: "Status", render: "status" },
    ],
    filters: [
      { name: "category", label: "Category", optionsKey: "opportunity_categories" },
      { name: "mode", label: "Mode", optionsKey: "modes" },
      { name: "registration", label: "Registration", optionsKey: "registration_statuses" },
    ],
    sections: [
      {
        title: "Opportunity",
        fields: [
          { name: "title", label: "Event / opportunity name", type: "text", required: true, max: 250, wide: true },
          { name: "category", label: "Category", type: "select", optionsKey: "opportunity_categories", required: true },
          { name: "mode", label: "Mode", type: "select", optionsKey: "modes", required: true },
          { name: "organizer", label: "Organizer", type: "text", required: true, max: 250 },
          { name: "institution", label: "College / organization", type: "text", max: 250 },
          { name: "city", label: "City", type: "text", max: 100 },
          { name: "state", label: "State", type: "text", max: 100 },
          { name: "country", label: "Country", type: "text", max: 100, defaultValue: "India", required: true },
          { name: "start_date", label: "Start date", type: "date" },
          { name: "end_date", label: "End date", type: "date" },
          { name: "registration_deadline", label: "Registration deadline", type: "date" },
          { name: "eligibility", label: "Eligibility", type: "text", max: 300 },
          { name: "team_size", label: "Team size", type: "text", max: 50, placeholder: "1–4" },
          { name: "prize_info", label: "Prizes", type: "text", max: 500 },
          { name: "contact_info", label: "Contact", type: "text", max: 300 },
          { name: "description", label: "Description", type: "textarea", wide: true },
          { name: "poster_url", label: "Poster", type: "image", folder: "opportunities" },
        ],
      },
      {
        title: "Verification",
        description: "Only publish opportunities you have checked against the official source.",
        fields: [
          { name: "registration_url", label: "Official registration URL", type: "url", required: true },
          { name: "website_url", label: "Official website", type: "url" },
          { name: "source_url", label: "Source URL (where you verified it)", type: "url", required: true },
          { name: "last_verified_at", label: "Last verified on", type: "date", required: true, defaultValue: "today" },
        ],
      },
    ],
  },
  {
    key: "placement-years",
    label: "Placement Statistics",
    singular: "Placement year",
    titleField: "academic_year",
    columns: [
      { field: "academic_year", label: "Academic year" },
      { field: "students_placed", label: "Placed" },
      { field: "eligible_students", label: "Eligible" },
      { field: "highest_package_lpa", label: "Highest", render: "lpa" },
      { field: "status", label: "Status", render: "status" },
    ],
    sections: [
      {
        title: "Year-wise statistics",
        fields: [
          { name: "academic_year", label: "Academic year", type: "text", required: true, pattern: ACADEMIC_YEAR, placeholder: "2025-26" },
          { name: "companies_visited", label: "Companies visited", type: "number", min: 0 },
          { name: "eligible_students", label: "Eligible students", type: "number", min: 0 },
          { name: "students_placed", label: "Students placed", type: "number", min: 0 },
          { name: "highest_package_lpa", label: "Highest package (LPA)", type: "number", min: 0, step: 0.1 },
          { name: "average_package_lpa", label: "Average package (LPA)", type: "number", min: 0, step: 0.1 },
          { name: "publish_average", label: "Show average package publicly", type: "checkbox" },
          { name: "summary", label: "Summary / highlights", type: "textarea", wide: true },
        ],
      },
    ],
  },
  {
    key: "placements",
    label: "Placement Records",
    singular: "Placement",
    titleField: "student_name",
    excelEntity: "placements",
    columns: [
      { field: "student_name", label: "Student" },
      { field: "company", label: "Company" },
      { field: "package_lpa", label: "Package", render: "lpa" },
      { field: "academic_year", label: "Year" },
      { field: "status", label: "Status", render: "status" },
    ],
    sections: [
      {
        title: "Offer",
        fields: [
          { name: "student_name", label: "Student name", type: "text", required: true, max: 150 },
          { name: "student_id", label: "Link to student record (optional)", type: "student" },
          { name: "company", label: "Company", type: "text", required: true, max: 200 },
          { name: "role", label: "Role", type: "text", max: 150 },
          { name: "package_lpa", label: "Package (LPA)", type: "number", min: 0, step: 0.1 },
          { name: "offer_type", label: "Offer type", type: "text", max: 30, placeholder: "Full-time / Internship + PPO" },
          { name: "academic_year", label: "Academic year", type: "text", required: true, pattern: ACADEMIC_YEAR, placeholder: "2025-26" },
        ],
      },
    ],
  },
  {
    key: "recruiters",
    label: "Recruiters",
    singular: "Recruiter",
    titleField: "name",
    columns: [
      { field: "logo_url", label: "", render: "image", className: "w-14" },
      { field: "name", label: "Company" },
      { field: "status", label: "Status", render: "status" },
    ],
    sections: [
      {
        title: "Recruiter",
        fields: [
          { name: "name", label: "Company name", type: "text", required: true, max: 200 },
          { name: "website_url", label: "Website", type: "url" },
          { name: "display_order", label: "Display order", type: "number", min: 0, max: 10000, defaultValue: 100 },
          { name: "logo_url", label: "Logo", type: "image", folder: "recruiters" },
        ],
      },
    ],
  },
  {
    key: "internships",
    label: "Internships",
    singular: "Internship",
    titleField: "company",
    columns: [
      { field: "company", label: "Company" },
      { field: "role", label: "Role" },
      { field: "kind", label: "Type" },
      { field: "deadline", label: "Deadline", render: "date" },
      { field: "status", label: "Status", render: "status" },
    ],
    filters: [{ name: "kind", label: "Type", optionsKey: "internship_kinds" }],
    sections: [
      {
        title: "Internship",
        fields: [
          { name: "kind", label: "Type", type: "select", optionsKey: "internship_kinds", required: true, defaultValue: "OPENING", help: "OPENING = vacancy for students; STUDENT = internship done by a student." },
          { name: "company", label: "Company", type: "text", required: true, max: 200 },
          { name: "role", label: "Role", type: "text", required: true, max: 150 },
          { name: "duration", label: "Duration", type: "text", max: 60, placeholder: "8 weeks" },
          { name: "location", label: "Location", type: "text", max: 150 },
          { name: "mode", label: "Mode", type: "select", optionsKey: "modes" },
          { name: "eligibility", label: "Eligibility", type: "text", max: 300 },
          { name: "deadline", label: "Application deadline", type: "date" },
          { name: "stipend", label: "Stipend", type: "text", max: 100 },
          { name: "apply_url", label: "Application URL", type: "url" },
          { name: "student_name", label: "Student name (for student internships)", type: "text", max: 150 },
          { name: "academic_year", label: "Academic year", type: "text", pattern: ACADEMIC_YEAR, placeholder: "2025-26" },
          { name: "description", label: "Description", type: "textarea", wide: true },
        ],
      },
    ],
  },
  {
    key: "publications",
    label: "Publications",
    singular: "Publication",
    titleField: "title",
    excelEntity: "publications",
    columns: [
      { field: "title", label: "Title" },
      { field: "authors", label: "Authors" },
      { field: "pub_type", label: "Type" },
      { field: "year", label: "Year" },
      { field: "status", label: "Status", render: "status" },
    ],
    filters: [{ name: "pub_type", label: "Type", optionsKey: "publication_types" }],
    sections: [
      {
        title: "Publication",
        fields: [
          { name: "title", label: "Title", type: "text", required: true, max: 400, wide: true },
          { name: "authors", label: "Authors", type: "text", required: true, max: 600, wide: true },
          { name: "faculty_id", label: "Faculty author", type: "faculty" },
          { name: "is_student_publication", label: "Student publication", type: "checkbox" },
          { name: "pub_type", label: "Type", type: "select", optionsKey: "publication_types", required: true },
          { name: "year", label: "Year", type: "number", required: true, min: 1950, max: 2100 },
          { name: "venue", label: "Journal / conference", type: "text", max: 300 },
          { name: "indexing", label: "Indexing", type: "text", max: 100, placeholder: "Scopus, SCI, Web of Science" },
          { name: "domain", label: "Research domain", type: "text", max: 150 },
          { name: "doi", label: "DOI", type: "text", max: 200 },
          { name: "url", label: "Link", type: "url" },
        ],
      },
    ],
  },
  {
    key: "patents",
    label: "Patents",
    singular: "Patent",
    titleField: "title",
    columns: [
      { field: "title", label: "Title" },
      { field: "inventors", label: "Inventors" },
      { field: "patent_status", label: "Patent status" },
      { field: "year", label: "Year" },
      { field: "status", label: "Status", render: "status" },
    ],
    sections: [
      {
        title: "Patent",
        fields: [
          { name: "title", label: "Title", type: "text", required: true, max: 400, wide: true },
          { name: "inventors", label: "Inventors", type: "text", required: true, max: 600, wide: true },
          { name: "faculty_id", label: "Faculty inventor", type: "faculty" },
          { name: "patent_status", label: "Patent status", type: "select", optionsKey: "patent_statuses", required: true },
          { name: "application_no", label: "Application number", type: "text", max: 100 },
          { name: "patent_no", label: "Patent number", type: "text", max: 100 },
          { name: "filed_date", label: "Filed on", type: "date" },
          { name: "granted_date", label: "Granted on", type: "date" },
          { name: "year", label: "Year", type: "number", required: true, min: 1950, max: 2100 },
          { name: "domain", label: "Domain", type: "text", max: 150 },
          { name: "url", label: "Link", type: "url" },
        ],
      },
    ],
  },
  {
    key: "research-projects",
    label: "Research Projects",
    singular: "Research project",
    titleField: "title",
    columns: [
      { field: "title", label: "Title" },
      { field: "pi_faculty", label: "PI", render: "ref" },
      { field: "funding_agency", label: "Funding" },
      { field: "project_status", label: "Project status" },
      { field: "status", label: "Status", render: "status" },
    ],
    sections: [
      {
        title: "Project",
        fields: [
          { name: "title", label: "Title", type: "text", required: true, max: 400, wide: true },
          { name: "pi_faculty_id", label: "Principal investigator", type: "faculty" },
          { name: "investigators", label: "Co-investigators", type: "text", max: 500 },
          { name: "funding_agency", label: "Funding agency", type: "text", max: 250 },
          { name: "amount_lakhs", label: "Amount (₹ lakhs)", type: "number", min: 0, step: 0.01 },
          { name: "project_status", label: "Project status", type: "select", optionsKey: "project_statuses", required: true },
          { name: "year", label: "Year (sanctioned)", type: "number", required: true, min: 1950, max: 2100 },
          { name: "start_date", label: "Start date", type: "date" },
          { name: "end_date", label: "End date", type: "date" },
          { name: "domain", label: "Domain", type: "text", max: 150 },
          { name: "collaboration_partner", label: "Collaboration partner", type: "text", max: 250 },
          { name: "is_industry_collaboration", label: "Industry collaboration", type: "checkbox" },
          { name: "description", label: "Description", type: "textarea", wide: true },
        ],
      },
    ],
  },
  {
    key: "laboratories",
    label: "Laboratories",
    singular: "Laboratory",
    titleField: "name",
    publicHref: (i) => `/laboratories#${i.slug}`,
    columns: [
      { field: "image_url", label: "", render: "image", className: "w-14" },
      { field: "name", label: "Name" },
      { field: "incharge_faculty", label: "In-charge", render: "ref" },
      { field: "is_research_lab", label: "Research lab", render: "bool" },
      { field: "status", label: "Status", render: "status" },
    ],
    sections: [
      {
        title: "Laboratory",
        fields: [
          { name: "name", label: "Lab name", type: "text", required: true, max: 200 },
          { name: "incharge_faculty_id", label: "Faculty in-charge", type: "faculty" },
          { name: "display_order", label: "Display order", type: "number", min: 0, max: 10000, defaultValue: 100 },
          { name: "is_research_lab", label: "This is a research lab", type: "checkbox" },
          { name: "description", label: "Description", type: "textarea", wide: true },
          { name: "equipment", label: "Equipment", type: "list", wide: true },
          { name: "software", label: "Software / tools", type: "list", wide: true },
          { name: "courses", label: "Courses supported", type: "list", wide: true },
          { name: "research_domains", label: "Research domains", type: "list", wide: true },
          { name: "student_projects", label: "Student projects", type: "textarea", wide: true },
          { name: "image_url", label: "Lab photo", type: "image", folder: "laboratories" },
        ],
      },
    ],
  },
  {
    key: "projects",
    label: "Projects",
    singular: "Project",
    titleField: "title",
    excelEntity: "projects",
    columns: [
      { field: "title", label: "Title" },
      { field: "students", label: "Students" },
      { field: "domain", label: "Domain" },
      { field: "academic_year", label: "Year" },
      { field: "status", label: "Status", render: "status" },
    ],
    sections: [
      {
        title: "Project",
        fields: [
          { name: "title", label: "Project title", type: "text", required: true, max: 300, wide: true },
          { name: "students", label: "Students", type: "text", required: true, max: 500, wide: true },
          { name: "guide_faculty_id", label: "Faculty guide", type: "faculty" },
          { name: "academic_year", label: "Academic year", type: "text", required: true, pattern: ACADEMIC_YEAR, placeholder: "2025-26" },
          { name: "domain", label: "Domain", type: "text", max: 150 },
          { name: "is_featured", label: "Featured project", type: "checkbox" },
          { name: "technologies", label: "Technologies", type: "list", wide: true },
          { name: "description", label: "Description", type: "textarea", wide: true },
          { name: "github_url", label: "GitHub URL", type: "url" },
          { name: "demo_url", label: "Demo URL", type: "url" },
          { name: "publication", label: "Publication", type: "text", max: 500, wide: true },
          { name: "image_urls", label: "Images", type: "images", folder: "projects", wide: true },
        ],
      },
    ],
  },
  {
    key: "alumni",
    label: "Alumni",
    singular: "Alumnus",
    titleField: "name",
    excelEntity: "alumni",
    columns: [
      { field: "name", label: "Name" },
      { field: "graduation_year", label: "Graduated" },
      { field: "organization", label: "Organization" },
      { field: "designation", label: "Designation" },
      { field: "status", label: "Status", render: "status" },
    ],
    sections: [
      {
        title: "Alumnus",
        fields: [
          { name: "name", label: "Name", type: "text", required: true, max: 150 },
          { name: "graduation_year", label: "Graduation year", type: "number", required: true, min: 1950, max: 2100 },
          { name: "batch", label: "Batch", type: "text", pattern: BATCH, placeholder: "2016-2020" },
          { name: "organization", label: "Current organization", type: "text", max: 200 },
          { name: "designation", label: "Designation", type: "text", max: 150 },
          { name: "higher_studies", label: "Higher studies", type: "text", max: 300 },
          { name: "linkedin_url", label: "LinkedIn URL", type: "url" },
          { name: "photo_url", label: "Photo", type: "image", folder: "alumni" },
          { name: "achievements", label: "Achievements", type: "textarea", wide: true },
          { name: "testimonial", label: "Testimonial", type: "textarea", wide: true },
          { name: "events_participated", label: "Alumni events participated", type: "textarea", wide: true },
        ],
      },
    ],
  },
  {
    key: "news",
    label: "News",
    singular: "News article",
    titleField: "title",
    publicHref: (i) => `/news/${i.slug}`,
    columns: [
      { field: "title", label: "Title" },
      { field: "category", label: "Category" },
      { field: "published_on", label: "Date", render: "date" },
      { field: "status", label: "Status", render: "status" },
    ],
    filters: [{ name: "category", label: "Category", optionsKey: "news_categories" }],
    sections: [
      {
        title: "Article",
        fields: [
          { name: "title", label: "Title", type: "text", required: true, max: 300, wide: true },
          { name: "category", label: "Category", type: "select", optionsKey: "news_categories", required: true },
          { name: "published_on", label: "Date", type: "date", required: true, defaultValue: "today" },
          { name: "author", label: "Author", type: "text", max: 150 },
          { name: "is_featured", label: "Feature on the home page", type: "checkbox" },
          { name: "summary", label: "Summary", type: "textarea", required: true, max: 600, wide: true, help: "Shown on cards and in search results." },
          { name: "content", label: "Full content", type: "markdown", wide: true, help: "Supports Markdown: **bold**, ## headings, - lists, [links](https://…)." },
          { name: "cover_image_url", label: "Cover image", type: "image", folder: "news" },
          { name: "external_url", label: "External link", type: "url" },
          { name: "image_urls", label: "Photo gallery", type: "images", folder: "news", wide: true },
        ],
      },
    ],
  },
  {
    key: "gallery",
    label: "Gallery",
    singular: "Album",
    titleField: "title",
    publicHref: (i) => `/gallery/${i.slug}`,
    columns: [
      { field: "cover_image_url", label: "", render: "image", className: "w-14" },
      { field: "title", label: "Album" },
      { field: "category", label: "Category" },
      { field: "event_date", label: "Date", render: "date" },
      { field: "status", label: "Status", render: "status" },
    ],
    filters: [{ name: "category", label: "Category", optionsKey: "gallery_categories" }],
    sections: [
      {
        title: "Album",
        description: "Save the album first, then add photos below.",
        fields: [
          { name: "title", label: "Album title", type: "text", required: true, max: 200 },
          { name: "category", label: "Category", type: "select", optionsKey: "gallery_categories", help: "Decides which gallery tab the album appears under." },
          { name: "event_date", label: "Event date", type: "date" },
          { name: "description", label: "Description", type: "textarea", wide: true },
          { name: "cover_image_url", label: "Cover image (optional, defaults to first photo)", type: "image", folder: "gallery" },
        ],
      },
    ],
  },
  {
    key: "mous",
    label: "MOUs",
    singular: "MOU",
    titleField: "organization",
    publicHref: () => "/#mous",
    searchPlaceholder: "Search organization or purpose",
    columns: [
      { field: "logo_url", label: "", render: "image", className: "w-14" },
      { field: "organization", label: "Organization" },
      { field: "signed_on", label: "Signed", render: "date" },
      { field: "valid_until", label: "Valid until", render: "date" },
      { field: "status", label: "Status", render: "status" },
    ],
    sections: [
      {
        title: "MOU",
        description: "Memoranda of understanding with industry, academic and research partners (shown on the home page).",
        fields: [
          { name: "organization", label: "Partner organization", type: "text", required: true, max: 250 },
          { name: "display_order", label: "Display order", type: "number", min: 0, max: 10000, defaultValue: 100 },
          { name: "signed_on", label: "Date signed", type: "date" },
          { name: "valid_until", label: "Valid until", type: "date" },
          { name: "purpose", label: "Purpose / scope", type: "textarea", wide: true },
          { name: "website_url", label: "Partner website", type: "url" },
          { name: "logo_url", label: "Partner logo", type: "image", folder: "mous" },
          { name: "document_url", label: "MOU document (PDF)", type: "document", folder: "mous" },
        ],
      },
    ],
  },
  {
    key: "highlights",
    label: "Home Highlights",
    singular: "Highlight",
    titleField: "title",
    columns: [
      { field: "title", label: "Title" },
      { field: "display_order", label: "Order" },
      { field: "status", label: "Status", render: "status" },
    ],
    sections: [
      {
        title: "Highlight",
        description: "Featured items shown on the home page (e.g. accreditation, rankings, MoUs).",
        fields: [
          { name: "title", label: "Title", type: "text", required: true, max: 200 },
          { name: "display_order", label: "Display order", type: "number", min: 0, max: 10000, defaultValue: 0 },
          { name: "description", label: "Description", type: "textarea", wide: true },
          { name: "link_url", label: "Link", type: "url" },
          { name: "image_url", label: "Image", type: "image", folder: "highlights" },
        ],
      },
    ],
  },
  {
    key: "videos",
    label: "Videos",
    singular: "Video",
    titleField: "title",
    publicHref: () => "/gallery?tab=videos",
    columns: [
      { field: "title", label: "Title" },
      { field: "category", label: "Category" },
      { field: "event_date", label: "Date", render: "date" },
      { field: "status", label: "Status", render: "status" },
    ],
    filters: [{ name: "category", label: "Category", optionsKey: "gallery_categories" }],
    sections: [
      {
        title: "Video",
        fields: [
          { name: "title", label: "Title", type: "text", required: true, max: 250 },
          { name: "video_url", label: "Video link", type: "url", required: true, help: "YouTube links play on the website; other links open in a new tab." },
          { name: "category", label: "Category", type: "select", optionsKey: "gallery_categories" },
          { name: "event_date", label: "Date", type: "date" },
          { name: "description", label: "Description", type: "textarea", wide: true },
        ],
      },
    ],
  },
  {
    key: "programs",
    label: "Programs",
    singular: "Program",
    titleField: "name",
    publicHref: () => "/academics#programs",
    columns: [
      { field: "name", label: "Program" },
      { field: "level", label: "Level" },
      { field: "intake", label: "Intake" },
      { field: "status", label: "Status", render: "status" },
    ],
    filters: [{ name: "level", label: "Level", optionsKey: "program_levels" }],
    sections: [
      {
        title: "Program",
        fields: [
          { name: "name", label: "Program name", type: "text", required: true, max: 200, placeholder: "B.E. Computer Science and Engineering (AI & ML)" },
          { name: "level", label: "Level", type: "select", optionsKey: "program_levels", required: true },
          { name: "duration", label: "Duration", type: "text", max: 50, placeholder: "4 years" },
          { name: "intake", label: "Annual intake", type: "number", min: 0, max: 10000 },
          { name: "display_order", label: "Display order", type: "number", min: 0, max: 10000, defaultValue: 100 },
          { name: "description", label: "Description", type: "textarea", wide: true },
        ],
      },
    ],
  },
  {
    key: "academic-documents",
    label: "Academic Documents",
    singular: "Document",
    titleField: "title",
    publicHref: () => "/academics#documents",
    columns: [
      { field: "title", label: "Title" },
      { field: "category", label: "Category" },
      { field: "academic_year", label: "Year" },
      { field: "status", label: "Status", render: "status" },
    ],
    filters: [{ name: "category", label: "Category", optionsKey: "academic_document_categories" }],
    sections: [
      {
        title: "Document",
        description: "Curriculum, regulations, academic calendar, timetables and other downloads. Upload a PDF or give a link.",
        fields: [
          { name: "title", label: "Title", type: "text", required: true, max: 250 },
          { name: "category", label: "Category", type: "select", optionsKey: "academic_document_categories", required: true },
          { name: "program", label: "Program", type: "text", max: 200, help: "Optional, e.g. B.E. CSE (AI & ML)" },
          { name: "regulation", label: "Regulation", type: "text", max: 50, placeholder: "R2024" },
          { name: "academic_year", label: "Academic year", type: "text", pattern: ACADEMIC_YEAR, placeholder: "2025-26" },
          { name: "display_order", label: "Display order", type: "number", min: 0, max: 10000, defaultValue: 100 },
          { name: "file_url", label: "PDF file", type: "document", folder: "academics" },
          { name: "external_url", label: "Or link", type: "url" },
          { name: "description", label: "Description", type: "textarea", wide: true },
        ],
      },
    ],
  },
];

export const RESOURCE_MAP: Record<string, ResourceConfig> = Object.fromEntries(RESOURCES.map((r) => [r.key, r]));

export function allFields(cfg: ResourceConfig): FieldDef[] {
  return cfg.sections.flatMap((s) => s.fields);
}
