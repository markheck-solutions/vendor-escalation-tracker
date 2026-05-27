export function isStaleFollowUp(args: { lastVendorTouchDate: Date; now?: Date }): boolean {
  const now = args.now ?? new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.floor((now.getTime() - args.lastVendorTouchDate.getTime()) / msPerDay);

  // Placeholder rule. A future slice will define the actual threshold(s).
  return days >= 7;
}
