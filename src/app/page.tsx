import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PrismLogo from "@/components/PrismLogo";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6">
      <p className="eyebrow mb-6">Star Citizen // Operations</p>
      <div className="mb-6">
        <PrismLogo height={120} />
      </div>
      <p className="mt-2 max-w-xl text-muted">
        Live quotes, yields and prices for every refinery in the Verse — plus a
        personal dashboard showing which of your jobs are still running and how
        long they have left.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/register" className="btn-primary">
          Create account
        </Link>
        <Link href="/login" className="btn-ghost">
          Sign in
        </Link>
      </div>

      <dl className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Live Data", "Quotes, yields & prices via UEX API"],
          ["Job Timer", "See in real time what's still processing"],
          ["Per Account", "Your own data, your own dashboard"],
        ].map(([title, sub]) => (
          <div key={title} className="panel p-4">
            <div className="font-display text-lg font-semibold text-ink">{title}</div>
            <div className="mt-1 text-sm text-muted">{sub}</div>
          </div>
        ))}
      </dl>
    </main>
  );
}
