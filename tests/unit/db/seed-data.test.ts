import { describe, expect, it } from "vitest";
import { buildSeedListings } from "@/db/seed-data";

describe("buildSeedListings", () => {
  it("matches the locked phase 3A seller and status distribution", () => {
    const listings = buildSeedListings(new Date("2026-03-27T00:00:00.000Z"));

    expect(listings).toHaveLength(20);

    const statusCounts = listings.reduce<Record<string, number>>(
      (counts, seededListing) => {
        counts[seededListing.status] = (counts[seededListing.status] ?? 0) + 1;
        return counts;
      },
      {},
    );

    const sellerCounts = listings.reduce<Record<string, number>>(
      (counts, seededListing) => {
        counts[seededListing.sellerEmail] =
          (counts[seededListing.sellerEmail] ?? 0) + 1;
        return counts;
      },
      {},
    );

    const bobActiveCount = listings.filter(
      (seededListing) =>
        seededListing.sellerEmail === "bob@test.com" &&
        seededListing.status === "active",
    ).length;

    expect(statusCounts).toMatchObject({
      active: 9,
      scheduled: 4,
      ended: 4,
      draft: 3,
    });
    expect(sellerCounts).toMatchObject({
      "bob@test.com": 8,
      "alice@test.com": 6,
      "charlie@test.com": 6,
    });
    expect(bobActiveCount).toBe(7);
  });

  it("keeps the seeded lifecycle dates and image coverage aligned", () => {
    const now = new Date("2026-03-27T00:00:00.000Z");
    const listings = buildSeedListings(now);

    expect(
      listings.every(
        (seededListing) =>
          seededListing.imageUrl.startsWith("https://picsum.photos/seed/") &&
          seededListing.imageUrl.endsWith("/1200/900"),
      ),
    ).toBe(true);

    const scheduledListings = listings.filter(
      (seededListing) => seededListing.status === "scheduled",
    );
    const endedListings = listings.filter(
      (seededListing) => seededListing.status === "ended",
    );
    const activeListings = listings.filter(
      (seededListing) => seededListing.status === "active",
    );

    expect(
      scheduledListings.every(
        (seededListing) =>
          seededListing.startsAt !== null &&
          seededListing.startsAt.getTime() > now.getTime(),
      ),
    ).toBe(true);
    expect(
      endedListings.every(
        (seededListing) => seededListing.endsAt.getTime() < now.getTime(),
      ),
    ).toBe(true);
    expect(
      activeListings.every(
        (seededListing) => seededListing.endsAt.getTime() > now.getTime(),
      ),
    ).toBe(true);
  });
});
