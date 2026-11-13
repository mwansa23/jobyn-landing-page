/**
 * Candidate profile service backed by GET /api/v1/resume/profile/{candidate_id}.
 * Maps the backend response onto the shape the existing Profile page renders,
 * with safe fallbacks so every section keeps rendering when fields are missing.
 */
import { apiRequest } from "./api";
import { getStoredResumeResult } from "./resume";

export type CandidateProfile = {
  name: string;
  headline: string;
  location: string;
  email: string;
  phone: string;
  summary: string;
  completion: { score: number; sections: { label: string; done: boolean }[] };
  skills: { name: string; level: string }[];
  experience: {
    role: string;
    company: string;
    location: string;
    period: string;
    bullets: string[];
  }[];
  education: { degree: string; school: string; period: string; detail: string }[];
  recommendedRoles: { title: string; match: number }[];
};

type Raw = Record<string, unknown>;

function obj(value: unknown): Raw | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : null;
}

function pick(source: Raw | null, ...keys: string[]): unknown {
  if (!source) return undefined;
  for (const key of keys) {
    const v = source[key];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Reads the user ID required by the candidate-profile endpoint from the upload response. */
export function getCandidateId(): string | null {
  const result = getStoredResumeResult<Raw>();
  const candidate =
    pick(result, "user_id", "candidate_id", "candidateId") ??
    pick(obj(result?.["candidate"]), "user_id", "candidate_id");
  return candidate === undefined ? null : String(candidate);
}

function mapSkills(value: unknown): { name: string; level: string }[] {
  return arr(value)
    .map((s) => {
      if (typeof s === "string") return { name: s, level: "" };
      const o = obj(s);
      if (!o) return null;
      const name = str(pick(o, "name", "skill", "title"));
      return name ? { name, level: str(pick(o, "level", "proficiency", "category")) } : null;
    })
    .filter((s): s is { name: string; level: string } => Boolean(s));
}

function mapExperience(value: unknown): CandidateProfile["experience"] {
  return arr(value)
    .map((e) => {
      const o = obj(e);
      if (!o) return null;
      const start = str(pick(o, "start_date", "start", "from"));
      const end = str(pick(o, "end_date", "end", "to"));
      const period = str(pick(o, "period", "dates"), [start, end].filter(Boolean).join(" — "));
      const bullets = arr(pick(o, "bullets", "highlights", "responsibilities", "achievements"))
        .map((b) => (typeof b === "string" ? b : str(pick(obj(b), "text", "description"))))
        .filter(Boolean);
      const description = str(pick(o, "description", "summary"));
      return {
        role: str(pick(o, "role", "title", "position")),
        company: str(pick(o, "company", "employer", "organization")),
        location: str(pick(o, "location", "city")),
        period,
        bullets: bullets.length ? bullets : description ? [description] : [],
      };
    })
    .filter((e): e is CandidateProfile["experience"][number] =>
      Boolean(e && (e.role || e.company || e.bullets.length)),
    );
}

function mapEducation(value: unknown): CandidateProfile["education"] {
  return arr(value)
    .map((e) => {
      const o = obj(e);
      if (!o) return null;
      const start = str(pick(o, "start_date", "start", "from"));
      const end = str(pick(o, "end_date", "end", "to", "graduation_year", "year"));
      const period = str(pick(o, "period", "dates"), [start, end].filter(Boolean).join(" — "));
      return {
        degree: str(pick(o, "degree", "qualification", "program", "title")),
        school: str(pick(o, "school", "institution", "university", "college")),
        period,
        detail: str(pick(o, "detail", "description", "field_of_study", "field", "grade")),
      };
    })
    .filter((e): e is CandidateProfile["education"][number] =>
      Boolean(e && (e.degree || e.school || e.detail)),
    );
}

function mapRoles(value: unknown): { title: string; match: number }[] {
  return arr(value)
    .map((r) => {
      if (typeof r === "string") return { title: r, match: 0 };
      const o = obj(r);
      if (!o) return null;
      const title = str(pick(o, "title", "role", "name", "job_title"));
      return title
        ? { title, match: num(pick(o, "match", "match_score", "score", "fit_score")) }
        : null;
    })
    .filter((r): r is { title: string; match: number } => Boolean(r));
}

/** Backends often nest the profile under `content`, `profile`, `data` or `parsed_data`. */
function unwrap(raw: unknown): Raw | null {
  const root = obj(raw);
  if (!root) return null;
  let merged: Raw = { ...root };
  for (const key of [
    "content",
    "parsed_data",
    "profile",
    "candidate",
    "data",
    "result",
    "analysis",
  ]) {
    const nested = obj(root[key]);
    if (nested) merged = { ...nested, ...merged, ...nested };
  }
  return merged;
}

export function mapCandidateProfile(raw: unknown): CandidateProfile {
  const src = unwrap(raw) ?? {};
  const contact = obj(pick(src, "contact", "contact_info")) ?? src;

  const skills = mapSkills(pick(src, "skills", "top_skills", "extracted_skills"));
  const experience = mapExperience(pick(src, "experience", "work_experience", "employment"));
  const education = mapEducation(pick(src, "education", "education_history"));
  const recommendedRoles = mapRoles(
    pick(src, "recommended_roles", "recommended_job_titles", "roles"),
  );

  const sections = [
    { label: "Contact info", done: Boolean(pick(contact, "email", "phone")) },
    { label: "Work experience", done: experience.length > 0 },
    { label: "Education", done: education.length > 0 },
    { label: "Skills", done: skills.length > 0 },
    {
      label: "Portfolio links",
      done: Boolean(pick(src, "portfolio", "links", "website", "github")),
    },
    { label: "Certifications", done: arr(pick(src, "certifications")).length > 0 },
  ];

  const reported = pick(
    src,
    "profile_completion",
    "completeness",
    "completion_score",
    "completion",
  );
  const score =
    reported === undefined
      ? Math.round((sections.filter((section) => section.done).length / sections.length) * 100)
      : num(typeof reported === "object" ? pick(obj(reported), "score", "value") : reported);

  return {
    name: str(pick(src, "full_name", "name", "candidate_name")),
    headline: str(pick(src, "headline", "current_role", "title", "career_level")),
    location: str(pick(contact, "location", "city", "address")),
    email: str(pick(contact, "email")),
    phone: str(pick(contact, "phone", "phone_number", "mobile")),
    summary: str(pick(src, "summary", "professional_summary", "ai_summary", "about")),
    completion: { score, sections },
    skills,
    experience,
    education,
    recommendedRoles,
  };
}

export function hasCandidateProfileData(profile: CandidateProfile): boolean {
  return Boolean(
    profile.name ||
    profile.headline ||
    profile.location ||
    profile.email ||
    profile.phone ||
    profile.summary ||
    profile.skills.length ||
    profile.experience.length ||
    profile.education.length ||
    profile.recommendedRoles.length,
  );
}

/** GET /api/v1/resume/profile/{candidate_id} */
export async function fetchCandidateProfile(candidateId: string): Promise<CandidateProfile> {
  const data = await apiRequest<unknown>(
    `/api/v1/resume/profile/${encodeURIComponent(candidateId)}`,
    { method: "GET", auth: "required" },
  );
  return mapCandidateProfile(data);
}
