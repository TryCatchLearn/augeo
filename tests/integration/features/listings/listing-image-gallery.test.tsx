import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListingImageGallery } from "@/features/listings/components/listing-image-gallery";

const hoisted = vi.hoisted(() => ({
  setMainListingImageAction: vi.fn(),
  deleteListingImageAction: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) =>
    React.createElement("img", props),
}));

vi.mock("@/features/listings/actions", () => ({
  setMainListingImageAction: hoisted.setMainListingImageAction,
  deleteListingImageAction: hoisted.deleteListingImageAction,
}));

describe("ListingImageGallery", () => {
  beforeEach(() => {
    hoisted.setMainListingImageAction.mockReset();
    hoisted.deleteListingImageAction.mockReset();
  });

  const images = [
    {
      id: "image-1",
      url: "https://example.com/main.jpg",
      isMain: true,
    },
    {
      id: "image-2",
      url: "https://example.com/detail.jpg",
      isMain: false,
    },
  ];

  it("switches the selected image when a thumbnail is clicked", () => {
    render(<ListingImageGallery title="Collector Camera" images={images} />);

    expect(
      screen.getByRole("img", { name: "Collector Camera" }),
    ).toHaveAttribute("src", "https://example.com/main.jpg");

    fireEvent.click(screen.getByRole("button", { name: "View image 2" }));

    expect(
      screen.getByRole("img", { name: "Collector Camera" }),
    ).toHaveAttribute("src", "https://example.com/detail.jpg");
  });

  it("shows management controls only when image management is enabled", () => {
    const { rerender } = render(
      <ListingImageGallery
        listingId="listing-1"
        title="Collector Camera"
        images={images}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Set image 2 as main" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete image 2" }),
    ).not.toBeInTheDocument();

    rerender(
      <ListingImageGallery
        listingId="listing-1"
        canManage
        title="Collector Camera"
        images={images}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Set image 2 as main" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete image 2" }),
    ).toBeInTheDocument();
  });

  it("sets another image as main when management succeeds", async () => {
    hoisted.setMainListingImageAction.mockResolvedValue({
      listingId: "listing-1",
      imageId: "image-2",
    });

    render(
      <ListingImageGallery
        listingId="listing-1"
        canManage
        title="Collector Camera"
        images={images}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Set image 2 as main" }),
    );

    await waitFor(() => {
      expect(hoisted.setMainListingImageAction).toHaveBeenCalledWith({
        listingId: "listing-1",
        imageId: "image-2",
      });
    });

    expect(
      screen.getByRole("button", { name: "Image 2 is the main image" }),
    ).toBeDisabled();
  });

  it("shows action errors and can delete a non-main image", async () => {
    hoisted.setMainListingImageAction.mockRejectedValue(
      new Error("Unable to update the listing images right now."),
    );
    hoisted.deleteListingImageAction.mockResolvedValue({
      listingId: "listing-1",
      imageId: "image-2",
    });

    render(
      <ListingImageGallery
        listingId="listing-1"
        canManage
        title="Collector Camera"
        images={images}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Set image 2 as main" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to update the listing images right now.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete image 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Image" }));

    await waitFor(() => {
      expect(hoisted.deleteListingImageAction).toHaveBeenCalledWith({
        listingId: "listing-1",
        imageId: "image-2",
      });
    });
    expect(
      screen.queryByRole("button", { name: "Delete image 2" }),
    ).not.toBeInTheDocument();
  });
});
