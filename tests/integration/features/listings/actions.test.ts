import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  BidActionError: class BidActionError extends Error {},
  requireAuthenticatedSession: vi.fn(),
  revalidatePath: vi.fn(),
  createListingImageUploadSignature: vi.fn(),
  deleteCloudinaryAssets: vi.fn(),
  generateSmartListingFromImage: vi.fn(),
  streamEnhancedDescription: vi.fn(),
  insertDraftWithMainImage: vi.fn(),
  updateDraftListing: vi.fn(),
  updateListingStatus: vi.fn(),
  deleteDraftListingRecords: vi.fn(),
  insertListingImage: vi.fn(),
  placeBidForListing: vi.fn(),
  setMainListingImage: vi.fn(),
  deleteListingImageRecord: vi.fn(),
  incrementListingDescriptionGenerationCount: vi.fn(),
  getOwnedListing: vi.fn(),
  listListingImageAssets: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: hoisted.revalidatePath,
}));

vi.mock("@/features/auth/session", () => ({
  requireAuthenticatedSession: hoisted.requireAuthenticatedSession,
}));

vi.mock("@/server/cloudinary", () => ({
  createListingImageUploadSignature: hoisted.createListingImageUploadSignature,
  deleteCloudinaryAssets: hoisted.deleteCloudinaryAssets,
}));

vi.mock("@/server/ai", async () => {
  const actual =
    await vi.importActual<typeof import("@/server/ai")>("@/server/ai");

  return {
    ...actual,
    generateSmartListingFromImage: hoisted.generateSmartListingFromImage,
    streamEnhancedDescription: hoisted.streamEnhancedDescription,
  };
});

vi.mock("@/features/listings/mutations", () => ({
  BidActionError: hoisted.BidActionError,
  insertDraftWithMainImage: hoisted.insertDraftWithMainImage,
  updateDraftListing: hoisted.updateDraftListing,
  updateListingStatus: hoisted.updateListingStatus,
  deleteDraftListingRecords: hoisted.deleteDraftListingRecords,
  insertListingImage: hoisted.insertListingImage,
  placeBidForListing: hoisted.placeBidForListing,
  setMainListingImage: hoisted.setMainListingImage,
  deleteListingImageRecord: hoisted.deleteListingImageRecord,
  incrementListingDescriptionGenerationCount:
    hoisted.incrementListingDescriptionGenerationCount,
}));

vi.mock("@/features/listings/queries", () => ({
  getOwnedListing: hoisted.getOwnedListing,
  listListingImageAssets: hoisted.listListingImageAssets,
}));

