interface Props {
  height?: number;
  subtitle?: string;
}

export default function PrismLogo({ height = 28, subtitle }: Props) {
  const vh = subtitle ? 68 : 50;
  const vw = 200;
  const w = height * (vw / vh);

  return (
    <svg width={w} height={height} viewBox={`0 0 ${vw} ${vh}`} fill="none" aria-label="hMA">
      {/* Prism mark */}
      <path d="M28 4 L54 48 L2 48 Z" fill="rgba(124,58,237,0.1)" stroke="#7c3aed" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M28 4 L54 48 L28 32 Z" fill="rgba(167,139,250,0.15)"/>
      <line x1="28" y1="4" x2="28" y2="48" stroke="#a78bfa" strokeWidth=".6" opacity=".35"/>
      <circle cx="28" cy="48" r="2.5" fill="#a78bfa" opacity=".8"/>
      <circle cx="2"  cy="48" r="1.5" fill="#7c3aed" opacity=".4"/>
      <circle cx="54" cy="48" r="1.5" fill="#7c3aed" opacity=".4"/>
      {/* Wordmark */}
      <text x="66" y="40" fontSize="34" fontWeight="700" fill="#ede9fe"
        letterSpacing="-1" fontFamily="var(--font-rajdhani),'Segoe UI',sans-serif">hMA</text>
      {subtitle && (
        <>
          <line x1="66" y1="52" x2="196" y2="52" stroke="#1c1428" strokeWidth=".8"/>
          <text x="66" y="63" fontSize="7.5" letterSpacing="3.5" fill="#4a3870"
            fontFamily="'Segoe UI',sans-serif">{subtitle}</text>
        </>
      )}
    </svg>
  );
}
