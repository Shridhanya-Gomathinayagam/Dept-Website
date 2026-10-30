// Types mirroring the FastAPI schemas (backend/app/schemas/modules.py).

export type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface Meta {
  id: number;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface Ref {
  id: number;
  name: string;
}
export interface FacultyRef extends Ref {
  slug: string;
}

export interface LinkItem {
  label: string;
  url: string;
}

export interface Department {
  id: number;
  name: string;
  short_name: string | null;
  college_name: string | null;
  college_logo_url: string | null;
  hero_image_url: string | null;
  tagline: string | null;
  intro: string | null;
  overview: string | null;
  vision: string | null;
  mission: string[];
  peos: string[];
  pos: string[];
  psos: string[];
  objectives: string[];
  year_established: number | null;
  accreditation: string | null;
  recognition: string | null;
  facilities: string[];
  hod_name: string | null;
  hod_designation: string | null;
  hod_photo_url: string | null;
  hod_message: string | null;
  address: string | null;
  college_address: string | null;
  email: string | null;
  phone: string | null;
  map_embed_url: string | null;
  college_website: string | null;
  social_links: LinkItem[];
  important_links: LinkItem[];
  updated_at: string;
}

export interface Highlight extends Meta {
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  display_order: number;
}

export interface FacultyListItem {
  id: number;
  slug: string;
  name: string;
  designation: string;
  qualification: string | null;
  specialization: string | null;
  photo_url: string | null;
  research_interests: string[];
}

export interface Faculty extends Meta, FacultyListItem {
  experience_years: number | null;
  email: string | null;
  show_email: boolean;
  bio: string | null;
  publications_summary: string | null;
  patents_summary: string | null;
  certifications: string | null;
  workshops: string | null;
  fdps: string | null;
  awards: string | null;
  projects_guided: string | null;
  google_scholar_url: string | null;
  orcid_url: string | null;
  linkedin_url: string | null;
  display_order: number;
}

export interface StudentPublic {
  id: number;
  name: string;
  batch: string;
  academic_year: string | null;
  section: string | null;
  skills: string[];
  interests: string[];
  projects_summary: string | null;
  achievements_summary: string | null;
  certifications: string | null;
  photo_url: string | null;
  register_no: string | null;
  email: string | null;
  linkedin_url: string | null;
  github_url: string | null;
}

export interface FacultyAchievement extends Meta {
  faculty_id: number;
  faculty: FacultyRef | null;
  title: string;
  description: string | null;
  category: string;
  date: string | null;
  year: number;
  organization: string | null;
  level: string | null;
  research_domain: string | null;
  image_url: string | null;
  document_url: string | null;
  external_url: string | null;
}

export interface StudentAchievement extends Meta {
  student_id: number | null;
  student: Ref | null;
  participants: string;
  team_name: string | null;
  batch: string | null;
  title: string;
  event_name: string | null;
  organizer: string | null;
  position: string | null;
  date: string | null;
  year: number;
  category: string;
  level: string;
  description: string | null;
  image_url: string | null;
  certificate_url: string | null;
  external_url: string | null;
}

export interface EventItem extends Meta {
  slug: string;
  title: string;
  event_type: string;
  start_at: string;
  end_at: string | null;
  venue: string | null;
  speaker: string | null;
  organizer: string | null;
  description: string | null;
  poster_url: string | null;
  registration_url: string | null;
  contact_info: string | null;
  event_status: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";
  is_featured: boolean;
}

export interface Opportunity extends Meta {
  title: string;
  organizer: string;
  institution: string | null;
  city: string | null;
  state: string | null;
  country: string;
  mode: "ONLINE" | "OFFLINE" | "HYBRID";
  category: string;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
  eligibility: string | null;
  team_size: string | null;
  description: string | null;
  prize_info: string | null;
  registration_url: string;
  website_url: string | null;
  source_url: string;
  source: string;
  last_verified_at: string;
  poster_url: string | null;
  contact_info: string | null;
  registration_status: "OPEN" | "CLOSING_SOON" | "CLOSED";
}

export interface PlacementYear extends Meta {
  academic_year: string;
  eligible_students: number | null;
  students_placed: number | null;
  highest_package_lpa: number | null;
  average_package_lpa: number | null;
  publish_average: boolean;
  companies_visited: number | null;
  summary: string | null;
  placement_percentage: number | null;
}

export interface Placement extends Meta {
  academic_year: string;
  student_name: string;
  company: string;
  role: string | null;
  package_lpa: number | null;
  offer_type: string | null;
}

export interface Recruiter extends Meta {
  name: string;
  logo_url: string | null;
  website_url: string | null;
}

export interface PlacementSummary {
  years: PlacementYear[];
  companies: { company: string; offers: number; highest_package_lpa: number | null }[];
  recruiters: Recruiter[];
}

export interface Internship extends Meta {
  kind: "OPENING" | "STUDENT";
  company: string;
  role: string;
  duration: string | null;
  location: string | null;
  mode: string | null;
  eligibility: string | null;
  deadline: string | null;
  stipend: string | null;
  description: string | null;
  apply_url: string | null;
  student_name: string | null;
  academic_year: string | null;
}

export interface Publication extends Meta {
  title: string;
  authors: string;
  faculty: FacultyRef | null;
  is_student_publication: boolean;
  pub_type: string;
  venue: string | null;
  year: number;
  doi: string | null;
  url: string | null;
  domain: string | null;
  indexing: string | null;
}

export interface Patent extends Meta {
  title: string;
  inventors: string;
  faculty: FacultyRef | null;
  application_no: string | null;
  patent_no: string | null;
  patent_status: string;
  filed_date: string | null;
  granted_date: string | null;
  year: number;
  domain: string | null;
  url: string | null;
}

export interface ResearchProject extends Meta {
  title: string;
  pi_faculty: FacultyRef | null;
  investigators: string | null;
  funding_agency: string | null;
  amount_lakhs: number | null;
  start_date: string | null;
  end_date: string | null;
  year: number;
  project_status: string;
  domain: string | null;
  collaboration_partner: string | null;
  is_industry_collaboration: boolean;
  description: string | null;
}

export interface Laboratory extends Meta {
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  equipment: string[];
  software: string[];
  incharge_faculty: FacultyRef | null;
  courses: string[];
  student_projects: string | null;
  is_research_lab: boolean;
  research_domains: string[];
}

export interface ResearchSummary {
  publications_by_type: Record<string, number>;
  publications: number;
  student_publications: number;
  patents: number;
  projects_by_status: Record<string, number>;
  industry_collaborations: number;
  domains: string[];
  research_labs: Laboratory[];
  faculty: FacultyRef[];
}

export interface Project extends Meta {
  title: string;
  description: string | null;
  students: string;
  guide_faculty: FacultyRef | null;
  domain: string | null;
  technologies: string[];
  academic_year: string;
  github_url: string | null;
  demo_url: string | null;
  publication: string | null;
  image_urls: string[];
  is_featured: boolean;
}

export interface Alumnus extends Meta {
  name: string;
  batch: string | null;
  graduation_year: number;
  organization: string | null;
  designation: string | null;
  higher_studies: string | null;
  achievements: string | null;
  testimonial: string | null;
  events_participated: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
}

export interface NewsListItem {
  id: number;
  slug: string;
  title: string;
  summary: string;
  cover_image_url: string | null;
  published_on: string;
  category: string;
  author: string | null;
}

export interface News extends Meta, NewsListItem {
  content: string | null;
  image_urls: string[];
  external_url: string | null;
}

export interface GalleryAlbumListItem {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  event_date: string | null;
  category: string | null;
  image_count: number;
}

export interface Video extends Meta {
  title: string;
  video_url: string;
  description: string | null;
  category: string | null;
  event_date: string | null;
}

export interface Program extends Meta {
  name: string;
  level: "UG" | "PG" | "PhD";
  duration: string | null;
  intake: number | null;
  description: string | null;
}

export interface AcademicDocument extends Meta {
  title: string;
  category: string;
  program: string | null;
  regulation: string | null;
  academic_year: string | null;
  description: string | null;
  file_url: string | null;
  external_url: string | null;
}

export interface GalleryImage {
  id: number;
  image_url: string;
  caption: string | null;
  display_order: number;
}

export interface GalleryAlbum extends Meta {
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  event_date: string | null;
  images: GalleryImage[];
}

export interface Stats {
  faculty: number;
  students: number;
  publications: number;
  patents: number;
  placements: number;
  achievements: number;
  projects: number;
  alumni: number;
  laboratories: number;
}

export interface HomeData {
  department: Department | null;
  stats: Stats;
  upcoming_events: EventItem[];
  student_achievements: StudentAchievement[];
  faculty_achievements: FacultyAchievement[];
  highlights: Highlight[];
  news: NewsListItem[];
  placement_rate: number | null;
}

export interface SearchResults {
  query: string;
  groups: {
    key: string;
    label: string;
    total: number;
    items: { id: number; slug: string | null; title: string; subtitle: string }[];
  }[];
}

export type Facets = Record<string, (string | number)[]>;
export type Options = Record<string, string[]>;

export interface Mou extends Meta {
  organization: string;
  logo_url: string | null;
  signed_on: string | null;
  valid_until: string | null;
  purpose: string | null;
  website_url: string | null;
  document_url: string | null;
}
