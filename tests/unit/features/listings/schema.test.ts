import { describe, expect, it } from "vitest";
import {
  dollarsToCents,
  listingDraftFormSchema,
  normalizeSmartListingCategory,
  normalizeSuggestedStartingPriceCents,
  saveDraftListingSchema,
  validateSmartListingCondition,
} from "@/features/listings/schema";

describe("listing draft schemas", () => {
  it("validates a complete draft edit payload", () => {
    const result = listingDraftFormSchema.safeParse({
      title: "Collector Camera",
      description: "Very clean body with original case.",
      location: "Portland, OR",
      category: "electronics",
      condition: "like_new",
      startingBidDollars: 250,
      reservePriceDollars: 300,
      startsAt: "2026-03-25T09:30",
      endsAt: "2026-03-26T09:30",
    });

    expect(result.success).toBe(true);
  });

  it("rejects reserve prices lower than the starting bid", () => {
    const result = listingDraftFormSchema.safeParse({
      title: "Collector Camera",
      description: "Very clean body with original case.",
      location: "Portland, OR",
      category: "electronics",
      condition: "like_new",
      startingBidDollars: 250,
      reservePriceDollars: 200,
      startsAt: "",
      endsAt: "2026-03-26T09:30",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.reservePriceDollars).toContain(
      "Reserve price must be at least the starting bid.",
    );
  });

  it("rejects an end time before the chosen start time", () => {
    const result = listingDraftFormSchema.safeParse({
      title: "Collector Camera",
      description: "Very clean body with original case.",
      location: "Portland, OR",
      category: "electronics",
      condition: "like_new",
      startingBidDollars: 250,
      reservePriceDollars: undefined,
      startsAt: "2026-03-26T09:30",
      endsAt: "2026-03-25T09:30",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.endsAt).toContain(
      "End time must be after the start time.",
    );
  });

  it("validates the server save payload with UTC timestamps and cents", () => {
    const result = saveDraftListingSchema.safeParse({
      listingId: "listing-1",
      title: "Collector Camera",
      description: "Very clean body with original case.",
      location: "Portland, OR",
      category: "electronics",
      condition: "like_new",
      startingBidCents: dollarsToCents(250),
      reservePriceCents: null,
      startsAt: null,
      endsAt: "2026-03-26T02:30:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("normalizes AI categories onto the existing listing enum", () => {
    expect(normalizeSmartListingCategory("Home & Garden")).toBe("home_garden");
    expect(normalizeSmartListingCategory("Automotive")).toBe("vehicles");
    expect(normalizeSmartListingCategory("unknown bucket")).toBe("other");
  });

  it("accepts the vehicles category in the draft schema", () => {
    const result = listingDraftFormSchema.safeParse({
      title: "Vintage Coupe",
      description: "Classic car in running condition.",
      location: "Phoenix, AZ",
      category: "vehicles",
      condition: "good",
      startingBidDollars: 5000,
      reservePriceDollars: undefined,
      startsAt: "",
      endsAt: "2026-03-26T09:30",
    });

    expect(result.success).toBe(true);
  });

  it("validates AI conditions and suggested prices", () => {
    expect(validateSmartListingCondition("Like New")).toBe("like_new");
    expect(validateSmartListingCondition("mystery")).toBeNull();
    expect(normalizeSuggestedStartingPriceCents(1299.8)).toBe(1300);
    expect(normalizeSuggestedStartingPriceCents(0)).toBeNull();
  });
});
