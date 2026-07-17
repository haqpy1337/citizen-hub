interface Props { size?: number }

export default function HubEmblem({ size = 38 }: Props) {
  const s = size / 38; // scale factor
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 38 38"
      fill="none"
      style={{ filter: `drop-shadow(0 0 ${6*s}px rgba(180,140,255,.55))` }}
    >
      <circle cx="19" cy="19" r="17" stroke="rgba(175,140,255,.12)" strokeWidth=".7" strokeDasharray="2 3"/>
      <line x1="19" y1="19" x2="19"   y2="3.5"  stroke="rgba(175,140,255,.30)" strokeWidth=".7"/>
      <line x1="19" y1="19" x2="32.7" y2="10.5" stroke="rgba(175,140,255,.30)" strokeWidth=".7"/>
      <line x1="19" y1="19" x2="32.7" y2="27.5" stroke="rgba(175,140,255,.30)" strokeWidth=".7"/>
      <line x1="19" y1="19" x2="19"   y2="34.5" stroke="rgba(175,140,255,.30)" strokeWidth=".7"/>
      <line x1="19" y1="19" x2="5.3"  y2="27.5" stroke="rgba(175,140,255,.30)" strokeWidth=".7"/>
      <line x1="19" y1="19" x2="5.3"  y2="10.5" stroke="rgba(175,140,255,.30)" strokeWidth=".7"/>
      <circle cx="19"   cy="3.5"  r="1.8" fill="rgba(185,150,255,.55)" stroke="rgba(210,185,255,.5)" strokeWidth=".6"/>
      <circle cx="32.7" cy="10.5" r="1.8" fill="rgba(185,150,255,.55)" stroke="rgba(210,185,255,.5)" strokeWidth=".6"/>
      <circle cx="32.7" cy="27.5" r="1.8" fill="rgba(185,150,255,.55)" stroke="rgba(210,185,255,.5)" strokeWidth=".6"/>
      <circle cx="19"   cy="34.5" r="1.8" fill="rgba(185,150,255,.55)" stroke="rgba(210,185,255,.5)" strokeWidth=".6"/>
      <circle cx="5.3"  cy="27.5" r="1.8" fill="rgba(185,150,255,.55)" stroke="rgba(210,185,255,.5)" strokeWidth=".6"/>
      <circle cx="5.3"  cy="10.5" r="1.8" fill="rgba(185,150,255,.55)" stroke="rgba(210,185,255,.5)" strokeWidth=".6"/>
      <circle cx="19" cy="19" r="5"   fill="rgba(170,125,255,.18)" stroke="rgba(200,165,255,.65)" strokeWidth="1"/>
      <circle cx="19" cy="19" r="2.5" fill="rgba(210,180,255,.80)"/>
      <circle cx="19" cy="19" r="1.2" fill="rgba(248,242,255,.98)"/>
    </svg>
  );
}
