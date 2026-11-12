import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase,
  MapPin,
  Sparkles,
  TrendingUp,
  Check,
  X,
  ArrowRight,
  Building2,
  Shield,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "Job Matches — Jobyn AI" },
      {
        name: "description",
        content:
          "AI-ranked job matches with explanations: matching skills, missing skills, and why each role fits your CV.",
      },
      { property: "og:title", content: "Job Matches — Jobyn AI" },
      {
        property: "og:description",
        content: "See personalized job matches with AI explanations for each recommendation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MatchesPage,
});

const jobs = [
  {
    id: "1",
    title: "Staff Frontend Engineer",
    company: "Linear",
    location: "Remote · EU",
    salary: "€130–160k",
    match: 94,
    matching: ["React", "TypeScript", "Design Systems", "Performance"],
    missing: ["System Design at scale"],
    explanation:
      "This role matches because your design-system leadership and React performance work directly mirror the team's staff-level scope.",
  },
  {
    id: "2",
    title: "Frontend Tech Lead",
    company: "Vercel",
    location: "Berlin · Hybrid",
    salary: "€120–150k",
    match: 91,
    matching: ["Next.js", "TypeScript", "Mentoring"],
    missing: ["Team headcount ownership"],
    explanation:
      "Your Next.js migration and mentoring track record align closely with what Vercel expects from a technical lead.",
  },
  {
    id: "3",
    title: "Design Systems Engineer",
    company: "Framer",
    location: "Amsterdam · Hybrid",
    salary: "€100–130k",
    match: 82,
    matching: ["Design Systems", "Tailwind CSS", "Figma"],
    missing: ["Multi-brand theming"],
    explanation:
      "Your internal design-system work at Northwind Labs is exactly the profile Framer is hiring for on this team.",
  },
  {
    id: "4",
    title: "Senior Full-Stack Engineer",
    company: "Supabase",
    location: "Remote · Global",
    salary: "€110–140k",
    match: 78,
    matching: ["React", "TypeScript", "Node.js"],
    missing: ["PostgreSQL depth", "Realtime systems"],
    explanation:
      "Strong frontend match; adding backend depth (Postgres, realtime) would push this above 90%.",
  },
];

function MatchesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-gradient-to-b from-primary/[0.04] to-background">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" /> AI Job Matching
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Roles hand-picked for your profile
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Each match is scored and explained. See exactly which skills line up — and which ones
              would take you to the next level.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="grid gap-6">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className="overflow-hidden border-border/70 p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 sm:p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">{job.title}</h2>
                      <p className="mt-0.5 text-sm text-primary">{job.company}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" /> {job.salary}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-1 rounded-full bg-[color:var(--emerald-soft)] px-3 py-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        <TrendingUp className="h-3.5 w-3.5" /> {job.match}% match
                      </div>
                    </div>
                  </div>
                </div>

                <Progress value={job.match} className="mt-5 h-1.5" />

                {/* Why these jobs */}
                <div className="mt-6 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] to-[color:var(--emerald-soft)]/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Why this job?
                      </p>
                      <p className="mt-1 text-sm text-foreground">{job.explanation}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Matching skills
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {job.matching.map((s) => (
                        <Badge
                          key={s}
                          className="rounded-full bg-[color:var(--emerald-soft)] px-2.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-[color:var(--emerald-soft)] dark:text-emerald-300"
                        >
                          <Check className="mr-1 h-3 w-3" /> {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Skills to grow
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {job.missing.map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="rounded-full border-amber-500/40 bg-amber-500/5 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300"
                        >
                          <X className="mr-1 h-3 w-3" /> {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to="/cover-letter">
                      Generate cover letter <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline">Save role</Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-10 flex items-start gap-3 rounded-xl border border-border/70 bg-surface/60 p-5 text-sm text-muted-foreground">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Matches are AI-generated from your CV and public job data. We recommend a quick human
              review before applying to any role.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
