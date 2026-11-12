import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  History,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { isAuthenticated } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import {
  describeCsvError,
  getImport,
  getMe,
  importCsv,
  listImports,
  previewCsv,
  validateCsvFile,
  type CsvHistoryItem,
  type CsvImportDetail,
  type CsvImportResult,
  type CsvPreview,
} from "@/lib/admin-csv";

export const Route = createFileRoute("/admin/vacancies")({
  head: () => ({
    meta: [
      { title: "Vacancy CSV Import — Jobyn AI Admin" },
      {
        name: "description",
        content: "Administrator tool to preview and import vacancy CSV files into Jobyn AI.",
      },
      { property: "og:title", content: "Vacancy CSV Import — Jobyn AI Admin" },
      { property: "og:description", content: "Preview, validate and import vacancy CSV files." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminVacanciesPage,
});

const PAGE_SIZE = 10;
type Access = "checking" | "signed-out" | "forbidden" | "admin" | "error";

function fmtBytes(n: number) {
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;
}
function fmtDate(s: string) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}
function actionBadge(action: string) {
  const a = action.toLowerCase();
  if (a.includes("create") || a === "new")
    return <Badge className="bg-emerald text-emerald-foreground">New</Badge>;
  if (a.includes("update")) return <Badge>Update</Badge>;
  if (a.includes("dup")) return <Badge variant="secondary">Duplicate</Badge>;
  if (a.includes("reject") || a.includes("invalid"))
    return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">{action || "—"}</Badge>;
}
function statusBadge(s: string) {
  const v = s.toLowerCase();
  if (v.includes("fail") || v.includes("error")) return <Badge variant="destructive">{s}</Badge>;
  if (v.includes("complete") || v.includes("success") || v.includes("imported"))
    return <Badge className="bg-emerald text-emerald-foreground">{s}</Badge>;
  return <Badge variant="secondary">{s}</Badge>;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "good" | "bad" | "warn";
}) {
  const color =
    tone === "good"
      ? "text-emerald"
      : tone === "bad"
        ? "text-destructive"
        : tone === "warn"
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function parseColumnMapping(value: string): Record<string, string> | null {
  if (!value.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed);
      const mapping: Record<string, string> = {};
      for (const [header, target] of entries) {
        if (!header.trim() || typeof target !== "string" || !target.trim()) return null;
        mapping[header] = target;
      }
      return mapping;
    }
  } catch {
    return null;
  }
  return null;
}

function AdminVacanciesPage() {
  const [access, setAccess] = useState<Access>("checking");

  useEffect(() => {
    if (!isAuthenticated()) return setAccess("signed-out");
    getMe()
      .then((me) => setAccess(me.role === "admin" && me.is_active ? "admin" : "forbidden"))
      .catch((e) =>
        setAccess(
          e instanceof ApiError && e.status === 401
            ? "signed-out"
            : e instanceof ApiError && e.status === 403
              ? "forbidden"
              : "error",
        ),
      );
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="mb-8">
            <p className="text-sm font-medium text-primary">Admin</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
              Vacancy CSV Import
            </h1>
            <p className="mt-2 text-muted-foreground">
              Upload a CSV, review the backend preview, then confirm the import.
            </p>
          </div>
          {access === "checking" && <Skeleton className="h-64 w-full" />}
          {access === "signed-out" && (
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Please sign in</AlertTitle>
              <AlertDescription>
                Sign in with an administrator account to import vacancies.{" "}
                <Link to="/auth" className="font-medium text-primary underline">
                  Sign in
                </Link>
              </AlertDescription>
            </Alert>
          )}
          {access === "forbidden" && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Administrator access required</AlertTitle>
              <AlertDescription>
                Your account does not have permission to import vacancies.
              </AlertDescription>
            </Alert>
          )}
          {access === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Could not verify your account</AlertTitle>
              <AlertDescription>
                The server could not be reached. Please try again shortly.
              </AlertDescription>
            </Alert>
          )}
          {access === "admin" && <AdminWorkspace />}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function AdminWorkspace() {
  const [historyKey, setHistoryKey] = useState(0);
  return (
    <div className="space-y-8">
      <UploadPanel onImported={() => setHistoryKey((k) => k + 1)} />
      <HistoryPanel refreshKey={historyKey} />
    </div>
  );
}

function UploadPanel({ onImported }: { onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [mappingText, setMappingText] = useState("");
  const [previewMapping, setPreviewMapping] = useState<Record<string, string> | null>(null);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [previewAt, setPreviewAt] = useState<Date | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setPreviewMapping(null);
    setMappingText("");
    setMappingError(null);
    setPreviewAt(null);
    setResult(null);
    setError(null);
    setExpired(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const runPreview = useCallback(
    async (f: File, rawMapping = mappingText) => {
      const mapping = parseColumnMapping(rawMapping);
      if (!mapping) {
        setMappingError("Enter a JSON object mapping CSV headers to backend field names.");
        return;
      }
      setBusy("preview");
      setError(null);
      setExpired(false);
      setPreview(null);
      setResult(null);
      setPreviewMapping(null);
      setMappingError(null);
      try {
        const p = await previewCsv(f, mapping);
        setPreview(p);
        setPreviewAt(new Date());
        setPreviewMapping(mapping);
      } catch (e) {
        setError(describeCsvError(e, "preview"));
      } finally {
        setBusy(null);
      }
    },
    [mappingText],
  );

  const choose = (f: File) => {
    setResult(null);
    const err = validateCsvFile(f);
    if (err) {
      setFile(null);
      setPreview(null);
      setPreviewMapping(null);
      setPreviewAt(null);
      setError(err);
      return;
    }
    setFile(f);
    setMappingText("");
    setPreviewMapping(null);
    void runPreview(f, "");
  };

  const confirm = async () => {
    if (!file || !preview || busy) return;
    setBusy("import");
    setError(null);
    try {
      const r = await importCsv(file, preview.confirmation_token, previewMapping ?? undefined);
      setResult(r);
      setPreview(null);
      onImported();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setExpired(true);
      setError(describeCsvError(e, "import"));
    } finally {
      setBusy(null);
    }
  };

  if (result) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Import complete</h2>
            <p className="text-sm text-muted-foreground">
              {result.filename} · recorded {fmtDate(result.created_at)}
            </p>
          </div>
          <div className="ml-auto">{statusBadge(result.status)}</div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Batch ID: <span className="font-mono">{result.batch_id}</span>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Rows submitted" value={result.rows_submitted} />
          <Stat label="Rows valid" value={result.rows_valid} />
          <Stat label="Jobs created" value={result.jobs_created} tone="good" />
          <Stat label="Jobs updated" value={result.jobs_updated} tone="warn" />
          <Stat label="Duplicates skipped" value={result.duplicates_skipped} />
          <Stat
            label="Rows rejected"
            value={result.rows_rejected}
            tone={result.rows_rejected ? "bad" : undefined}
          />
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={reset}>
            <Upload className="mr-2 h-4 w-4" />
            Import another file
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <FileSpreadsheet className="h-5 w-5 text-primary" />
        Upload vacancies
      </h2>
      {!preview && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Choose a CSV file to upload"
          onClick={() => !busy && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !busy) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f && !busy) choose(f);
          }}
          className={`mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"} ${busy ? "pointer-events-none opacity-70" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            aria-label="CSV file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) choose(f);
            }}
          />
          {busy === "preview" ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-primary" />
          )}
          <p className="mt-3 font-medium text-foreground">
            {busy === "preview"
              ? `Checking ${file?.name}…`
              : "Drag & drop a CSV, or click to browse"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">.csv only · max 5 MiB</p>
        </div>
      )}

      {file && (
        <div className="mt-4 space-y-2">
          <label htmlFor="csv-column-mapping" className="text-sm font-medium text-foreground">
            Optional column mapping
          </label>
          <Textarea
            id="csv-column-mapping"
            value={mappingText}
            disabled={busy !== null}
            onChange={(event) => {
              setMappingText(event.target.value);
              setPreview(null);
              setPreviewMapping(null);
              setPreviewAt(null);
              setExpired(false);
            }}
            placeholder={'{"Position": "title", "Employer": "company"}'}
            aria-describedby="csv-column-mapping-help"
          />
          <p id="csv-column-mapping-help" className="text-xs text-muted-foreground">
            Enter a JSON object from CSV headers to backend field names. Changing the mapping
            requires a fresh preview before import.
          </p>
          {mappingError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{mappingError}</AlertDescription>
            </Alert>
          )}
          {!preview && busy !== "preview" && (
            <div className="flex justify-end">
              <Button onClick={() => void runPreview(file)} disabled={busy !== null}>
                <RefreshCw className="mr-2 h-4 w-4" /> Preview CSV
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{expired ? "Preview expired" : "Something went wrong"}</AlertTitle>
          <AlertDescription>
            {error}
            {expired && file && (
              <Button size="sm" variant="outline" className="mt-2" onClick={() => runPreview(file)}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Preview again
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {preview && file && (
        <div className="mt-4 space-y-6">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{preview.filename}</p>
              <p className="text-xs text-muted-foreground">{fmtBytes(file.size)}</p>
            </div>
            {previewAt && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Preview expires around{" "}
                {new Date(previewAt.getTime() + 30 * 60_000).toLocaleTimeString()} (~30 min)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Rows detected" value={preview.rows_detected} />
            <Stat label="Ready to import" value={preview.ready_to_import} tone="good" />
            <Stat label="Valid rows" value={preview.valid_rows} />
            <Stat
              label="Invalid rows"
              value={preview.invalid_rows}
              tone={preview.invalid_rows ? "bad" : undefined}
            />
            <Stat label="Duplicate rows" value={preview.duplicate_rows} />
          </div>

          {preview.unmapped_columns.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground">Unmapped columns (ignored)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {preview.unmapped_columns.map((c) => (
                  <Badge key={c} variant="outline">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {preview.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-destructive">
                Validation errors ({preview.errors.length})
              </p>
              <div className="mt-2 max-h-64 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Issue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.errors.map((er, i) => (
                      <TableRow key={`${er.row}-${er.field}-${i}`}>
                        <TableCell>{er.row}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{er.field}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{er.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-foreground">
              Preview records ({preview.records.length})
            </p>
            <div className="mt-2 max-h-96 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Apply link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.records.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                        No importable records.
                      </TableCell>
                    </TableRow>
                  )}
                  {preview.records.map((r) => (
                    <TableRow key={r.row}>
                      <TableCell>{r.row}</TableCell>
                      <TableCell>{actionBadge(r.existing_action)}</TableCell>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>{r.company}</TableCell>
                      <TableCell>{r.location}</TableCell>
                      <TableCell className="text-xs">
                        {r.source_name}
                        <span className="block text-muted-foreground">{r.source_url_domain}</span>
                      </TableCell>
                      <TableCell>
                        {r.application_url_present ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald" aria-label="Present" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" aria-label="Missing" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={reset} disabled={busy === "import"}>
              Cancel / Choose another file
            </Button>
            <Button
              onClick={confirm}
              disabled={busy !== null || expired || preview.ready_to_import === 0}
            >
              {busy === "import" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : (
                <>Confirm import ({preview.ready_to_import})</>
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function HistoryPanel({ refreshKey }: { refreshKey: number }) {
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<CsvHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    setError(null);
    listImports(PAGE_SIZE, offset)
      .then((d) => alive && setItems(Array.isArray(d) ? d : []))
      .catch((e) => alive && setError(describeCsvError(e, "load")));
    return () => {
      alive = false;
    };
  }, [offset, refreshKey]);

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <History className="h-5 w-5 text-primary" />
        Import history
      </h2>
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!items && !error && <Skeleton className="mt-4 h-40 w-full" />}
      {items && (
        <div className="mt-4 overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Imported</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Duplicates</TableHead>
                <TableHead>Rejected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                    No imports yet.
                  </TableCell>
                </TableRow>
              )}
              {items.map((it) => (
                <TableRow key={it.batch_id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {fmtDate(it.created_at)}
                  </TableCell>
                  <TableCell className="max-w-48 truncate">{it.filename}</TableCell>
                  <TableCell>{it.row_count}</TableCell>
                  <TableCell>{it.imported_count}</TableCell>
                  <TableCell>{it.updated_count}</TableCell>
                  <TableCell>{it.duplicate_count}</TableCell>
                  <TableCell>{it.rejected_count}</TableCell>
                  <TableCell>{statusBadge(it.status)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setDetailId(it.batch_id)}>
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Page {offset / PAGE_SIZE + 1}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={offset === 0 || !items}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!items || items.length < PAGE_SIZE}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>
      <DetailDialog batchId={detailId} onClose={() => setDetailId(null)} />
    </Card>
  );
}

function DetailDialog({ batchId, onClose }: { batchId: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<CsvImportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) return;
    let alive = true;
    setDetail(null);
    setError(null);
    getImport(batchId)
      .then((d) => alive && setDetail(d))
      .catch(
        (e) =>
          alive &&
          setError(
            e instanceof ApiError && e.status === 404
              ? "Import batch not found."
              : describeCsvError(e, "load"),
          ),
      );
    return () => {
      alive = false;
    };
  }, [batchId]);

  return (
    <Dialog open={!!batchId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import details</DialogTitle>
          <DialogDescription className="font-mono text-xs">{batchId}</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!detail && !error && <Skeleton className="h-40 w-full" />}
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate font-medium text-foreground">{detail.filename}</span>
              {statusBadge(detail.status)}
            </div>
            <p className="text-xs text-muted-foreground">Recorded {fmtDate(detail.created_at)}</p>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Rows" value={detail.row_count} />
              <Stat label="Valid" value={detail.valid_count} />
              <Stat label="Imported" value={detail.imported_count} tone="good" />
              <Stat label="Updated" value={detail.updated_count} tone="warn" />
              <Stat label="Duplicates" value={detail.duplicate_count} />
              <Stat
                label="Rejected"
                value={detail.rejected_count}
                tone={detail.rejected_count ? "bad" : undefined}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Row errors retained: {detail.errors_retained ? "Yes" : "No"}
            </p>
            <div>
              <p className="text-sm font-medium text-foreground">
                Sources / observations ({detail.sources.length})
              </p>
              <div className="mt-2 max-h-64 space-y-2 overflow-auto">
                {detail.sources.length === 0 && (
                  <p className="text-sm text-muted-foreground">No source records.</p>
                )}
                {detail.sources.map((s, i) => (
                  <dl
                    key={i}
                    className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border p-3 text-xs"
                  >
                    {Object.entries(s).map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                        <dd className="break-all text-foreground">
                          {v === null || v === undefined
                            ? "—"
                            : typeof v === "object"
                              ? JSON.stringify(v)
                              : String(v)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
