import type { ListingOutcome, ListingStatus } from "@/features/listings/domain";

export const ABLY_LISTING_EVENT_NAME = "bid.placed";
export const ABLY_OUTBID_EVENT_NAME = "auction.outbid";
export const ABLY_LISTING_LIFECYCLE_EVENT_NAME = "listing.lifecycle.changed";

export function getListingChannelName(listingId: string) {
  return `listing:${listingId}`;
}

export function getUserChannelName(userId: string) {
  return `user:${userId}`;
}

export type ListingBidPlacedEvent = {
  listingId: string;
  currentBidCents: number;
  bidCount: number;
  minimumNextBidCents: number;
  highestBidderId: string;
  bid: {
    id: string;
    bidderId: string;
    bidderName: string;
    amountCents: number;
    createdAt: string;
  };
};

export type AuctionOutbidEvent = {
  acceptedBidId: string;
  listingId: string;
  listingTitle: string;
  currentBidCents: number;
  minimumNextBidCents: number;
  bidCount: number;
  listingUrl: string;
};

export type ListingLifecycleChangedEvent = {
  listingId: string;
  status: ListingStatus;
  outcome: ListingOutcome | null;
  endedAt: string;
  winnerUserId: string | null;
  winningBidId: string | null;
  currentBidCents: number | null;
  bidCount: number;
};
