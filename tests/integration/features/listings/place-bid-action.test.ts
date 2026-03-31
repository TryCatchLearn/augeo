// @vitest-environment node

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bid, listing } from "@/db/schema";
import { insertUser } from "../../../factories/user";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../../helpers/database";

const hoisted = vi.hoisted(() => ({
  requireAuthenticatedSession: vi.fn(),
  revalidatePath: vi.fn(),
  db: null as TestDatabase["db"] | null,
}));

vi.mock("next/cache", () => ({
  revalidatePath: hoisted.revalidatePath,
}));

vi.mock("@/features/auth/session", () => ({
  requireAuthenticatedSession: hoisted.requireAuthenticatedSession,
}));

vi.mock("@/db/client", () => ({
  get db() {
    return hoisted.db;
  },
}));

describe("placeBidAction", () => {
  let testDatabase: TestDatabase;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
    hoisted.db = testDatabase.db;
    hoisted.revalidatePath.mockReset();
    hoisted.requireAuthenticatedSession.mockReset();
  });

  afterEach(async () => {
    hoisted.db = null;
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

  async function placeBidAs(
    userId: string,
    amountCents: number,
    listingId: string,
  ) {
    hoisted.requireAuthenticatedSession.mockResolvedValue({
      user: { id: userId },
      session: { id: `session-${userId}` },
    });

    const { placeBidAction } = await import("@/features/listings/actions");

    return placeBidAction({ listingId, amountCents });
  }

  it("accepts a valid first bid", async () => {
    const { listingId } = await seedListing();
    const buyer = await insertUser(testDatabase.db, {
      name: "Buyer One",
      email: "buyer-one@example.test",
    });

    await expect(placeBidAs(buyer.id, 10_000, listingId)).resolves.toEqual({
      status: "success",
      listingId,
    });

    const [updatedListing] = await testDatabase.db
      .select()
      .from(listing)
      .where(eq(listing.id, listingId));
    const placedBids = await testDatabase.db
      .select()
      .from(bid)
      .where(eq(bid.listingId, listingId));

    expect(updatedListing?.currentBidCents).toBe(10_000);
    expect(updatedListing?.bidCount).toBe(1);
    expect(placedBids).toHaveLength(1);
  });

  it("accepts a valid later bid", async () => {
    const { listingId } = await seedListing();
    const buyerOne = await insertUser(testDatabase.db, {
      name: "Buyer One",
      email: "buyer-one@example.test",
    });
    const buyerTwo = await insertUser(testDatabase.db, {
      name: "Buyer Two",
      email: "buyer-two@example.test",
    });

    await placeBidAs(buyerOne.id, 10_000, listingId);

    await expect(placeBidAs(buyerTwo.id, 10_500, listingId)).resolves.toEqual({
      status: "success",
      listingId,
    });

    const [updatedListing] = await testDatabase.db
      .select()
      .from(listing)
      .where(eq(listing.id, listingId));

    expect(updatedListing?.currentBidCents).toBe(10_500);
    expect(updatedListing?.bidCount).toBe(2);
  });

  it("allows the highest bidder to raise their own bid", async () => {
    const { listingId } = await seedListing();
    const buyer = await insertUser(testDatabase.db, {
      name: "Buyer One",
      email: "buyer-one@example.test",
    });

    await placeBidAs(buyer.id, 10_000, listingId);

    await expect(placeBidAs(buyer.id, 10_500, listingId)).resolves.toEqual({
      status: "success",
      listingId,
    });
  });

  it("rejects unauthenticated bids", async () => {
    const { listingId } = await seedListing();

    hoisted.requireAuthenticatedSession.mockRejectedValue(
      new Error("Unauthorized"),
    );
    const { placeBidAction } = await import("@/features/listings/actions");

    await expect(
      placeBidAction({ listingId, amountCents: 10_000 }),
    ).resolves.toEqual({
      status: "error",
      errorMessage: "Sign in to place a bid.",
    });
  });

  it("rejects seller self-bids", async () => {
    const { listingId, seller } = await seedListing();

    await expect(placeBidAs(seller.id, 10_000, listingId)).resolves.toEqual({
      status: "error",
      errorMessage: "You can't bid on your own listing.",
    });
  });

  it("rejects inactive listings", async () => {
    const { listingId } = await seedListing({ status: "scheduled" });
    const buyer = await insertUser(testDatabase.db, {
      name: "Buyer One",
      email: "buyer-one@example.test",
    });

    await expect(placeBidAs(buyer.id, 10_000, listingId)).resolves.toEqual({
      status: "error",
      errorMessage: "Only active listings can accept bids.",
    });
  });

  it("rejects expired listings", async () => {
    const { listingId } = await seedListing({
      endsAt: new Date("2026-03-01T12:00:00.000Z"),
    });
    const buyer = await insertUser(testDatabase.db, {
      name: "Buyer One",
      email: "buyer-one@example.test",
    });

    await expect(placeBidAs(buyer.id, 10_000, listingId)).resolves.toEqual({
      status: "error",
      errorMessage: "This auction has already ended.",
    });
  });

  it("rejects bids below the next minimum increment", async () => {
    const { listingId } = await seedListing();
    const buyerOne = await insertUser(testDatabase.db, {
      name: "Buyer One",
      email: "buyer-one@example.test",
    });
    const buyerTwo = await insertUser(testDatabase.db, {
      name: "Buyer Two",
      email: "buyer-two@example.test",
    });

    await placeBidAs(buyerOne.id, 10_000, listingId);

    await expect(placeBidAs(buyerTwo.id, 10_050, listingId)).resolves.toEqual({
      status: "error",
      errorMessage: "Bid must be at least $105.00.",
    });
  });
});
