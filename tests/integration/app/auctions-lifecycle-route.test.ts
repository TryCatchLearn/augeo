// @vitest-environment node

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bid, listing, notification } from "@/db/schema";
import { insertUser } from "../../factories/user";
import { createTestDatabase, type TestDatabase } from "../../helpers/database";

const hoisted = vi.hoisted(() => ({
  db: null as TestDatabase["db"] | null,
  publishListingLifecycleChanged: vi.fn(),
  publishNotificationCreated: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  get db() {
    return hoisted.db;
  },
}));

vi.mock("@/server/ably", () => ({
  publishListingLifecycleChanged: hoisted.publishListingLifecycleChanged,
  publishNotificationCreated: hoisted.publishNotificationCreated,
}));

describe("auctions lifecycle route", () => {
  let testDatabase: TestDatabase;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T12:00:00.000Z"));
    testDatabase = await createTestDatabase();
    hoisted.db = testDatabase.db;
    hoisted.publishListingLifecycleChanged.mockReset();
    hoisted.publishNotificationCreated.mockReset();
    vi.stubEnv("AUCTION_LIFECYCLE_CRON_SECRET", "phase-5-secret");
  });

  afterEach(async () => {
    hoisted.db = null;
    await testDatabase.cleanup();
  });

  async function postLifecycle(secret?: string) {
    const { POST } = await import("@/app/api/auctions/lifecycle/route");
    const headers = new Headers();

    if (secret) {
      headers.set("authorization", `Bearer ${secret}`);
    }

    return POST(
      new Request("http://localhost/api/auctions/lifecycle", {
        method: "POST",
        headers,
      }),
    );
  }

  async function seedListing(overrides?: Partial<typeof listing.$inferInsert>) {
    const seller = await insertUser(testDatabase.db, {
      name: "Seller One",
      email: `seller-${randomUUID()}@example.test`,
    });
    const listingId = overrides?.id ?? randomUUID();

    await testDatabase.db.insert(listing).values({
      id: listingId,
      sellerId: seller.id,
      title: "Lifecycle Camera",
      description: "Auction lifecycle test listing.",
      location: "Portland, OR",
      category: "electronics",
      condition: "good",
      startingBidCents: 10_000,
      currentBidCents: null,
      bidCount: 0,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date("2026-04-02T12:05:00.000Z"),
      status: "active",
      aiDescriptionGenerationCount: 0,
      ...overrides,
    });

    return { listingId, seller };
  }

  async function seedHighestBid(
    listingId: string,
    amountCents: number,
    overrides?: Partial<typeof bid.$inferInsert>,
  ) {
    const bidder = await insertUser(testDatabase.db, {
      name: "Buyer One",
      email: `buyer-${randomUUID()}@example.test`,
    });
    const bidId = overrides?.id ?? randomUUID();

    await testDatabase.db.insert(bid).values({
      id: bidId,
      listingId,
      bidderId: bidder.id,
      amountCents,
      createdAt: new Date("2026-04-02T12:01:00.000Z"),
      ...overrides,
    });

    return { bidId, bidder };
  }

  it("rejects missing bearer secrets", async () => {
    const response = await postLifecycle();

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(hoisted.publishListingLifecycleChanged).not.toHaveBeenCalled();
  });

  it("rejects incorrect bearer secrets", async () => {
    const response = await postLifecycle("wrong-secret");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(hoisted.publishListingLifecycleChanged).not.toHaveBeenCalled();
  });

  it("activates scheduled listings whose start time has arrived", async () => {
    const { listingId } = await seedListing({
      status: "scheduled",
      startsAt: new Date("2026-04-02T11:59:00.000Z"),
      endsAt: new Date("2026-04-02T12:30:00.000Z"),
    });

    const response = await postLifecycle("phase-5-secret");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activatedCount: 1,
      closedCount: 0,
      soldCount: 0,
      unsoldCount: 0,
      reserveNotMetCount: 0,
    });

    const [updatedListing] = await testDatabase.db
      .select({
        status: listing.status,
        outcome: listing.outcome,
      })
      .from(listing)
      .where(eq(listing.id, listingId));

    expect(updatedListing).toEqual({
      status: "active",
      outcome: null,
    });
    expect(hoisted.publishListingLifecycleChanged).toHaveBeenCalledWith({
      listingId,
      status: "active",
      outcome: null,
      endedAt: "2026-04-02T12:30:00.000Z",
      winnerUserId: null,
      winningBidId: null,
      currentBidCents: null,
      bidCount: 0,
    });
  });

  it("closes an active listing as sold when the reserve is met", async () => {
    const { listingId, seller } = await seedListing({
      currentBidCents: 12_500,
      bidCount: 1,
      endsAt: new Date("2026-04-02T11:59:00.000Z"),
      reservePriceCents: 12_000,
    });
    const { bidId, bidder } = await seedHighestBid(listingId, 12_500);

    const response = await postLifecycle("phase-5-secret");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activatedCount: 0,
      closedCount: 1,
      soldCount: 1,
      unsoldCount: 0,
      reserveNotMetCount: 0,
    });

    const [updatedListing] = await testDatabase.db
      .select({
        status: listing.status,
        outcome: listing.outcome,
        winnerUserId: listing.winnerUserId,
        winningBidId: listing.winningBidId,
      })
      .from(listing)
      .where(eq(listing.id, listingId));

    expect(updatedListing).toEqual({
      status: "ended",
      outcome: "sold",
      winnerUserId: bidder.id,
      winningBidId: bidId,
    });
    const createdNotifications = await testDatabase.db
      .select({
        userId: notification.userId,
        type: notification.type,
      })
      .from(notification);

    expect(createdNotifications).toEqual(
      expect.arrayContaining([
        {
          userId: bidder.id,
          type: "auction_won",
        },
        {
          userId: seller.id,
          type: "item_sold",
        },
      ]),
    );
    expect(hoisted.publishListingLifecycleChanged).toHaveBeenCalledWith({
      listingId,
      status: "ended",
      outcome: "sold",
      endedAt: "2026-04-02T11:59:00.000Z",
      winnerUserId: bidder.id,
      winningBidId: bidId,
      currentBidCents: 12_500,
      bidCount: 1,
    });
    expect(hoisted.publishNotificationCreated).toHaveBeenCalledTimes(2);
  });

  it("closes an active listing as unsold when it has no bids", async () => {
    const { listingId, seller } = await seedListing({
      endsAt: new Date("2026-04-02T11:59:00.000Z"),
    });

    const response = await postLifecycle("phase-5-secret");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activatedCount: 0,
      closedCount: 1,
      soldCount: 0,
      unsoldCount: 1,
      reserveNotMetCount: 0,
    });

    const [updatedListing] = await testDatabase.db
      .select({
        status: listing.status,
        outcome: listing.outcome,
        winnerUserId: listing.winnerUserId,
        winningBidId: listing.winningBidId,
      })
      .from(listing)
      .where(eq(listing.id, listingId));

    expect(updatedListing).toEqual({
      status: "ended",
      outcome: "unsold",
      winnerUserId: null,
      winningBidId: null,
    });
    await expect(
      testDatabase.db
        .select({
          type: notification.type,
          userId: notification.userId,
        })
        .from(notification),
    ).resolves.toEqual([
      {
        type: "item_not_sold",
        userId: seller.id,
      },
    ]);
  });

  it("closes an active listing as reserve_not_met when the top bid is too low", async () => {
    const { listingId, seller } = await seedListing({
      currentBidCents: 19_000,
      bidCount: 1,
      endsAt: new Date("2026-04-02T11:59:00.000Z"),
      reservePriceCents: 20_000,
    });

    await seedHighestBid(listingId, 19_000);

    const response = await postLifecycle("phase-5-secret");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activatedCount: 0,
      closedCount: 1,
      soldCount: 0,
      unsoldCount: 0,
      reserveNotMetCount: 1,
    });

    const [updatedListing] = await testDatabase.db
      .select({
        status: listing.status,
        outcome: listing.outcome,
        winnerUserId: listing.winnerUserId,
        winningBidId: listing.winningBidId,
      })
      .from(listing)
      .where(eq(listing.id, listingId));

    expect(updatedListing).toEqual({
      status: "ended",
      outcome: "reserve_not_met",
      winnerUserId: null,
      winningBidId: null,
    });
    await expect(
      testDatabase.db
        .select({
          type: notification.type,
          userId: notification.userId,
        })
        .from(notification),
    ).resolves.toEqual([
      {
        type: "item_not_sold",
        userId: seller.id,
      },
    ]);
  });

  it("is safe to rerun without duplicating state changes or publish events", async () => {
    const { listingId } = await seedListing({
      currentBidCents: 12_500,
      bidCount: 1,
      endsAt: new Date("2026-04-02T11:59:00.000Z"),
    });
    const { bidder, bidId } = await seedHighestBid(listingId, 12_500);

    const firstResponse = await postLifecycle("phase-5-secret");
    const secondResponse = await postLifecycle("phase-5-secret");

    await expect(firstResponse.json()).resolves.toEqual({
      activatedCount: 0,
      closedCount: 1,
      soldCount: 1,
      unsoldCount: 0,
      reserveNotMetCount: 0,
    });
    await expect(secondResponse.json()).resolves.toEqual({
      activatedCount: 0,
      closedCount: 0,
      soldCount: 0,
      unsoldCount: 0,
      reserveNotMetCount: 0,
    });

    const [updatedListing] = await testDatabase.db
      .select({
        status: listing.status,
        outcome: listing.outcome,
        winnerUserId: listing.winnerUserId,
        winningBidId: listing.winningBidId,
      })
      .from(listing)
      .where(eq(listing.id, listingId));

    expect(updatedListing).toEqual({
      status: "ended",
      outcome: "sold",
      winnerUserId: bidder.id,
      winningBidId: bidId,
    });
    expect(hoisted.publishListingLifecycleChanged).toHaveBeenCalledTimes(1);
    expect(hoisted.publishNotificationCreated).toHaveBeenCalledTimes(2);
    await expect(
      testDatabase.db.select({ id: notification.id }).from(notification),
    ).resolves.toHaveLength(2);
  });
});
