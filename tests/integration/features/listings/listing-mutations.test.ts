// @vitest-environment node

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listing, listingImage, user } from "@/db/schema";
import {
  deleteDraftListing,
  publishListing,
  returnListingToDraft,
  saveDraftListing,
} from "@/features/listings/mutations";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../../helpers/database";

describe("listing mutations", () => {
  let testDatabase: TestDatabase;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
  });

  afterEach(async () => {
    await testDatabase.cleanup();
  });

  async function seedDraftListing() {
    const sellerId = randomUUID();
    const listingId = randomUUID();

    await testDatabase.db.insert(user).values({
      id: sellerId,
      name: "Seller One",
      email: `seller-${sellerId}@example.test`,
      emailVerified: true,
    });

    await testDatabase.db.insert(listing).values({
      id: listingId,
      sellerId,
      title: "Draft Camera",
      description: "Initial draft",
      location: "Austin, TX",
      category: "electronics",
      condition: "good",
      startingBidCents: 15000,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date("2026-03-28T12:00:00.000Z"),
      status: "draft",
    });

    return { sellerId, listingId };
  }

  it("saves draft edits without changing the draft status", async () => {
    const { sellerId, listingId } = await seedDraftListing();

    await saveDraftListing(
      {
        sellerId,
        listingId,
        title: "Refined Camera",
        description: "Updated description",
        location: "Portland, OR",
        category: "collectibles",
        condition: "like_new",
        startingBidCents: 22500,
        reservePriceCents: 30000,
        startsAt: "2026-03-27T12:00:00.000Z",
        endsAt: "2026-03-30T12:00:00.000Z",
      },
      testDatabase.db,
    );

    const [updatedListing] = await testDatabase.db
      .select()
      .from(listing)
      .where(eq(listing.id, listingId));

    expect(updatedListing).toMatchObject({
      title: "Refined Camera",
      description: "Updated description",
      location: "Portland, OR",
      category: "collectibles",
      condition: "like_new",
      startingBidCents: 22500,
      reservePriceCents: 30000,
      status: "draft",
    });
    expect(updatedListing?.startsAt?.toISOString()).toBe(
      "2026-03-27T12:00:00.000Z",
    );
  });

  it("publishes drafts immediately when no future start time exists", async () => {
    const { sellerId, listingId } = await seedDraftListing();

    const result = await publishListing(
      {
        sellerId,
        listingId,
        now: new Date("2026-03-24T12:00:00.000Z"),
      },
      testDatabase.db,
    );

    expect(result.status).toBe("active");
  });

  it("publishes drafts as scheduled when the start time is in the future", async () => {
    const { sellerId, listingId } = await seedDraftListing();

    await testDatabase.db
      .update(listing)
      .set({
        startsAt: new Date("2026-03-29T12:00:00.000Z"),
      })
      .where(eq(listing.id, listingId));

    const result = await publishListing(
      {
        sellerId,
        listingId,
        now: new Date("2026-03-24T12:00:00.000Z"),
      },
      testDatabase.db,
    );

    expect(result.status).toBe("scheduled");
  });

  it("returns scheduled listings to draft", async () => {
    const { sellerId, listingId } = await seedDraftListing();

    await testDatabase.db
      .update(listing)
      .set({
        status: "scheduled",
      })
      .where(eq(listing.id, listingId));

    const result = await returnListingToDraft(
      {
        sellerId,
        listingId,
      },
      testDatabase.db,
    );

    expect(result.status).toBe("draft");
  });

  it("deletes draft rows and removes cloud assets first", async () => {
    const { sellerId, listingId } = await seedDraftListing();
    const deleteAssets = vi.fn().mockResolvedValue(undefined);

    await testDatabase.db.insert(listingImage).values([
      {
        id: randomUUID(),
        listingId,
        publicId: "listing/cover",
        url: "https://res.cloudinary.com/demo/image/upload/listing/cover.jpg",
        isMain: true,
      },
      {
        id: randomUUID(),
        listingId,
        publicId: "listing/detail",
        url: "https://res.cloudinary.com/demo/image/upload/listing/detail.jpg",
        isMain: false,
      },
    ]);

    await deleteDraftListing(
      {
        sellerId,
        listingId,
        deleteAssets,
      },
      testDatabase.db,
    );

    const remainingListings = await testDatabase.db
      .select()
      .from(listing)
      .where(eq(listing.id, listingId));
    const remainingImages = await testDatabase.db
      .select()
      .from(listingImage)
      .where(eq(listingImage.listingId, listingId));

    expect(deleteAssets).toHaveBeenCalledTimes(1);
    expect(deleteAssets.mock.calls[0]?.[0]?.slice().sort()).toEqual([
      "listing/cover",
      "listing/detail",
    ]);
    expect(remainingListings).toHaveLength(0);
    expect(remainingImages).toHaveLength(0);
  });
});
