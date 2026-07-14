interface Props {
  height?: number;
}

export default function CrestLogo({ height = 28 }: Props) {
  const vw = 220;
  const vh = 52;
  const w = height * (vw / vh);

  // All colors use CSS custom properties so the logo adapts to each theme
  const q  = "var(--color-quant)";
  const ink = "var(--color-ink)";

  return (
    <svg width={w} height={height} viewBox={`0 0 ${vw} ${vh}`} fill="none" aria-label="Citizen Hub">
      {/* Compass ring */}
      <circle cx="26" cy="26" r="22" stroke={q} strokeWidth="1" opacity="0.3"/>
      <circle cx="26" cy="26" r="16" stroke={q} strokeWidth="1.2" opacity="0.55"/>
      {/* Crosshair ticks */}
      <line x1="26" y1="4"  x2="26" y2="10" stroke={q} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="26" y1="42" x2="26" y2="48" stroke={q} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="4"  y1="26" x2="10" y2="26" stroke={q} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="42" y1="26" x2="48" y2="26" stroke={q} strokeWidth="1.5" strokeLinecap="round"/>
      {/* 4-point star */}
      <path d="M26 12 L29 23 L40 26 L29 29 L26 40 L23 29 L12 26 L23 23 Z"
        fill={q} fillOpacity={0.15} stroke={q} strokeWidth="1.3" strokeLinejoin="round"/>
      {/* Center dot */}
      <circle cx="26" cy="26" r="3" fill={q}/>
      <circle cx="26" cy="26" r="1.5" fill={ink} fillOpacity={0.9}/>
      {/* Wordmark */}
      <text x="60" y="26" fontSize="20" fontWeight="700" fill={ink}
        letterSpacing="-0.5" fontFamily="'Segoe UI',sans-serif">Citizen</text>
      <text x="60" y="46" fontSize="13" fontWeight="600" fill={q}
        letterSpacing="1.5" fontFamily="'Segoe UI',sans-serif">HUB</text>
    </svg>
  );
}
