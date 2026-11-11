import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Download, FileStack, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ApiError } from "@/lib/api";
import {
  buildApplicationPackage,
  downloadGeneratedText,
  fetchJobOptions,
  loadGeneratedArtifact,
  type JobOption,
} from "@/lib/applications";

export const Route = createFileRoute("/application-package")({
  head: () => ({
    meta: [
      { title: "Application Package Builder — Jobyn AI" },
      {
        name: "description",
        content:
          "Combine the tailored CV, cover letter, and supporting evidence into a single packaged application.",
      },
    ],
  }),
  component: ApplicationPackagePage,
});

function ApplicationPackagePage() {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [jobId, setJobId] = useState("");
  const [cvText, setCvText] = useState("");
  const [coverLetterText, setCoverLetterText] = useState("");
  const [supportingDocuments, setSupportingDocuments] = useState("");
  const [includeQualifications, setIncludeQualifications] = useState(true);
  const [includeCertifications, setIncludeCertifications] = useState(true);
  const [packageContent, setPackageContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const items = await fetchJobOptions();
        setJobs(items);
        if (items[0]?.id) setJobId(items[0].id);
      } catch {
        setError("Unable to load the jobs list.");
      }
    })();

    const savedCv = loadGeneratedArtifact("jobyn.tailored_cv") ?? "";
    const savedLetter = loadGeneratedArtifact("jobyn.cover_letter") ?? "";
    if (savedCv) setCvText(savedCv);
    if (savedLetter) setCoverLetterText(savedLetter);
  }, []);

  const selectedJob = useMemo(() => jobs.find((job) => job.id === jobId) ?? null, [jobId, jobs]);

  const handleBuild = async () => {
    if (!cvText.trim() || !coverLetterText.trim()) {
      setError("Please choose a tailored CV and cover letter before building the package.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await buildApplicationPackage({
        jobId: jobId || undefined,
        cvText,
        coverLetterText,
        supportingDocuments: supportingDocuments
          .split(/\n{2,}|\r\n\r\n/)
          .map((item) => item.trim())
          .filter(Boolean),
        includeQualifications,
        includeCertifications,
      });
      const content = result.content ?? result.package ?? result.text ?? "";
      setPackageContent(content);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to build the application package.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-gradient-to-b from-primary/[0.04] to-background">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" /> Application Package Builder
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Package your story for one job.
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Combine the tailored CV, cover letter, and supporting documents into a single
              candidate package ready for submission.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-2 lg:gap-8 lg:px-8">
          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
              <FileStack className="h-4 w-4 text-primary" /> Package inputs
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <Label htmlFor="job">Select job</Label>
                <select
                  id="job"
                  value={jobId}
                  onChange={(event) => setJobId(event.target.value)}
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select a job</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} @ {job.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="tailored-cv">Tailored CV</Label>
                <Textarea
                  id="tailored-cv"
                  value={cvText}
                  onChange={(event) => setCvText(event.target.value)}
                  placeholder="Paste the tailored CV here or load it from the CV tailoring page."
                  className="mt-1.5 min-h-40"
                />
              </div>

              <div>
                <Label htmlFor="cover-letter">Cover letter</Label>
                <Textarea
                  id="cover-letter"
                  value={coverLetterText}
                  onChange={(event) => setCoverLetterText(event.target.value)}
                  placeholder="Paste the generated cover letter here or load it from the cover letter generator."
                  className="mt-1.5 min-h-40"
                />
              </div>

              <div>
                <Label htmlFor="supporting-docs">Supporting documents</Label>
                <Textarea
                  id="supporting-docs"
                  value={supportingDocuments}
                  onChange={(event) => setSupportingDocuments(event.target.value)}
                  placeholder="List certifications, references, portfolio links or attachments to include."
                  className="mt-1.5 min-h-28"
                />
              </div>

              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="qualifications"
                    checked={includeQualifications}
                    onCheckedChange={(value) => setIncludeQualifications(Boolean(value))}
                  />
                  <Label htmlFor="qualifications">Include relevant qualifications</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="certifications"
                    checked={includeCertifications}
                    onCheckedChange={(value) => setIncludeCertifications(Boolean(value))}
                  />
                  <Label htmlFor="certifications">Include certifications and credentials</Label>
                </div>
              </div>

              <Button onClick={() => void handleBuild()} disabled={busy} className="w-full">
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building package…
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" /> Build application package
                  </>
                )}
              </Button>

              {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Result
              </div>
              {packageContent && (
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadGeneratedText(
                      `${selectedJob?.title ?? "application-package"}.txt`,
                      packageContent,
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-border/70 bg-gradient-to-br from-background to-primary/[0.02] p-6">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {packageContent ||
                  "Build a package to preview the final combination of CV + cover letter + supporting materials."}
              </pre>
            </div>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
}
