import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListingSellerControls } from "@/features/listings/components/listing-seller-controls";

const hoisted = vi.hoisted(() => ({
  publishListingAction: vi.fn(),
  returnListingToDraftAction: vi.fn(),
  deleteDraftListingAction: vi.fn(),
}));

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    useRouter: () => ({
      push,
      refresh,
    }),
  };
});

vi.mock("@/features/listings/actions", () => ({
  publishListingAction: hoisted.publishListingAction,
  returnListingToDraftAction: hoisted.returnListingToDraftAction,
  deleteDraftListingAction: hoisted.deleteDraftListingAction,
}));

describe("ListingSellerControls", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    hoisted.publishListingAction.mockReset();
    hoisted.returnListingToDraftAction.mockReset();
    hoisted.deleteDraftListingAction.mockReset();
  });

  const baseListing = {
    id: "listing-1",
    title: "Draft Camera",
    description: "Description",
    location: "Austin, TX",
    category: "electronics",
    condition: "good",
    startingBidCents: 15000,
    reservePriceCents: null,
    startsAt: null,
    endsAt: new Date("2026-03-30T12:00:00.000Z"),
  };

  it("renders draft controls and publishes the listing", async () => {
    hoisted.publishListingAction.mockResolvedValue({
      listingId: "listing-1",
      status: "active",
    });

    render(
      <ListingSellerControls listing={{ ...baseListing, status: "draft" }} />,
    );

    expect(
      screen.getByRole("link", { name: "Refine Listing" }),
    ).toHaveAttribute("href", "/listings/listing-1/edit");
    expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => {
      expect(hoisted.publishListingAction).toHaveBeenCalledWith({
        listingId: "listing-1",
      });
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("renders return-to-draft for scheduled listings and runs the action", async () => {
    hoisted.returnListingToDraftAction.mockResolvedValue({
      listingId: "listing-1",
      status: "draft",
    });

    render(
      <ListingSellerControls
        listing={{ ...baseListing, status: "scheduled" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Return to Draft" }));
    fireEvent.click(screen.getByRole("button", { name: "Return to Draft" }));

    await waitFor(() => {
      expect(hoisted.returnListingToDraftAction).toHaveBeenCalledWith({
        listingId: "listing-1",
      });
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("deletes draft listings and redirects back to seller drafts", async () => {
    hoisted.deleteDraftListingAction.mockResolvedValue({
      listingId: "listing-1",
    });

    render(
      <ListingSellerControls listing={{ ...baseListing, status: "draft" }} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Draft" }));

    await waitFor(() => {
      expect(hoisted.deleteDraftListingAction).toHaveBeenCalledWith({
        listingId: "listing-1",
      });
    });
    expect(push).toHaveBeenCalledWith("/dashboard/listings?status=draft");
  });

  it("hides seller actions for ended listings", () => {
    render(
      <ListingSellerControls listing={{ ...baseListing, status: "ended" }} />,
    );

    expect(
      screen.queryByRole("button", { name: "Publish" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Return to Draft" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });
});
