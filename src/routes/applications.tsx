import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Briefcase, ChevronDown, RefreshCw, Sparkles } from "lucide-react";
import { ApiError, parseApiErrorMessage } from "@/lib/api";
import {
  fetchApplications,
  fetchJobOptions,
  createApplication,
  updateApplication,
  STATUS_LABELS,
  type ApplicationRead,
  type ApplicationStatus,
  type JobOption,
} from "@/lib/applications";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute("/applications")({
  head: () => ({
    meta: [
      { title: "My Applications - Jobyn AI" },
      { name: "description", content: "Track your job applications." },
    ],
  }),
  component: ApplicationsPage,
});

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  applied: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  under_review: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  interviewing: "bg-primary/10 text-primary",
  offered: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground line-through",
};

const NEXT_STATUSES: Partial<Record<ApplicationStatus, ApplicationStatus>> = {
  draft: "applied",
  applied: "under_review",
  under_review: "interviewing",
  interviewing: "offered",
};

function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationRead[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [coverLetterText, setCoverLetterText] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [appsData, jobsData] = await Promise.all([
        fetchApplications({ limit: 50 }),
        fetchJobOptions(),
      ]);
      setApplications(appsData.items);
      setJobs(jobsData);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? parseApiErrorMessage(err.detail, err.status)
          : "Could not load applications. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!selectedJobId) {
      setCreateError("Please select a job.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    setCreateSuccess(false);
    try {
      const application = await createApplication({
        job_id: selectedJobId,
        cover_letter: coverLetterText.trim() || undefined,
        status: "applied",
      });
      setApplications((previous) => [application, ...previous]);
      setSelectedJobId("");
      setCoverLetterText("");
      setCreateSuccess(true);
      window.setTimeout(() => setCreateSuccess(false), 3000);
    } catch (err) {
      setCreateError(
        err instanceof ApiError
          ? parseApiErrorMessage(err.detail, err.status)
          : "Failed to create application.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleAdvanceStatus = async (application: ApplicationRead) => {
    const nextStatus = NEXT_STATUSES[application.status];
    if (!nextStatus || updatingId) return;

    setUpdatingId(application.id);
    setError(null);
    try {
      const updated = await updateApplication(application.id, { status: nextStatus });
      setApplications((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? parseApiErrorMessage(err.detail, err.status)
          : "Could not update the application. Please try again.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const jobLabel = (jobId: string) => {
    const job = jobs.find((item) => item.id === jobId);
    return job ? `${job.title} @ ${job.company_name}` : `${jobId.slice(0, 8)}...`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-gradient-to-b from-primary/[0.04] to-background">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Briefcase className="h-4 w-4" /> Application Tracking
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              My Applications
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Track every role you&apos;ve applied to. Update statuses as you move through the
              hiring pipeline.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
          <Card className="p-6">
            <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Apply to a job
            </h2>
            {createError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            {createSuccess && (
              <Alert className="mb-4 border-emerald-500/40 bg-emerald-500/10">
                <AlertDescription className="text-emerald-700 dark:text-emerald-400">
                  Application submitted successfully!
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-muted-foreground">
                <span className="mb-1.5 block">Select a job</span>
                <span className="relative block">
                  <select
                    value={selectedJobId}
                    onChange={(event) => setSelectedJobId(event.target.value)}
                    className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">
                      {jobs.length === 0 ? "No jobs available" : "-- select a job --"}
                    </option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} @ {job.company_name}
                        {job.location ? ` · ${job.location}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </span>
              </label>
              <Button
                onClick={() => void handleCreate()}
                disabled={creating || !selectedJobId}
                className="w-full sm:w-auto"
              >
                {creating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Briefcase className="mr-2 h-4 w-4" /> Submit Application
                  </>
                )}
              </Button>
            </div>
          </Card>

          <section aria-labelledby="applications-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="applications-heading" className="text-lg font-semibold text-foreground">
                {loading
                  ? "Loading..."
                  : `${applications.length} application${applications.length !== 1 ? "s" : ""}`}
              </h2>
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            {error && !loading && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <Card key={item} className="p-5">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="mt-2 h-4 w-32" />
                  </Card>
                ))}
              </div>
            )}
            {!loading && !error && applications.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground/40" />
                <p className="text-lg font-medium text-foreground">No applications yet</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Select a job above and submit your first application.
                </p>
              </div>
            )}
            {!loading && !error && applications.length > 0 && (
              <div className="space-y-3">
                {applications.map((application) => {
                  const nextStatus = NEXT_STATUSES[application.status];
                  return (
                    <Card
                      key={application.id}
                      className="border-border/70 p-5 transition-all hover:border-primary/30 hover:shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-foreground">
                            {jobLabel(application.job_id)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Applied{" "}
                            {application.applied_at ?? application.created_at.slice(0, 10) ?? "—"}
                          </p>
                          {application.notes && (
                            <p className="mt-1.5 truncate text-xs italic text-muted-foreground">
                              {application.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[application.status]}`}
                          >
                            {STATUS_LABELS[application.status]}
                          </span>
                          {nextStatus && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              disabled={updatingId !== null}
                              onClick={() => void handleAdvanceStatus(application)}
                            >
                              {updatingId === application.id
                                ? "Updating..."
                                : `→ ${STATUS_LABELS[nextStatus]}`}
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </main>
      <Footer />
    </div>
  );
}
