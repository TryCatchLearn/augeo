import type { ListingOutcome, ListingStatus } from "@/features/listings/domain";
import type {
  NotificationIcon,
  NotificationType,
} from "@/features/notifications/domain";

export const ABLY_LISTING_EVENT_NAME = "bid.placed";
export const ABLY_LISTING_LIFECYCLE_EVENT_NAME = "listing.lifecycle.changed";
export const ABLY_NOTIFICATION_CREATED_EVENT_NAME = "notification.created";

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

export type NotificationCreatedEvent = {
  notificationId: string;
  type: NotificationType;
  listingId: string;
  listingUrl: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  icon: NotificationIcon;
  outcome: ListingOutcome | null;
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
