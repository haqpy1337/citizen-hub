import TradeRoutes from "@/components/TradeRoutes";

export default function TradePage() {
  return (
    <div>
      <p className="eyebrow">Market // Live Routes</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Trade Routes</h1>
      <p className="mt-2 text-muted">
        Best buy → sell routes sorted by profit per SCU. Live prices via UEX Corp API.
      </p>
      <div className="mt-8">
        <TradeRoutes />
      </div>
    </div>
  );
}
