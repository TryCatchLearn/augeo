export const listingStatuses = [
  "draft",
  "scheduled",
  "active",
  "ended",
] as const;

export type ListingStatus = (typeof listingStatuses)[number];

export type ListingViewer = {
  sellerId: string;
  viewerId?: string | null;
  status: ListingStatus;
};

export const listingCategories = [
  "electronics",
  "fashion",
  "home_garden",
  "collectibles",
  "art",
  "jewelry_watches",
  "toys_hobbies",
  "sports_outdoors",
  "media",
  "other",
] as const;

export type ListingCategory = (typeof listingCategories)[number];

export const listingConditions = [
  "new",
  "like_new",
  "good",
  "fair",
  "poor",
] as const;

export type ListingCondition = (typeof listingConditions)[number];

export const listingStatusLabels: Record<ListingStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  ended: "Ended",
};

export function isListingStatus(value: string): value is ListingStatus {
  return listingStatuses.includes(value as ListingStatus);
}

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

export function canViewListingDetail({
  sellerId,
  viewerId,
  status,
}: ListingViewer) {
  if (status !== "draft") {
    return true;
  }

  return sellerId === viewerId;
}

export function formatListingPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatTimeRemaining(endsAt: Date, now = new Date()) {
  const diffMs = endsAt.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Ended";
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  return `${Math.max(minutes, 1)}m left`;
}

export function getPlaceholderPricing(startingBidCents: number) {
  return {
    currentBidCents: startingBidCents,
    minimumBidCents: startingBidCents,
    bidCount: 0,
  };
}

export function getListingTimeMeta(
  status: ListingStatus,
  endsAt: Date,
  startsAt?: Date | null,
  now = new Date(),
) {
  if (status === "scheduled" && startsAt) {
    return {
      label: "Starts In",
      value: formatTimeRemaining(startsAt, now),
    };
  }

  return {
    label: status === "ended" ? "Auction Ended" : "Time Remaining",
    value: formatTimeRemaining(endsAt, now),
  };
}
