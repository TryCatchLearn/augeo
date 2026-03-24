// @vitest-environment node

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listing, listingImage, user } from "@/db/schema";
import {
  addListingImage,
  deleteDraftListing,
  deleteListingImage,
  publishListing,
  returnListingToDraft,
  saveDraftListing,
  setMainListingImage,
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

  async function seedDraftListingImages(listingId: string) {
    const mainImageId = randomUUID();
    const secondaryImageId = randomUUID();

    await testDatabase.db.insert(listingImage).values([
      {
        id: mainImageId,
        listingId,
        publicId: "listing/cover",
        url: "https://res.cloudinary.com/demo/image/upload/listing/cover.jpg",
        isMain: true,
      },
      {
        id: secondaryImageId,
        listingId,
        publicId: "listing/detail",
        url: "https://res.cloudinary.com/demo/image/upload/listing/detail.jpg",
        isMain: false,
      },
    ]);

    return { mainImageId, secondaryImageId };
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

    await seedDraftListingImages(listingId);

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

  it("adds an additional draft image until the five-image cap is reached", async () => {
    const { sellerId, listingId } = await seedDraftListing();
    await seedDraftListingImages(listingId);

    await addListingImage(
      {
        sellerId,
        listingId,
        uploadPublicId: "listing/extra",
        uploadUrl:
          "https://res.cloudinary.com/demo/image/upload/listing/extra.jpg",
      },
      testDatabase.db,
    );

    const images = await testDatabase.db
      .select()
      .from(listingImage)
      .where(eq(listingImage.listingId, listingId));

    expect(images).toHaveLength(3);
    expect(images.some((image) => image.publicId === "listing/extra")).toBe(
      true,
    );
  });

  it("rejects additional image uploads after five images", async () => {
    const { sellerId, listingId } = await seedDraftListing();

    await testDatabase.db.insert(listingImage).values(
      Array.from({ length: 5 }, (_, index) => ({
        id: randomUUID(),
        listingId,
        publicId: `listing/${index}`,
        url: `https://res.cloudinary.com/demo/image/upload/listing/${index}.jpg`,
        isMain: index === 0,
      })),
    );

    await expect(
      addListingImage(
        {
          sellerId,
          listingId,
          uploadPublicId: "listing/overflow",
          uploadUrl:
            "https://res.cloudinary.com/demo/image/upload/listing/overflow.jpg",
        },
        testDatabase.db,
      ),
    ).rejects.toThrow("Listings can include up to 5 images.");
  });

  it("switches the main image within a draft", async () => {
    const { sellerId, listingId } = await seedDraftListing();
    const { mainImageId, secondaryImageId } =
      await seedDraftListingImages(listingId);

    await setMainListingImage(
      {
        sellerId,
        listingId,
        imageId: secondaryImageId,
      },
      testDatabase.db,
    );

    const images = await testDatabase.db
      .select()
      .from(listingImage)
      .where(eq(listingImage.listingId, listingId));

    expect(images.find((image) => image.id === mainImageId)?.isMain).toBe(
      false,
    );
    expect(images.find((image) => image.id === secondaryImageId)?.isMain).toBe(
      true,
    );
  });

  it("deletes a draft image and promotes another image when the main one is removed", async () => {
    const { sellerId, listingId } = await seedDraftListing();
    const { mainImageId, secondaryImageId } =
      await seedDraftListingImages(listingId);
    const deleteAssets = vi.fn().mockResolvedValue(undefined);

    await deleteListingImage(
      {
        sellerId,
        listingId,
        imageId: mainImageId,
        deleteAssets,
      },
      testDatabase.db,
    );

    const images = await testDatabase.db
      .select()
      .from(listingImage)
      .where(eq(listingImage.listingId, listingId));

    expect(deleteAssets).toHaveBeenCalledWith(["listing/cover"]);
    expect(images).toHaveLength(1);
    expect(images[0]?.id).toBe(secondaryImageId);
    expect(images[0]?.isMain).toBe(true);
  });

  it("prevents deleting the final remaining image", async () => {
    const { sellerId, listingId } = await seedDraftListing();
    const imageId = randomUUID();

    await testDatabase.db.insert(listingImage).values({
      id: imageId,
      listingId,
      publicId: "listing/only",
      url: "https://res.cloudinary.com/demo/image/upload/listing/only.jpg",
      isMain: true,
    });

    await expect(
      deleteListingImage(
        {
          sellerId,
          listingId,
          imageId,
        },
        testDatabase.db,
      ),
    ).rejects.toThrow("The final listing image cannot be deleted.");
  });
});
