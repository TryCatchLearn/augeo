import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { listing, user } from "@/db/schema";
import { createTestDatabase } from "../../../helpers/database";

const hoisted = vi.hoisted(() => ({
  getSession: vi.fn(),
  db: null as Awaited<ReturnType<typeof createTestDatabase>>["db"] | null,
  streamEnhancedDescription: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  getSession: hoisted.getSession,
}));

vi.mock("@/db/client", () => ({
  get db() {
    if (!hoisted.db) {
      throw new Error("Test database not set");
    }

    return hoisted.db;
  },
}));

vi.mock("@/server/ai", async () => {
  const actual =
    await vi.importActual<typeof import("@/server/ai")>("@/server/ai");

  return {
    ...actual,
    streamEnhancedDescription: hoisted.streamEnhancedDescription,
  };
});

describe("enhanceListingDescriptionAction", () => {
  it("returns a validated enhanced description and consumes one run", async () => {
    const testDatabase = await createTestDatabase();
    hoisted.db = testDatabase.db;
    hoisted.getSession.mockResolvedValue({
      user: { id: "seller-1" },
      session: { id: "session-1" },
    });
    hoisted.streamEnhancedDescription.mockResolvedValue({
      text: new Array(10)
        .fill("Friendly rewrite based on the existing description only.")
        .join(" "),
      modelId: "google/gemini-2.5-flash-lite",
    });

    try {
      await testDatabase.db.insert(user).values({
        id: "seller-1",
        name: "Seller One",
        email: "seller-one@example.com",
        emailVerified: true,
      });
      await testDatabase.db.insert(listing).values({
        id: "listing-1",
        sellerId: "seller-1",
        title: "Camera",
        description: "Camera body with strap and case.",
        location: "Austin, TX",
        category: "electronics",
        condition: "good",
        startingBidCents: 1000,
        reservePriceCents: null,
        aiDescriptionGenerationCount: 0,
        startsAt: null,
        endsAt: new Date("2026-03-30T00:00:00.000Z"),
        status: "draft",
      });

      const { enhanceListingDescriptionAction } = await import(
        "@/features/listings/actions"
      );
      const result = await enhanceListingDescriptionAction({
        listingId: "listing-1",
        title: "Camera",
        category: "electronics",
        condition: "good",
        description: "Camera body with strap and case.",
        tone: "friendly",
      });

      expect(result).toEqual({
        text: new Array(10)
          .fill("Friendly rewrite based on the existing description only.")
          .join(" "),
        remainingRuns: 9,
      });

      const [updatedListing] = await testDatabase.db
        .select({
          aiDescriptionGenerationCount: listing.aiDescriptionGenerationCount,
        })
        .from(listing)
        .where(eq(listing.id, "listing-1"));

      expect(updatedListing?.aiDescriptionGenerationCount).toBe(1);
    } finally {
      hoisted.db = null;
      hoisted.streamEnhancedDescription.mockReset();
      await testDatabase.cleanup();
    }
  });

  it("rejects requests after the per-listing AI limit is reached", async () => {
    const testDatabase = await createTestDatabase();
    hoisted.db = testDatabase.db;
    hoisted.getSession.mockResolvedValue({
      user: { id: "seller-1" },
      session: { id: "session-1" },
    });

    try {
      await testDatabase.db.insert(user).values({
        id: "seller-1",
        name: "Seller One",
        email: "seller-one@example.com",
        emailVerified: true,
      });
      await testDatabase.db.insert(listing).values({
        id: "listing-1",
        sellerId: "seller-1",
        title: "Camera",
        description: "Camera body with strap and case.",
        location: "Austin, TX",
        category: "electronics",
        condition: "good",
        startingBidCents: 1000,
        reservePriceCents: null,
        aiDescriptionGenerationCount: 10,
        startsAt: null,
        endsAt: new Date("2026-03-30T00:00:00.000Z"),
        status: "draft",
      });

      const { enhanceListingDescriptionAction } = await import(
        "@/features/listings/actions"
      );

      await expect(
        enhanceListingDescriptionAction({
          listingId: "listing-1",
          title: "Camera",
          category: "electronics",
          condition: "good",
          description: "Camera body with strap and case.",
          tone: "friendly",
        }),
      ).rejects.toThrow("AI description limit reached for this listing.");
    } finally {
      hoisted.db = null;
      hoisted.streamEnhancedDescription.mockReset();
      await testDatabase.cleanup();
    }
  });
});
