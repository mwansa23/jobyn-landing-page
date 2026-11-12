import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles,
  Target,
  TrendingUp,
  CheckCircle2,
  Plus,
  ArrowRight,
  Compass,
  ClipboardList,
  MessageSquare,
  Rocket,
  Award,
  Lightbulb,
  BookOpen,
  Briefcase,
  ShieldCheck,
  FileSearch,
  Brain,
  ScanLine,
  GraduationCap,
  Layers,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ApiError } from "@/lib/api";
import { fetchLatestCareerCoach, type CareerCoachData } from "@/lib/career";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "AI Career Coach — Jobyn AI" },
      {
        name: "description",
        content:
          "Personalized AI career guidance: readiness score, strengths, skill gaps, career roadmap, and a 30-day action plan tailored to your resume.",
      },
      { property: "og:title", content: "AI Career Coach — Jobyn AI" },
      {
        property: "og:description",
        content:
          "Discover your career readiness and get an AI-generated roadmap, action plan, and interview prep — all in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoachPage,
});

const EMPTY_COACH_DATA: CareerCoachData = {
  career_level: "",
  readiness_score: 0,
  summary: "",
  strengths: [],
  current_skills: [],
  skill_gaps: [],
  roadmap: [],
  action_plan: [],
  interview_topics: [],
  recommendations: [],
  reasoning: { evidence: [], reasoning: [], explanations: [] },
};

