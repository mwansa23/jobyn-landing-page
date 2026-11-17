import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ApiError } from "@/lib/api";
import {
  analyzeCvAgainstJobDescription,
  generateTailoredCv,
  downloadTailoredCvFile,
  saveVisualCvEdit,
  type TailoredCVRead,
  type TailoredCVSection,
} from "@/lib/applications";
import { storeResumeResult, uploadMultipartDocument } from "@/lib/resume";

export const Route = createFileRoute("/cv-tailoring")({
  head: () => ({
    meta: [
      { title: "CV Tailoring — Jobyn AI" },
      {
        name: "description",
        content:
          "Upload your CV and job description, then generate a tailored version built around the role's key requirements.",
      },
    ],
  }),
  component: CvTailoringPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type AnalysisSummary = {
  summary: string;
  match_score: number;
  strengths: string[];
  gaps: string[];
};

// ── CV section renderer ───────────────────────────────────────────────────────

function CVSectionView({ section }: { section: TailoredCVSection }) {
  const sourceTag: Record<string, string> = {
    original: "Preserved",
    rewritten: "Tailored",
    candidate_confirmed: "Confirmed",
  };
  const sourceColour: Record<string, string> = {
    original: "text-muted-foreground bg-muted",
    rewritten: "text-primary bg-primary/10",
    candidate_confirmed: "text-amber-700 bg-amber-50",
  };
  const tag = section.source ? sourceTag[section.source] ?? section.source : null;
  const tagCls = section.source
    ? sourceColour[section.source] ?? "text-muted-foreground bg-muted"
    : "";

  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-baseline gap-2">
        {section.heading && (
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
            {section.heading}
          </h3>
        )}
        {tag && (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${tagCls}`}>
            {tag}
          </span>
        )}
      </div>
      <div className="border-b border-border/50 mb-2" />

      {/* Contact: render each line */}
      {section.type === "contact" && section.content && (
        <div className="space-y-0.5">
          {section.content.split("\n").map((line, i) =>
            line.trim() ? (
              <p key={i} className="text-sm text-foreground">
                {line}
              </p>
            ) : null,
          )}
        </div>
      )}

      {/* Summary: single paragraph */}
      {section.type === "summary" && section.content && (
        <p className="text-sm text-foreground leading-relaxed">{section.content}</p>
      )}

      {/* List-based sections */}
      {section.items && section.items.length > 0 && (
        <ul className="space-y-3">
          {section.items.map((item, idx) => {
            if (typeof item === "string") {
              return (
                <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              );
            }
            if (item && typeof item === "object") {
              const entry = item as Record<string, unknown>;
              const title = String(
                entry["title"] ?? entry["role"] ?? entry["name"] ?? "",
              ).trim();
              const company = String(
                entry["company"] ?? entry["organisation"] ?? entry["institution"] ?? "",
              ).trim();
              const dates = String(entry["dates"] ?? entry["date"] ?? "").trim();
              const details = Array.isArray(entry["details"])
                ? (entry["details"] as unknown[])
                : Array.isArray(entry["bullets"])
                  ? (entry["bullets"] as unknown[])
                  : typeof entry["description"] === "string"
                    ? [entry["description"]]
                    : [];

              return (
                <li key={idx} className="text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="font-semibold text-foreground">{title}</span>
                    {dates && (
                      <span className="shrink-0 text-xs text-muted-foreground">{dates}</span>
                    )}
                  </div>
                  {company && (
                    <div className="text-xs text-muted-foreground mb-1">{company}</div>
                  )}
                  {details.length > 0 && (
                    <ul className="mt-1 space-y-0.5 pl-3">
                      {details.map((d, di) => (
                        <li key={di} className="flex items-start gap-2 text-foreground">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                          <span>{String(d)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }
            return null;
          })}
        </ul>
      )}

      {/* Fallback: plain content */}
      {!section.items?.length && section.type !== "contact" && section.type !== "summary" && section.content && (
        <p className="text-sm text-foreground leading-relaxed">{section.content}</p>
      )}
    </div>
  );
}

// ── Validation warnings banner ────────────────────────────────────────────────

function ValidationWarnings({ cv }: { cv: TailoredCVRead }) {
  const validation = cv.content.validation;
  if (!validation) return null;

  if (!validation.is_valid && validation.unsupported_claims.length > 0) {
    return (
      <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-destructive mb-1">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {validation.unsupported_claims.length} unsupported claim
          {validation.unsupported_claims.length !== 1 ? "s" : ""} detected
        </div>
        <ul className="pl-5 space-y-0.5">
          {validation.unsupported_claims.map((c, i) => (
            <li key={i} className="text-xs text-destructive list-disc">
              <span className="font-medium">{c.section}:</span> {c.claim} — {c.detail}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (validation.warnings.length > 0) {
    return (
      <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 mb-1">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {validation.warnings.length} item
          {validation.warnings.length !== 1 ? "s" : ""} need confirmation
        </div>
        <ul className="pl-5 space-y-0.5">
          {validation.warnings.map((w, i) => (
            <li key={i} className="text-xs text-amber-700 list-disc">
              {w.claim} — {w.detail}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      {validation.validation_summary}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function CvTailoringPage() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null);
  const [generatedCv, setGeneratedCv] = useState<TailoredCVRead | null>(null);
  const [busy, setBusy] = useState<"analyze" | "generate" | "docx" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editSections, setEditSections] = useState<TailoredCVSection[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleCvUpload = async (file: File) => {
    setCvFile(file);
    setError(null);
    setUploadProgress(0);
    try {
      const result = await uploadMultipartDocument(
        "/api/v1/tailoring/cv/upload",
        file,
        setUploadProgress,
      );
      storeResumeResult(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to upload the CV.");
    }
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError("Please paste or upload the job description.");
      return;
    }
    setBusy("analyze");
    setError(null);
    try {
      const result = await analyzeCvAgainstJobDescription({ jobDescription });
      setAnalysis({
        summary: result.summary ?? "",
        match_score: result.match_score ?? 0,
        strengths: result.strengths ?? [],
        gaps: result.gaps ?? [],
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to analyze the CV.");
    } finally {
      setBusy(null);
    }
  };

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      setError("Please paste or upload the job description before generating.");
      return;
    }
    setBusy("generate");
    setError(null);
    try {
      const result = await generateTailoredCv({ jobDescription });
      setGeneratedCv(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to generate the tailored CV.");
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async (format: "docx" | "pdf") => {
    if (!generatedCv) return;
    setBusy(format);
    setError(null);
    try {
      await downloadTailoredCvFile(generatedCv.id, format);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : `Unable to download the CV as ${format.toUpperCase()}.`,
      );
    } finally {
      setBusy(null);
    }
  };

  // ── Editing handlers ────────────────────────────────────────────────────
  const handleEditToggle = () => {
    if (!generatedCv) return;
    // Deep-clone sections into editable state
    setEditSections(JSON.parse(JSON.stringify(generatedCv.content.sections)));
    setIsEditing(true);
    setSaveMsg(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditSections([]);
    setSaveMsg(null);
  };

  const handleSaveEdit = async () => {
    if (!generatedCv) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const updated = await saveVisualCvEdit(generatedCv.id, editSections);
      setGeneratedCv(updated);
      setIsEditing(false);
      setEditSections([]);
      setSaveMsg({ type: "ok", text: `Saved as version ${updated.version_number}.` });
    } catch (err) {
      setSaveMsg({
        type: "err",
        text: err instanceof ApiError ? err.message : "Unable to save the CV.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Update a section's content (for summary, contact, etc.)
  const updateSectionContent = (idx: number, content: string) => {
    setEditSections((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], content };
      return next;
    });
  };

  // Update a string item in a list section
  const updateSectionItem = (secIdx: number, itemIdx: number, value: string) => {
    setEditSections((prev) => {
      const next = [...prev];
      const items = [...(next[secIdx].items ?? [])];
      items[itemIdx] = value;
      next[secIdx] = { ...next[secIdx], items };
      return next;
    });
  };

  // Update a bullet inside an experience item's details list
  const updateExperienceBullet = (secIdx: number, itemIdx: number, bulletIdx: number, value: string) => {
    setEditSections((prev) => {
      const next = [...prev];
      const items = [...(next[secIdx].items ?? [])];
      const item = { ...(items[itemIdx] as Record<string, unknown>) };
      const details = [...((item["details"] as unknown[]) || [])];
      details[bulletIdx] = value;
      item["details"] = details;
      items[itemIdx] = item;
      next[secIdx] = { ...next[secIdx], items };
      return next;
    });
  };

  // Update a field inside an experience/education item
  const updateExperienceField = (secIdx: number, itemIdx: number, field: string, value: string) => {
    setEditSections((prev) => {
      const next = [...prev];
      const items = [...(next[secIdx].items ?? [])];
      const item = { ...(items[itemIdx] as Record<string, unknown>) };
      item[field] = value;
      items[itemIdx] = item;
      next[secIdx] = { ...next[secIdx], items };
      return next;
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="border-b border-border/60 bg-gradient-to-b from-primary/[0.04] to-background">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" /> CV Tailoring
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Match your experience to the role.
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Upload a CV, paste the job description, analyse the match, then generate and
              download a professionally formatted, ATS-friendly tailored CV.
            </p>
          </div>
        </section>

        {/* ── Two-panel layout ──────────────────────────────────────── */}
        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-5 lg:gap-8 lg:px-8">

          {/* ── Left: inputs ──────────────────────────────────────── */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
              <Upload className="h-4 w-4 text-primary" /> Inputs
            </div>

            <div className="mt-5 space-y-4">
              {/* CV upload */}
              <div>
                <Label htmlFor="cv-upload">Upload CV</Label>
                <Input
                  id="cv-upload"
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleCvUpload(file);
                  }}
                  className="mt-1.5"
                />
                {cvFile && (
                  <p className="mt-2 text-xs text-muted-foreground">{cvFile.name}</p>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Uploading… {uploadProgress}%
                  </p>
                )}
                {uploadProgress === 100 && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="h-3 w-3" /> CV uploaded
                  </p>
                )}
              </div>

              {/* JD textarea */}
              <div>
                <Label htmlFor="jd">Job description</Label>
                <Textarea
                  id="jd"
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="Paste the target role description here…"
                  className="mt-1.5 min-h-52"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => void handleAnalyze()}
                  disabled={busy !== null}
                  className="flex-1"
                >
                  {busy === "analyze" ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</>
                  ) : (
                    <><BriefcaseBusiness className="mr-2 h-4 w-4" /> Analyse CV</>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void handleGenerate()}
                  disabled={busy !== null}
                  className="flex-1"
                >
                  {busy === "generate" ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Writing…</>
                  ) : (
                    <><Wand2 className="mr-2 h-4 w-4" /> Tailor CV</>
                  )}
                </Button>
              </div>

              {/* Error */}
              {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              {/* Download buttons — only after CV generated */}
              {generatedCv && (
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={busy !== null}
                    onClick={() => void handleDownload("docx")}
                  >
                    {busy === "docx" ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-3 w-3" />
                    )}
                    DOCX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={busy !== null}
                    onClick={() => void handleDownload("pdf")}
                  >
                    {busy === "pdf" ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-3 w-3" />
                    )}
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* ── Right: preview ────────────────────────────────────── */}
          <Card className="p-6 lg:col-span-3">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                <FileText className="h-4 w-4 text-primary" /> Preview
              </div>
              {generatedCv && (
                <span className="text-xs text-muted-foreground">
                  Version {generatedCv.version_number} ·{" "}
                  <span
                    className={
                      generatedCv.status === "accepted"
                        ? "text-green-600"
                        : generatedCv.status === "rejected"
                          ? "text-destructive"
                          : "text-amber-600"
                    }
                  >
                    {generatedCv.status}
                  </span>
                </span>
              )}
            </div>

            {/* Analysis panel */}
            {analysis && (
              <div className="mb-5 space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">Match score</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-sm font-semibold ${
                      analysis.match_score >= 70
                        ? "bg-green-100 text-green-700"
                        : analysis.match_score >= 45
                          ? "bg-amber-100 text-amber-700"
                          : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {analysis.match_score}%
                  </span>
                </div>
                {analysis.summary && (
                  <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                )}
                {analysis.strengths.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground">
                      Key strengths
                    </p>
                    <ul className="space-y-1">
                      {analysis.strengths.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.gaps.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground">
                      Priority gaps
                    </p>
                    <ul className="space-y-1">
                      {analysis.gaps.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Validation warnings */}
            {generatedCv && !isEditing && <ValidationWarnings cv={generatedCv} />}

            {/* Save message */}
            {saveMsg && (
              <div
                className={`mb-4 rounded-lg border p-3 text-sm ${
                  saveMsg.type === "ok"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-destructive/40 bg-destructive/5 text-destructive"
                }`}
              >
                {saveMsg.text}
              </div>
            )}

            {/* Edit controls */}
            {generatedCv && !isEditing && (
              <div className="mb-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEditToggle} disabled={busy !== null}>
                  <FileText className="mr-2 h-3 w-3" /> Edit CV
                </Button>
              </div>
            )}

            {isEditing && (
              <div className="mb-4 flex gap-2">
                <Button size="sm" onClick={() => void handleSaveEdit()} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-2 h-3 w-3" />}
                  Save Changes
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={saving}>
                  Cancel
                </Button>
              </div>
            )}

            {/* Structured CV preview / editor */}
            {generatedCv ? (
              <div className="rounded-xl border border-border/70 bg-gradient-to-br from-background to-primary/[0.02] p-6">
                {isEditing
                  ? // ── Edit mode ──────────────────────────────────────────
                    editSections.map((section, idx) => (
                      <div key={idx} className="mb-5">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-foreground mb-1">
                          {section.heading || `Section ${idx + 1}`}
                        </h3>
                        <div className="border-b border-border/50 mb-2" />

                        {/* Editable contact */}
                        {section.type === "contact" && (
                          <Textarea
                            value={section.content ?? ""}
                            onChange={(e) => updateSectionContent(idx, e.target.value)}
                            className="min-h-20 text-sm"
                            rows={Math.max(2, (section.content ?? "").split("\n").length)}
                          />
                        )}

                        {/* Editable summary */}
                        {section.type === "summary" && (
                          <Textarea
                            value={section.content ?? ""}
                            onChange={(e) => updateSectionContent(idx, e.target.value)}
                            className="min-h-24 text-sm"
                          />
                        )}

                        {/* Editable list sections (skills, education, certifications) */}
                        {section.type !== "contact" && section.type !== "summary" && section.type !== "experience" &&
                          (section.items ?? []).map((item, itemIdx) => (
                            typeof item === "string" ? (
                              <div key={itemIdx} className="mb-2">
                                <Textarea
                                  value={item}
                                  onChange={(e) => updateSectionItem(idx, itemIdx, e.target.value)}
                                  className="min-h-10 text-sm"
                                  rows={2}
                                />
                              </div>
                            ) : null
                          ))
                        }

                        {/* Editable experience entries */}
                        {section.type === "experience" &&
                          (section.items ?? []).map((item, itemIdx) => {
                            if (typeof item !== "object" || item === null) return null;
                            const entry = item as Record<string, unknown>;
                            const title = String(entry["title"] ?? entry["role"] ?? "");
                            const company = String(entry["company"] ?? entry["organisation"] ?? "");
                            const dates = String(entry["dates"] ?? entry["date"] ?? "");
                            const details = Array.isArray(entry["details"])
                              ? (entry["details"] as string[])
                              : Array.isArray(entry["bullets"])
                                ? (entry["bullets"] as string[])
                                : [];
                            return (
                              <div key={itemIdx} className="mb-4 rounded-lg border border-border/40 p-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs">Job title</Label>
                                    <Input
                                      value={title}
                                      onChange={(e) => updateExperienceField(idx, itemIdx, "title", e.target.value)}
                                      className="text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Company</Label>
                                    <Input
                                      value={company}
                                      onChange={(e) => updateExperienceField(idx, itemIdx, "company", e.target.value)}
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <Label className="text-xs">Dates</Label>
                                  <Input
                                    value={dates}
                                    onChange={(e) => updateExperienceField(idx, itemIdx, "dates", e.target.value)}
                                    className="text-sm"
                                  />
                                </div>
                                {details.map((d, bulletIdx) => (
                                  <div key={bulletIdx} className="mt-2">
                                    <Label className="text-xs">Bullet {bulletIdx + 1}</Label>
                                    <Textarea
                                      value={d}
                                      onChange={(e) => updateExperienceBullet(idx, itemIdx, bulletIdx, e.target.value)}
                                      className="min-h-10 text-sm"
                                      rows={2}
                                    />
                                  </div>
                                ))}
                              </div>
                            );
                          })
                        }
                      </div>
                    ))
                  : // ── Read-only mode ─────────────────────────────────────
                    generatedCv.content.sections.map((section, idx) => (
                      <CVSectionView key={idx} section={section} />
                    ))
                }
                {generatedCv.content.generation_notes && !isEditing && (
                  <p className="mt-4 text-xs text-muted-foreground italic border-t border-border/40 pt-3">
                    {generatedCv.content.generation_notes}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-gradient-to-br from-background to-primary/[0.02] p-6 text-sm text-muted-foreground">
                Upload a CV, paste the job description, then click <strong>Tailor CV</strong> to
                generate a structured, downloadable tailored CV.
              </div>
            )}
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
}
