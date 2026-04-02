import type { ListingOutcome } from "@/features/listings/domain";
import { formatListingPrice } from "@/features/listings/utils";

export const notificationTypes = [
  "outbid",
  "auction_won",
  "item_sold",
  "item_not_sold",
] as const;

export type NotificationType = (typeof notificationTypes)[number];

export type NotificationIcon =
  | "gavel"
  | "trophy"
  | "badge-dollar-sign"
  | "circle-alert";

export type OutbidNotificationPayload = {
  listingId: string;
  listingTitle: string;
  acceptedBidId: string;
  currentBidCents: number;
  minimumNextBidCents: number;
  bidCount: number;
};

export type AuctionWonNotificationPayload = {
  listingId: string;
  listingTitle: string;
  finalBidCents: number;
};

export type ItemSoldNotificationPayload = {
  listingId: string;
  listingTitle: string;
  finalBidCents: number;
};

export type ItemNotSoldNotificationPayload = {
  listingId: string;
  listingTitle: string;
  outcome: Extract<ListingOutcome, "unsold" | "reserve_not_met">;
};

export type NotificationPayloadByType = {
  outbid: OutbidNotificationPayload;
  auction_won: AuctionWonNotificationPayload;
  item_sold: ItemSoldNotificationPayload;
  item_not_sold: ItemNotSoldNotificationPayload;
};

export type NotificationPayload = NotificationPayloadByType[NotificationType];

export type NotificationRecord<
  TType extends NotificationType = NotificationType,
> = {
  id: string;
  type: TType;
  createdAt: Date;
  readAt: Date | null;
  payload: NotificationPayloadByType[TType];
};

export type NotificationPresentation = {
  icon: NotificationIcon;
  title: string;
  message: string;
  listingId: string;
  listingUrl: string;
  outcome?: Extract<ListingOutcome, "reserve_not_met" | "unsold">;
};

export function buildOutbidNotificationDedupeKey(input: {
  recipientUserId: string;
  listingId: string;
  acceptedBidId: string;
}) {
  return `outbid:${input.recipientUserId}:${input.listingId}:${input.acceptedBidId}`;
}

export function buildAuctionOutcomeNotificationDedupeKey(input: {
  type: Exclude<NotificationType, "outbid">;
  recipientUserId: string;
  listingId: string;
  outcome: ListingOutcome;
}) {
  return `${input.type}:${input.recipientUserId}:${input.listingId}:${input.outcome}`;
}

export function serializeNotificationPayload(payload: NotificationPayload) {
  return JSON.stringify(payload);
}

export function parseNotificationPayload<TType extends NotificationType>(
  _type: TType,
  payload: string,
) {
  return JSON.parse(payload) as NotificationPayloadByType[TType];
}

export function getNotificationPresentation<TType extends NotificationType>(
  record: NotificationRecord<TType>,
): NotificationPresentation {
  switch (record.type) {
    case "outbid": {
      const payload = record.payload as OutbidNotificationPayload;

      return {
        icon: "gavel",
        title: "You've been outbid",
        message: `New current bid ${formatListingPrice(payload.currentBidCents)} across ${payload.bidCount} bid${payload.bidCount === 1 ? "" : "s"}. Next bid ${formatListingPrice(payload.minimumNextBidCents)}.`,
        listingId: payload.listingId,
        listingUrl: `/listings/${payload.listingId}`,
      };
    }
    case "auction_won": {
      const payload = record.payload as AuctionWonNotificationPayload;

      return {
        icon: "trophy",
        title: "You won this auction",
        message: `${payload.listingTitle} closed at ${formatListingPrice(payload.finalBidCents)}.`,
        listingId: payload.listingId,
        listingUrl: `/listings/${payload.listingId}`,
      };
    }
    case "item_sold": {
      const payload = record.payload as ItemSoldNotificationPayload;

      return {
        icon: "badge-dollar-sign",
        title: "Your item sold",
        message: `${payload.listingTitle} sold for ${formatListingPrice(payload.finalBidCents)}.`,
        listingId: payload.listingId,
        listingUrl: `/listings/${payload.listingId}`,
      };
    }
    case "item_not_sold": {
      const payload = record.payload as ItemNotSoldNotificationPayload;

      return {
        icon: "circle-alert",
        title: "Your auction ended without a sale",
        message:
          payload.outcome === "reserve_not_met"
            ? `${payload.listingTitle} ended below reserve and did not sell.`
            : `${payload.listingTitle} ended without any winning bids.`,
        listingId: payload.listingId,
        listingUrl: `/listings/${payload.listingId}`,
        outcome: payload.outcome,
      };
    }
  }
}
