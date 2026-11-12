/** Admin CSV vacancy import — thin client over the real FastAPI endpoints. */
import { apiRequest, ApiError } from "./api";
import { fetchCurrentUser, type CurrentUser } from "./auth";

export type CsvRowError = { row: number; field: string; message: string };
export type CsvPreviewRecord = {
  row: number;
  title: string;
  company: string;
  location: string;
  source_name: string;
  source_url_domain: string;
  application_url_present: boolean;
  existing_action: string;
};
export type CsvPreview = {
  filename: string;
  rows_detected: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  ready_to_import: number;
  confirmation_token: string;
  records: CsvPreviewRecord[];
  errors: CsvRowError[];
  unmapped_columns: string[];
};
export type CsvImportResult = {
  batch_id: string;
  filename: string;
  rows_submitted: number;
  rows_valid: number;
  jobs_created: number;
  jobs_updated: number;
  duplicates_skipped: number;
  rows_rejected: number;
  status: string;
  created_at: string;
};
export type CsvHistoryItem = {
  batch_id: string;
  created_at: string;
  filename: string;
  row_count: number;
  valid_count: number;
  imported_count: number;
  updated_count: number;
  duplicate_count: number;
  rejected_count: number;
  status: string;
};
export type CsvImportDetail = CsvHistoryItem & {
  sources: Record<string, unknown>[];
  errors_retained: boolean;
};

export const MAX_CSV_BYTES = 5 * 1024 * 1024;
const BASE = "/api/v1/admin/jobs/csv";

export function getMe() {
  return fetchCurrentUser();
}

export function previewCsv(file: File, columnMapping?: Record<string, string>) {
  const fd = new FormData();
  fd.append("file", file);
  if (columnMapping && Object.keys(columnMapping).length > 0) {
    fd.append("column_mapping", JSON.stringify(columnMapping));
  }
  return apiRequest<CsvPreview>(`${BASE}/preview`, { method: "POST", formData: fd });
}

export function importCsv(
  file: File,
  confirmationToken: string,
  columnMapping?: Record<string, string>,
) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("confirmation_token", confirmationToken);
  if (columnMapping && Object.keys(columnMapping).length > 0) {
    fd.append("column_mapping", JSON.stringify(columnMapping));
  }
  return apiRequest<CsvImportResult>(`${BASE}/import`, { method: "POST", formData: fd });
}

export function listImports(limit: number, offset: number) {
  return apiRequest<CsvHistoryItem[]>(`${BASE}/imports?limit=${limit}&offset=${offset}`);
}

export function getImport(batchId: string) {
  return apiRequest<CsvImportDetail>(`${BASE}/imports/${encodeURIComponent(batchId)}`);
}

/** Client-side checks only (type/empty/size); all business validation stays on the backend. */
export function validateCsvFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) return "Only .csv files are accepted.";
  if (file.size === 0) return "The selected file is empty.";
  if (file.size > MAX_CSV_BYTES) return "File is larger than the 5 MiB limit.";
  return null;
}

/** Friendly message per HTTP status, falling back to the backend's detail. */
export function describeCsvError(err: unknown, phase: "preview" | "import" | "load"): string {
  if (!(err instanceof ApiError)) return "Something went wrong. Please try again.";
  switch (err.status) {
    case 0:
      return err.message;
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "Administrator access is required for vacancy imports.";
    case 409:
      return "This preview has expired or the file has changed. Please preview the file again before importing.";
    case 413:
      return "The file is too large for the server. Maximum size is 5 MiB.";
    case 400:
    case 422:
      return err.message;
    default:
      if (err.status >= 500)
        return `The server could not complete the ${phase}. Please try again later.`;
      return err.message;
  }
}
