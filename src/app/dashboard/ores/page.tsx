import OreTable from "@/components/OreTable";

export default function OresPage() {
  return (
    <div>
      <p className="eyebrow">Market // Commodities</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Ore Prices</h1>
      <p className="mt-2 text-muted">
        Raw and refined commodities with live prices, density, and flags. Click a row
        to show the best sell locations for that ore.
      </p>
      <div className="mt-8">
        <OreTable />
      </div>
    </div>
  );
}
