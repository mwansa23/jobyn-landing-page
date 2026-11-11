import { ApiError, apiRequest } from "./api";

export type ApplicationStatus =
  "draft" | "applied" | "under_review" | "interviewing" | "offered" | "rejected" | "withdrawn";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  applied: "Applied",
  under_review: "Under Review",
  interviewing: "Interviewing",
  offered: "Offered",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export type ApplicationRead = {
  id: string;
  user_id: string;
  job_id: string;
  resume_id: string | null;
  status: ApplicationStatus;
  cover_letter: string | null;
  applied_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type JobOption = {
  id: string;
  title: string;
  company_name: string;
  location: string | null;
};

type ApplicationsResponse = {
  items: ApplicationRead[];
  total: number;
  offset: number;
  limit: number;
};

export async function fetchApplications(
  options: { offset?: number; limit?: number; status?: ApplicationStatus } = {},
): Promise<ApplicationsResponse> {
  const params = new URLSearchParams();
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.status) params.set("status", options.status);

  const query = params.toString();
  return apiRequest<ApplicationsResponse>(`/api/v1/applications${query ? `?${query}` : ""}`);
}

export async function fetchJobOptions(): Promise<JobOption[]> {
  const response = await apiRequest<{ items: JobOption[] }>("/api/v1/jobs?limit=100");
  return response.items;
}

export function createApplication(payload: {
  job_id: string;
  cover_letter?: string;
  notes?: string;
  status?: ApplicationStatus;
}): Promise<ApplicationRead> {
  return apiRequest<ApplicationRead>("/api/v1/applications", {
    method: "POST",
    body: payload,
  });
}

export function updateApplication(
  applicationId: string,
  payload: {
    status?: ApplicationStatus;
    cover_letter?: string;
    notes?: string;
  },
): Promise<ApplicationRead> {
  return apiRequest<ApplicationRead>(`/api/v1/applications/${encodeURIComponent(applicationId)}`, {
    method: "PATCH",
    body: payload,
  });
}

export type TailoringResult = {
  job_title?: string;
  company_name?: string;
  match_score?: number;
  summary?: string;
  strengths?: string[];
  gaps?: string[];
  tailored_cv?: string;
  content?: string;
  text?: string;
  notes?: string[];
};

export type CoverLetterResult = {
  cover_letter?: string;
  content?: string;
  text?: string;
  letter?: string;
  generated_text?: string;
  filename?: string;
};

export type ApplicationPackageResult = {
  package_name?: string;
  title?: string;
  content?: string;
  text?: string;
  package?: string;
  download_url?: string;
  file_url?: string;
  filename?: string;
  message?: string;
};

function normalizeTextPayload(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeTextPayload(entry))
      .filter(Boolean)
      .join("\n\n");
  }
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const direct =
      source["content"] ??
      source["text"] ??
      source["cover_letter"] ??
      source["tailored_cv"] ??
      source["cv"] ??
      source["body"] ??
      source["result"] ??
      source["generated_text"] ??
      source["letter"] ??
      source["package"] ??
      source["summary"];
    const result = normalizeTextPayload(direct);
    if (result) return result;

    const nested = Object.values(source).find((entry) => typeof entry === "string");
    if (nested) return String(nested).trim();
  }
  return "";
}

function getStoredArtifact(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveGeneratedArtifact(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // storage unavailable
  }
}

export function loadGeneratedArtifact(key: string): string | null {
  return getStoredArtifact(key);
}

async function tryApiRoutes<T>(
  routes: Array<{ path: string; method?: string; body?: unknown; formData?: FormData }>,
  fallbackMessage: string,
): Promise<T> {
  let last: unknown;

  for (const route of routes) {
    try {
      return await apiRequest<T>(route.path, {
        method: route.method ?? "POST",
        body: route.body,
        formData: route.formData,
      });
    } catch (error) {
      last = error;
      const status = error instanceof ApiError ? error.status : 0;
      if (![404, 405, 422].includes(status)) {
        throw error;
      }
    }
  }

  if (last instanceof ApiError) {
    throw last;
  }

  throw new ApiError(fallbackMessage, 500, last);
}

export async function analyzeCvAgainstJobDescription(input: {
  jobDescription: string;
  cvText?: string;
  candidateId?: string;
  includeSuggestions?: boolean;
}): Promise<TailoringResult> {
  const payload: Record<string, unknown> = {
    job_description: input.jobDescription,
    jd: input.jobDescription,
    jobDescription: input.jobDescription,
    include_suggestions: input.includeSuggestions ?? true,
  };

  if (input.cvText && input.cvText.trim()) {
    payload["cv_text"] = input.cvText;
    payload["resume_text"] = input.cvText;
    payload["cv"] = input.cvText;
  }
  if (input.candidateId) {
    payload["candidate_id"] = input.candidateId;
    payload["user_id"] = input.candidateId;
  }

  const result = await tryApiRoutes<TailoringResult>(
    [
      { path: "/api/v1/resume/analyze", method: "POST", body: payload },
      { path: "/api/v1/resume/tailor/analyze", method: "POST", body: payload },
      { path: "/api/v1/resume/tailor", method: "POST", body: payload },
      { path: "/api/v1/resume/compare", method: "POST", body: payload },
    ],
    "Unable to analyze this CV against the job description.",
  );

  const text = normalizeTextPayload(result);
  if (text && !result.summary) {
    result.summary = text;
  }
  if (result.strengths === undefined && typeof result.summary === "string") {
    result.strengths = result.summary.split(/\n+/).filter(Boolean).slice(0, 5);
  }
  if (result.gaps === undefined) {
    result.gaps = [];
  }
  return result;
}

