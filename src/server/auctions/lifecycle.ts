import { and, desc, eq, isNotNull, lte } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "@/db/schema";
import { bid, listing } from "@/db/schema";
import { getListingClosureResult } from "@/features/listings/domain";
import {
  createAuctionWonNotification,
  createItemNotSoldNotification,
  createItemSoldNotification,
} from "@/features/notifications/mutations";
import type {
  ListingLifecycleChangedEvent,
  NotificationCreatedEvent,
} from "@/features/realtime/events";
import {
  publishListingLifecycleChanged,
  publishNotificationCreated,
} from "@/server/ably";

type Database = LibSQLDatabase<typeof schema>;

export type AuctionLifecycleSummary = {
  activatedCount: number;
  closedCount: number;
  soldCount: number;
  unsoldCount: number;
  reserveNotMetCount: number;
};

type RunAuctionLifecycleOptions = {
  now?: Date;
  database?: Database;
};

type LifecycleListingRecord = {
  id: string;
  status: typeof listing.$inferSelect.status;
  outcome: typeof listing.$inferSelect.outcome;
  endsAt: Date;
  currentBidCents: number | null;
  bidCount: number;
  winnerUserId: string | null;
  winningBidId: string | null;
};

async function resolveDatabase(database?: Database) {
  if (database) {
    return database;
  }

  const { db } = await import("@/db/client");

  return db;
}

function toLifecycleEvent(
  record: LifecycleListingRecord,
): ListingLifecycleChangedEvent {
  return {
    listingId: record.id,
    status: record.status,
    outcome: record.outcome,
    endedAt: record.endsAt.toISOString(),
    winnerUserId: record.winnerUserId,
    winningBidId: record.winningBidId,
    currentBidCents: record.currentBidCents,
    bidCount: record.bidCount,
  };
}

export async function runAuctionLifecycle(
  options: RunAuctionLifecycleOptions = {},
) {
  const now = options.now ?? new Date();
  const database = await resolveDatabase(options.database);
  const summary: AuctionLifecycleSummary = {
    activatedCount: 0,
    closedCount: 0,
    soldCount: 0,
    unsoldCount: 0,
    reserveNotMetCount: 0,
  };
  const transactionResult = await database.transaction(async (tx) => {
    const listingEvents: ListingLifecycleChangedEvent[] = [];
    const notificationEvents: Array<{
      userId: string;
      event: NotificationCreatedEvent;
    }> = [];

    const activatedListings = await tx
      .update(listing)
      .set({
        status: "active",
      })
      .where(
        and(
          eq(listing.status, "scheduled"),
          isNotNull(listing.startsAt),
          lte(listing.startsAt, now),
        ),
      )
      .returning({
        id: listing.id,
        status: listing.status,
        outcome: listing.outcome,
        endsAt: listing.endsAt,
        currentBidCents: listing.currentBidCents,
        bidCount: listing.bidCount,
        winnerUserId: listing.winnerUserId,
        winningBidId: listing.winningBidId,
      });

    listingEvents.push(...activatedListings.map(toLifecycleEvent));
    summary.activatedCount = activatedListings.length;

    const listingsToClose = await tx
      .select({
        id: listing.id,
        title: listing.title,
        sellerId: listing.sellerId,
        endsAt: listing.endsAt,
        reservePriceCents: listing.reservePriceCents,
        currentBidCents: listing.currentBidCents,
        bidCount: listing.bidCount,
        status: listing.status,
      })
      .from(listing)
      .where(and(eq(listing.status, "active"), lte(listing.endsAt, now)));

    for (const listingToClose of listingsToClose) {
      const [highestBid] = await tx
        .select({
          id: bid.id,
          bidderId: bid.bidderId,
          amountCents: bid.amountCents,
        })
        .from(bid)
        .where(eq(bid.listingId, listingToClose.id))
        .orderBy(desc(bid.amountCents), desc(bid.createdAt))
        .limit(1);

      const closure = getListingClosureResult({
        reservePriceCents: listingToClose.reservePriceCents,
        highestBid: highestBid ?? null,
      });

      const [closedListing] = await tx
        .update(listing)
        .set({
          status: "ended",
          outcome: closure.outcome,
          winnerUserId: closure.winnerUserId,
          winningBidId: closure.winningBidId,
        })
        .where(
          and(eq(listing.id, listingToClose.id), eq(listing.status, "active")),
        )
        .returning({
          id: listing.id,
          status: listing.status,
          outcome: listing.outcome,
          endsAt: listing.endsAt,
          currentBidCents: listing.currentBidCents,
          bidCount: listing.bidCount,
          winnerUserId: listing.winnerUserId,
          winningBidId: listing.winningBidId,
        });

      if (!closedListing) {
        continue;
      }

      summary.closedCount += 1;

      if (closedListing.outcome === "sold" && highestBid) {
        summary.soldCount += 1;

        if (closedListing.winnerUserId) {
          const winnerNotification = await createAuctionWonNotification(tx, {
            userId: closedListing.winnerUserId,
            listingId: listingToClose.id,
            listingTitle: listingToClose.title,
            finalBidCents: highestBid.amountCents,
            createdAt: now,
          });

          if (winnerNotification) {
            notificationEvents.push({
              userId: closedListing.winnerUserId,
              event: winnerNotification,
            });
          }
        }

        const sellerNotification = await createItemSoldNotification(tx, {
          userId: listingToClose.sellerId,
          listingId: listingToClose.id,
          listingTitle: listingToClose.title,
          finalBidCents: highestBid.amountCents,
          createdAt: now,
        });

        if (sellerNotification) {
          notificationEvents.push({
            userId: listingToClose.sellerId,
            event: sellerNotification,
          });
        }
      }

      if (
        closedListing.outcome === "unsold" ||
        closedListing.outcome === "reserve_not_met"
      ) {
        if (closedListing.outcome === "unsold") {
          summary.unsoldCount += 1;
        } else {
          summary.reserveNotMetCount += 1;
        }

        const sellerNotification = await createItemNotSoldNotification(tx, {
          userId: listingToClose.sellerId,
          listingId: listingToClose.id,
          listingTitle: listingToClose.title,
          outcome: closedListing.outcome,
          createdAt: now,
        });

        if (sellerNotification) {
          notificationEvents.push({
            userId: listingToClose.sellerId,
            event: sellerNotification,
          });
        }
      }

      listingEvents.push(toLifecycleEvent(closedListing));
    }

    return {
      listingEvents,
      notificationEvents,
    };
  });

  await Promise.all(
    transactionResult.listingEvents.map(async (event) => {
      try {
        await publishListingLifecycleChanged(event);
      } catch (error) {
        console.error("Failed to publish listing lifecycle update.", error);
      }
    }),
  );

  await Promise.all(
    transactionResult.notificationEvents.map(async ({ userId, event }) => {
      try {
        await publishNotificationCreated(userId, event);
      } catch (error) {
        console.error("Failed to publish notification update.", error);
      }
    }),
  );

  return summary;
}
