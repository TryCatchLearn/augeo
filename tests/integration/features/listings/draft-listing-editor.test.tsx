import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DraftListingEditor } from "@/features/listings/components/draft-listing-editor";

const hoisted = vi.hoisted(() => ({
  saveDraftListingAction: vi.fn(),
}));

const push = vi.fn();

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    useRouter: () => ({
      push,
    }),
  };
});

vi.mock("@/features/listings/actions", () => ({
  saveDraftListingAction: hoisted.saveDraftListingAction,
}));

describe("DraftListingEditor", () => {
  beforeEach(() => {
    push.mockReset();
    hoisted.saveDraftListingAction.mockReset();
  });

  it("routes back to the listing detail page after saving", async () => {
    hoisted.saveDraftListingAction.mockResolvedValue({
      listingId: "listing-1",
    });

    render(
      <DraftListingEditor
        listing={{
          id: "listing-1",
          title: "Owner Draft",
          description: "Draft details",
          location: "Austin, TX",
          category: "other",
          condition: "good",
          status: "draft",
          startingBidCents: 18000,
          reservePriceCents: null,
          startsAt: null,
          endsAt: new Date("2026-03-25T12:00:00.000Z"),
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/listings/listing-1");
    });
    expect(hoisted.saveDraftListingAction).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: "listing-1",
        title: "Owner Draft",
      }),
    );
  });

  it("shows form validation errors before submitting invalid values", async () => {
    render(
      <DraftListingEditor
        listing={{
          id: "listing-1",
          title: "Owner Draft",
          description: "Draft details",
          location: "Austin, TX",
          category: "other",
          condition: "good",
          status: "draft",
          startingBidCents: 18000,
          reservePriceCents: null,
          startsAt: null,
          endsAt: new Date("2026-03-25T12:00:00.000Z"),
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Starting Bid"), {
      target: { value: "300" },
    });
    fireEvent.change(screen.getByLabelText("Reserve Price"), {
      target: { value: "200" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    expect(
      await screen.findByText(
        "Reserve price must be at least the starting bid.",
      ),
    ).toBeInTheDocument();
    expect(hoisted.saveDraftListingAction).not.toHaveBeenCalled();
  });

  it("shows action errors when the save fails", async () => {
    hoisted.saveDraftListingAction.mockRejectedValue(
      new Error("Listing cannot be edited."),
    );

    render(
      <DraftListingEditor
        listing={{
          id: "listing-1",
          title: "Owner Draft",
          description: "Draft details",
          location: "Austin, TX",
          category: "other",
          condition: "good",
          status: "draft",
          startingBidCents: 18000,
          reservePriceCents: null,
          startsAt: null,
          endsAt: new Date("2026-03-25T12:00:00.000Z"),
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    expect(
      await screen.findByText("Listing cannot be edited."),
    ).toBeInTheDocument();
  });
});
