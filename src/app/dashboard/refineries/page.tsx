import RefineriesView from "@/components/RefineriesView";

export default function RefineriesPage() {
  return (
    <div>
      <p className="eyebrow">Live // UEX Network</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
        Refineries in the Verse
      </h1>
      <p className="mt-2 text-muted">
        All stations with a refinery, their current queue times and best yields.
        Sortable and filterable.
      </p>

      <div className="mt-8">
        <RefineriesView />
      </div>
    </div>
  );
}
