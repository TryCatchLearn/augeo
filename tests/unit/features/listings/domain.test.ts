import { describe, expect, it } from "vitest";
import {
  buildManualDraftDefaults,
  buildSmartListingDraftDefaults,
  canAddListingImage,
  canDeleteListing,
  canDeleteListingImage,
  canPlaceBid,
  canPublishListing,
  canReceiveBids,
  canReturnToDraft,
  canViewListingDetail,
  getBidIncrementCents,
  getCurrentPriceCents,
  getListingClosureResult,
  getMinimumNextBidCents,
  getNextMainImageIdAfterDelete,
  getPublishedStatus,
  getViewerBidStatus,
  isListingStatus,
  listingConditions,
  listingOutcomes,
  listingStatuses,
  normalizeSmartListingCategory,
  normalizeSuggestedStartingPriceCents,
  validateSmartListingCondition,
} from "@/features/listings/domain";
import {
  formatTimeRemaining,
  getCountdownUrgencyTier,
} from "@/features/listings/utils";

describe("listing status rules", () => {
  it("exports the supported listing enums", () => {
    expect(listingStatuses).toEqual(["draft", "scheduled", "active", "ended"]);
    expect(listingOutcomes).toEqual(["sold", "unsold", "reserve_not_met"]);
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

  it("selects sold, unsold, and reserve-not-met outcomes with winner rules", () => {
    expect(
      getListingClosureResult({
        reservePriceCents: null,
        highestBid: {
          id: "bid-1",
          bidderId: "buyer-1",
          amountCents: 15_000,
        },
      }),
    ).toEqual({
      outcome: "sold",
      winnerUserId: "buyer-1",
      winningBidId: "bid-1",
    });

    expect(
      getListingClosureResult({
        reservePriceCents: null,
        highestBid: null,
      }),
    ).toEqual({
      outcome: "unsold",
      winnerUserId: null,
      winningBidId: null,
    });

    expect(
      getListingClosureResult({
        reservePriceCents: 20_000,
        highestBid: {
          id: "bid-2",
          bidderId: "buyer-2",
          amountCents: 19_500,
        },
      }),
    ).toEqual({
      outcome: "reserve_not_met",
      winnerUserId: null,
      winningBidId: null,
    });
  });

  it("returns the same closure result for idempotent reruns", () => {
    const input = {
      reservePriceCents: 30_000,
      highestBid: {
        id: "bid-9",
        bidderId: "buyer-9",
        amountCents: 30_000,
      },
    } as const;

    expect(getListingClosureResult(input)).toEqual(
      getListingClosureResult(input),
    );
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
      "3d 3h 30m 0s left",
    );
    expect(formatTimeRemaining(new Date("2026-03-21T17:45:00.000Z"), now)).toBe(
      "5h 45m 0s left",
    );
    expect(formatTimeRemaining(new Date("2026-03-21T12:10:00.000Z"), now)).toBe(
      "10m 0s left",
    );
    expect(formatTimeRemaining(new Date("2026-03-21T12:00:09.000Z"), now)).toBe(
      "9s left",
    );
    expect(formatTimeRemaining(new Date("2026-03-21T11:59:00.000Z"), now)).toBe(
      "Ended",
    );
  });

  it("maps countdown urgency thresholds from neutral through ended", () => {
    const now = new Date("2026-03-21T12:00:00.000Z");

    expect(
      getCountdownUrgencyTier(new Date("2026-03-23T12:00:01.000Z"), now),
    ).toBe("neutral");
    expect(
      getCountdownUrgencyTier(new Date("2026-03-22T12:00:00.000Z"), now),
    ).toBe("warning");
    expect(
      getCountdownUrgencyTier(new Date("2026-03-21T12:59:59.000Z"), now),
    ).toBe("urgent");
    expect(
      getCountdownUrgencyTier(new Date("2026-03-21T12:05:00.000Z"), now),
    ).toBe("critical");
    expect(
      getCountdownUrgencyTier(new Date("2026-03-21T12:00:00.000Z"), now),
    ).toBe("ended");
  });

  it("maps the locked bid increment ladder", () => {
    expect(getBidIncrementCents(9_999)).toBe(100);
    expect(getBidIncrementCents(10_000)).toBe(500);
    expect(getBidIncrementCents(50_000)).toBe(1_000);
    expect(getBidIncrementCents(100_000)).toBe(2_500);
    expect(getBidIncrementCents(500_000)).toBe(5_000);
  });

  it("derives current and minimum-next bid values from persisted state", () => {
    expect(getCurrentPriceCents(27_500, null)).toBe(27_500);
    expect(getCurrentPriceCents(27_500, 31_000)).toBe(31_000);
    expect(getMinimumNextBidCents(27_500, null)).toBe(27_500);
    expect(getMinimumNextBidCents(27_500, 31_000)).toBe(31_500);
  });

  it("projects the viewer bid status from highest-bidder and history state", () => {
    expect(
      getViewerBidStatus({
        viewerId: "buyer-1",
        highestBidderId: "buyer-1",
        hasViewerBid: true,
      }),
    ).toBe("highest");
    expect(
      getViewerBidStatus({
        viewerId: "buyer-1",
        highestBidderId: "buyer-2",
        hasViewerBid: true,
      }),
    ).toBe("outbid");
    expect(
      getViewerBidStatus({
        viewerId: "buyer-1",
        highestBidderId: "buyer-2",
        hasViewerBid: false,
      }),
    ).toBe("none");
  });

  it("checks bid eligibility for auth, seller ownership, status, and expiration", () => {
    const now = new Date("2026-03-21T12:00:00.000Z");

    expect(
      canPlaceBid({
        sellerId: "seller-1",
        viewerId: "buyer-1",
        status: "active",
        endsAt: new Date("2026-03-21T12:05:00.000Z"),
        now,
      }),
    ).toBe(true);
    expect(
      canPlaceBid({
        sellerId: "seller-1",
        viewerId: null,
        status: "active",
        endsAt: new Date("2026-03-21T12:05:00.000Z"),
        now,
      }),
    ).toBe(false);
    expect(
      canPlaceBid({
        sellerId: "seller-1",
        viewerId: "seller-1",
        status: "active",
        endsAt: new Date("2026-03-21T12:05:00.000Z"),
        now,
      }),
    ).toBe(false);
    expect(
      canPlaceBid({
        sellerId: "seller-1",
        viewerId: "buyer-1",
        status: "scheduled",
        endsAt: new Date("2026-03-21T12:05:00.000Z"),
        now,
      }),
    ).toBe(false);
    expect(
      canPlaceBid({
        sellerId: "seller-1",
        viewerId: "buyer-1",
        status: "active",
        endsAt: new Date("2026-03-21T11:59:00.000Z"),
        now,
      }),
    ).toBe(false);
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
