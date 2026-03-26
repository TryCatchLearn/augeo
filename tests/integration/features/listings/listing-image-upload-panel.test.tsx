import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListingImageUploadPanel } from "@/features/listings/components/listing-image-upload-panel";

const hoisted = vi.hoisted(() => ({
  addListingImageAction: vi.fn(),
  uploadImage: vi.fn(),
}));

const refresh = vi.fn();

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    useRouter: () => ({
      refresh,
    }),
  };
});

vi.mock("@/features/listings/actions", () => ({
  addListingImageAction: hoisted.addListingImageAction,
}));

vi.mock("@/features/listings/hooks/use-listing-image-upload", () => ({
  useListingImageUpload: () => ({
    uploadImage: hoisted.uploadImage,
  }),
}));

describe("ListingImageUploadPanel", () => {
  beforeEach(() => {
    refresh.mockReset();
    hoisted.addListingImageAction.mockReset();
    hoisted.uploadImage.mockReset();
  });

  it("uploads an additional image and refreshes the listing detail page", async () => {
    hoisted.uploadImage.mockResolvedValue({
      public_id: "cloudinary-public-id",
      secure_url: "https://res.cloudinary.com/demo/image/upload/detail.jpg",
    });
    hoisted.addListingImageAction.mockResolvedValue({
      listingId: "listing-1",
      imageId: "image-2",
    });

    render(<ListingImageUploadPanel listingId="listing-1" imageCount={2} />);

    fireEvent.change(screen.getByLabelText("Add another listing image"), {
      target: {
        files: [new File(["extra"], "detail.jpg", { type: "image/jpeg" })],
      },
    });

    await waitFor(() => {
      expect(hoisted.addListingImageAction).toHaveBeenCalledWith({
        listingId: "listing-1",
        uploadPublicId: "cloudinary-public-id",
        uploadUrl: "https://res.cloudinary.com/demo/image/upload/detail.jpg",
      });
    });

    expect(refresh).toHaveBeenCalled();
  });

  it("blocks uploads when the listing already has five images", async () => {
    render(<ListingImageUploadPanel listingId="listing-1" imageCount={5} />);

    fireEvent.change(screen.getByLabelText("Add another listing image"), {
      target: {
        files: [new File(["extra"], "detail.jpg", { type: "image/jpeg" })],
      },
    });

    expect(
      await screen.findByText("Listings can include up to 5 images."),
    ).toBeInTheDocument();
    expect(hoisted.uploadImage).not.toHaveBeenCalled();
    expect(hoisted.addListingImageAction).not.toHaveBeenCalled();
  });

  it("supports drag-and-drop uploads and shows upload errors", async () => {
    hoisted.uploadImage.mockRejectedValue(
      new Error("Unable to prepare the image upload."),
    );

    render(<ListingImageUploadPanel listingId="listing-1" imageCount={2} />);
    const dropZone = screen.getByText("Drop an image here").closest("label");

    if (!dropZone) {
      throw new Error("Expected image upload drop zone");
    }

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [new File(["extra"], "detail.jpg", { type: "image/jpeg" })],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to prepare the image upload.",
    );
  });
});