export async function generateTailoredCv(input: {
  jobDescription: string;
  cvText?: string;
  candidateId?: string;
  jobTitle?: string;
  companyName?: string;
}): Promise<TailoringResult> {
  const payload: Record<string, unknown> = {
    job_description: input.jobDescription,
    jd: input.jobDescription,
    job_description_text: input.jobDescription,
    job_title: input.jobTitle,
    company_name: input.companyName,
  };

  if (input.cvText && input.cvText.trim()) {
    payload["cv_text"] = input.cvText;
    payload["resume_text"] = input.cvText;
    payload["cv"] = input.cvText;
  }
  if (input.candidateId) {
    payload["candidate_id"] = input.candidateId;
    payload["user_id"] = input.candidateId;
  }

  const result = await tryApiRoutes<TailoringResult>(
    [
      { path: "/api/v1/resume/generate-tailored-cv", method: "POST", body: payload },
      { path: "/api/v1/resume/tailor", method: "POST", body: payload },
      { path: "/api/v1/resume/tailor/generate", method: "POST", body: payload },
      { path: "/api/v1/resume/tailor/cv", method: "POST", body: payload },
      { path: "/api/v1/cv-tailoring/generate", method: "POST", body: payload },
    ],
    "Unable to generate the tailored CV.",
  );

  const text = normalizeTextPayload(result) || result.tailored_cv || result.content || result.text;
  if (text && !result.tailored_cv) {
    result.tailored_cv = text;
  }
  if (text && !result.content) {
    result.content = text;
  }
  return result;
}

export async function generateCoverLetterForJob(input: {
  jobId?: string;
  jobDescription?: string;
  role?: string;
  company?: string;
  candidateId?: string;
  candidateProfile?: Record<string, unknown> | null;
}): Promise<CoverLetterResult> {
  const payload: Record<string, unknown> = {
    job_id: input.jobId,
    role: input.role,
    company: input.company,
    job_description: input.jobDescription,
    jd: input.jobDescription,
    candidate_id: input.candidateId,
    user_id: input.candidateId,
  };

  if (input.candidateProfile && typeof input.candidateProfile === "object") {
    payload["candidate_profile"] = input.candidateProfile;
    payload["profile"] = input.candidateProfile;
  }

  const result = await tryApiRoutes<CoverLetterResult>(
    [
      { path: "/api/v1/cover-letter/generate", method: "POST", body: payload },
      { path: "/api/v1/cover-letters/generate", method: "POST", body: payload },
      { path: "/api/v1/cover_letter/generate", method: "POST", body: payload },
      { path: "/api/v1/resume/cover-letter", method: "POST", body: payload },
      { path: "/api/v1/applications/cover-letter", method: "POST", body: payload },
    ],
    "Unable to generate a cover letter for this role.",
  );

  const text =
    normalizeTextPayload(result) ||
    result.cover_letter ||
    result.letter ||
    result.content ||
    result.text;
  if (text && !result.cover_letter) {
    result.cover_letter = text;
  }
  if (text && !result.content) {
    result.content = text;
  }
  return result;
}

export async function buildApplicationPackage(input: {
  jobId?: string;
  cvText?: string;
  coverLetterText?: string;
  supportingDocuments?: string[];
  includeQualifications?: boolean;
  includeCertifications?: boolean;
}): Promise<ApplicationPackageResult> {
  const payload: Record<string, unknown> = {
    job_id: input.jobId,
    cv_text: input.cvText,
    cover_letter_text: input.coverLetterText,
    supporting_documents: input.supportingDocuments ?? [],
    include_qualifications: Boolean(input.includeQualifications ?? true),
    include_certifications: Boolean(input.includeCertifications ?? true),
  };

  const result = await tryApiRoutes<ApplicationPackageResult>(
    [
      { path: "/api/v1/applications/package", method: "POST", body: payload },
      { path: "/api/v1/application-packages", method: "POST", body: payload },
      { path: "/api/v1/packages/build", method: "POST", body: payload },
      { path: "/api/v1/applications/build-package", method: "POST", body: payload },
    ],
    "Unable to build the application package.",
  );

  const text =
    normalizeTextPayload(result) ||
    result.package ||
    result.content ||
    result.text ||
    result.message;
  if (text && !result.content) {
    result.content = text;
  }
  if (text && !result.package) {
    result.package = text;
  }
  return result;
}

export function downloadGeneratedText(filename: string, content: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content || ""], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
