"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { translations, type Lang } from "@/lib/i18n";
import PrismLogo from "@/components/PrismLogo";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate lang from localStorage after mount (SSR guard)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hma-lang") as Lang | null;
      if (stored === "de" || stored === "en") setLangState(stored);
    } catch {
      // localStorage not available (SSR)
    }
  }, []);

  function toggleLang() {
    const next: Lang = lang === "en" ? "de" : "en";
    setLangState(next);
    try {
      localStorage.setItem("hma-lang", next);
    } catch {
      // ignore
    }
  }

  const t = translations[lang].auth;

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 relative">
      {/* Language toggle */}
      <button
        onClick={toggleLang}
        className="absolute top-6 right-6 font-mono text-xs text-muted hover:text-ink transition border border-edge rounded px-2 py-1"
      >
        {lang === "en" ? "DE" : "EN"}
      </button>

      <Link href="/" className="eyebrow mb-8 hover:text-quant">
        {t.back}
      </Link>

      <div className="panel p-7">
        <div className="mb-6 flex items-center gap-4">
          <PrismLogo height={36} />
          <div className="h-8 w-px bg-edge" />
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {isRegister ? t.createAccount : t.signIn}
          </h1>
        </div>
        <p className="mb-6 text-sm text-muted">
          {isRegister ? t.setupSubtitle : t.backSubtitle}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="username">
              {t.username}
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              className="field"
              placeholder={t.usernamePlaceholder}
            />
            {isRegister && (
              <p className="mt-1 font-mono text-xs text-muted">
                {t.usernameHint}
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="password">
              {t.password}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="field"
              placeholder={isRegister ? t.passwordPlaceholder : "••••••••"}
            />
          </div>

          {error && (
            <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? t.pleaseWait : isRegister ? t.register : t.signIn}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        {isRegister ? (
          <>
            {t.alreadyRegistered}{" "}
            <Link href="/login" className="text-quant hover:underline">
              {t.signIn}
            </Link>
          </>
        ) : (
          <>
            {t.noAccount}{" "}
            <Link href="/register" className="text-quant hover:underline">
              {t.createAccount}
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
