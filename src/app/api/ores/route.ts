import { NextResponse } from "next/server";
import { uexFetch } from "@/lib/uex/client";
import { UexCommodity } from "@/lib/uex/types";

export interface FullOre {
  id: number;
  name: string;
  code: string;
  kind: string;
  weightScu: number | null;
  priceBuy: number | null;
  priceSell: number | null;
  isRaw: boolean;
  isRefined: boolean;
  isRefinable: boolean;
  isVolatileQt: boolean;
  isIllegal: boolean;
  parentId: number | null;
  wiki: string | null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeAll = searchParams.get("all") === "1";

  const all = await uexFetch<UexCommodity & {
    kind?: string;
    weight_scu?: number;
    price_buy?: number;
    price_sell?: number;
    is_volatile_qt?: number;
    is_illegal?: number;
    id_parent?: number;
    wiki?: string;
    is_raw?: number;
    is_refined?: number;
  }>("commodities");

  // Default: only sellable ores. With ?all=1: include all mineable/refinable ores too.
  const ores = all
    .filter((c) => includeAll
      ? (c.is_refinable === 1 || c.is_extractable === 1 || (c as any).is_refined === 1)
      : (c as any).price_sell > 0
    )
    .map((c): FullOre => ({
      id: c.id,
      name: c.name,
      code: c.code ?? "",
      kind: (c as any).kind ?? "—",
      weightScu: (c as any).weight_scu ?? null,
      priceBuy: (c as any).price_buy || null,
      priceSell: (c as any).price_sell || null,
      isRaw: c.is_raw === 1,
      isRefined: c.is_refined === 1,
      isRefinable: c.is_refinable === 1,
      isVolatileQt: (c as any).is_volatile_qt === 1,
      isIllegal: (c as any).is_illegal === 1,
      parentId: (c as any).id_parent ?? null,
      wiki: (c as any).wiki ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ ores });
}
