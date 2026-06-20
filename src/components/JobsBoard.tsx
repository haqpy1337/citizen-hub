"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import JobCard from "./JobCard";
import type { Job } from "@/lib/clientTypes";

export default function JobsBoard({ variant }: { variant: "active" | "all" }) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setJobs(data.jobs);
    } catch {
      setError("Failed to load jobs.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="panel p-6 text-sm text-danger">{error}</div>
    );
  }

  if (jobs === null) {
    return <div className="panel p-6 text-sm text-muted">Loading jobs…</div>;
  }

  const visible =
    variant === "active"
      ? jobs.filter((j) => j.status === "running")
      : jobs.filter((j) => j.status === "running");

  if (visible.length === 0) {
    return (
      <div className="panel flex flex-col items-start gap-3 p-8">
        <p className="text-muted">
          {variant === "active"
            ? "No jobs currently running."
            : "You have no jobs yet."}
        </p>
        <Link href="/dashboard/jobs/new" className="btn-primary">
          Start a job
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {visible.map((job) => (
        <JobCard key={job.id} job={job} onChange={load} />
      ))}
    </div>
  );
}
