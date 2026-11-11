import { ApiError, apiRequest } from "./api";

export type AdminJob = {
  id: string;
  title?: string;
  company_name?: string;
  company?: string;
  location?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type AdminCandidate = {
  id: string;
  name?: string;
  email?: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
};

export type AdminApplication = {
  id: string;
  job_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

async function tryAdminRoute<T>(routes: string[], fallbackMessage: string): Promise<T> {
  let lastError: unknown;

  for (const route of routes) {
    try {
      return await apiRequest<T>(route);
    } catch (error) {
      lastError = error;
      const status = error instanceof ApiError ? error.status : 0;
      if (![404, 405].includes(status)) throw error;
    }
  }

  if (lastError instanceof ApiError) throw lastError;
  throw new ApiError(fallbackMessage, 500, lastError);
}

export async function fetchAdminJobs(limit = 50): Promise<AdminJob[]> {
  const data = await tryAdminRoute<{ items?: AdminJob[]; data?: AdminJob[]; jobs?: AdminJob[] }>(
    [`/api/v1/admin/jobs?limit=${limit}`, `/api/v1/jobs?limit=${limit}`],
    "Unable to load job data.",
  );

  const list = data.items ?? data.data ?? data.jobs ?? [];
  return Array.isArray(list) ? list : [];
}

export async function fetchAdminCandidates(limit = 50): Promise<AdminCandidate[]> {
  const data = await tryAdminRoute<{
    items?: AdminCandidate[];
    data?: AdminCandidate[];
    candidates?: AdminCandidate[];
  }>(
    [`/api/v1/admin/candidates?limit=${limit}`, `/api/v1/candidates?limit=${limit}`],
    "Unable to load candidate data.",
  );

  const list = data.items ?? data.data ?? data.candidates ?? [];
  return Array.isArray(list) ? list : [];
}

export async function fetchAdminApplications(limit = 50): Promise<AdminApplication[]> {
  const data = await tryAdminRoute<{
    items?: AdminApplication[];
    data?: AdminApplication[];
    applications?: AdminApplication[];
  }>(
    [`/api/v1/admin/applications?limit=${limit}`, `/api/v1/applications?limit=${limit}`],
    "Unable to load application data.",
  );

  const list = data.items ?? data.data ?? data.applications ?? [];
  return Array.isArray(list) ? list : [];
}

export async function exportAdminCsv(): Promise<Response> {
  const urls = [
    "/api/v1/admin/jobs/csv/export",
    "/api/v1/admin/jobs/export",
    "/api/v1/admin/jobs/csv",
    "/api/v1/jobs/export/csv",
  ];

  for (const url of urls) {
    try {
      const response = await fetch(
        `${(import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "")}${url}`,
      );
      if (response.ok) {
        return response;
      }
      if (response.status !== 404 && response.status !== 405) {
        throw new ApiError("Unable to export the CSV file.", response.status);
      }
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      if (apiError && apiError.status !== 404 && apiError.status !== 405) {
        throw apiError;
      }
    }
  }

  throw new ApiError("CSV export is not available for this backend.", 404);
}
