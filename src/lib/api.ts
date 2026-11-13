/**
 * Reusable API client for the Jobyn AI FastAPI backend.
 *
 * Base URL comes from VITE_API_BASE_URL (Vite project).
 */

import { getCurrentAccessToken, isSupabaseConfigured } from "./supabase";

export const API_BASE_URL: string =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "") ??
  "https://jobyn-ai-v2-djv8-git-feature-cv-tailoring-studio-jobyn-ai.vercel.app";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** Turns FastAPI error shapes ({detail: string | ValidationError[]}) into a readable message. */
export function parseApiErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (payload && typeof payload === "object") {
    const detail =
      (payload as { detail?: unknown; message?: unknown }).detail ??
      (payload as { message?: unknown }).message;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const msgs = detail
        .map((d) => {
          if (d && typeof d === "object") {
            const loc = Array.isArray((d as { loc?: unknown }).loc)
              ? ((d as { loc: unknown[] }).loc.filter((p) => p !== "body").join(".") as string)
              : "";
            const msg = String((d as { msg?: unknown }).msg ?? "Invalid value");
            return loc ? `${loc}: ${msg}` : msg;
          }
          return String(d);
        })
        .filter(Boolean);
      if (msgs.length) return msgs.join("; ");
    }
  }
  if (status === 401) return "Your session is not authorized for this request.";
  if (status === 403) return "You don't have permission to do that.";
  return `Request failed (${status}).`;
}

type RequestOptions = {
  method?: string;
  /** JSON body — ignored when `formData` is provided. */
  body?: unknown;
  formData?: FormData;
  /** Attach the current Supabase access token; "required" fails if there is no session. */
  auth?: boolean | "required";
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

/** Builds the URL, attaches the current Supabase access token, and parses the response. */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, formData, auth = true, headers = {}, signal } = options;

  const finalHeaders: Record<string, string> = { Accept: "application/json", ...headers };

  if (auth !== false && isSupabaseConfigured()) {
    const token = await getCurrentAccessToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
    if (auth === "required" && !token) {
      throw new ApiError("Please sign in to continue.", 401);
    }
  } else if (auth === "required") {
    throw new ApiError("Supabase authentication is not configured.", 500);
  }

  let payload: BodyInit | undefined;
  if (formData) {
    // Never set Content-Type for FormData — the browser adds the boundary.
    payload = formData;
  } else if (body !== undefined) {
    if (body instanceof URLSearchParams) {
      finalHeaders["Content-Type"] = "application/x-www-form-urlencoded";
      payload = body.toString();
    } else {
      finalHeaders["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: payload,
      signal,
    });
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError(`The API request to ${API_BASE_URL} could not be completed.`, 0, error);
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(parseApiErrorMessage(data, response.status), response.status, data);
  }

  return data as T;
}
