/** Resume upload service backed by POST /api/v1/resume/upload. */
import {
  API_BASE_URL,
  ApiError,
  getStoredToken,
  clearStoredToken,
  parseApiErrorMessage,
} from "./api";
import { getCurrentFirebaseIdToken, getFirebaseCurrentUser } from "./firebase";

export type ParsedResumeRead = Record<string, unknown>;

const RESULT_KEY = "latest_resume_profile";

/** Persists the parsed backend response so downstream pages can render real data. */
export function storeResumeResult(result: unknown): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
}

export function getStoredResumeResult<T = ParsedResumeRead>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(RESULT_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** True when the backend indicates that parsing is still in progress. */
export function isProcessing(result: ParsedResumeRead | null): boolean {
  const status = String(result?.["status"] ?? "").toLowerCase();
  return status === "processing" || status === "pending" || status === "queued";
}

/**
 * Uploads the CV as multipart/form-data (field name: `file`) with upload progress.
 * Uses XMLHttpRequest because fetch cannot report upload progress.
 */
export async function uploadMultipartDocument(
  path: string,
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<ParsedResumeRead> {
  const firebaseUser = getFirebaseCurrentUser();
  const token = firebaseUser ? await getCurrentFirebaseIdToken() : getStoredToken();

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}${path}`);
    xhr.setRequestHeader("Accept", "application/json");
    // Do NOT set Content-Type — the browser sets the multipart boundary.
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onerror = () =>
      reject(
        new ApiError(`Cannot reach the API at ${API_BASE_URL}. Is the FastAPI server running?`, 0),
      );
    xhr.onabort = () => reject(new ApiError("Upload cancelled.", 0));

    xhr.onload = () => {
      let data: unknown = null;
      if (xhr.responseText) {
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = xhr.responseText;
        }
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          reject(new ApiError("The server returned an invalid parsed resume response.", 502, data));
          return;
        }
        const payload = data as ParsedResumeRead;
        const backendStatus = String(
          payload["status"] ?? payload["processing_status"] ?? "",
        ).toLowerCase();
        const backendError = payload["error"];
        if (
          [
            "error",
            "failed",
            "failure",
            "processing_error",
            "processing_failed",
            "parse_error",
          ].includes(backendStatus) ||
          payload["success"] === false ||
          (typeof backendError === "string" && backendError.length > 0)
        ) {
          const message =
            payload["detail"] ?? payload["message"] ?? backendError ?? "Resume processing failed.";
          reject(new ApiError(String(message), 422, data));
          return;
        }
        resolve(payload);
        return;
      }
      if (xhr.status === 401 && !getFirebaseCurrentUser()) clearStoredToken();
      reject(new ApiError(parseApiErrorMessage(data, xhr.status), xhr.status, data));
    };

    if (signal) signal.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.send(form);
  });
}
