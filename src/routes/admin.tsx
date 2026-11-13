import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Briefcase,
  FileSpreadsheet,
  Layers3,
  Loader2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { isAuthenticated } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import {
  exportAdminCsv,
  fetchAdminApplications,
  fetchAdminCandidates,
  fetchAdminJobs,
  type AdminApplication,
  type AdminCandidate,
  type AdminJob,
} from "@/lib/admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal — Jobyn AI" },
      {
        name: "description",
        content: "Manage jobs, candidates, and applications via the live backend data.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [candidates, setCandidates] = useState<AdminCandidate[]>([]);
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (!(await isAuthenticated())) {
          setLoading(false);
          return;
        }
        setSignedIn(true);
        const [jobsData, candidatesData, applicationsData] = await Promise.all([
          fetchAdminJobs(25),
          fetchAdminCandidates(25),
          fetchAdminApplications(25),
        ]);
        if (!active) return;
        setJobs(jobsData);
        setCandidates(candidatesData);
        setApplications(applicationsData);
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : "Unable to load admin data.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const response = await exportAdminCsv();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `jobyn-admin-export-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "CSV export is not available from this backend.",
      );
    } finally {
      setExporting(false);
    }
  };

  if (!loading && !signedIn) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
            <Alert variant="destructive">
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Administrator access required</AlertTitle>
              <AlertDescription>
                Sign in to view job, candidate, and application data from the live backend.
                <Link to="/auth" className="ml-2 font-medium text-primary underline">
                  Go to sign in
                </Link>
              </AlertDescription>
            </Alert>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-gradient-to-b from-primary/[0.04] to-background">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-primary">Admin portal</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Job, candidate, and application operations
                </h1>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => void handleExportCsv()}
                  disabled={exporting}
                >
                  {exporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                  )}
                  Export CSV
                </Button>
                <Link to="/admin/vacancies">
                  <Button>
                    <ArrowUpRight className="mr-2 h-4 w-4" /> Vacancy import
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not load the admin dashboard</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Jobs</p>
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {loading ? "…" : jobs.length}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Candidates</p>
                <Users className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {loading ? "…" : candidates.length}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Applications</p>
                <Layers3 className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {loading ? "…" : applications.length}
              </p>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="p-5 xl:col-span-1">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                <Briefcase className="h-4 w-4 text-primary" /> Jobs
              </h2>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading jobs…</p>
                ) : jobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No jobs available from the backend.
                  </p>
                ) : (
                  jobs.slice(0, 8).map((job) => (
                    <div
                      key={job.id}
                      className="rounded-lg border border-border/70 bg-muted/20 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">
                          {job.title ?? "Untitled role"}
                        </p>
                        <Badge variant="secondary">{job.status ?? "active"}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {job.company_name ?? job.company ?? "Unknown company"}
                      </p>
                      {job.location && (
                        <p className="mt-1 text-xs text-muted-foreground">{job.location}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-5 xl:col-span-1">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                <Users className="h-4 w-4 text-primary" /> Candidates
              </h2>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading candidates…</p>
                ) : candidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No candidates available from the backend.
                  </p>
                ) : (
                  candidates.slice(0, 8).map((candidate) => (
                    <div
                      key={candidate.id}
                      className="rounded-lg border border-border/70 bg-muted/20 p-3"
                    >
                      <p className="font-medium text-foreground">{candidate.name ?? "Candidate"}</p>
                      {candidate.email && (
                        <p className="mt-1 text-sm text-muted-foreground">{candidate.email}</p>
                      )}
                      {candidate.status && <Badge className="mt-2">{candidate.status}</Badge>}
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-5 xl:col-span-1">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                <Layers3 className="h-4 w-4 text-primary" /> Applications
              </h2>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading applications…</p>
                ) : applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No applications available from the backend.
                  </p>
                ) : (
                  applications.slice(0, 8).map((application) => (
                    <div
                      key={application.id}
                      className="rounded-lg border border-border/70 bg-muted/20 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{application.id.slice(0, 8)}</p>
                        <Badge variant="secondary">{application.status ?? "active"}</Badge>
                      </div>
                      {application.job_id && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Job: {application.job_id}
                        </p>
                      )}
                      {application.created_at && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(application.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
