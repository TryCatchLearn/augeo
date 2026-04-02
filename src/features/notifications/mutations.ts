import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "@/db/schema";
import { notification } from "@/db/schema";
import type { ListingOutcome } from "@/features/listings/domain";
import {
  buildAuctionOutcomeNotificationDedupeKey,
  buildOutbidNotificationDedupeKey,
  getNotificationPresentation,
  type NotificationPayloadByType,
  type NotificationRecord,
  type NotificationType,
  parseNotificationPayload,
  serializeNotificationPayload,
} from "@/features/notifications/domain";
import type { NotificationCreatedEvent } from "@/features/realtime/events";

type Database = LibSQLDatabase<typeof schema>;
type NotificationDatabase = Pick<Database, "insert" | "update" | "select">;

type CreateNotificationInput<TType extends NotificationType> = {
  userId: string;
  type: TType;
  dedupeKey: string;
  payload: NotificationPayloadByType[TType];
  createdAt?: Date;
};

function toNotificationCreatedEvent<TType extends NotificationType>(
  record: NotificationRecord<TType>,
): NotificationCreatedEvent {
  const presentation = getNotificationPresentation(record);

  return {
    notificationId: record.id,
    type: record.type,
    listingId: presentation.listingId,
    listingUrl: presentation.listingUrl,
    title: presentation.title,
    message: presentation.message,
    createdAt: record.createdAt.toISOString(),
    readAt: record.readAt?.toISOString() ?? null,
    icon: presentation.icon,
    outcome: presentation.outcome ?? null,
  };
}

async function createNotification<TType extends NotificationType>(
  database: NotificationDatabase,
  input: CreateNotificationInput<TType>,
) {
  const createdAt = input.createdAt ?? new Date();
  const notificationId = randomUUID();
  const inserted = await database
    .insert(notification)
    .values({
      id: notificationId,
      userId: input.userId,
      type: input.type,
      dedupeKey: input.dedupeKey,
      payload: serializeNotificationPayload(input.payload),
      createdAt,
    })
    .onConflictDoNothing({
      target: notification.dedupeKey,
    })
    .returning({
      id: notification.id,
      type: notification.type,
      payload: notification.payload,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    });

  const createdNotification = inserted[0];

  if (!createdNotification) {
    return null;
  }

  const record = {
    id: createdNotification.id,
    type: createdNotification.type as TType,
    payload: parseNotificationPayload(input.type, createdNotification.payload),
    createdAt: createdNotification.createdAt,
    readAt: createdNotification.readAt,
  } satisfies NotificationRecord<TType>;

  return toNotificationCreatedEvent(record);
}

export async function createOutbidNotification(
  database: NotificationDatabase,
  input: {
    userId: string;
    listingId: string;
    listingTitle: string;
    acceptedBidId: string;
    currentBidCents: number;
    minimumNextBidCents: number;
    bidCount: number;
    createdAt?: Date;
  },
) {
  return createNotification(database, {
    userId: input.userId,
    type: "outbid",
    dedupeKey: buildOutbidNotificationDedupeKey({
      recipientUserId: input.userId,
      listingId: input.listingId,
      acceptedBidId: input.acceptedBidId,
    }),
    payload: {
      listingId: input.listingId,
      listingTitle: input.listingTitle,
      acceptedBidId: input.acceptedBidId,
      currentBidCents: input.currentBidCents,
      minimumNextBidCents: input.minimumNextBidCents,
      bidCount: input.bidCount,
    },
    createdAt: input.createdAt,
  });
}

export async function createAuctionWonNotification(
  database: NotificationDatabase,
  input: {
    userId: string;
    listingId: string;
    listingTitle: string;
    finalBidCents: number;
    createdAt?: Date;
  },
) {
  return createNotification(database, {
    userId: input.userId,
    type: "auction_won",
    dedupeKey: buildAuctionOutcomeNotificationDedupeKey({
      type: "auction_won",
      recipientUserId: input.userId,
      listingId: input.listingId,
      outcome: "sold",
    }),
    payload: {
      listingId: input.listingId,
      listingTitle: input.listingTitle,
      finalBidCents: input.finalBidCents,
    },
    createdAt: input.createdAt,
  });
}

export async function createItemSoldNotification(
  database: NotificationDatabase,
  input: {
    userId: string;
    listingId: string;
    listingTitle: string;
    finalBidCents: number;
    createdAt?: Date;
  },
) {
  return createNotification(database, {
    userId: input.userId,
    type: "item_sold",
    dedupeKey: buildAuctionOutcomeNotificationDedupeKey({
      type: "item_sold",
      recipientUserId: input.userId,
      listingId: input.listingId,
      outcome: "sold",
    }),
    payload: {
      listingId: input.listingId,
      listingTitle: input.listingTitle,
      finalBidCents: input.finalBidCents,
    },
    createdAt: input.createdAt,
  });
}

export async function createItemNotSoldNotification(
  database: NotificationDatabase,
  input: {
    userId: string;
    listingId: string;
    listingTitle: string;
    outcome: Extract<ListingOutcome, "unsold" | "reserve_not_met">;
    createdAt?: Date;
  },
) {
  return createNotification(database, {
    userId: input.userId,
    type: "item_not_sold",
    dedupeKey: buildAuctionOutcomeNotificationDedupeKey({
      type: "item_not_sold",
      recipientUserId: input.userId,
      listingId: input.listingId,
      outcome: input.outcome,
    }),
    payload: {
      listingId: input.listingId,
      listingTitle: input.listingTitle,
      outcome: input.outcome,
    },
    createdAt: input.createdAt,
  });
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
  database: Database,
) {
  await database
    .update(notification)
    .set({
      readAt: new Date(),
    })
    .where(
      and(
        eq(notification.id, notificationId),
        eq(notification.userId, userId),
        isNull(notification.readAt),
      ),
    );
}

export async function markAllNotificationsRead(
  userId: string,
  database: Database,
) {
  await database
    .update(notification)
    .set({
      readAt: new Date(),
    })
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)));
}
