import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DraftListingEditor } from "@/features/listings/components/draft-listing-editor";

const hoisted = vi.hoisted(() => ({
  saveDraftListingAction: vi.fn(),
  enhanceListingDescriptionAction: vi.fn(),
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
  enhanceListingDescriptionAction: hoisted.enhanceListingDescriptionAction,
  saveDraftListingAction: hoisted.saveDraftListingAction,
}));

function renderEditor() {
  return render(
    <DraftListingEditor
      listing={{
        id: "listing-1",
        title: "Owner Draft",
        description: "Draft details with strap and case.",
        location: "Austin, TX",
        category: "other",
        condition: "good",
        status: "draft",
        startingBidCents: 18000,
        reservePriceCents: null,
        aiDescriptionGenerationCount: 0,
        startsAt: null,
        endsAt: new Date("2026-03-25T12:00:00.000Z"),
      }}
    />,
  );
}

describe("DraftListingEditor", () => {
  beforeEach(() => {
    push.mockReset();
    hoisted.saveDraftListingAction.mockReset();
    hoisted.enhanceListingDescriptionAction.mockReset();
  });

  it("routes back to the listing detail page after saving", async () => {
    hoisted.saveDraftListingAction.mockResolvedValue({
      listingId: "listing-1",
    });

    renderEditor();
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
    renderEditor();

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

    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    expect(
      await screen.findByText("Listing cannot be edited."),
    ).toBeInTheDocument();
  });

  it("shows the AI preview and accepts it into form state only", async () => {
    hoisted.enhanceListingDescriptionAction.mockResolvedValue({
      text: "Friendly rewrite with the original details intact.",
      remainingRuns: 9,
    });

    renderEditor();
    fireEvent.click(
      screen.getByRole("button", { name: "Refine description with AI" }),
    );

    expect(await screen.findByText(/Friendly rewrite/)).toBeInTheDocument();
    expect(screen.getByText("9 AI runs remaining.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Description")).toHaveValue(
        "Friendly rewrite with the original details intact.",
      );
    });
    expect(hoisted.saveDraftListingAction).not.toHaveBeenCalled();
  });

  it("cancels the generated preview without changing the textarea", async () => {
    hoisted.enhanceListingDescriptionAction.mockResolvedValue({
      text: "Friendly rewrite with the original details intact.",
      remainingRuns: 9,
    });

    renderEditor();
    fireEvent.click(
      screen.getByRole("button", { name: "Refine description with AI" }),
    );

    expect(await screen.findByText(/Friendly rewrite/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[1]);

    await waitFor(() => {
      expect(
        screen.queryByText(
          "Friendly rewrite with the original details intact.",
        ),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Draft details with strap and case.",
    );
  });

  it("shows recoverable AI errors and allows regeneration", async () => {
    hoisted.enhanceListingDescriptionAction
      .mockRejectedValueOnce(new Error("AI description enhancement failed."))
      .mockResolvedValueOnce({
        text: "Friendly rewrite with the original details intact.",
        remainingRuns: 8,
      });

    renderEditor();
    fireEvent.click(
      screen.getByRole("button", { name: "Refine description with AI" }),
    );

    expect(
      await screen.findByText("AI description enhancement failed."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));

    expect(await screen.findByText(/Friendly rewrite/)).toBeInTheDocument();
    expect(screen.getByText("8 AI runs remaining.")).toBeInTheDocument();
    expect(hoisted.enhanceListingDescriptionAction).toHaveBeenCalledTimes(2);
  });
});
