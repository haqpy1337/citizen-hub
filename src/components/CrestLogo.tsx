interface Props {
  height?: number;
}

export default function CrestLogo({ height = 28 }: Props) {
  const vw = 220;
  const vh = 52;
  const w = height * (vw / vh);

  return (
    <svg width={w} height={height} viewBox={`0 0 ${vw} ${vh}`} fill="none" aria-label="Citizen Hub">
      {/* Shield mark */}
      <path d="M26 6 L46 14 L46 30 Q46 44 26 50 Q6 44 6 30 L6 14 Z"
        fill="rgba(245,158,11,0.08)" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M26 12 L40 18 L40 30 Q40 41 26 46 Q12 41 12 30 L12 18 Z"
        fill="none" stroke="#f59e0b" strokeWidth="0.7" strokeLinejoin="round" opacity="0.4"/>
      {/* CH monogram */}
      <text x="26" y="36" fontSize="16" fontWeight="700" fill="#f59e0b"
        textAnchor="middle" fontFamily="'Segoe UI',sans-serif" letterSpacing="-1">CH</text>
      {/* Wordmark */}
      <text x="60" y="26" fontSize="20" fontWeight="700" fill="#ede9fe"
        letterSpacing="-0.5" fontFamily="'Segoe UI',sans-serif">Citizen</text>
      <text x="60" y="46" fontSize="13" fontWeight="600" fill="#f59e0b"
        letterSpacing="1.5" fontFamily="'Segoe UI',sans-serif">HUB</text>
    </svg>
  );
}
