import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  FileText,
  Briefcase,
  PenTool,
  Upload,
  ArrowRight,
  Check,
  Sparkles,
  Zap,
  Shield,
} from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import heroImage from "@/assets/hero-jobyn-ai.png";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Jobyn AI — AI-Powered Career Assistant" },
      {
        name: "description",
        content:
          "Jobyn AI helps you land your next role with AI resume analysis, smart job matching, and personalized cover letters. Upload your CV and get started today.",
      },
      { property: "og:title", content: "Jobyn AI — AI-Powered Career Assistant" },
      {
        property: "og:description",
        content:
          "AI resume analysis, smart job matching, and personalized cover letters in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const features = [
  {
    icon: FileText,
    title: "Resume Analysis",
    description:
      "Get instant, actionable feedback on your CV. Jobyn AI checks structure, keywords, and impact so recruiters notice you.",
  },
  {
    icon: Briefcase,
    title: "Job Matching",
    description:
      "Discover roles that fit your skills and goals. Our AI scans thousands of listings and ranks them by your personal fit.",
  },
  {
    icon: PenTool,
    title: "AI Cover Letter Generator",
    description:
      "Generate tailored cover letters in seconds. Each one is crafted for the specific job and your unique experience.",
  },
];

const benefits = [
  "ATS-friendly resume suggestions",
  "Personalized job recommendations",
  "Cover letters tailored per application",
  "Privacy-first, secure document handling",
];

function Hero() {
  return (
    <section className="relative overflow-hidden hero-glow">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Career Intelligence Platform</span>
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Discover how AI sees <span className="text-primary">your career</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Upload your CV to receive a personalized career profile, intelligent job matches, and
              application-ready documents — in under a minute.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/upload"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30"
              >
                Upload Your CV
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/"
                hash="features"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-base font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Explore features
              </Link>
            </div>
            <ul className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
              {benefits.slice(0, 3).map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-primary/5 to-primary-glow/10 p-2 shadow-2xl shadow-primary/10 ring-1 ring-primary/10 sm:max-w-lg">
              <img
                src={heroImage}
                alt="Jobyn AI assistant analyzing a resume"
                width={1024}
                height={1024}
                className="w-full rounded-xl object-cover"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UploadSection() {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <section id="upload" className="w-full bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-glow p-1 shadow-2xl shadow-primary/20">
          <div className="rounded-[22px] bg-background px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Upload Your CV
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Drag and drop your resume or click to browse. Jobyn AI will analyze it and unlock
                your personalized career insights.
              </p>

              <div
                role="button"
                tabIndex={0}
                aria-label="Upload CV"
                className={`mt-8 flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-10 transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border bg-surface hover:border-primary/50 hover:bg-primary/5"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onClick={() => {
                  // Placeholder for file picker integration
                }}
              >
                <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="text-base font-medium text-foreground">
                    Drop your resume here, or click to select a file
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Supports PDF, DOCX, and TXT up to 10MB
                  </p>
                </div>
                <span className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                  Choose file
                </span>
              </div>

              <p className="mt-6 text-sm text-muted-foreground">
                No account required to preview. Your data is processed securely and never shared.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="w-full bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
            <Zap className="h-3.5 w-3.5" />
            <span>Powerful features</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to get hired
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Three AI tools designed to help you stand out, save time, and apply with confidence.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-background p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-3 text-base text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section id="about" className="w-full bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Built for serious job seekers
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We combine modern AI with recruitment expertise to give you an edge at every stage of
              the application process.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { label: "Instant feedback", value: "< 60s" },
                { label: "Job match accuracy", value: "95%" },
                { label: "Users assisted", value: "50K+" },
                { label: "Documents analyzed", value: "200K+" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border bg-surface p-5">
                  <p className="text-3xl font-bold text-primary">{stat.value}</p>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Privacy-first by design</h3>
            </div>
            <p className="mt-4 text-muted-foreground">
              Your CV and personal data are encrypted at rest and in transit. We never sell your
              information, and you can delete your documents at any time.
            </p>
            <ul className="mt-6 space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3">
                  <div className="grid h-5 w-5 place-items-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section id="pricing" className="w-full bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Ready to accelerate your job search?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Join thousands of job seekers using Jobyn AI to get noticed and hired faster.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/upload"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30"
          >
            Upload Your CV
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/"
            hash="features"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-base font-semibold text-foreground transition-colors hover:bg-accent"
          >
            See how it works
          </Link>
        </div>
      </div>
    </section>
  );
}

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <UploadSection />
        <Features />
        <TrustSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
