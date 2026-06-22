export type Concentration = "high" | "medium" | "low";

export type MiningOre = {
  name: string; // matches commodity name prefix, e.g. "Quantanium"
  concentration: Concentration;
};

export type MiningLocation = {
  id: string;
  name: string;
  type: "moon" | "planet" | "asteroid_belt" | "lagrange";
  system: string;
  body: string; // parent planet/star
  nearestRefineries: string[]; // ordered by proximity
  ores: MiningOre[];
  notes?: string;
};

export const MINING_LOCATIONS: MiningLocation[] = [
  // ── ArcCorp ──────────────────────────────────────────────────────────────
  {
    id: "lyria",
    name: "Lyria",
    type: "moon",
    system: "Stanton",
    body: "ArcCorp",
    nearestRefineries: ["ARC-L1 Wide Forest Station", "ARC-L2 Lively Pathway Station"],
    ores: [
      { name: "Quantanium", concentration: "high" },
      { name: "Bexalite", concentration: "high" },
      { name: "Hephaestanite", concentration: "medium" },
      { name: "Borase", concentration: "medium" },
      { name: "Laranite", concentration: "low" },
      { name: "Titanium", concentration: "low" },
    ],
  },
  {
    id: "wala",
    name: "Wala",
    type: "moon",
    system: "Stanton",
    body: "ArcCorp",
    nearestRefineries: ["ARC-L1 Wide Forest Station", "ARC-L2 Lively Pathway Station"],
    ores: [
      { name: "Taranite", concentration: "high" },
      { name: "Bexalite", concentration: "medium" },
      { name: "Aphorite", concentration: "medium" },
      { name: "Agricium", concentration: "low" },
      { name: "Copper", concentration: "low" },
    ],
  },

  // ── Hurston ──────────────────────────────────────────────────────────────
  {
    id: "arial",
    name: "Arial",
    type: "moon",
    system: "Stanton",
    body: "Hurston",
    nearestRefineries: ["HUR-L1 Green Glade Station", "HUR-L2 Faithful Dream Station"],
    ores: [
      { name: "Laranite", concentration: "high" },
      { name: "Bexalite", concentration: "medium" },
      { name: "Tungsten", concentration: "medium" },
      { name: "Titanium", concentration: "low" },
    ],
  },
  {
    id: "magda",
    name: "Magda",
    type: "moon",
    system: "Stanton",
    body: "Hurston",
    nearestRefineries: ["HUR-L3 Thundering Express Station", "HUR-L4 Melodic Fields Station"],
    ores: [
      { name: "Taranite", concentration: "high" },
      { name: "Borase", concentration: "high" },
      { name: "Agricium", concentration: "medium" },
      { name: "Iron", concentration: "low" },
    ],
  },
  {
    id: "aberdeen",
    name: "Aberdeen",
    type: "moon",
    system: "Stanton",
    body: "Hurston",
    nearestRefineries: ["HUR-L1 Green Glade Station", "HUR-L5 High Course Station"],
    ores: [
      { name: "Borase", concentration: "high" },
      { name: "Agricium", concentration: "medium" },
      { name: "Corundum", concentration: "medium" },
      { name: "Copper", concentration: "low" },
    ],
  },
  {
    id: "ita",
    name: "Ita",
    type: "moon",
    system: "Stanton",
    body: "Hurston",
    nearestRefineries: ["HUR-L5 High Course Station"],
    ores: [
      { name: "Agricium", concentration: "medium" },
      { name: "Titanium", concentration: "medium" },
      { name: "Quartz", concentration: "low" },
    ],
  },

  // ── Crusader ─────────────────────────────────────────────────────────────
  {
    id: "cellin",
    name: "Cellin",
    type: "moon",
    system: "Stanton",
    body: "Crusader",
    nearestRefineries: ["CRU-L1 Ambitious Dream Station", "CRU-L5 Beautiful Glen Station"],
    ores: [
      { name: "Hephaestanite", concentration: "high" },
      { name: "Aphorite", concentration: "medium" },
      { name: "Copper", concentration: "medium" },
      { name: "Iron", concentration: "low" },
    ],
  },
  {
    id: "daymar",
    name: "Daymar",
    type: "moon",
    system: "Stanton",
    body: "Crusader",
    nearestRefineries: ["CRU-L1 Ambitious Dream Station", "CRU-L5 Beautiful Glen Station"],
    ores: [
      { name: "Aphorite", concentration: "high" },
      { name: "Agricium", concentration: "medium" },
      { name: "Corundum", concentration: "medium" },
      { name: "Quartz", concentration: "low" },
    ],
  },
  {
    id: "yela",
    name: "Yela",
    type: "moon",
    system: "Stanton",
    body: "Crusader",
    nearestRefineries: ["CRU-L3 Endless Odyssey Station", "CRU-L5 Beautiful Glen Station"],
    ores: [
      { name: "Aphorite", concentration: "medium" },
      { name: "Hephaestanite", concentration: "medium" },
      { name: "Titanium", concentration: "medium" },
      { name: "Corundum", concentration: "low" },
    ],
    notes: "Yela asteroid belt nearby — excellent for bulk mining",
  },
  {
    id: "yela-belt",
    name: "Yela Asteroid Belt",
    type: "asteroid_belt",
    system: "Stanton",
    body: "Crusader",
    nearestRefineries: ["CRU-L3 Endless Odyssey Station", "CRU-L5 Beautiful Glen Station"],
    ores: [
      { name: "Aphorite", concentration: "high" },
      { name: "Hephaestanite", concentration: "medium" },
      { name: "Laranite", concentration: "low" },
      { name: "Corundum", concentration: "low" },
    ],
  },
  {
    id: "aaron-halo",
    name: "Aaron Halo",
    type: "asteroid_belt",
    system: "Stanton",
    body: "Crusader",
    nearestRefineries: ["CRU-L4 Shallow Fields Station", "CRU-L1 Ambitious Dream Station"],
    ores: [
      { name: "Taranite", concentration: "medium" },
      { name: "Bexalite", concentration: "medium" },
      { name: "Borase", concentration: "medium" },
      { name: "Titanium", concentration: "high" },
    ],
    notes: "Large belt — varied deposits, good for bulk refined ores",
  },

  // ── microTech ─────────────────────────────────────────────────────────────
  {
    id: "calliope",
    name: "Calliope",
    type: "moon",
    system: "Stanton",
    body: "microTech",
    nearestRefineries: ["MIC-L1 Shallow Frontier Station", "MIC-L2 Long Forest Station"],
    ores: [
      { name: "Quantanium", concentration: "high" },
      { name: "Laranite", concentration: "medium" },
      { name: "Titanium", concentration: "low" },
    ],
  },
  {
    id: "clio",
    name: "Clio",
    type: "moon",
    system: "Stanton",
    body: "microTech",
    nearestRefineries: ["MIC-L2 Long Forest Station", "MIC-L3 Endless Odyssey Station"],
    ores: [
      { name: "Taranite", concentration: "high" },
      { name: "Bexalite", concentration: "medium" },
      { name: "Tungsten", concentration: "medium" },
      { name: "Copper", concentration: "low" },
    ],
  },
  {
    id: "euterpe",
    name: "Euterpe",
    type: "moon",
    system: "Stanton",
    body: "microTech",
    nearestRefineries: ["MIC-L4 Red Crossroads Station", "MIC-L5 Modern Icebox Station"],
    ores: [
      { name: "Quantanium", concentration: "high" },
      { name: "Bexalite", concentration: "high" },
      { name: "Hephaestanite", concentration: "low" },
    ],
    notes: "Top Quantanium spot alongside Lyria and Calliope",
  },
];

export const LOCATION_TYPES: Record<MiningLocation["type"], string> = {
  moon: "Moon",
  planet: "Planet",
  asteroid_belt: "Asteroid Belt",
  lagrange: "Lagrange Point",
};

export const BODIES = [...new Set(MINING_LOCATIONS.map((l) => l.body))].sort();
export const ORE_NAMES = [...new Set(MINING_LOCATIONS.flatMap((l) => l.ores.map((o) => o.name)))].sort();

export const CONCENTRATION_ORDER: Record<Concentration, number> = { high: 3, medium: 2, low: 1 };
