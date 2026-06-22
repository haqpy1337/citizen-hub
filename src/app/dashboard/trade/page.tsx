import TradeRoutes from "@/components/TradeRoutes";

export default function TradePage() {
  return (
    <div>
      <p className="eyebrow">Market // Trade</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Trade Routes</h1>
      <p className="mt-2 text-muted">
        Best buy→sell commodity routes ranked by profit per SCU. Filter by cargo size
        or investment to find routes within your budget.
      </p>
      <div className="mt-8">
        <TradeRoutes />
      </div>
    </div>
  );
}
