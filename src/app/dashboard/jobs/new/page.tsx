import JobForm from "@/components/JobForm";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: { station?: string };
}) {
  const initialStation = searchParams.station ?? undefined;

  return (
    <div>
      <p className="eyebrow">Logbook // New Run</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
        Log Refinery Drop
      </h1>
      <p className="mt-2 text-muted">
        Record what you just dropped off at a refinery station. Select from the live
        station list or enter manually.
      </p>

      <div className="mt-8">
        <JobForm initialStation={initialStation} />
      </div>
    </div>
  );
}
