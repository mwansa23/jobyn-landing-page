/**
 * Reusable API client for the Jobyn AI FastAPI backend.
 *
 * Base URL comes from VITE_API_BASE_URL (Vite project).
 * Falls back to the local FastAPI dev server.
 */

import { getCurrentFirebaseIdToken, getFirebaseCurrentUser } from "./firebase";

export const API_BASE_URL: string =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";

const TOKEN_KEY = "jobyn.access_token";

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

/** Reads the legacy Jobyn access token (browser only). Firebase tokens are not stored here. */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Retained for compatibility with existing callers; Firebase auth does not use this storage. */
export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
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
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to do that.";
  return `Request failed (${status}).`;
}

type RequestOptions = {
  method?: string;
  /** JSON body — ignored when `formData` is provided. */
  body?: unknown;
  formData?: FormData;
  /** Attach the current Firebase ID token, or a legacy stored Jobyn token when no Firebase session exists. */
  auth?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

/**
 * Core request helper: builds the URL, attaches the current Firebase ID token,
 * parses JSON, and raises ApiError for non-2xx responses.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, formData, auth = true, headers = {}, signal } = options;

  const finalHeaders: Record<string, string> = { Accept: "application/json", ...headers };

  if (auth) {
    const firebaseUser = getFirebaseCurrentUser();
    const token = firebaseUser ? await getCurrentFirebaseIdToken() : getStoredToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
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
  } catch {
    throw new ApiError(
      `Cannot reach the API at ${API_BASE_URL}. Is the FastAPI server running?`,
      0,
    );
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
    if (response.status === 401 && !getFirebaseCurrentUser()) clearStoredToken();
    throw new ApiError(parseApiErrorMessage(data, response.status), response.status, data);
  }

  return data as T;
}
