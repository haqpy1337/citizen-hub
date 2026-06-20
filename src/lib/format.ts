// Reine, framework-unabhaengige Helfer (client- und serverseitig nutzbar).

export function formatDuration(totalSec: number): string {
  if (totalSec <= 0) return "0s";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

// Sekunden bis zur Fertigstellung (negativ/0 -> fertig).
export function secondsLeft(finishesAt: string | Date, now = Date.now()): number {
  const end = new Date(finishesAt).getTime();
  return Math.max(0, Math.round((end - now) / 1000));
}

// Dauer-Eingabe "1h 30m" / "90m" / "01:30:00" -> Sekunden.
export function parseDurationInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // HH:MM:SS oder MM:SS
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const parts = trimmed.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return parts[0] * 60 + parts[1];
  }

  // "1h 30m 10s" in beliebiger Kombination
  const re = /(\d+(?:\.\d+)?)\s*(h|m|s)/gi;
  let total = 0;
  let matched = false;
  let match: RegExpExecArray | null;
  while ((match = re.exec(trimmed)) !== null) {
    matched = true;
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    total += unit === "h" ? value * 3600 : unit === "m" ? value * 60 : value;
  }
  if (matched) return Math.round(total);

  // reine Zahl -> als Minuten interpretieren
  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber)) return Math.round(asNumber * 60);

  return null;
}
