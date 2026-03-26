import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  requireAuthenticatedSession: vi.fn(),
  createListingImageUploadSignature: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireAuthenticatedSession: hoisted.requireAuthenticatedSession,
}));

vi.mock("@/server/cloudinary", () => ({
  createListingImageUploadSignature: hoisted.createListingImageUploadSignature,
  deleteCloudinaryAssets: vi.fn(),
}));

describe("createListingImageUploadSignatureAction", () => {
  beforeEach(() => {
    hoisted.requireAuthenticatedSession.mockReset();
    hoisted.createListingImageUploadSignature.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    hoisted.requireAuthenticatedSession.mockRejectedValue(
      new Error("Unauthorized"),
    );

    const { createListingImageUploadSignatureAction } = await import(
      "@/features/listings/actions"
    );

    await expect(createListingImageUploadSignatureAction()).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("returns signed upload parameters for authenticated requests", async () => {
    hoisted.requireAuthenticatedSession.mockResolvedValue({
      user: { id: "seller-1" },
      session: { id: "session-1" },
    });
    hoisted.createListingImageUploadSignature.mockReturnValue({
      cloudName: "demo-cloud",
      apiKey: "demo-key",
      folder: "augeo/listings",
      timestamp: 1763611200,
      signature: "signed-demo-payload",
    });

    const { createListingImageUploadSignatureAction } = await import(
      "@/features/listings/actions"
    );

    await expect(createListingImageUploadSignatureAction()).resolves.toEqual({
      cloudName: "demo-cloud",
      apiKey: "demo-key",
      folder: "augeo/listings",
      timestamp: 1763611200,
      signature: "signed-demo-payload",
    });
    expect(hoisted.requireAuthenticatedSession).toHaveBeenCalled();
  });
});
