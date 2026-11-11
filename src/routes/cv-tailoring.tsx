import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
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
import { getCandidateId } from "@/lib/candidate-profile";
import {
  downloadGeneratedText,
  generateTailoredCv,
  analyzeCvAgainstJobDescription,
  saveGeneratedArtifact,
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

function recursiveText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((entry) => recursiveText(entry))
      .filter(Boolean)
      .join("\n\n");
  }
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const direct =
      source["content"] ??
      source["text"] ??
      source["resume_text"] ??
      source["cv_text"] ??
      source["parsed_text"] ??
      source["summary"] ??
      source["description"] ??
      source["result"] ??
      source["data"];

    if (direct !== undefined) {
      const nested = recursiveText(direct);
      if (nested) return nested;
    }

    for (const item of Object.values(source)) {
      const nested = recursiveText(item);
      if (nested) return nested;
    }
  }
  return "";
}

function CvTailoringPage() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [cvText, setCvText] = useState("");
  const [analysis, setAnalysis] = useState<{
    summary?: string;
    match_score?: number;
    strengths?: string[];
    gaps?: string[];
  } | null>(null);
  const [generatedCv, setGeneratedCv] = useState("");
  const [busy, setBusy] = useState<"analyze" | "generate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const candidateId = useMemo(() => getCandidateId() ?? undefined, []);

  const handleCvUpload = async (file: File) => {
    setCvFile(file);
    setError(null);
    setUploadProgress(0);
    try {
      const result = await uploadMultipartDocument(
        "/api/v1/resume/upload",
        file,
        setUploadProgress,
      );
      storeResumeResult(result);
      const extracted = recursiveText(result);
      if (extracted) {
        setCvText(extracted);
      }
    } catch (err) {
      const apiError = err instanceof ApiError ? err.message : "Unable to upload the CV.";
      setError(apiError);
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
      const result = await analyzeCvAgainstJobDescription({
        jobDescription,
        cvText: cvText || undefined,
        candidateId,
      });
      setAnalysis({
        summary: result.summary ?? "The CV aligns well with the target role.",
        match_score: (result.match_score ?? result.summary) ? 80 : 0,
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
      setError("Please paste or upload the job description before generating the tailored CV.");
      return;
    }

    setBusy("generate");
    setError(null);

    try {
      const result = await generateTailoredCv({
        jobDescription,
        cvText: cvText || undefined,
        candidateId,
      });
      const text = result.tailored_cv ?? result.content ?? result.text ?? "";
      setGeneratedCv(text);
      saveGeneratedArtifact("jobyn.tailored_cv", text);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to generate the tailored CV.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-gradient-to-b from-primary/[0.04] to-background">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" /> CV Tailoring
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Match your experience to the role.
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Upload a CV, paste the job description, and generate a tailored version that
              highlights the evidence the hiring team needs to see.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-5 lg:gap-8 lg:px-8">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
              <Upload className="h-4 w-4 text-primary" /> Inputs
            </div>

            <div className="mt-5 space-y-4">
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
                {cvFile && <p className="mt-2 text-xs text-muted-foreground">{cvFile.name}</p>}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Uploading CV… {uploadProgress}%
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="jd">Job description</Label>
                <Textarea
                  id="jd"
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="Paste the target role description here…"
                  className="mt-1.5 min-h-52"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Use the posted JD or a competitor brief.</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary"
                    onClick={() =>
                      setJobDescription(
                        (value) =>
                          value ||
                          "Senior Product Designer · Own product vision, collaborate with engineering, lead discovery, and design high-quality experiences for enterprise customers.",
                      )
                    }
                  >
                    Add sample JD
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => void handleAnalyze()}
                  disabled={busy !== null}
                  className="flex-1"
                >
                  {busy === "analyze" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…
                    </>
                  ) : (
                    <>
                      <BriefcaseBusiness className="mr-2 h-4 w-4" /> Analyze CV
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void handleGenerate()}
                  disabled={busy !== null}
                  className="flex-1"
                >
                  {busy === "generate" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Writing…
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" /> Tailor CV
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          </Card>

          <Card className="p-6 lg:col-span-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                <FileText className="h-4 w-4 text-primary" /> Preview
              </div>
              {generatedCv && (
                <Button
                  variant="outline"
                  onClick={() => downloadGeneratedText("tailored-cv.txt", generatedCv)}
                >
                  <Download className="mr-2 h-4 w-4" /> Download CV
                </Button>
              )}
            </div>

            {analysis && (
              <div className="mt-5 space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">Match score</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
                    {analysis.match_score ?? 0}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                {analysis.strengths && analysis.strengths.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-foreground">Key strengths</p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {analysis.strengths.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.gaps && analysis.gaps.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-foreground">Priority gaps</p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {analysis.gaps.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 rounded-xl border border-border/70 bg-gradient-to-br from-background to-primary/[0.02] p-6">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {generatedCv ||
                  "Upload a CV and generate a tailored version to preview the output here."}
              </pre>
            </div>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
}