function ScoreRing({ value }: { value: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={radius} className="fill-none stroke-muted" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          className="fill-none stroke-primary transition-all duration-1000"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight text-foreground">
          {value}
          <span className="text-lg text-muted-foreground">%</span>
        </span>
        <span className="text-xs font-medium text-muted-foreground">Ready</span>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

function CoachSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-56 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-64 w-full rounded-xl lg:col-span-3" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}

function CoachPage() {
  const [coach, setCoach] = useState<CareerCoachData>(EMPTY_COACH_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchLatestCareerCoach()
      .then((data) => {
        if (!active) return;
        setCoach(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load your career coach. Please try again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const {
    readiness_score,
    summary,
    strengths,
    current_skills,
    skill_gaps,
    roadmap,
    action_plan,
    interview_topics,
    recommendations,
    career_level,
    reasoning,
  } = coach;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/50">
          <div className="hero-glow absolute inset-0 -z-10" />
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/15">
                <Sparkles className="mr-1 h-3 w-3" />
                AI Career Coach
              </Badge>
              <Badge variant="outline" className="border-primary/20 text-muted-foreground">
                Personalized for you
              </Badge>
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Your AI-guided career game plan
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              A personalized coach that reads your resume, spots opportunities, and tells you
              exactly what to do next.
            </p>
          </div>
        </section>

        {loading ? (
          <CoachSkeleton />
        ) : error ? (
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:px-8">
            {/* Summary + Readiness */}
            <section className="grid gap-6 lg:grid-cols-3">
              <Card className="relative overflow-hidden border-primary/20 p-6 lg:col-span-2">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Career intelligence summary
                    </span>
                  </div>
                  <p className="mt-4 text-lg leading-relaxed text-foreground">{summary}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Briefcase className="h-3 w-3" />
                      Level: {career_level}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Trajectory: On track
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card className="flex flex-col items-center justify-center p-6 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Career readiness
                </span>
                <div className="mt-3">
                  <ScoreRing value={readiness_score} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Based on skills, experience, education, resume quality, and market alignment.
                </p>
              </Card>
            </section>

            {/* AI Reasoning & Evidence */}
            <section>
              <SectionHeader
                eyebrow="Explainable AI"
                title="How AI generated your career insights"
                description="Full transparency into the evidence, reasoning, and explanations behind every recommendation."
              />
              <Card className="relative overflow-hidden p-6 sm:p-8">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
                <div className="relative grid gap-8 lg:grid-cols-3">
                  {/* Evidence */}
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <FileSearch className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        Resume evidence detected
                      </span>
                    </div>
                    <ul className="mt-4 space-y-3">
                      {reasoning.evidence.map((e) => {
                        const Icon =
                          e.icon === "briefcase"
                            ? Briefcase
                            : e.icon === "layers"
                              ? Layers
                              : e.icon === "graduation"
                                ? GraduationCap
                                : ScanLine;
                        return (
                          <li
                            key={e.label}
                            className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/60 p-3 backdrop-blur-sm"
                          >
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium text-muted-foreground">
                                  {e.label}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] uppercase tracking-wider"
                                >
                                  Detected
                                </Badge>
                              </div>
                              <p className="mt-0.5 text-sm font-semibold text-foreground">
                                {e.value}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">{e.detail}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Reasoning timeline */}
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <Brain className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        AI reasoning
                      </span>
                    </div>
                    <ol className="relative mt-4 space-y-4 border-l border-primary/20 pl-6">
                      {reasoning.reasoning.map((step, i) => (
                        <li key={i} className="relative">
                          <span className="absolute -left-[29px] grid h-6 w-6 place-items-center rounded-full border border-primary/30 bg-background text-[11px] font-semibold text-primary">
                            {i + 1}
                          </span>
                          <p className="text-sm leading-relaxed text-foreground">{step}</p>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-5 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <p className="text-xs text-muted-foreground">
                        Reasoning steps are generated from your resume signals and current job
                        market patterns.
                      </p>
                    </div>
                  </div>

                  {/* Recommendation explanations */}
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <Lightbulb className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        Recommendation explanation
                      </span>
                    </div>
                    <ul className="mt-4 space-y-3">
                      {reasoning.explanations.map((e) => (
                        <li
                          key={e.role}
                          className="rounded-lg border border-border/60 bg-background/60 p-4 backdrop-blur-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Target className="h-3.5 w-3.5 text-primary" />
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Career recommendation
                            </p>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-foreground">{e.role}</p>
                          <p className="mt-2 text-xs font-medium text-muted-foreground">Why:</p>
                          <p className="mt-0.5 text-sm text-foreground">{e.why}</p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {e.badges.map((b) => (
                              <Badge key={b} variant="secondary" className="gap-1 text-xs">
                                <CheckCircle2 className="h-3 w-3 text-primary" />
                                {b}
                              </Badge>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            </section>

            {/* Strengths */}
            <section>
              <SectionHeader
                eyebrow="Strengths"
                title="Professional strengths"
                description="What already makes you stand out to hiring teams."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {strengths.map((s) => (
                  <Card key={s.title} className="p-5 transition-shadow hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Award className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{s.explanation}</p>
                        <p className="mt-3 rounded-md bg-muted/60 p-3 text-xs italic text-muted-foreground">
                          <span className="font-medium not-italic text-foreground">Evidence:</span>{" "}
                          {s.evidence}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            {/* Skills Gap */}
            <section>
              <SectionHeader
                eyebrow="Skill gaps"
                title="What can improve your career opportunities?"
                description="A focused list of high-leverage skills to add next."
              />
              <div className="grid gap-6 lg:grid-cols-5">
                <Card className="p-5 lg:col-span-2">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">
                      Current skills
                    </h3>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {current_skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </Card>

                <Card className="p-5 lg:col-span-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Plus className="h-4 w-4" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">
                      Recommended skills
                    </h3>
                  </div>
                  <ul className="mt-4 space-y-4">
                    {skill_gaps.map((g) => (
                      <li
                        key={g.skill}
                        className="rounded-lg border border-border/60 bg-muted/30 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-foreground">{g.skill}</p>
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/15">
                            High impact
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Why:</span> {g.why}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Impact:</span> {g.impact}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </section>

            {/* Roadmap */}
            <section>
              <SectionHeader
                eyebrow="Roadmap"
                title="Your career roadmap"
                description="A realistic path from where you are to where you're going."
              />
              <div className="grid gap-4 md:grid-cols-3">
                {roadmap.map((step, idx) => (
                  <Card key={step.stage} className="relative p-5 transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-2 text-primary">
                      <Compass className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        {step.stage}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">{step.role}</h3>
                    <ul className="mt-4 space-y-2">
                      {step.actions.map((a) => (
                        <li
                          key={a}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex items-center gap-1">
                      {roadmap.map((_, i) => (
                        <span
                          key={i}
                          className={`h-1 flex-1 rounded-full ${
                            i <= idx ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            {/* Action Plan + Interview */}
            <section className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <div className="flex items-center gap-2 text-primary">
                  <ClipboardList className="h-4 w-4" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider">
                    Your next 30 days
                  </h3>
                </div>
                <h4 className="mt-1 text-xl font-bold text-foreground">Personalized action plan</h4>
                <ul className="mt-5 space-y-3">
                  {action_plan.map((task, i) => (
                    <li
                      key={task}
                      className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary/5 text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground">{task}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  <Progress value={20} className="h-2" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    1 of 5 steps started — keep the momentum going.
                  </p>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-2 text-primary">
                  <MessageSquare className="h-4 w-4" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider">
                    Interview preparation
                  </h3>
                </div>
                <h4 className="mt-1 text-xl font-bold text-foreground">
                  Based on your profile, prepare for questions about:
                </h4>
                <ul className="mt-5 space-y-3">
                  {interview_topics.map((topic) => (
                    <li key={topic} className="flex items-start gap-3">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm text-foreground">{topic}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs text-muted-foreground">
                    Tip: rehearse 2–3 concrete stories per topic using the STAR method (Situation,
                    Task, Action, Result).
                  </p>
                </div>
              </Card>
            </section>

            {/* Recommended paths */}
            <section>
              <SectionHeader
                eyebrow="AI career recommendations"
                title="Recommended career paths"
                description="Roles the AI believes fit you best right now, and how to strengthen each."
              />
              <div className="grid gap-4 md:grid-cols-3">
                {recommendations.map((r) => (
                  <Card
                    key={r.role}
                    className="relative overflow-hidden p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-primary">
                          <Target className="h-4 w-4" />
                          <span className="text-xs font-semibold uppercase tracking-wider">
                            Match {r.match}%
                          </span>
                        </div>
                        <h3 className="mt-1 text-lg font-semibold text-foreground">{r.role}</h3>
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Rocket className="h-5 w-5" />
                      </div>
                    </div>
                    <Progress value={r.match} className="mt-3 h-1.5" />
                    <p className="mt-4 text-sm text-muted-foreground">{r.why}</p>
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Required skills
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.required.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Improve:</span> {r.improve}
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-8 text-center sm:p-12">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Ready to act on your plan?
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                See tailored job matches or generate a cover letter aligned with your strengths and
                roadmap.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  to="/matches"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  View job matches
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/cover-letter"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  Generate cover letter
                </Link>
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
