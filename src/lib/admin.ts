import { API_BASE_URL, ApiError, apiRequest } from "./api";
import { getCurrentAccessToken } from "./supabase";

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
  const token = await getCurrentAccessToken();
  if (!token) throw new ApiError("Please sign in to export admin data.", 401);

  const urls = [
    "/api/v1/admin/jobs/csv/export",
    "/api/v1/admin/jobs/export",
    "/api/v1/admin/jobs/csv",
    "/api/v1/jobs/export/csv",
  ];

  for (const url of urls) {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        return response;
      }
      if (response.status !== 404 && response.status !== 405) {
        throw new ApiError("Unable to export the CSV file.", response.status);
      }
    } catch (error) {
      if (error instanceof ApiError && [404, 405].includes(error.status)) continue;
      if (error instanceof ApiError) throw error;
      throw new ApiError(`The API request to ${API_BASE_URL} could not be completed.`, 0, error);
    }
  }

  throw new ApiError("CSV export is not available for this backend.", 404);
}
