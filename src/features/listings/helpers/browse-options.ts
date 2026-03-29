import type { ListingCategory } from "@/features/listings/domain";
import { listingCategories } from "@/features/listings/domain";
import type { PublicListingPriceFilter } from "@/features/listings/helpers/browse-query";

const listingCategoryLabels: Record<ListingCategory, string> = {
  electronics: "Electronics",
  fashion: "Fashion",
  home_garden: "Home & Garden",
  collectibles: "Collectibles",
  art: "Art",
  jewelry_watches: "Jewelry & Watches",
  toys_hobbies: "Toys & Hobbies",
  sports_outdoors: "Sports & Outdoors",
  vehicles: "Vehicles",
  media: "Media",
  other: "Other",
};

const publicListingPriceThresholds: Record<PublicListingPriceFilter, number> = {
  lt_10: 1_000,
  lt_50: 5_000,
  lt_100: 10_000,
  lt_500: 50_000,
};

export const publicListingCategoryOptions = [
  { value: "all", label: "All Categories" },
  ...listingCategories.map((category) => ({
    value: category,
    label: listingCategoryLabels[category],
  })),
] as const;

export const publicListingPriceOptions = [
  { value: "any", label: "Any Price" },
  { value: "lt_10", label: "< $10" },
  { value: "lt_50", label: "< $50" },
  { value: "lt_100", label: "< $100" },
  { value: "lt_500", label: "< $500" },
] as const;

export const publicListingSortOptions = [
  { value: "newest", label: "Newest" },
  { value: "ending_soonest", label: "Ending Soonest" },
  { value: "price_asc", label: "Price Low→High" },
  { value: "price_desc", label: "Price High→Low" },
] as const;

export function getPublicListingPriceThresholdCents(
  priceFilter: PublicListingPriceFilter,
) {
  return publicListingPriceThresholds[priceFilter];
}
