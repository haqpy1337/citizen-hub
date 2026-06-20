import OreTable from "@/components/OreTable";

export default function OresPage() {
  return (
    <div>
      <p className="eyebrow">Live // UEX Network</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Ore Prices</h1>
      <p className="mt-2 text-muted">
        All mineable and refined commodities with current prices, weights and flags.
        Click a name to open the Star Citizen wiki entry.
      </p>
      <div className="mt-8">
        <OreTable />
      </div>
    </div>
  );
}
