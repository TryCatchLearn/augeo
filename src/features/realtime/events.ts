export const ABLY_LISTING_EVENT_NAME = "bid.placed";
export const ABLY_OUTBID_EVENT_NAME = "auction.outbid";

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
