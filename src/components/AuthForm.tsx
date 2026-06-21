"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      username: form.get("username"),
      password: form.get("password"),
    };

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push(params.get("redirect") || "/dashboard");
      router.refresh();
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="eyebrow mb-8 hover:text-quant">
        &larr; haqpy's Miner Assistant
      </Link>

      <div className="panel p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="font-display text-3xl font-bold text-quant">hMA</span>
          <div className="h-8 w-px bg-edge" />
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {isRegister ? "Create account" : "Sign in"}
          </h1>
        </div>
        <p className="mb-6 text-sm text-muted">
          {isRegister
            ? "Set up your personal mining logbook."
            : "Back to your dashboard."}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              className="field"
              placeholder="e.g. RockHopper"
            />
            {isRegister && (
              <p className="mt-1 font-mono text-xs text-muted">
                Letters, numbers, _ and - only. Min. 3 characters.
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="field"
              placeholder={isRegister ? "min. 8 characters" : "••••••••"}
            />
          </div>

          {error && (
            <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Please wait…" : isRegister ? "Register" : "Sign in"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        {isRegister ? (
          <>
            Already registered?{" "}
            <Link href="/login" className="text-quant hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            No account yet?{" "}
            <Link href="/register" className="text-quant hover:underline">
              Create account
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
