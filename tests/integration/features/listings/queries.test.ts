// @vitest-environment node

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listing, listingImage, user } from "@/db/schema";
import {
  getListingDetail,
  getListingDetailForViewer,
  listPublicListingCards,
  listSellerListingCards,
} from "@/features/listings/queries";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../../helpers/database";

describe("listing queries", () => {
  let testDatabase: TestDatabase;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
  });

  afterEach(async () => {
    await testDatabase.cleanup();
  });

  it("returns public listings while excluding drafts", async () => {
    const sellerId = randomUUID();
    const now = new Date("2026-03-21T12:00:00.000Z");

    await testDatabase.db.insert(user).values({
      id: sellerId,
      name: "Seller One",
      email: "seller-one@example.test",
      emailVerified: true,
    });

    const activeListingId = randomUUID();
    const draftListingId = randomUUID();

    await testDatabase.db.insert(listing).values([
      {
        id: activeListingId,
        sellerId,
        title: "Public Camera",
        description: "Visible listing",
        location: "Portland, OR",
        category: "electronics",
        condition: "good",
        startingBidCents: 25000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date(now.getTime() + 1000 * 60 * 60),
        status: "active",
      },
      {
        id: draftListingId,
        sellerId,
        title: "Private Draft",
        description: "Hidden listing",
        location: "Portland, OR",
        category: "electronics",
        condition: "good",
        startingBidCents: 30000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date(now.getTime() + 1000 * 60 * 60),
        status: "draft",
      },
    ]);

    await testDatabase.db.insert(listingImage).values({
      id: randomUUID(),
      listingId: activeListingId,
      publicId: "seed/public-camera",
      url: "https://picsum.photos/seed/public-camera/1200/900",
      isMain: true,
    });

    const listings = await listPublicListingCards(testDatabase.db);

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      id: activeListingId,
      title: "Public Camera",
      status: "active",
      sellerName: "Seller One",
      imageUrl: "https://picsum.photos/seed/public-camera/1200/900",
      bidCount: 0,
    });
  });

  it("filters seller listings by status", async () => {
    const sellerId = randomUUID();
    const otherSellerId = randomUUID();
    const now = new Date("2026-03-21T12:00:00.000Z");

    await testDatabase.db.insert(user).values([
      {
        id: sellerId,
        name: "Seller One",
        email: "seller-one@example.test",
        emailVerified: true,
      },
      {
        id: otherSellerId,
        name: "Seller Two",
        email: "seller-two@example.test",
        emailVerified: true,
      },
    ]);

    await testDatabase.db.insert(listing).values([
      {
        id: randomUUID(),
        sellerId,
        title: "Seller Draft",
        description: "Draft listing",
        location: "Austin, TX",
        category: "other",
        condition: "fair",
        startingBidCents: 11000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date(now.getTime() + 1000 * 60 * 60),
        status: "draft",
      },
      {
        id: randomUUID(),
        sellerId,
        title: "Seller Active",
        description: "Active listing",
        location: "Austin, TX",
        category: "other",
        condition: "fair",
        startingBidCents: 12000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date(now.getTime() + 1000 * 60 * 60),
        status: "active",
      },
      {
        id: randomUUID(),
        sellerId: otherSellerId,
        title: "Other Seller Active",
        description: "Not mine",
        location: "Dallas, TX",
        category: "other",
        condition: "fair",
        startingBidCents: 15000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date(now.getTime() + 1000 * 60 * 60),
        status: "active",
      },
    ]);

    const listings = await listSellerListingCards(
      sellerId,
      "active",
      testDatabase.db,
    );

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      title: "Seller Active",
      status: "active",
      sellerName: "Seller One",
    });
  });

  it("returns public detail data with gallery images for non-draft listings", async () => {
    const sellerId = randomUUID();
    const listingId = randomUUID();

    await testDatabase.db.insert(user).values({
      id: sellerId,
      name: "Seller One",
      email: "seller-one@example.test",
      emailVerified: true,
    });

    await testDatabase.db.insert(listing).values({
      id: listingId,
      sellerId,
      title: "Public Camera",
      description: "Visible listing",
      location: "Portland, OR",
      category: "electronics",
      condition: "good",
      startingBidCents: 25000,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date("2026-03-22T12:00:00.000Z"),
      status: "active",
    });

    await testDatabase.db.insert(listingImage).values([
      {
        id: randomUUID(),
        listingId,
        publicId: "seed/public-camera-main",
        url: "https://picsum.photos/seed/public-camera-main/1200/900",
        isMain: true,
      },
      {
        id: randomUUID(),
        listingId,
        publicId: "seed/public-camera-side",
        url: "https://picsum.photos/seed/public-camera-side/1200/900",
        isMain: false,
      },
    ]);

    const detail = await getListingDetailForViewer(
      listingId,
      null,
      testDatabase.db,
    );

    expect(detail).toMatchObject({
      id: listingId,
      title: "Public Camera",
      sellerName: "Seller One",
      status: "active",
    });
    expect(detail?.images).toHaveLength(2);
    expect(detail?.images[0]?.isMain).toBe(true);
  });

  it("allows only the owner to read draft listings", async () => {
    const sellerId = randomUUID();
    const listingId = randomUUID();

    await testDatabase.db.insert(user).values({
      id: sellerId,
      name: "Seller One",
      email: "seller-one@example.test",
      emailVerified: true,
    });

    await testDatabase.db.insert(listing).values({
      id: listingId,
      sellerId,
      title: "Private Draft",
      description: "Owner only listing",
      location: "Austin, TX",
      category: "other",
      condition: "fair",
      startingBidCents: 18000,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date("2026-03-22T12:00:00.000Z"),
      status: "draft",
    });

    expect(
      await getListingDetailForViewer(listingId, sellerId, testDatabase.db),
    ).toMatchObject({
      id: listingId,
      status: "draft",
    });

    expect(
      await getListingDetailForViewer(listingId, "other-user", testDatabase.db),
    ).toBeNull();
    expect(
      await getListingDetailForViewer(listingId, null, testDatabase.db),
    ).toBeNull();
  });

  it("returns null when the listing does not exist", async () => {
    await expect(
      getListingDetail(randomUUID(), testDatabase.db),
    ).resolves.toBeNull();
  });
});
