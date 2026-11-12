import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Gauge,
  Sparkles,
  Target,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { ApiError } from "@/lib/api";
import {
  fetchCandidateProfile,
  getCandidateId,
  hasCandidateProfileData,
  mapCandidateProfile,
  type CandidateProfile,
} from "@/lib/candidate-profile";
import { getStoredResumeResult } from "@/lib/resume";

type Raw = Record<string, unknown>;
type ScoreMetric = { label: string; value: number; icon: ComponentType<{ className?: string }> };

export const Route = createFileRoute("/snapshot")({
  head: () => ({
    meta: [
      { title: "AI Career Snapshot — Jobyn AI" },
      {
        name: "description",
        content:
          "Review the skills, experience, scores and recommended roles in your parsed resume.",
      },
      { property: "og:title", content: "AI Career Snapshot — Jobyn AI" },
      {
        property: "og:description",
        content:
          "Review the skills, experience, scores and recommended roles in your parsed resume.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SnapshotPage,
});

function findValue(source: unknown, keys: string[]): unknown {
  if (!source || typeof source !== "object") return undefined;
  if (Array.isArray(source)) {
    for (const item of source) {
      const value = findValue(item, keys);
      if (value !== undefined) return value;
    }
    return undefined;
  }

  const record = source as Raw;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== "") {
      return record[key];
    }
  }
  for (const value of Object.values(record)) {
    const nested = findValue(value, keys);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

function scoreValue(source: unknown, keys: string[]): number | null {
  const raw = findValue(source, keys);
  const value =
    raw && typeof raw === "object" ? ((raw as Raw)["score"] ?? (raw as Raw)["value"]) : raw;
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : null;
}

function getScoreMetrics(source: unknown, profile: CandidateProfile): ScoreMetric[] {
  const metrics: ScoreMetric[] = [];
  const ats = scoreValue(source, ["ats_score", "atsScore"]);
  const completeness =
    scoreValue(source, [
      "profile_completion",
      "completeness",
      "resume_completeness",
      "completeness_score",
    ]) ??
    (profile.completion.sections.length
      ? Math.round(
          (profile.completion.sections.filter((section) => section.done).length /
            profile.completion.sections.length) *
            100,
        )
      : null);
  const readiness = scoreValue(source, ["readiness_score", "career_readiness_score"]);
  const confidence = scoreValue(source, ["confidence", "confidence_score"]);

  if (ats !== null) metrics.push({ label: "ATS score", value: ats, icon: Gauge });
  if (completeness !== null) {
    metrics.push({ label: "Profile completeness", value: completeness, icon: BadgeCheck });
  }
  if (readiness !== null) {
    metrics.push({ label: "Career readiness", value: readiness, icon: Target });
  }
  if (confidence !== null) {
    metrics.push({ label: "Analysis confidence", value: confidence, icon: Sparkles });
  }
  return metrics;
}

function SnapshotPage() {
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [scores, setScores] = useState<ScoreMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const stored = getStoredResumeResult<Raw>();
    if (!stored) {
      setLoading(false);
      return;
    }

    const storedProfile = mapCandidateProfile(stored);
    if (hasCandidateProfileData(storedProfile)) {
      setCandidate(storedProfile);
      setScores(getScoreMetrics(stored, storedProfile));
    }

    const candidateId = getCandidateId();
    if (!candidateId) {
      setLoading(false);
      return;
    }

    fetchCandidateProfile(candidateId)
      .then((profile) => {
        if (active && hasCandidateProfileData(profile)) setCandidate(profile);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load your parsed resume. Please try again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const hasContent = candidate !== null && hasCandidateProfileData(candidate);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          {loading && (
            <div className="space-y-5">
              <Skeleton className="h-36 w-full rounded-xl" />
              <div className="grid gap-5 md:grid-cols-2">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
            </div>
          )}

          {!loading && error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && !hasContent && (
            <Card className="mx-auto max-w-xl p-8 text-center sm:p-12">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Briefcase className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
                No parsed resume yet
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload your PDF or DOCX resume to see the profile details and insights returned by
                the backend.
              </p>
              <Button asChild className="mt-6">
                <Link to="/upload">
                  Upload a resume <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Card>
          )}

          {!loading && hasContent && candidate && (
            <>
              <header className="mb-8">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  Parsed resume
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {candidate.name
                    ? `${candidate.name}'s career snapshot`
                    : candidate.headline || "Career snapshot"}
                </h1>
                {candidate.headline && (
                  <p className="mt-2 text-lg text-muted-foreground">{candidate.headline}</p>
                )}
                {candidate.summary && (
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    {candidate.summary}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild variant="outline">
                    <Link to="/profile">View full profile</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/matches">View job matches</Link>
                  </Button>
                </div>
              </header>

              {scores.length > 0 && (
                <section aria-labelledby="score-overview" className="mb-8">
                  <h2 id="score-overview" className="mb-4 text-xl font-semibold text-foreground">
                    Score overview
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {scores.map(({ label, value, icon: Icon }) => (
                      <Card key={label} className="p-5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Icon className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-medium">{label}</h3>
                        </div>
                        <p className="mt-3 text-3xl font-bold text-foreground">{value}%</p>
                        <Progress value={value} className="mt-3 h-2" />
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                {candidate.skills.length > 0 && (
                  <Card className="p-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <BadgeCheck className="h-5 w-5 text-primary" />
                      Skills
                    </h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {candidate.skills.map((skill) => (
                        <Badge key={skill.name} variant="secondary">
                          {skill.name}
                          {skill.level && <span className="ml-1.5 opacity-70">{skill.level}</span>}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {candidate.recommendedRoles.length > 0 && (
                  <Card className="p-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <Target className="h-5 w-5 text-primary" />
                      Recommended job titles
                    </h2>
                    <ul className="mt-4 space-y-3">
                      {candidate.recommendedRoles.map((role) => (
                        <li
                          key={role.title}
                          className="flex items-center justify-between gap-4 rounded-lg border p-3"
                        >
                          <span className="font-medium text-foreground">{role.title}</span>
                          {role.match > 0 && (
                            <span className="text-sm font-semibold text-primary">
                              {role.match}%
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {candidate.experience.length > 0 && (
                  <Card className="p-6 lg:col-span-2">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Experience highlights
                    </h2>
                    <ol className="mt-5 space-y-5">
                      {candidate.experience.map((job, index) => (
                        <li
                          key={`${job.role}-${job.company}-${index}`}
                          className="border-l-2 border-primary/20 pl-4"
                        >
                          {(job.role || job.company) && (
                            <h3 className="font-semibold text-foreground">
                              {[job.role, job.company].filter(Boolean).join(" · ")}
                            </h3>
                          )}
                          {(job.period || job.location) && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {[job.period, job.location].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {job.bullets.length > 0 && (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                              {job.bullets.map((highlight, bulletIndex) => (
                                <li key={`${bulletIndex}-${highlight}`}>{highlight}</li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ol>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
