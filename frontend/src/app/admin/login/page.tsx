/**
 * Admin Login Page (/admin/login)
 *
 * The one admin route exempt from the auth guard in middleware.ts.
 * Posts credentials to /api/admin/login, which sets the session cookie,
 * then redirects into /admin/dashboard (or the originally requested page).
 */
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function loginErrorMessage(status: number, serverMessage?: string): string {
  if (status === 401 || status === 429 || status === 400) return serverMessage ?? "Unable to sign in.";
  if (status === 403) {
    return "The server rejected this site's address. Add this site's URL to FRONTEND_URL on Render.";
  }
  if (status >= 500 || status === 404) {
    return "The server isn't responding yet. It may be waking up — wait 30–60 seconds and try again.";
  }
  return serverMessage ?? "Unable to sign in.";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      // The proxy can return an HTML error page (502/504) while Render wakes up,
      // so never assume the body is JSON.
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(loginErrorMessage(response.status, data?.error));
        setSubmitting(false);
        return;
      }
      router.push(searchParams.get("next") ?? "/admin/dashboard");
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
      <Input label="Email" name="email" type="email" required autoComplete="username" />
      <Input label="Password" name="password" type="password" required autoComplete="current-password" />
      {error && (
        <p role="alert" className="text-sm text-rust">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-parchment px-6">
      <div className="w-full max-w-sm">
        <p className="text-center text-sm uppercase tracking-[0.2em] text-brass">Rock n Logs</p>
        <h1 className="mt-2 text-center font-display text-3xl text-ink">Staff sign in</h1>
        <div className="mt-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
