import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { listing, listingImage, user } from "@/db/schema";
import { createTestDatabase } from "../../../helpers/database";

const hoisted = vi.hoisted(() => ({
  getSession: vi.fn(),
  db: null as Awaited<ReturnType<typeof createTestDatabase>>["db"] | null,
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

describe("createDraftFromFirstUploadAction", () => {
  it("creates the first draft listing and its main image", async () => {
    const testDatabase = await createTestDatabase();
    hoisted.db = testDatabase.db;
    hoisted.getSession.mockResolvedValue({
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
        seed: "camera.jpg:123:cloudinary-public-id",
      });

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
      expect(createdImage).toMatchObject({
        listingId: response.listingId,
        publicId: "cloudinary-public-id",
        url: "https://res.cloudinary.com/demo/image/upload/cover.jpg",
        isMain: true,
      });
    } finally {
      hoisted.db = null;
      await testDatabase.cleanup();
    }
  });
});
