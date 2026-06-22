import RefineriesView from "@/components/RefineriesView";

export default function RefineriesPage() {
  return (
    <div>
      <p className="eyebrow">Network // Stations</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
        Refineries
      </h1>
      <p className="mt-2 text-muted">
        All refinery stations with live queue times, yield rates, and supported ores.
        Use this to pick the fastest or most efficient station for your run.
      </p>

      <div className="mt-8">
        <RefineriesView />
      </div>
    </div>
  );
}
