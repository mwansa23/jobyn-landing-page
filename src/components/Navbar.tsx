import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X, Sparkles } from "lucide-react";
import { isAuthenticated, logout } from "@/lib/auth";
import { toast } from "sonner";

const navLinks = [
  { label: "Upload CV", to: "/upload" },
  { label: "CV Tailoring", to: "/cv-tailoring" },
  { label: "Cover Letter Generator", to: "/cover-letter" },
  { label: "Application Package Builder", to: "/application-package" },
  { label: "Snapshot", to: "/snapshot" },
  { label: "Profile", to: "/profile" },
  { label: "Career Coach", to: "/coach" },
  { label: "Matches", to: "/matches" },
  { label: "Admin", to: "/admin" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void isAuthenticated()
      .then((authenticated) => {
        if (active) setSignedIn(authenticated);
      })
      .catch((error: unknown) => {
        if (active)
          toast.error(error instanceof Error ? error.message : "Could not check your session.");
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setSignedIn(false);
      navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not log out.");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-foreground">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight">Jobyn AI</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {signedIn ? (
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Log out
            </button>
          ) : (
            <Link
              to="/auth"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Log in
            </Link>
          )}

          <Link
            to="/upload"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Upload CV
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-border/50 bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6 lg:px-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border/50 pt-3">
              {signedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    void handleLogout();
                  }}
                  className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Log out
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Log in
                </Link>
              )}

              <Link
                to="/upload"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Upload CV
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
