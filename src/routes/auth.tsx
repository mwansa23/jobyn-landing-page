import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { setStoredToken, setStoredUser, type CurrentUser } from "@/lib/auth";
import { ApiError, apiRequest } from "@/lib/api";

type TokenResponse = {
  access_token: string;
  token_type?: string;
};

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create your Jobyn AI account" },
      {
        name: "description",
        content:
          "Sign in to Jobyn AI to upload your CV and unlock your AI career snapshot, job matches and cover letters.",
      },
      { property: "og:title", content: "Sign in to Jobyn AI" },
      {
        property: "og:description",
        content: "Access your AI career intelligence workspace on Jobyn AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const credentials = new URLSearchParams({
        username: email.trim(),
        password,
      });
      const tokenResponse = await apiRequest<TokenResponse>("/api/v1/auth/login", {
        method: "POST",
        body: credentials,
        auth: false,
      });
      if (!tokenResponse.access_token) {
        throw new ApiError("The server did not return an access token.", 502);
      }
      setStoredToken(tokenResponse.access_token);

      const user = await apiRequest<CurrentUser>("/api/v1/auth/me", {
        method: "GET",
        auth: false,
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      setStoredUser(user);
      navigate({ to: "/upload" });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 401
            ? "Invalid username or password. Please try again."
            : err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-md px-4 py-16 sm:py-24">
          <div className="mb-8 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Jobyn AI
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to continue your AI career analysis.
            </p>
          </div>

          <Card className="p-6">
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Username or email</Label>
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive" role="alert" className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
}
