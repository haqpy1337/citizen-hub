import Link from "next/link";
import JobsBoard from "@/components/JobsBoard";

export default function JobsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Logbook // Active</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
            My Jobs
          </h1>
        </div>
        <Link href="/dashboard/jobs/new" className="btn-primary">
          + New Job
        </Link>
      </div>
      <p className="mt-2 text-muted">
        All your refinery runs — currently processing, ready to collect, and archived.
      </p>

      <div className="mt-8">
        <JobsBoard variant="all" />
      </div>
    </div>
  );
}
