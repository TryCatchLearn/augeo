import { describe, expect, it } from "vitest";
import {
  buildManualDraftDefaults,
  buildSmartListingDraftDefaults,
  canAddListingImage,
  canDeleteListing,
  canDeleteListingImage,
  canPublishListing,
  canReceiveBids,
  canReturnToDraft,
  canViewListingDetail,
  getNextMainImageIdAfterDelete,
  getPlaceholderPricing,
  getPublishedStatus,
  isListingStatus,
  listingConditions,
  listingStatuses,
  normalizeSmartListingCategory,
  normalizeSuggestedStartingPriceCents,
  validateSmartListingCondition,
} from "@/features/listings/domain";
import {
  formatTimeRemaining,
  getListingTimeMeta,
} from "@/features/listings/utils";

describe("listing status rules", () => {
  it("exports the supported listing enums", () => {
    expect(listingStatuses).toEqual(["draft", "scheduled", "active", "ended"]);
    expect(listingConditions).toEqual([
      "new",
      "like_new",
      "good",
      "fair",
      "poor",
    ]);
  });

  it("recognizes valid listing statuses", () => {
    expect(isListingStatus("draft")).toBe(true);
    expect(isListingStatus("active")).toBe(true);
    expect(isListingStatus("preview")).toBe(false);
  });

  it("allows bids only for active listings that have not ended", () => {
    const now = new Date("2026-03-21T12:00:00.000Z");

    expect(
      canReceiveBids("active", new Date("2026-03-21T12:05:00.000Z"), now),
    ).toBe(true);
    expect(
      canReceiveBids("scheduled", new Date("2026-03-21T12:05:00.000Z"), now),
    ).toBe(false);
    expect(
      canReceiveBids("active", new Date("2026-03-21T11:59:59.000Z"), now),
    ).toBe(false);
  });

  it("allows returning to draft only before any bids exist", () => {
    expect(canReturnToDraft("scheduled", 0)).toBe(true);
    expect(canReturnToDraft("active", 0)).toBe(true);
    expect(canReturnToDraft("draft", 0)).toBe(false);
    expect(canReturnToDraft("active", 1)).toBe(false);
  });

  it("limits publish and delete transitions to draft listings", () => {
    expect(canPublishListing("draft")).toBe(true);
    expect(canPublishListing("active")).toBe(false);
    expect(canDeleteListing("draft")).toBe(true);
    expect(canDeleteListing("ended")).toBe(false);
  });

  it("enforces the image cap and last-image delete rule", () => {
    expect(canAddListingImage(0)).toBe(true);
    expect(canAddListingImage(4)).toBe(true);
    expect(canAddListingImage(5)).toBe(false);

    expect(canDeleteListingImage(3)).toBe(true);
    expect(canDeleteListingImage(1)).toBe(false);
  });

  it("chooses the next main image when deleting the current cover image", () => {
    expect(
      getNextMainImageIdAfterDelete(
        [
          { id: "image-1", isMain: true },
          { id: "image-2", isMain: false },
          { id: "image-3", isMain: false },
        ],
        "image-1",
      ),
    ).toBe("image-2");

    expect(
      getNextMainImageIdAfterDelete(
        [
          { id: "image-1", isMain: true },
          { id: "image-2", isMain: false },
        ],
        "image-2",
      ),
    ).toBe("image-1");
  });

  it("chooses active or scheduled when publishing a draft", () => {
    const now = new Date("2026-03-21T12:00:00.000Z");

    expect(getPublishedStatus(null, now)).toBe("active");
    expect(getPublishedStatus(new Date("2026-03-21T11:00:00.000Z"), now)).toBe(
      "active",
    );
    expect(getPublishedStatus(new Date("2026-03-21T13:00:00.000Z"), now)).toBe(
      "scheduled",
    );
  });

  it("keeps draft detail pages owner-only", () => {
    expect(
      canViewListingDetail({
        sellerId: "seller-1",
        viewerId: "seller-1",
        status: "draft",
      }),
    ).toBe(true);
    expect(
      canViewListingDetail({
        sellerId: "seller-1",
        viewerId: "buyer-1",
        status: "draft",
      }),
    ).toBe(false);
    expect(
      canViewListingDetail({
        sellerId: "seller-1",
        viewerId: null,
        status: "active",
      }),
    ).toBe(true);
  });

  it("formats time remaining for days, hours, minutes, and ended states", () => {
    const now = new Date("2026-03-21T12:00:00.000Z");

    expect(formatTimeRemaining(new Date("2026-03-24T15:30:00.000Z"), now)).toBe(
      "3d 3h left",
    );
    expect(formatTimeRemaining(new Date("2026-03-21T17:45:00.000Z"), now)).toBe(
      "5h 45m left",
    );
    expect(formatTimeRemaining(new Date("2026-03-21T12:10:00.000Z"), now)).toBe(
      "10m left",
    );
    expect(formatTimeRemaining(new Date("2026-03-21T11:59:00.000Z"), now)).toBe(
      "Ended",
    );
  });

  it("returns Phase 1 placeholder pricing from the starting bid", () => {
    expect(getPlaceholderPricing(27500)).toEqual({
      currentBidCents: 27500,
      minimumBidCents: 27500,
      bidCount: 0,
    });
  });

  it("returns status-aware time metadata for detail pages", () => {
    const now = new Date("2026-03-21T12:00:00.000Z");

    expect(
      getListingTimeMeta(
        "scheduled",
        new Date("2026-03-25T12:00:00.000Z"),
        new Date("2026-03-21T14:30:00.000Z"),
        now,
      ),
    ).toEqual({
      label: "Starts In",
      value: "2h 30m left",
    });

    expect(
      getListingTimeMeta(
        "ended",
        new Date("2026-03-21T11:59:00.000Z"),
        null,
        now,
      ),
    ).toEqual({
      label: "Auction Ended",
      value: "Ended",
    });
  });

  it("normalizes smart listing AI output", () => {
    expect(normalizeSmartListingCategory("Home & Garden")).toBe("home_garden");
    expect(normalizeSmartListingCategory("Automotive")).toBe("vehicles");
    expect(normalizeSmartListingCategory("unknown bucket")).toBe("other");
    expect(validateSmartListingCondition("Like New")).toBe("like_new");
    expect(validateSmartListingCondition("mystery")).toBeNull();
    expect(normalizeSuggestedStartingPriceCents(1299.8)).toBe(1300);
    expect(normalizeSuggestedStartingPriceCents(0)).toBeNull();
  });

  it("builds manual and smart listing draft defaults", () => {
    const now = new Date("2026-03-21T12:00:00.000Z");

    expect(buildManualDraftDefaults(now)).toMatchObject({
      title: "Untitled draft",
      location: "Add location",
      category: "other",
      condition: "good",
      startingBidCents: 100,
      status: "draft",
    });
    expect(
      buildSmartListingDraftDefaults(
        {
          title: " Camera Lot ",
          description: " Nice body and case ",
          category: "electronics",
          condition: "good",
          suggestedStartingPriceCents: 18500,
        },
        now,
      ),
    ).toMatchObject({
      title: "Camera Lot",
      description: "Nice body and case",
      category: "electronics",
      condition: "good",
      startingBidCents: 18500,
      status: "draft",
    });
  });
});
