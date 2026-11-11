import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, FileText, AlertCircle, X, Loader2, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { isAuthenticated } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import {
  isProcessing,
  storeResumeResult,
  uploadMultipartDocument,
  type ParsedResumeRead,
} from "@/lib/resume";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload Your CV — Jobyn AI" },
      {
        name: "description",
        content:
          "Upload your PDF or DOCX resume. Jobyn AI generates your Career Snapshot, job matches and cover letters in under a minute.",
      },
      { property: "og:title", content: "Upload Your CV — Jobyn AI" },
      {
        property: "og:description",
        content: "Drag & drop your CV and watch AI build your personalized Career Snapshot.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UploadPage,
});

const ACCEPTED_EXT = [".pdf", ".docx"];
const MAX_SIZE = 10 * 1024 * 1024;

type Status = "idle" | "uploading" | "processing" | "done" | "error";

const PROCESSING_STEPS = [
  "Uploading resume",
  "Extracting text",
  "Identifying skills",
  "Building candidate profile",
  "Matching career opportunities",
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validate(file: File): string | null {
  const nameOk = ACCEPTED_EXT.some((ext) => file.name.toLowerCase().endsWith(ext));
  if (!nameOk) return "Unsupported file type. Please upload a PDF or DOCX.";
  if (file.size > MAX_SIZE)
    return `File is too large (${formatBytes(file.size)}). Max size is 10 MB.`;
  if (file.size === 0) return "File appears to be empty.";
  return null;
}

function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [result, setResult] = useState<ParsedResumeRead | null>(null);
  const [signedIn, setSignedIn] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSignedIn(isAuthenticated());
  }, []);

  const handleFile = useCallback((selected: File) => {
    setError(null);
    setAuthError(false);
    setResult(null);
    setProgress(0);
    const err = validate(selected);
    if (err) {
      setError(err);
      setStatus("error");
      setFile(null);
      return;
    }
    setFile(selected);
    setStatus("idle");
  }, []);

  const startUpload = useCallback(async () => {
    if (!file) return;
    if (!isAuthenticated()) {
      setSignedIn(false);
      setAuthError(true);
      setError("Please sign in before uploading your CV.");
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setProgress(0);
    setError(null);
    setAuthError(false);
    setResult(null);
    setStepIndex(-1);

    try {
      const data = await uploadMultipartDocument("/api/v1/resume/upload", file, setProgress);
      storeResumeResult(data);
      setResult(data);
      setStatus("processing");
      setStepIndex(1);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      setAuthError(apiErr?.status === 401);
      if (apiErr?.status === 401) setSignedIn(false);
      setError(apiErr ? apiErr.message : "Upload failed. Please try again.");
      setStatus("error");
    }
  }, [file]);

  useEffect(() => {
    if (status !== "processing") return;
    if (stepIndex >= PROCESSING_STEPS.length) {
      setStatus("done");
      const timeout = setTimeout(() => navigate({ to: "/snapshot" }), 600);
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(() => setStepIndex((current) => current + 1), 700);
    return () => clearTimeout(timeout);
  }, [status, stepIndex, navigate]);

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setStepIndex(-1);
    setResult(null);
    setProgress(0);
    setError(null);
    setAuthError(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const showProcessing = status === "processing" || status === "done";
  const backendProcessing = isProcessing(result);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
          <div className="mb-10 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> AI Career Intelligence
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Discover how AI sees your career
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Upload your CV to receive a personalized career profile, intelligent job matches, and
              application-ready documents — in under a minute.
            </p>
          </div>

          {showProcessing ? (
            <Card className="overflow-hidden border-primary/20 p-8 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Building your Career Snapshot
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {backendProcessing
                      ? `Your resume is queued for AI parsing — ${file?.name}`
                      : `Our AI is analyzing ${file?.name ?? "your resume"} in real time.`}
                  </p>
                </div>
              </div>

              <ul className="mt-8 space-y-3">
                {PROCESSING_STEPS.map((step, index) => {
                  const done = index < stepIndex;
                  const active = index === stepIndex;
                  return (
                    <li
                      key={step}
                      className={`flex items-center gap-3 rounded-lg border p-3.5 transition-all ${
                        active
                          ? "border-primary/40 bg-primary/5"
                          : done
                            ? "border-[color:var(--emerald)]/30 bg-[color:var(--emerald-soft)]/60"
                            : "border-border bg-background"
                      }`}
                    >
                      <div
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                          done
                            ? "bg-emerald text-emerald-foreground"
                            : active
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {done ? (
                          <Check className="h-4 w-4" />
                        ) : active ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <span className="text-xs font-semibold">{index + 1}</span>
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          done || active ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {step}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Redirecting to your snapshot when analysis completes…
              </p>
            </Card>
          ) : (
            <Card className="p-6 sm:p-8">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                onClick={() => status !== "uploading" && inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && status !== "uploading") {
                    inputRef.current?.click();
                  }
                }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                } ${status === "uploading" ? "pointer-events-none opacity-70" : ""}`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <p className="mt-4 text-base font-medium text-foreground">
                  {isDragging ? "Drop your file here" : "Drag & drop your resume"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  or <span className="font-medium text-primary">browse files</span>
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  PDF or DOCX · Max 10 MB · Private &amp; encrypted
                </p>
              </div>

              {file && (
                <div className="mt-6 flex items-center gap-3 rounded-lg border bg-muted/40 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                    {status === "uploading" && (
                      <div className="mt-2">
                        <Progress value={progress} className="h-2" />
                        <p className="mt-1 text-xs text-muted-foreground">Uploading… {progress}%</p>
                      </div>
                    )}
                  </div>
                  {status !== "uploading" && (
                    <button
                      onClick={reset}
                      aria-label="Remove file"
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <div className="text-sm text-destructive">
                    <p>{error}</p>
                    {authError && (
                      <Link to="/auth" className="mt-1 inline-block font-medium underline">
                        Sign in to continue
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {!signedIn && !authError && (
                <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
                  You need an account to analyze a CV.{" "}
                  <Link to="/auth" className="font-medium text-primary underline">
                    Sign in or register
                  </Link>
                  .
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button onClick={startUpload} disabled={!file || status === "uploading"} size="lg">
                  {status === "uploading" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {status === "error" ? "Retry upload" : "Analyze with AI"}
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
