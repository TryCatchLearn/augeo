// @vitest-environment node

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { notification } from "@/db/schema";
import {
  getUnreadNotificationCount,
  listRecentNotifications,
} from "@/features/notifications/queries";
import { insertUser } from "../../../factories/user";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../../helpers/database";

describe("notification queries", () => {
  let testDatabase: TestDatabase;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
  });

  afterEach(async () => {
    await testDatabase.cleanup();
  });

  it("returns the unread count for a user", async () => {
    const user = await insertUser(testDatabase.db);
    const otherUser = await insertUser(testDatabase.db);

    await testDatabase.db.insert(notification).values([
      buildNotification({
        userId: user.id,
        type: "outbid",
        readAt: null,
      }),
      buildNotification({
        userId: user.id,
        type: "item_sold",
        readAt: null,
      }),
      buildNotification({
        userId: user.id,
        type: "auction_won",
        readAt: new Date("2026-04-02T12:05:00.000Z"),
      }),
      buildNotification({
        userId: otherUser.id,
        type: "outbid",
        readAt: null,
      }),
    ]);

    await expect(
      getUnreadNotificationCount(user.id, testDatabase.db),
    ).resolves.toBe(2);
  });

  it("returns the 10 most recent notifications newest-first", async () => {
    const user = await insertUser(testDatabase.db);

    for (let index = 0; index < 12; index += 1) {
      await testDatabase.db.insert(notification).values(
        buildNotification({
          userId: user.id,
          type: index % 2 === 0 ? "outbid" : "item_not_sold",
          payload:
            index % 2 === 0
              ? JSON.stringify({
                  listingId: `listing-${index}`,
                  listingTitle: `Listing ${index}`,
                  acceptedBidId: `bid-${index}`,
                  currentBidCents: 50_000 + index,
                  minimumNextBidCents: 51_000 + index,
                  bidCount: index + 1,
                })
              : JSON.stringify({
                  listingId: `listing-${index}`,
                  listingTitle: `Listing ${index}`,
                  outcome: "unsold",
                }),
          createdAt: new Date(
            `2026-04-02T12:${String(index).padStart(2, "0")}:00.000Z`,
          ),
          readAt: index < 3 ? new Date("2026-04-02T13:00:00.000Z") : null,
        }),
      );
    }

    const recentNotifications = await listRecentNotifications(
      user.id,
      testDatabase.db,
    );

    expect(recentNotifications).toHaveLength(10);
    expect(recentNotifications.map((item) => item.listingId)).toEqual([
      "listing-11",
      "listing-10",
      "listing-9",
      "listing-8",
      "listing-7",
      "listing-6",
      "listing-5",
      "listing-4",
      "listing-3",
      "listing-2",
    ]);
    expect(recentNotifications[0]).toMatchObject({
      title: "Your auction ended without a sale",
      message: "Listing 11 ended without any winning bids.",
      readAt: null,
    });
    expect(recentNotifications[1]).toMatchObject({
      title: "You've been outbid",
      listingUrl: "/listings/listing-10",
      readAt: null,
    });
  });
});

function buildNotification(
  overrides: Partial<typeof notification.$inferInsert> & { userId: string },
): typeof notification.$inferInsert {
  return {
    id: overrides.id ?? randomUUID(),
    userId: overrides.userId,
    type: overrides.type ?? "outbid",
    dedupeKey: overrides.dedupeKey ?? randomUUID(),
    payload:
      overrides.payload ??
      JSON.stringify({
        listingId: "listing-1",
        listingTitle: "Collector Camera",
        acceptedBidId: "bid-1",
        currentBidCents: 50_000,
        minimumNextBidCents: 51_000,
        bidCount: 2,
      }),
    readAt: overrides.readAt ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-04-02T12:00:00.000Z"),
  };
}
