import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getSession: vi.fn(),
  revalidatePath: vi.fn(),
  createDraftFromFirstUpload: vi.fn(),
  saveDraftListing: vi.fn(),
  publishListing: vi.fn(),
  returnListingToDraft: vi.fn(),
  deleteDraftListing: vi.fn(),
  addListingImage: vi.fn(),
  setMainListingImage: vi.fn(),
  deleteListingImage: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: hoisted.revalidatePath,
}));

vi.mock("@/features/auth/session", () => ({
  getSession: hoisted.getSession,
}));

vi.mock("@/features/listings/mutations", () => ({
  createDraftFromFirstUpload: hoisted.createDraftFromFirstUpload,
  saveDraftListing: hoisted.saveDraftListing,
  publishListing: hoisted.publishListing,
  returnListingToDraft: hoisted.returnListingToDraft,
  deleteDraftListing: hoisted.deleteDraftListing,
  addListingImage: hoisted.addListingImage,
  setMainListingImage: hoisted.setMainListingImage,
  deleteListingImage: hoisted.deleteListingImage,
}));

describe("listing server actions", () => {
  beforeEach(() => {
    hoisted.getSession.mockReset();
    hoisted.revalidatePath.mockReset();
    hoisted.createDraftFromFirstUpload.mockReset();
    hoisted.saveDraftListing.mockReset();
    hoisted.publishListing.mockReset();
    hoisted.returnListingToDraft.mockReset();
    hoisted.deleteDraftListing.mockReset();
    hoisted.addListingImage.mockReset();
    hoisted.setMainListingImage.mockReset();
    hoisted.deleteListingImage.mockReset();
  });

  const session = {
    user: { id: "seller-1" },
    session: { id: "session-1" },
  };

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
    hoisted.getSession.mockResolvedValue(null);
    const { createDraftFromFirstUploadAction } = await loadActions();

    await expect(
      createDraftFromFirstUploadAction({
        uploadPublicId: "image-1",
        uploadUrl: "https://example.com/image.jpg",
        seed: "seed-1",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects invalid create-draft payloads", async () => {
    hoisted.getSession.mockResolvedValue(session);
    const { createDraftFromFirstUploadAction } = await loadActions();

    await expect(
      createDraftFromFirstUploadAction({
        uploadPublicId: "",
        uploadUrl: "invalid-url",
        seed: "",
      }),
    ).rejects.toThrow("Invalid draft payload");
  });

  it("creates a draft with the authenticated seller id", async () => {
    hoisted.getSession.mockResolvedValue(session);
    hoisted.createDraftFromFirstUpload.mockResolvedValue({ id: "listing-1" });
    const { createDraftFromFirstUploadAction } = await loadActions();

    await expect(
      createDraftFromFirstUploadAction({
        uploadPublicId: "image-1",
        uploadUrl: "https://example.com/image.jpg",
        seed: "seed-1",
      }),
    ).resolves.toEqual({ listingId: "listing-1" });

    expect(hoisted.createDraftFromFirstUpload).toHaveBeenCalledWith({
      sellerId: "seller-1",
      uploadPublicId: "image-1",
      uploadUrl: "https://example.com/image.jpg",
      seed: "seed-1",
    });
  });

  it("rejects unauthenticated save-draft requests", async () => {
    hoisted.getSession.mockResolvedValue(null);
    const { saveDraftListingAction } = await loadActions();

    await expect(
      saveDraftListingAction({
        listingId: "listing-1",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects invalid save-draft payloads", async () => {
    hoisted.getSession.mockResolvedValue(session);
    const { saveDraftListingAction } = await loadActions();

    await expect(
      saveDraftListingAction({
        listingId: "",
        title: "",
      }),
    ).rejects.toThrow("Invalid draft payload");
  });

  it("saves drafts and revalidates listing paths", async () => {
    hoisted.getSession.mockResolvedValue(session);
    hoisted.saveDraftListing.mockResolvedValue({ id: "listing-1" });
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

    expect(hoisted.saveDraftListing).toHaveBeenCalledWith({
      sellerId: "seller-1",
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

  it("rejects unauthenticated publish requests", async () => {
    hoisted.getSession.mockResolvedValue(null);
    const { publishListingAction } = await loadActions();

    await expect(
      publishListingAction({ listingId: "listing-1" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects invalid publish payloads", async () => {
    hoisted.getSession.mockResolvedValue(session);
    const { publishListingAction } = await loadActions();

    await expect(publishListingAction({ listingId: "" })).rejects.toThrow(
      "Invalid publish payload",
    );
  });

  it("publishes listings and revalidates listing paths", async () => {
    hoisted.getSession.mockResolvedValue(session);
    hoisted.publishListing.mockResolvedValue({
      id: "listing-1",
      status: "active",
    });
    const { publishListingAction } = await loadActions();

    await expect(
      publishListingAction({ listingId: "listing-1" }),
    ).resolves.toEqual({ listingId: "listing-1", status: "active" });

    expect(hoisted.publishListing).toHaveBeenCalledWith({
      listingId: "listing-1",
      sellerId: "seller-1",
    });
    expectListingRevalidation("listing-1");
  });

  it("rejects unauthenticated return-to-draft requests", async () => {
    hoisted.getSession.mockResolvedValue(null);
    const { returnListingToDraftAction } = await loadActions();

    await expect(
      returnListingToDraftAction({ listingId: "listing-1" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects invalid return-to-draft payloads", async () => {
    hoisted.getSession.mockResolvedValue(session);
    const { returnListingToDraftAction } = await loadActions();

    await expect(returnListingToDraftAction({ listingId: "" })).rejects.toThrow(
      "Invalid return-to-draft payload",
    );
  });

  it("returns listings to draft and revalidates listing paths", async () => {
    hoisted.getSession.mockResolvedValue(session);
    hoisted.returnListingToDraft.mockResolvedValue({
      id: "listing-1",
      status: "draft",
    });
    const { returnListingToDraftAction } = await loadActions();

    await expect(
      returnListingToDraftAction({ listingId: "listing-1" }),
    ).resolves.toEqual({ listingId: "listing-1", status: "draft" });

    expect(hoisted.returnListingToDraft).toHaveBeenCalledWith({
      listingId: "listing-1",
      sellerId: "seller-1",
    });
    expectListingRevalidation("listing-1");
  });

  it("rejects unauthenticated delete-draft requests", async () => {
    hoisted.getSession.mockResolvedValue(null);
    const { deleteDraftListingAction } = await loadActions();

    await expect(
      deleteDraftListingAction({ listingId: "listing-1" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects invalid delete-draft payloads", async () => {
    hoisted.getSession.mockResolvedValue(session);
    const { deleteDraftListingAction } = await loadActions();

    await expect(deleteDraftListingAction({ listingId: "" })).rejects.toThrow(
      "Invalid delete payload",
    );
  });

  it("deletes drafts and revalidates listing paths", async () => {
    hoisted.getSession.mockResolvedValue(session);
    hoisted.deleteDraftListing.mockResolvedValue({ id: "listing-1" });
    const { deleteDraftListingAction } = await loadActions();

    await expect(
      deleteDraftListingAction({ listingId: "listing-1" }),
    ).resolves.toEqual({ listingId: "listing-1" });

    expect(hoisted.deleteDraftListing).toHaveBeenCalledWith({
      listingId: "listing-1",
      sellerId: "seller-1",
    });
    expectListingRevalidation("listing-1");
  });

  it("rejects unauthenticated add-image requests", async () => {
    hoisted.getSession.mockResolvedValue(null);
    const { addListingImageAction } = await loadActions();

    await expect(
      addListingImageAction({
        listingId: "listing-1",
        uploadPublicId: "image-2",
        uploadUrl: "https://example.com/detail.jpg",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects invalid add-image payloads", async () => {
    hoisted.getSession.mockResolvedValue(session);
    const { addListingImageAction } = await loadActions();

    await expect(
      addListingImageAction({
        listingId: "",
        uploadPublicId: "",
        uploadUrl: "invalid-url",
      }),
    ).rejects.toThrow("Invalid add-image payload");
  });

  it("adds images and revalidates listing paths", async () => {
    hoisted.getSession.mockResolvedValue(session);
    hoisted.addListingImage.mockResolvedValue({
      id: "image-2",
      listingId: "listing-1",
    });
    const { addListingImageAction } = await loadActions();

    await expect(
      addListingImageAction({
        listingId: "listing-1",
        uploadPublicId: "image-2",
        uploadUrl: "https://example.com/detail.jpg",
      }),
    ).resolves.toEqual({ listingId: "listing-1", imageId: "image-2" });

    expect(hoisted.addListingImage).toHaveBeenCalledWith({
      listingId: "listing-1",
      sellerId: "seller-1",
      uploadPublicId: "image-2",
      uploadUrl: "https://example.com/detail.jpg",
    });
    expectListingRevalidation("listing-1");
  });

  it("rejects unauthenticated set-main requests", async () => {
    hoisted.getSession.mockResolvedValue(null);
    const { setMainListingImageAction } = await loadActions();

    await expect(
      setMainListingImageAction({ listingId: "listing-1", imageId: "image-2" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects invalid set-main payloads", async () => {
    hoisted.getSession.mockResolvedValue(session);
    const { setMainListingImageAction } = await loadActions();

    await expect(
      setMainListingImageAction({ listingId: "", imageId: "" }),
    ).rejects.toThrow("Invalid set-main payload");
  });

  it("sets the main image and revalidates listing paths", async () => {
    hoisted.getSession.mockResolvedValue(session);
    hoisted.setMainListingImage.mockResolvedValue({
      id: "image-2",
      listingId: "listing-1",
    });
    const { setMainListingImageAction } = await loadActions();

    await expect(
      setMainListingImageAction({ listingId: "listing-1", imageId: "image-2" }),
    ).resolves.toEqual({ listingId: "listing-1", imageId: "image-2" });

    expect(hoisted.setMainListingImage).toHaveBeenCalledWith({
      listingId: "listing-1",
      imageId: "image-2",
      sellerId: "seller-1",
    });
    expectListingRevalidation("listing-1");
  });

  it("rejects unauthenticated delete-image requests", async () => {
    hoisted.getSession.mockResolvedValue(null);
    const { deleteListingImageAction } = await loadActions();

    await expect(
      deleteListingImageAction({ listingId: "listing-1", imageId: "image-2" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects invalid delete-image payloads", async () => {
    hoisted.getSession.mockResolvedValue(session);
    const { deleteListingImageAction } = await loadActions();

    await expect(
      deleteListingImageAction({ listingId: "", imageId: "" }),
    ).rejects.toThrow("Invalid delete-image payload");
  });

  it("deletes images and revalidates listing paths", async () => {
    hoisted.getSession.mockResolvedValue(session);
    hoisted.deleteListingImage.mockResolvedValue({
      id: "image-2",
      listingId: "listing-1",
    });
    const { deleteListingImageAction } = await loadActions();

    await expect(
      deleteListingImageAction({ listingId: "listing-1", imageId: "image-2" }),
    ).resolves.toEqual({ listingId: "listing-1", imageId: "image-2" });

    expect(hoisted.deleteListingImage).toHaveBeenCalledWith({
      listingId: "listing-1",
      imageId: "image-2",
      sellerId: "seller-1",
    });
    expectListingRevalidation("listing-1");
  });
});
