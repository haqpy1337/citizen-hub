import JobHistory from "@/components/JobHistory";

export default function HistoryPage() {
  return (
    <div>
      <p className="eyebrow">Logbook // Past Runs</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Job History</h1>
      <p className="mt-2 text-muted">
        All completed and cancelled runs with materials, yields, and earnings. Values
        are recalculated against current live ore prices.
      </p>
      <div className="mt-8">
        <JobHistory />
      </div>
    </div>
  );
}
