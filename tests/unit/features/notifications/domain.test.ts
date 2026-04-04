import { describe, expect, it } from "vitest";
import {
  buildAuctionOutcomeNotificationDedupeKey,
  buildOutbidNotificationDedupeKey,
  getNotificationPresentation,
  notificationTypes,
} from "@/features/notifications/domain";

describe("notification domain helpers", () => {
  it("exports the supported notification types", () => {
    expect(notificationTypes).toEqual([
      "outbid",
      "auction_won",
      "item_sold",
      "item_not_sold",
    ]);
  });

  it("builds a deterministic outbid dedupe key", () => {
    expect(
      buildOutbidNotificationDedupeKey({
        recipientUserId: "user-1",
        listingId: "listing-1",
        acceptedBidId: "bid-9",
      }),
    ).toBe("outbid:user-1:listing-1:bid-9");
  });

  it("builds a deterministic lifecycle dedupe key", () => {
    expect(
      buildAuctionOutcomeNotificationDedupeKey({
        type: "item_not_sold",
        recipientUserId: "seller-1",
        listingId: "listing-1",
        outcome: "reserve_not_met",
      }),
    ).toBe("item_not_sold:seller-1:listing-1:reserve_not_met");
  });

  it("maps outbid notifications into display copy", () => {
    expect(
      getNotificationPresentation({
        id: "notification-1",
        type: "outbid",
        createdAt: new Date("2026-04-02T12:00:00.000Z"),
        readAt: null,
        payload: {
          listingId: "listing-1",
          acceptedBidId: "bid-2",
          currentBidCents: 50_000,
          minimumNextBidCents: 51_000,
          bidCount: 2,
        },
      }),
    ).toEqual({
      title: "You've been outbid",
      message: "New current bid $500.00 across 2 bids. Next bid $510.00.",
      listingId: "listing-1",
      listingUrl: "/listings/listing-1",
    });
  });

  it("maps seller and winner lifecycle notifications into display copy", () => {
    expect(
      getNotificationPresentation({
        id: "notification-2",
        type: "auction_won",
        createdAt: new Date("2026-04-02T12:00:00.000Z"),
        readAt: null,
        payload: {
          listingId: "listing-2",
          listingTitle: "Rare Watch",
          finalBidCents: 75_000,
        },
      }),
    ).toEqual({
      title: "You won this auction",
      message: "Rare Watch closed at $750.00.",
      listingId: "listing-2",
      listingUrl: "/listings/listing-2",
    });

    expect(
      getNotificationPresentation({
        id: "notification-3",
        type: "item_sold",
        createdAt: new Date("2026-04-02T12:00:00.000Z"),
        readAt: null,
        payload: {
          listingId: "listing-3",
          listingTitle: "Studio Light",
          finalBidCents: 12_500,
        },
      }),
    ).toEqual({
      title: "Your item sold",
      message: "Studio Light sold for $125.00.",
      listingId: "listing-3",
      listingUrl: "/listings/listing-3",
    });
  });

  it("preserves reserve-not-met copy for seller-facing notifications", () => {
    expect(
      getNotificationPresentation({
        id: "notification-4",
        type: "item_not_sold",
        createdAt: new Date("2026-04-02T12:00:00.000Z"),
        readAt: null,
        payload: {
          listingId: "listing-4",
          listingTitle: "Vintage Amp",
          outcome: "reserve_not_met",
        },
      }),
    ).toEqual({
      title: "Your auction ended without a sale",
      message: "Vintage Amp ended below reserve and did not sell.",
      listingId: "listing-4",
      listingUrl: "/listings/listing-4",
      outcome: "reserve_not_met",
    });
  });
});
