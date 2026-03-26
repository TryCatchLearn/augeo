// @vitest-environment node

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listing, listingImage, user } from "@/db/schema";
import {
  deleteDraftListingRecords,
  deleteListingImageRecord,
  incrementListingDescriptionGenerationCount,
  insertDraftWithMainImage,
  insertListingImage,
  setMainListingImage,
  updateDraftListing,
  updateListingStatus,
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

  async function seedSeller() {
    const sellerId = randomUUID();

    await testDatabase.db.insert(user).values({
      id: sellerId,
      name: "Seller One",
      email: `seller-${sellerId}@example.test`,
      emailVerified: true,
    });

    return sellerId;
  }

  async function seedDraftListing() {
    const sellerId = await seedSeller();
    const listingId = randomUUID();

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
      aiDescriptionGenerationCount: 0,
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

  it("inserts a draft listing with its main image", async () => {
    const sellerId = await seedSeller();

    const result = await insertDraftWithMainImage(
      {
        sellerId,
        uploadPublicId: "cloudinary-public-id",
        uploadUrl: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
        defaults: {
          title: "Vintage Camera",
          description: "Great condition.",
          location: "Add location",
          category: "electronics",
          condition: "good",
          startingBidCents: 18000,
          reservePriceCents: null,
          startsAt: null,
          endsAt: new Date("2026-03-30T12:00:00.000Z"),
          status: "draft",
        },
      },
      testDatabase.db,
    );

    const [createdListing] = await testDatabase.db
      .select()
      .from(listing)
      .where(eq(listing.id, result.id));
    const [createdImage] = await testDatabase.db
      .select()
      .from(listingImage)
      .where(eq(listingImage.listingId, result.id));

    expect(createdListing?.sellerId).toBe(sellerId);
    expect(createdImage).toMatchObject({
      listingId: result.id,
      publicId: "cloudinary-public-id",
      isMain: true,
    });
  });

  it("updates draft fields", async () => {
    const { listingId } = await seedDraftListing();

    await updateDraftListing(
      {
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
    });
  });

  it("updates listing status", async () => {
    const { listingId } = await seedDraftListing();

    await updateListingStatus(
      {
        listingId,
        status: "active",
      },
      testDatabase.db,
    );

    const [updatedListing] = await testDatabase.db
      .select({
        status: listing.status,
      })
      .from(listing)
      .where(eq(listing.id, listingId));

    expect(updatedListing?.status).toBe("active");
  });

  it("deletes draft rows", async () => {
    const { listingId } = await seedDraftListing();
    await seedDraftListingImages(listingId);

    await deleteDraftListingRecords(listingId, testDatabase.db);

    await expect(
      testDatabase.db.select().from(listing).where(eq(listing.id, listingId)),
    ).resolves.toHaveLength(0);
    await expect(
      testDatabase.db
        .select()
        .from(listingImage)
        .where(eq(listingImage.listingId, listingId)),
    ).resolves.toHaveLength(0);
  });

  it("inserts additional listing images", async () => {
    const { listingId } = await seedDraftListing();

    const result = await insertListingImage(
      {
        listingId,
        uploadPublicId: "listing/detail",
        uploadUrl:
          "https://res.cloudinary.com/demo/image/upload/listing/detail.jpg",
        isMain: false,
      },
      testDatabase.db,
    );

    const [image] = await testDatabase.db
      .select()
      .from(listingImage)
      .where(eq(listingImage.id, result.id));

    expect(image?.listingId).toBe(listingId);
    expect(image?.isMain).toBe(false);
  });

  it("switches the main image within a draft", async () => {
    const { listingId } = await seedDraftListing();
    const { mainImageId, secondaryImageId } =
      await seedDraftListingImages(listingId);

    await setMainListingImage(
      {
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

  it("deletes an image row and promotes the next main image", async () => {
    const { listingId } = await seedDraftListing();
    const { mainImageId, secondaryImageId } =
      await seedDraftListingImages(listingId);

    await deleteListingImageRecord(
      {
        imageId: mainImageId,
        nextMainImageId: secondaryImageId,
      },
      testDatabase.db,
    );

    const images = await testDatabase.db
      .select()
      .from(listingImage)
      .where(eq(listingImage.listingId, listingId));

    expect(images).toHaveLength(1);
    expect(images[0]?.id).toBe(secondaryImageId);
    expect(images[0]?.isMain).toBe(true);
  });

  it("increments the AI description generation counter", async () => {
    const { sellerId, listingId } = await seedDraftListing();

    await incrementListingDescriptionGenerationCount(
      {
        listingId,
        sellerId,
        currentCount: 0,
      },
      testDatabase.db,
    );

    const [updatedListing] = await testDatabase.db
      .select({
        aiDescriptionGenerationCount: listing.aiDescriptionGenerationCount,
      })
      .from(listing)
      .where(eq(listing.id, listingId));

    expect(updatedListing?.aiDescriptionGenerationCount).toBe(1);
  });
});
