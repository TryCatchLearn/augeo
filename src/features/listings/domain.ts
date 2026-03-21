export const listingStatuses = [
  "draft",
  "scheduled",
  "active",
  "ended",
] as const;

export type ListingStatus = (typeof listingStatuses)[number];

export function canReceiveBids(
  status: ListingStatus,
  endsAt: Date,
  now = new Date(),
) {
  return status === "active" && endsAt.getTime() > now.getTime();
}

export function canReturnToDraft(status: ListingStatus, bidCount: number) {
  return (status === "scheduled" || status === "active") && bidCount === 0;
}
