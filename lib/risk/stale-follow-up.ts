import { diffUtcDays } from "./time";

export function isStaleFollowUp(args: {
  lastVendorTouchDate: Date;
  now?: Date;
  /**
   * Treat the follow-up as stale once it's been this many full UTC days since the last vendor touch.
   *
   * Defaults to 7 for a weekly follow-up posture in the public demo.
   */
  staleAfterDays?: number;
}): boolean {
  const now = args.now ?? new Date();
  const staleAfterDays = args.staleAfterDays ?? 7;

  const daysSinceTouch = diffUtcDays(now, args.lastVendorTouchDate);
  return daysSinceTouch >= staleAfterDays;
}
