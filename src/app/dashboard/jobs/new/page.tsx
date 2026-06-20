import JobForm from "@/components/JobForm";

export default function NewJobPage() {
  return (
    <div>
      <p className="eyebrow">New Entry</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
        Create Refinery Job
      </h1>
      <p className="mt-2 text-muted">
        Log what you just dropped off in-game. Pick a station and ores from the
        live list, or type them in manually.
      </p>

      <div className="mt-8">
        <JobForm />
      </div>
    </div>
  );
}
