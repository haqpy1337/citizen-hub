// One-shot cross-page navigation payload. The app has no router — pages are
// swapped via PageContext — so this module carries "open commodity X" from
// the dashboard ticker to the Commodities page across the remount.

let pendingCommodity: { id: number; name: string } | null = null;

export function setPendingCommodity(id: number, name: string) {
  pendingCommodity = { id, name };
}

/** Returns the pending commodity once, then clears it. */
export function takePendingCommodity(): { id: number; name: string } | null {
  const v = pendingCommodity;
  pendingCommodity = null;
  return v;
}