describe("listing server actions", () => {
  const session = {
    user: { id: "seller-1" },
    session: { id: "session-1" },
  };

  beforeEach(() => {
    Object.values(hoisted).forEach((value) => {
      if (typeof value === "function" && "mockReset" in value) {
        value.mockReset();
      }
    });
  });

  async function loadActions() {
    return import("@/features/listings/actions");
  }

  function expectListingRevalidation(listingId: string) {
    expect(hoisted.revalidatePath.mock.calls).toEqual([
      [`/listings/${listingId}`],
      [`/listings/${listingId}/edit`],
      ["/listings"],
      ["/dashboard/listings"],
    ]);
  }

  it("rejects unauthenticated create-draft requests", async () => {
    hoisted.requireAuthenticatedSession.mockRejectedValue(
      new Error("Unauthorized"),
    );
    const { createDraftFromFirstUploadAction } = await loadActions();

    await expect(
      createDraftFromFirstUploadAction({
        uploadPublicId: "image-1",
        uploadUrl: "https://example.com/image.jpg",
        creationMode: "ai",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("creates a signed upload response for authenticated requests", async () => {
    hoisted.requireAuthenticatedSession.mockResolvedValue(session);
    hoisted.createListingImageUploadSignature.mockReturnValue({
      cloudName: "demo-cloud",
      apiKey: "demo-key",
      folder: "augeo/listings",
      timestamp: 1763611200,
      signature: "signed-payload",
    });
    const { createListingImageUploadSignatureAction } = await loadActions();

    await expect(createListingImageUploadSignatureAction()).resolves.toEqual({
      cloudName: "demo-cloud",
      apiKey: "demo-key",
      folder: "augeo/listings",
      timestamp: 1763611200,
      signature: "signed-payload",
    });
  });

  it("creates a draft with AI-derived defaults", async () => {
    hoisted.requireAuthenticatedSession.mockResolvedValue(session);
    hoisted.generateSmartListingFromImage.mockResolvedValue({
      title: "Camera",
      description: "Clean body and case.",
      category: "electronics",
      condition: "good",
      suggestedStartingPriceCents: 18000,
    });
    hoisted.insertDraftWithMainImage.mockResolvedValue({ id: "listing-1" });
    const { createDraftFromFirstUploadAction } = await loadActions();

    await expect(
      createDraftFromFirstUploadAction({
        uploadPublicId: "image-1",
        uploadUrl: "https://example.com/image.jpg",
        creationMode: "ai",
      }),
    ).resolves.toEqual({ status: "created", listingId: "listing-1" });

    expect(hoisted.insertDraftWithMainImage).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: "seller-1",
        uploadPublicId: "image-1",
        uploadUrl: "https://example.com/image.jpg",
      }),
    );
  });

  it("saves drafts after ownership checks and revalidates listing paths", async () => {
    hoisted.requireAuthenticatedSession.mockResolvedValue(session);
    hoisted.getOwnedListing.mockResolvedValue({
      id: "listing-1",
      sellerId: "seller-1",
      status: "draft",
      startsAt: null,
      bidCount: 0,
      aiDescriptionGenerationCount: 0,
    });
    hoisted.updateDraftListing.mockResolvedValue({ id: "listing-1" });
    const { saveDraftListingAction } = await loadActions();

    await expect(
      saveDraftListingAction({
        listingId: "listing-1",
        title: "Refined Camera",
        description: "Updated",
        location: "Portland, OR",
        category: "electronics",
        condition: "good",
        startingBidCents: 25000,
        reservePriceCents: null,
        startsAt: null,
        endsAt: "2026-03-30T12:00:00.000Z",
      }),
    ).resolves.toEqual({ listingId: "listing-1" });

    expect(hoisted.updateDraftListing).toHaveBeenCalledWith({
      listingId: "listing-1",
      title: "Refined Camera",
      description: "Updated",
      location: "Portland, OR",
      category: "electronics",
      condition: "good",
      startingBidCents: 25000,
      reservePriceCents: null,
      startsAt: null,
      endsAt: "2026-03-30T12:00:00.000Z",
    });
    expectListingRevalidation("listing-1");
  });

  it("publishes listings and revalidates listing paths", async () => {
    hoisted.requireAuthenticatedSession.mockResolvedValue(session);
    hoisted.getOwnedListing.mockResolvedValue({
      id: "listing-1",
      sellerId: "seller-1",
      status: "draft",
      startsAt: null,
      bidCount: 0,
      aiDescriptionGenerationCount: 0,
    });
    hoisted.updateListingStatus.mockResolvedValue({
      id: "listing-1",
      status: "active",
    });
    const { publishListingAction } = await loadActions();

    await expect(
      publishListingAction({ listingId: "listing-1" }),
    ).resolves.toEqual({ listingId: "listing-1", status: "active" });

    expect(hoisted.updateListingStatus).toHaveBeenCalledWith({
      listingId: "listing-1",
      status: "active",
    });
    expectListingRevalidation("listing-1");
  });

  it("deletes drafts after Cloudinary cleanup and revalidates", async () => {
    hoisted.requireAuthenticatedSession.mockResolvedValue(session);
    hoisted.getOwnedListing.mockResolvedValue({
      id: "listing-1",
      sellerId: "seller-1",
      status: "draft",
      startsAt: null,
      bidCount: 0,
      aiDescriptionGenerationCount: 0,
    });
    hoisted.listListingImageAssets.mockResolvedValue([
      { id: "image-1", publicId: "listing/cover", isMain: true },
    ]);
    hoisted.deleteDraftListingRecords.mockResolvedValue({ id: "listing-1" });
    const { deleteDraftListingAction } = await loadActions();

    await expect(
      deleteDraftListingAction({ listingId: "listing-1" }),
    ).resolves.toEqual({ listingId: "listing-1" });

    expect(hoisted.deleteCloudinaryAssets).toHaveBeenCalledWith([
      "listing/cover",
    ]);
    expect(hoisted.deleteDraftListingRecords).toHaveBeenCalledWith("listing-1");
    expectListingRevalidation("listing-1");
  });

  it("adds listing images after validating ownership and image count", async () => {
    hoisted.requireAuthenticatedSession.mockResolvedValue(session);
    hoisted.getOwnedListing.mockResolvedValue({
      id: "listing-1",
      sellerId: "seller-1",
      status: "draft",
      startsAt: null,
      bidCount: 0,
      aiDescriptionGenerationCount: 0,
    });
    hoisted.listListingImageAssets.mockResolvedValue([
      { id: "image-1", publicId: "listing/cover", isMain: true },
    ]);
    hoisted.insertListingImage.mockResolvedValue({
      id: "image-2",
      listingId: "listing-1",
    });
    const { addListingImageAction } = await loadActions();

    await expect(
      addListingImageAction({
        listingId: "listing-1",
        uploadPublicId: "listing/detail",
        uploadUrl: "https://example.com/detail.jpg",
      }),
    ).resolves.toEqual({ listingId: "listing-1", imageId: "image-2" });

    expect(hoisted.insertListingImage).toHaveBeenCalledWith({
      listingId: "listing-1",
      uploadPublicId: "listing/detail",
      uploadUrl: "https://example.com/detail.jpg",
      isMain: false,
    });
    expectListingRevalidation("listing-1");
  });

  it("deletes listing images after Cloudinary cleanup and revalidates", async () => {
    hoisted.requireAuthenticatedSession.mockResolvedValue(session);
    hoisted.getOwnedListing.mockResolvedValue({
      id: "listing-1",
      sellerId: "seller-1",
      status: "draft",
      startsAt: null,
      bidCount: 0,
      aiDescriptionGenerationCount: 0,
    });
    hoisted.listListingImageAssets.mockResolvedValue([
      { id: "image-1", publicId: "listing/cover", isMain: true },
      { id: "image-2", publicId: "listing/detail", isMain: false },
    ]);
    hoisted.deleteListingImageRecord.mockResolvedValue({ id: "image-1" });
    const { deleteListingImageAction } = await loadActions();

    await expect(
      deleteListingImageAction({
        listingId: "listing-1",
        imageId: "image-1",
      }),
    ).resolves.toEqual({ listingId: "listing-1", imageId: "image-1" });

    expect(hoisted.deleteCloudinaryAssets).toHaveBeenCalledWith([
      "listing/cover",
    ]);
    expect(hoisted.deleteListingImageRecord).toHaveBeenCalledWith({
      imageId: "image-1",
      nextMainImageId: "image-2",
    });
    expectListingRevalidation("listing-1");
  });

  it("enhances descriptions after incrementing the generation count", async () => {
    hoisted.requireAuthenticatedSession.mockResolvedValue(session);
    hoisted.getOwnedListing.mockResolvedValue({
      id: "listing-1",
      sellerId: "seller-1",
      status: "draft",
      startsAt: null,
      bidCount: 0,
      aiDescriptionGenerationCount: 0,
    });
    hoisted.incrementListingDescriptionGenerationCount.mockResolvedValue({
      aiDescriptionGenerationCount: 1,
    });
    hoisted.streamEnhancedDescription.mockResolvedValue({
      text: new Array(10)
        .fill("Friendly rewrite based on the existing description only.")
        .join(" "),
      modelId: "demo-model",
    });
    const { enhanceListingDescriptionAction } = await loadActions();

    await expect(
      enhanceListingDescriptionAction({
        listingId: "listing-1",
        title: "Camera",
        category: "electronics",
        condition: "good",
        description: "Camera body with strap and case.",
        tone: "friendly",
      }),
    ).resolves.toEqual({
      text: new Array(10)
        .fill("Friendly rewrite based on the existing description only.")
        .join(" "),
      remainingRuns: 9,
    });
  });

  it("returns an inline error for unauthenticated bid attempts", async () => {
    hoisted.requireAuthenticatedSession.mockRejectedValue(
      new Error("Unauthorized"),
    );
    const { placeBidAction } = await loadActions();

    await expect(
      placeBidAction({
        listingId: "listing-1",
        amountCents: 20_000,
      }),
    ).resolves.toEqual({
      status: "error",
      errorMessage: "Sign in to place a bid.",
    });
  });

  it("places bids and revalidates listing paths", async () => {
    hoisted.requireAuthenticatedSession.mockResolvedValue(session);
    hoisted.placeBidForListing.mockResolvedValue({
      listingId: "listing-1",
      currentBidCents: 20_000,
    });
    const { placeBidAction } = await loadActions();

    await expect(
      placeBidAction({
        listingId: "listing-1",
        amountCents: 20_000,
      }),
    ).resolves.toEqual({
      status: "success",
      listingId: "listing-1",
    });

    expect(hoisted.placeBidForListing).toHaveBeenCalledWith({
      listingId: "listing-1",
      amountCents: 20_000,
      bidderId: "seller-1",
    });
    expectListingRevalidation("listing-1");
  });
});
