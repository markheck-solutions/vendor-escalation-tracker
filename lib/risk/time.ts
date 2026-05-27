const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toUtcMidnightMs(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
}

export function diffUtcDays(later: Date, earlier: Date): number {
  return Math.floor((toUtcMidnightMs(later) - toUtcMidnightMs(earlier)) / MS_PER_DAY);
}
