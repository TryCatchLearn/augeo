// @vitest-environment node

import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { bid, listing } from "@/db/schema";
import {
  BidActionError,
  placeBidForListing,
} from "@/features/listings/mutations";
import { insertUser } from "../../../factories/user";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../../helpers/database";

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolver) => {
    resolve = resolver;
  });

  return { promise, resolve };
}

describe("placeBidForListing", () => {
  let testDatabase: TestDatabase;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
    await testDatabase.client.execute("PRAGMA journal_mode = WAL");
    await testDatabase.client.execute("PRAGMA busy_timeout = 3000");
  });

  afterEach(async () => {
    await testDatabase.cleanup();
  });

  async function seedListing(overrides?: Partial<typeof listing.$inferInsert>) {
    const seller = await insertUser(testDatabase.db, {
      name: "Seller One",
      email: "seller@example.test",
    });
    const listingId = overrides?.id ?? randomUUID();

    await testDatabase.db.insert(listing).values({
      id: listingId,
      sellerId: seller.id,
      title: "Auction Camera",
      description: "Clean body and lens.",
      location: "Portland, OR",
      category: "electronics",
      condition: "good",
      startingBidCents: 10_000,
      currentBidCents: null,
      bidCount: 0,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date("2026-04-10T12:00:00.000Z"),
      status: "active",
      aiDescriptionGenerationCount: 0,
      ...overrides,
    });

    return { listingId, seller };
  }

  async function createIsolatedDatabase() {
    const client = createClient({ url: testDatabase.url });
    await client.execute("PRAGMA journal_mode = WAL");
    await client.execute("PRAGMA busy_timeout = 3000");

    return {
      client,
      db: drizzle(client, { schema }),
    };
  }

  it("accepts a first bid and increments listing version", async () => {
    const { listingId } = await seedListing();
    const bidder = await insertUser(testDatabase.db, {
      name: "Buyer One",
      email: "buyer-one@example.test",
    });

    const result = await placeBidForListing(
      {
        listingId,
        bidderId: bidder.id,
        amountCents: 10_000,
      },
      testDatabase.db,
    );

    const [updatedListing] = await testDatabase.db
      .select()
      .from(listing)
      .where(eq(listing.id, listingId));

    expect(result.listingId).toBe(listingId);
    expect(updatedListing?.currentBidCents).toBe(10_000);
    expect(updatedListing?.bidCount).toBe(1);
    expect(updatedListing?.version).toBe(1);
  });

  it("accepts only one concurrent bid for the same listing state", async () => {
    const { listingId } = await seedListing();
    const buyerOne = await insertUser(testDatabase.db, {
      name: "Buyer One",
      email: "buyer-one@example.test",
    });
    const buyerTwo = await insertUser(testDatabase.db, {
      name: "Buyer Two",
      email: "buyer-two@example.test",
    });
    const isolatedDatabase = await createIsolatedDatabase();
    const firstReadDeferred = createDeferred();
    const releaseDeferred = createDeferred();

    const firstBidPromise = placeBidForListing(
      {
        listingId,
        bidderId: buyerOne.id,
        amountCents: 10_000,
      },
      testDatabase.db,
      {
        afterBidStateRead: async () => {
          firstReadDeferred.resolve();
          await releaseDeferred.promise;
        },
      },
    );

    await firstReadDeferred.promise;

    const secondBidPromise = placeBidForListing(
      {
        listingId,
        bidderId: buyerTwo.id,
        amountCents: 10_000,
      },
      isolatedDatabase.db,
    );

    await expect(secondBidPromise).resolves.toMatchObject({
      listingId,
      currentBidCents: 10_000,
      bidCount: 1,
    });

    releaseDeferred.resolve();

    const [firstResult, secondResult] = await Promise.allSettled([
      firstBidPromise,
      secondBidPromise,
    ]);

    await isolatedDatabase.client.close();

    const outcomes = [firstResult, secondResult];
    const successCount = outcomes.filter(
      (result) => result.status === "fulfilled",
    ).length;
    const failure = outcomes.find((result) => result.status === "rejected");

    const [updatedListing] = await testDatabase.db
      .select()
      .from(listing)
      .where(eq(listing.id, listingId));
    const placedBids = await testDatabase.db
      .select()
      .from(bid)
      .where(eq(bid.listingId, listingId))
      .orderBy(desc(bid.createdAt));

    expect(successCount).toBe(1);
    expect(updatedListing?.currentBidCents).toBe(10_000);
    expect(updatedListing?.bidCount).toBe(1);
    expect(updatedListing?.version).toBe(1);
    expect(placedBids).toHaveLength(1);
    expect(failure?.status).toBe("rejected");
    expect(failure).toMatchObject({
      reason: expect.objectContaining({
        message: "Bid must be at least 10500 cents.",
      }),
    });
  }, 10000);

  it("returns the ended-auction error when the listing is expired", async () => {
    const { listingId } = await seedListing({
      endsAt: new Date("2026-04-10T11:58:30.000Z"),
    });
    const bidder = await insertUser(testDatabase.db, {
      name: "Buyer One",
      email: "buyer-one@example.test",
    });

    const bidAttempt = placeBidForListing(
      {
        listingId,
        bidderId: bidder.id,
        amountCents: 10_000,
        now: new Date("2026-04-10T11:59:00.000Z"),
      },
      testDatabase.db,
    );

    await expect(bidAttempt).rejects.toThrowError(
      new BidActionError("This auction has already ended."),
    );
  });
});
