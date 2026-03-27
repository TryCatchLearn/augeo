// @vitest-environment node

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listing, listingImage, user } from "@/db/schema";
import {
  getListingDetail,
  getListingDetailForViewer,
  listPublicListingCards,
  listSellerListingCards,
  normalizePublicListingsQuery,
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

  it("returns public listings for the selected public status and total count", async () => {
    const sellerId = randomUUID();
    const now = new Date("2026-03-21T12:00:00.000Z");

    await testDatabase.db.insert(user).values({
      id: sellerId,
      name: "Seller One",
      email: "seller-one@example.test",
      emailVerified: true,
    });

    const activeListingId = randomUUID();
    const scheduledListingId = randomUUID();
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
        id: scheduledListingId,
        sellerId,
        title: "Scheduled Vase",
        description: "Future listing",
        location: "Seattle, WA",
        category: "home_garden",
        condition: "like_new",
        startingBidCents: 28000,
        reservePriceCents: null,
        startsAt: new Date(now.getTime() + 1000 * 60 * 60 * 12),
        endsAt: new Date(now.getTime() + 1000 * 60 * 60 * 48),
        status: "scheduled",
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

    const listings = await listPublicListingCards(
      { status: "active" },
      testDatabase.db,
    );

    expect(listings.totalCount).toBe(1);
    expect(listings.items).toHaveLength(1);
    expect(listings.items[0]).toMatchObject({
      id: activeListingId,
      title: "Public Camera",
      status: "active",
      sellerName: "Seller One",
      imageUrl: "https://picsum.photos/seed/public-camera/1200/900",
      bidCount: 0,
    });
    expect(listings.items.find((item) => item.id === scheduledListingId)).toBe(
      undefined,
    );
  });

  it("normalizes invalid public status values to active", () => {
    expect(
      normalizePublicListingsQuery({
        status: "not-a-status",
      }),
    ).toMatchObject({
      status: "active",
      page: 1,
      pageSize: 6,
    });
  });

  it("filters public listings by category", async () => {
    const sellerId = randomUUID();

    await testDatabase.db.insert(user).values({
      id: sellerId,
      name: "Seller One",
      email: "seller-one@example.test",
      emailVerified: true,
    });

    await testDatabase.db.insert(listing).values([
      {
        id: randomUUID(),
        sellerId,
        title: "Vintage Receiver",
        description: "Stereo equipment",
        location: "Portland, OR",
        category: "electronics",
        condition: "good",
        startingBidCents: 18_000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-03-28T12:00:00.000Z"),
        status: "active",
      },
      {
        id: randomUUID(),
        sellerId,
        title: "Garden Bench",
        description: "Teak seating",
        location: "Portland, OR",
        category: "home_garden",
        condition: "good",
        startingBidCents: 21_000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-03-29T12:00:00.000Z"),
        status: "active",
      },
    ]);

    const listings = await listPublicListingCards(
      { status: "active", category: "electronics" },
      testDatabase.db,
    );

    expect(listings.totalCount).toBe(1);
    expect(listings.items.map((item) => item.title)).toEqual([
      "Vintage Receiver",
    ]);
  });

  it("filters public listings by starting bid price threshold", async () => {
    const sellerId = randomUUID();

    await testDatabase.db.insert(user).values({
      id: sellerId,
      name: "Seller One",
      email: "seller-one@example.test",
      emailVerified: true,
    });

    await testDatabase.db.insert(listing).values([
      {
        id: randomUUID(),
        sellerId,
        title: "Pocket Camera",
        description: "Compact and travel ready",
        location: "Austin, TX",
        category: "electronics",
        condition: "good",
        startingBidCents: 4_500,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-03-28T12:00:00.000Z"),
        status: "active",
      },
      {
        id: randomUUID(),
        sellerId,
        title: "Studio Camera",
        description: "Full-frame setup",
        location: "Austin, TX",
        category: "electronics",
        condition: "good",
        startingBidCents: 12_500,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-03-29T12:00:00.000Z"),
        status: "active",
      },
    ]);

    const listings = await listPublicListingCards(
      { status: "active", price: "lt_50" },
      testDatabase.db,
    );

    expect(listings.totalCount).toBe(1);
    expect(listings.items.map((item) => item.title)).toEqual(["Pocket Camera"]);
  });

  it("filters public listings by a case-insensitive title search query", async () => {
    const sellerId = randomUUID();

    await testDatabase.db.insert(user).values({
      id: sellerId,
      name: "Seller One",
      email: "seller-one@example.test",
      emailVerified: true,
    });

    await testDatabase.db.insert(listing).values([
      {
        id: randomUUID(),
        sellerId,
        title: "Studio Camera",
        description: "Mirrorless body with lens",
        location: "Portland, OR",
        category: "electronics",
        condition: "good",
        startingBidCents: 22_000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-03-29T12:00:00.000Z"),
        status: "active",
      },
      {
        id: randomUUID(),
        sellerId,
        title: "Workshop Lamp",
        description: "Bright bench light",
        location: "Portland, OR",
        category: "home_garden",
        condition: "good",
        startingBidCents: 4_000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-03-30T12:00:00.000Z"),
        status: "active",
      },
    ]);

    const listings = await listPublicListingCards(
      { status: "active", q: "  cAmErA  " },
      testDatabase.db,
    );

    expect(listings.totalCount).toBe(1);
    expect(listings.items.map((item) => item.title)).toEqual(["Studio Camera"]);
  });

  it("filters public listings by a case-insensitive description search query", async () => {
    const sellerId = randomUUID();

    await testDatabase.db.insert(user).values({
      id: sellerId,
      name: "Seller One",
      email: "seller-one@example.test",
      emailVerified: true,
    });

    await testDatabase.db.insert(listing).values([
      {
        id: randomUUID(),
        sellerId,
        title: "Collector Watch",
        description: "Features a rare BLUE dial and exhibition caseback.",
        location: "Boston, MA",
        category: "jewelry_watches",
        condition: "good",
        startingBidCents: 49_000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-03-30T12:00:00.000Z"),
        status: "active",
      },
      {
        id: randomUUID(),
        sellerId,
        title: "Canvas Tote",
        description: "Natural cotton everyday bag.",
        location: "Boston, MA",
        category: "fashion",
        condition: "good",
        startingBidCents: 3_000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-03-31T12:00:00.000Z"),
        status: "active",
      },
    ]);

    const listings = await listPublicListingCards(
      { status: "active", q: "blue dial" },
      testDatabase.db,
    );

    expect(listings.totalCount).toBe(1);
    expect(listings.items.map((item) => item.title)).toEqual([
      "Collector Watch",
    ]);
  });

  it("combines search with the selected status and active filters", async () => {
    const sellerId = randomUUID();

    await testDatabase.db.insert(user).values({
      id: sellerId,
      name: "Seller One",
      email: "seller-one@example.test",
      emailVerified: true,
    });

    await testDatabase.db.insert(listing).values([
      {
        id: randomUUID(),
        sellerId,
        title: "Travel Camera",
        description: "Compact body with everyday zoom",
        location: "Seattle, WA",
        category: "electronics",
        condition: "good",
        startingBidCents: 4_500,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-03-29T12:00:00.000Z"),
        status: "active",
      },
      {
        id: randomUUID(),
        sellerId,
        title: "Travel Camera",
        description: "Same term but outside the price filter",
        location: "Seattle, WA",
        category: "electronics",
        condition: "good",
        startingBidCents: 7_500,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-03-30T12:00:00.000Z"),
        status: "active",
      },
      {
        id: randomUUID(),
        sellerId,
        title: "Travel Camera",
        description: "Same term but different status",
        location: "Seattle, WA",
        category: "electronics",
        condition: "good",
        startingBidCents: 4_000,
        reservePriceCents: null,
        startsAt: new Date("2026-04-01T12:00:00.000Z"),
        endsAt: new Date("2026-04-05T12:00:00.000Z"),
        status: "scheduled",
      },
      {
        id: randomUUID(),
        sellerId,
        title: "Travel Camera",
        description: "Same term but different category",
        location: "Seattle, WA",
        category: "collectibles",
        condition: "good",
        startingBidCents: 4_000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-03-31T12:00:00.000Z"),
        status: "active",
      },
    ]);

    const listings = await listPublicListingCards(
      {
        status: "active",
        q: "camera",
        category: "electronics",
        price: "lt_50",
      },
      testDatabase.db,
    );

    expect(listings.totalCount).toBe(1);
    expect(listings.items.map((item) => item.startingBidCents)).toEqual([4500]);
  });

  it("sorts public listings by newest by default and for most bids", async () => {
    const sellerId = randomUUID();

    await testDatabase.db.insert(user).values({
      id: sellerId,
      name: "Seller One",
      email: "seller-one@example.test",
      emailVerified: true,
    });

    await testDatabase.db.insert(listing).values([
      {
        id: randomUUID(),
        sellerId,
        title: "Earlier Listing",
        description: "First created",
        location: "Denver, CO",
        category: "collectibles",
        condition: "good",
        startingBidCents: 8_000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-03-30T12:00:00.000Z"),
        status: "active",
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        updatedAt: new Date("2026-03-10T08:00:00.000Z"),
      },
      {
        id: randomUUID(),
        sellerId,
        title: "Later Listing",
        description: "Second created",
        location: "Denver, CO",
        category: "collectibles",
        condition: "good",
        startingBidCents: 12_000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-03-31T12:00:00.000Z"),
        status: "active",
        createdAt: new Date("2026-03-11T08:00:00.000Z"),
        updatedAt: new Date("2026-03-11T08:00:00.000Z"),
      },
    ]);

    const newest = await listPublicListingCards(
      { status: "active", sort: "newest" },
      testDatabase.db,
    );
    const mostBids = await listPublicListingCards(
      { status: "active", sort: "most_bids" },
      testDatabase.db,
    );

    expect(newest.items.map((item) => item.title)).toEqual([
      "Later Listing",
      "Earlier Listing",
    ]);
    expect(mostBids.items.map((item) => item.title)).toEqual([
      "Later Listing",
      "Earlier Listing",
    ]);
  });

  it("sorts public listings by ending soonest", async () => {
    const sellerId = randomUUID();

    await testDatabase.db.insert(user).values({
      id: sellerId,
      name: "Seller One",
      email: "seller-one@example.test",
      emailVerified: true,
    });

    await testDatabase.db.insert(listing).values([
      {
        id: randomUUID(),
        sellerId,
        title: "Ends Later",
        description: "Second to close",
        location: "Miami, FL",
        category: "art",
        condition: "good",
        startingBidCents: 22_000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-04-02T12:00:00.000Z"),
        status: "active",
      },
      {
        id: randomUUID(),
        sellerId,
        title: "Ends First",
        description: "First to close",
        location: "Miami, FL",
        category: "art",
        condition: "good",
        startingBidCents: 24_000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-04-01T12:00:00.000Z"),
        status: "active",
      },
    ]);

    const listings = await listPublicListingCards(
      { status: "active", sort: "ending_soonest" },
      testDatabase.db,
    );

    expect(listings.items.map((item) => item.title)).toEqual([
      "Ends First",
      "Ends Later",
    ]);
  });

  it("sorts public listings by price ascending and descending", async () => {
    const sellerId = randomUUID();

    await testDatabase.db.insert(user).values({
      id: sellerId,
      name: "Seller One",
      email: "seller-one@example.test",
      emailVerified: true,
    });

    await testDatabase.db.insert(listing).values([
      {
        id: randomUUID(),
        sellerId,
        title: "Higher Price",
        description: "More expensive",
        location: "Chicago, IL",
        category: "fashion",
        condition: "good",
        startingBidCents: 19_000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-03-30T12:00:00.000Z"),
        status: "active",
      },
      {
        id: randomUUID(),
        sellerId,
        title: "Lower Price",
        description: "Less expensive",
        location: "Chicago, IL",
        category: "fashion",
        condition: "good",
        startingBidCents: 7_000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: new Date("2026-03-30T12:00:00.000Z"),
        status: "active",
      },
    ]);

    const ascending = await listPublicListingCards(
      { status: "active", sort: "price_asc" },
      testDatabase.db,
    );
    const descending = await listPublicListingCards(
      { status: "active", sort: "price_desc" },
      testDatabase.db,
    );

    expect(ascending.items.map((item) => item.title)).toEqual([
      "Lower Price",
      "Higher Price",
    ]);
    expect(descending.items.map((item) => item.title)).toEqual([
      "Higher Price",
      "Lower Price",
    ]);
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
