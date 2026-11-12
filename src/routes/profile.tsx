import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Briefcase,
  GraduationCap,
  Sparkles,
  Target,
  Mail,
  MapPin,
  Phone,
  Award,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ApiError } from "@/lib/api";
import { getStoredResumeResult } from "@/lib/resume";
import {
  fetchCandidateProfile,
  getCandidateId,
  hasCandidateProfileData,
  mapCandidateProfile,
  type CandidateProfile,
} from "@/lib/candidate-profile";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Candidate Profile — Jobyn AI" },
      {
        name: "description",
        content:
          "AI-generated candidate profile with extracted skills, education, work experience, recommended roles, and completion score.",
      },
      { property: "og:title", content: "Candidate Profile — Jobyn AI" },
      {
        property: "og:description",
        content:
          "See your extracted profile: skills, experience, education and recommended job titles.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ProfilePage() {
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const stored = getStoredResumeResult<unknown>();
    if (stored) {
      const storedProfile = mapCandidateProfile(stored);
      if (hasCandidateProfileData(storedProfile)) setCandidate(storedProfile);
    }

    const candidateId = getCandidateId();
    if (!candidateId) {
      setLoading(false);
      return;
    }
    fetchCandidateProfile(candidateId)
      .then((data) => {
        if (!active) return;
        if (hasCandidateProfileData(data)) setCandidate(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.message : "Could not load your profile. Please try again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const completion = candidate?.completion;
  const done = completion?.sections.filter((s) => s.done).length ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-16">
          {loading && (
            <div className="mb-8 space-y-4">
              <Skeleton className="h-40 w-full rounded-xl" />
              <div className="grid gap-8 lg:grid-cols-3">
                <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            </div>
          )}
          {!loading && error && (
            <Alert variant="destructive" className="mb-8">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!loading && !candidate && (
            <Card className="mx-auto max-w-xl p-8 text-center sm:p-12">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Briefcase className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
                No candidate profile yet
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload your PDF or DOCX resume to generate a profile from its parsed data.
              </p>
              <Button asChild className="mt-6">
                <Link to="/upload">Upload a resume</Link>
              </Button>
            </Card>
          )}

          {candidate && (
            <>
              <Card className="mb-8 p-6 sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  {candidate.name && (
                    <Avatar className="h-20 w-20 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                        {initials(candidate.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1">
                    {candidate.name && (
                      <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {candidate.name}
                      </h1>
                    )}
                    {candidate.headline && (
                      <p className="mt-1 text-lg text-muted-foreground">{candidate.headline}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                      {candidate.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" /> {candidate.location}
                        </span>
                      )}
                      {candidate.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-4 w-4" /> {candidate.email}
                        </span>
                      )}
                      {candidate.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-4 w-4" /> {candidate.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild>
                      <Link to="/matches">Find jobs</Link>
                    </Button>
                  </div>
                </div>
                {candidate.summary && (
                  <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                    {candidate.summary}
                  </p>
                )}
              </Card>

              <div className="grid gap-8 lg:grid-cols-3">
                {/* Main column */}
                <div className="space-y-8 lg:col-span-2">
                  {/* Skills */}
                  {candidate.skills.length > 0 && (
                    <Card className="p-6 sm:p-8">
                      <SectionHeader icon={Sparkles} title="Extracted Skills" />
                      <div className="mt-5 flex flex-wrap gap-2">
                        {candidate.skills.map((skill) => (
                          <Badge
                            key={skill.name}
                            variant="secondary"
                            className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/15"
                          >
                            {skill.name}
                            {skill.level && (
                              <span className="ml-2 text-xs text-primary/70">{skill.level}</span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Experience */}
                  {candidate.experience.length > 0 && (
                    <Card className="p-6 sm:p-8">
                      <SectionHeader icon={Briefcase} title="Work Experience" />
                      <ol className="mt-6 space-y-6 border-l border-border pl-6">
                        {candidate.experience.map((job) => (
                          <li key={job.role + job.company} className="relative">
                            <span className="absolute -left-[29px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              {(job.role || job.company) && (
                                <h3 className="text-base font-semibold text-foreground">
                                  {job.role}
                                  {job.role && job.company && " · "}
                                  {job.company && (
                                    <span className="text-primary">{job.company}</span>
                                  )}
                                </h3>
                              )}
                              {job.period && (
                                <span className="text-xs text-muted-foreground">{job.period}</span>
                              )}
                            </div>
                            {job.location && (
                              <p className="mt-0.5 text-xs text-muted-foreground">{job.location}</p>
                            )}
                            {job.bullets.length > 0 && (
                              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                                {job.bullets.map((b) => (
                                  <li key={b}>{b}</li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ol>
                    </Card>
                  )}

                  {/* Education */}
                  {candidate.education.length > 0 && (
                    <Card className="p-6 sm:p-8">
                      <SectionHeader icon={GraduationCap} title="Education" />
                      <div className="mt-5 space-y-5">
                        {candidate.education.map((ed) => (
                          <div key={ed.degree} className="rounded-lg border bg-muted/30 p-4">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              {ed.degree && (
                                <h3 className="text-sm font-semibold text-foreground">
                                  {ed.degree}
                                </h3>
                              )}
                              {ed.period && (
                                <span className="text-xs text-muted-foreground">{ed.period}</span>
                              )}
                            </div>
                            {ed.school && (
                              <p className="mt-0.5 text-sm text-primary">{ed.school}</p>
                            )}
                            {ed.detail && (
                              <p className="mt-1 text-xs text-muted-foreground">{ed.detail}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                  {/* Completion */}
                  <Card className="p-6">
                    <SectionHeader icon={Award} title="Profile Completion" />
                    <div className="mt-5 flex items-center gap-4">
                      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-xl font-bold text-primary">
                          {candidate.completion.score}%
                        </span>
                      </div>
                      <div className="flex-1">
                        <Progress value={candidate.completion.score} className="h-2" />
                        <p className="mt-2 text-xs text-muted-foreground">
                          {done} of {candidate.completion.sections.length} sections complete
                        </p>
                      </div>
                    </div>
                    <ul className="mt-5 space-y-2">
                      {candidate.completion.sections.map((s) => (
                        <li key={s.label} className="flex items-center justify-between text-sm">
                          <span className={s.done ? "text-foreground" : "text-muted-foreground"}>
                            {s.label}
                          </span>
                          {s.done ? (
                            <span className="text-xs font-medium text-primary">Done</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not found</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </Card>

                  {/* Recommended roles */}
                  {candidate.recommendedRoles.length > 0 && (
                    <Card className="p-6">
                      <SectionHeader icon={Target} title="Recommended Roles" />
                      <ul className="mt-5 space-y-3">
                        {candidate.recommendedRoles.map((role) => (
                          <li
                            key={role.title}
                            className="rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-sm font-medium text-foreground">
                                {role.title}
                              </span>
                              {role.match > 0 && (
                                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                  <TrendingUp className="h-3 w-3" />
                                  {role.match}%
                                </span>
                              )}
                            </div>
                            {role.match > 0 && (
                              <Progress value={role.match} className="mt-2 h-1.5" />
                            )}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    </div>
  );
}
