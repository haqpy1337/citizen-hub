import JobForm from "@/components/JobForm";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: { station?: string };
}) {
  const initialStation = searchParams.station ?? undefined;

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
        <JobForm initialStation={initialStation} />
      </div>
    </div>
  );
}
