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
  "vehicles",
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

export const maxListingImageCount = 5;

export type ListingImageRecord = {
  id: string;
  isMain: boolean;
};

export type ListingDraftDefaults = {
  title: string;
  description: string;
  location: string;
  category: ListingCategory;
  condition: ListingCondition;
  startingBidCents: number;
  reservePriceCents: null;
  startsAt: null;
  endsAt: Date;
  status: "draft";
};

export type ViewerBidStatus = "highest" | "outbid" | "none";

export class InvalidSmartListingResultError extends Error {}

export const listingStatusLabels: Record<ListingStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  ended: "Ended",
};

const listingCategoryAliases: Record<string, ListingCategory> = {
  art: "art",
  collectible: "collectibles",
  collectibles: "collectibles",
  electronics: "electronics",
  electronic: "electronics",
  fashion: "fashion",
  clothing: "fashion",
  home: "home_garden",
  home_garden: "home_garden",
  home_and_garden: "home_garden",
  "home & garden": "home_garden",
  "home and garden": "home_garden",
  jewelry: "jewelry_watches",
  jewelry_watches: "jewelry_watches",
  watches: "jewelry_watches",
  media: "media",
  movies: "media",
  music: "media",
  other: "other",
  sports: "sports_outdoors",
  outdoors: "sports_outdoors",
  sports_outdoors: "sports_outdoors",
  toys: "toys_hobbies",
  hobbies: "toys_hobbies",
  toys_hobbies: "toys_hobbies",
  vehicle: "vehicles",
  vehicles: "vehicles",
  automotive: "vehicles",
  auto: "vehicles",
};

const listingConditionAliases: Record<string, ListingCondition> = {
  new: "new",
  brand_new: "new",
  "brand new": "new",
  like_new: "like_new",
  "like new": "like_new",
  excellent: "like_new",
  good: "good",
  fair: "fair",
  poor: "poor",
  used_good: "good",
  used_fair: "fair",
};

const manualDraftLocation = "Add location";
const manualDraftTitle = "Untitled draft";
const manualDraftDescription =
  "Add a seller-written description before publishing.";

function normalizeEnumInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("&", "and")
    .replaceAll("/", " ")
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

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

export function getBidIncrementCents(currentPriceCents: number) {
  if (currentPriceCents < 10_000) {
    return 100;
  }

  if (currentPriceCents < 50_000) {
    return 500;
  }

  if (currentPriceCents < 100_000) {
    return 1_000;
  }

  if (currentPriceCents < 500_000) {
    return 2_500;
  }

  return 5_000;
}

export function getCurrentPriceCents(
  startingBidCents: number,
  currentBidCents: number | null,
) {
  return currentBidCents ?? startingBidCents;
}

export function getMinimumNextBidCents(
  startingBidCents: number,
  currentBidCents: number | null,
) {
  if (currentBidCents === null) {
    return startingBidCents;
  }

  return currentBidCents + getBidIncrementCents(currentBidCents);
}

export function getViewerBidStatus(input: {
  viewerId?: string | null;
  highestBidderId?: string | null;
  hasViewerBid: boolean;
}): ViewerBidStatus {
  if (input.viewerId && input.viewerId === input.highestBidderId) {
    return "highest";
  }

  if (input.hasViewerBid) {
    return "outbid";
  }

  return "none";
}

export function canPlaceBid(input: {
  sellerId: string;
  viewerId?: string | null;
  status: ListingStatus;
  endsAt: Date;
  now?: Date;
}) {
  if (!input.viewerId) {
    return false;
  }

  if (input.viewerId === input.sellerId) {
    return false;
  }

  return canReceiveBids(input.status, input.endsAt, input.now);
}

export function canReturnToDraft(status: ListingStatus, bidCount: number) {
  return (status === "scheduled" || status === "active") && bidCount === 0;
}

export function canPublishListing(status: ListingStatus) {
  return status === "draft";
}

export function canDeleteListing(status: ListingStatus) {
  return status === "draft";
}

export function canAddListingImage(imageCount: number) {
  return imageCount < maxListingImageCount;
}

export function canDeleteListingImage(imageCount: number) {
  return imageCount > 1;
}

export function getNextMainImageIdAfterDelete(
  images: readonly ListingImageRecord[],
  deletedImageId: string,
) {
  const deletedImage = images.find((image) => image.id === deletedImageId);

  if (!deletedImage) {
    return null;
  }

  if (!deletedImage.isMain) {
    return images.find((image) => image.isMain)?.id ?? null;
  }

  return images.find((image) => image.id !== deletedImageId)?.id ?? null;
}

export function getPublishedStatus(
  startsAt: Date | null,
  now = new Date(),
): Extract<ListingStatus, "active" | "scheduled"> {
  if (startsAt && startsAt.getTime() > now.getTime()) {
    return "scheduled";
  }

  return "active";
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

export function normalizeSmartListingCategory(value: string): ListingCategory {
  const normalizedValue = normalizeEnumInput(value);

  return (
    listingCategoryAliases[normalizedValue] ??
    (listingCategories.includes(normalizedValue as ListingCategory)
      ? (normalizedValue as ListingCategory)
      : "other")
  );
}

export function validateSmartListingCondition(
  value: string,
): ListingCondition | null {
  const normalizedValue = normalizeEnumInput(value);

  return (
    listingConditionAliases[normalizedValue] ??
    (listingConditions.includes(normalizedValue as ListingCondition)
      ? (normalizedValue as ListingCondition)
      : null)
  );
}

export function normalizeSuggestedStartingPriceCents(value: number) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const cents = Math.round(value);

  return cents > 0 ? cents : null;
}

export function buildManualDraftDefaults(
  now = new Date(),
): ListingDraftDefaults {
  return {
    title: manualDraftTitle,
    description: manualDraftDescription,
    location: manualDraftLocation,
    category: "other",
    condition: "good",
    startingBidCents: 100,
    reservePriceCents: null,
    startsAt: null,
    endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    status: "draft",
  };
}

export function buildSmartListingDraftDefaults(
  input: {
    title: string;
    description: string;
    category: string;
    condition: string;
    suggestedStartingPriceCents: number;
  },
  now = new Date(),
): ListingDraftDefaults {
  const condition = validateSmartListingCondition(input.condition);
  const startingBidCents = normalizeSuggestedStartingPriceCents(
    input.suggestedStartingPriceCents,
  );

  if (!condition || !startingBidCents) {
    throw new InvalidSmartListingResultError("Invalid smart listing result.");
  }

  return {
    title: input.title.trim(),
    description: input.description.trim(),
    location: manualDraftLocation,
    category: normalizeSmartListingCategory(input.category),
    condition,
    startingBidCents,
    reservePriceCents: null,
    startsAt: null,
    endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    status: "draft",
  };
}
