import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { listing, listingImage, user } from "@/db/schema";
import { createTestDatabase } from "../../../helpers/database";

const hoisted = vi.hoisted(() => ({
  requireAuthenticatedSession: vi.fn(),
  db: null as Awaited<ReturnType<typeof createTestDatabase>>["db"] | null,
  generateSmartListingFromImage: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireAuthenticatedSession: hoisted.requireAuthenticatedSession,
}));

vi.mock("@/db/client", () => ({
  get db() {
    if (!hoisted.db) {
      throw new Error("Test database not set");
    }

    return hoisted.db;
  },
}));

vi.mock("@/server/ai", () => ({
  AiGenerationError: class AiGenerationError extends Error {},
  generateSmartListingFromImage: hoisted.generateSmartListingFromImage,
}));

describe("createDraftFromFirstUploadAction", () => {
  it("creates the first draft listing and its main image", async () => {
    const testDatabase = await createTestDatabase();
    hoisted.db = testDatabase.db;
    hoisted.generateSmartListingFromImage.mockResolvedValue({
      title: "Vintage Camera Lot",
      description: "Clean camera body shown from the front with case included.",
      category: "electronics",
      condition: "good",
      suggestedStartingPriceCents: 18500,
    });
    hoisted.requireAuthenticatedSession.mockResolvedValue({
      user: { id: "seller-1" },
    });

    try {
      await testDatabase.db.insert(user).values({
        id: "seller-1",
        name: "Seller One",
        email: "seller-one@example.com",
        emailVerified: true,
      });

      const { createDraftFromFirstUploadAction } = await import(
        "@/features/listings/actions"
      );

      const response = await createDraftFromFirstUploadAction({
        uploadPublicId: "cloudinary-public-id",
        uploadUrl: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
        creationMode: "ai",
      });

      expect(response.status).toBe("created");

      if (response.status !== "created") {
        throw new Error("Expected created draft response");
      }

      const [createdListing] = await testDatabase.db
        .select()
        .from(listing)
        .where(eq(listing.id, response.listingId));
      const [createdImage] = await testDatabase.db
        .select()
        .from(listingImage)
        .where(eq(listingImage.listingId, response.listingId));

      expect(createdListing).toBeDefined();
      expect(createdListing?.sellerId).toBe("seller-1");
      expect(createdListing?.status).toBe("draft");
      expect(createdListing?.title).toBe("Vintage Camera Lot");
      expect(createdListing?.location).toBe("Add location");
      expect(createdListing?.aiDescriptionGenerationCount).toBe(0);
      expect(createdImage).toMatchObject({
        listingId: response.listingId,
        publicId: "cloudinary-public-id",
        url: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
        isMain: true,
      });
    } finally {
      hoisted.db = null;
      hoisted.generateSmartListingFromImage.mockReset();
      await testDatabase.cleanup();
    }
  });

  it("returns a recoverable AI failure without creating a draft", async () => {
    const testDatabase = await createTestDatabase();
    hoisted.db = testDatabase.db;
    hoisted.requireAuthenticatedSession.mockResolvedValue({
      user: { id: "seller-1" },
    });

    try {
      await testDatabase.db.insert(user).values({
        id: "seller-1",
        name: "Seller One",
        email: "seller-one@example.com",
        emailVerified: true,
      });

      const { createDraftFromFirstUploadAction } = await import(
        "@/features/listings/actions"
      );
      const { AiGenerationError } = await import("@/server/ai");

      hoisted.generateSmartListingFromImage.mockRejectedValue(
        new AiGenerationError("gateway down"),
      );

      const response = await createDraftFromFirstUploadAction({
        uploadPublicId: "cloudinary-public-id",
        uploadUrl: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
        creationMode: "ai",
      });

      expect(response).toEqual({
        status: "ai_failed",
        errorMessage:
          "We couldn't create an AI draft right now. Retry AI or continue without AI.",
      });

      const createdListings = await testDatabase.db.select().from(listing);
      expect(createdListings).toHaveLength(0);
    } finally {
      hoisted.db = null;
      hoisted.generateSmartListingFromImage.mockReset();
      await testDatabase.cleanup();
    }
  });
});
