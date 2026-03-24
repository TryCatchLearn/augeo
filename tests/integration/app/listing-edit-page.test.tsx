import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createMockSession } from "../../helpers/auth/session";

const hoisted = vi.hoisted(() => ({
  requireSession: vi.fn(),
  getListingDetailForViewer: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
}));

vi.mock("@/features/auth/session", () => ({
  requireSession: hoisted.requireSession,
}));

vi.mock("@/features/listings/queries", () => ({
  getListingDetailForViewer: hoisted.getListingDetailForViewer,
}));

vi.mock("@/features/listings/components/draft-listing-editor", () => ({
  DraftListingEditor: () => <div>Draft editor</div>,
}));

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    notFound: hoisted.notFound,
  };
});

describe("Listing edit page", () => {
  it("protects the route behind the session requirement", async () => {
    hoisted.requireSession.mockRejectedValue(new Error("redirected"));

    const { default: ListingEditPage } = await import(
      "@/app/listings/[id]/edit/page"
    );

    await expect(
      ListingEditPage({ params: Promise.resolve({ id: "listing-1" }) }),
    ).rejects.toThrow("redirected");
  });

  it("renders the draft editor for the owner of a draft listing", async () => {
    const session = createMockSession({
      user: {
        id: "seller-1",
        name: "Seller One",
        email: "seller-one@example.test",
        emailVerified: true,
        createdAt: new Date("2026-03-21T00:00:00.000Z"),
        updatedAt: new Date("2026-03-21T00:00:00.000Z"),
        image: null,
      },
    });

    hoisted.requireSession.mockResolvedValue(session);
    hoisted.getListingDetailForViewer.mockResolvedValue({
      id: "listing-1",
      sellerId: "seller-1",
      sellerName: "Seller One",
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
      images: [],
    });

    const { default: ListingEditPage } = await import(
      "@/app/listings/[id]/edit/page"
    );

    render(
      await ListingEditPage({ params: Promise.resolve({ id: "listing-1" }) }),
    );

    expect(hoisted.requireSession).toHaveBeenCalledWith(
      "/listings/listing-1/edit",
    );
    expect(screen.getByText("Draft editor")).toBeInTheDocument();
  });

  it("returns not found for listings that are not in draft", async () => {
    const session = createMockSession({
      user: {
        id: "seller-1",
        name: "Seller One",
        email: "seller-one@example.test",
        emailVerified: true,
        createdAt: new Date("2026-03-21T00:00:00.000Z"),
        updatedAt: new Date("2026-03-21T00:00:00.000Z"),
        image: null,
      },
    });

    hoisted.requireSession.mockResolvedValue(session);
    hoisted.getListingDetailForViewer.mockResolvedValue({
      id: "listing-1",
      sellerId: "seller-1",
      sellerName: "Seller One",
      title: "Owner Active",
      description: "Active details",
      location: "Austin, TX",
      category: "other",
      condition: "good",
      status: "active",
      startingBidCents: 18000,
      reservePriceCents: null,
      startsAt: null,
      endsAt: new Date("2026-03-25T12:00:00.000Z"),
      images: [],
    });

    const { default: ListingEditPage } = await import(
      "@/app/listings/[id]/edit/page"
    );

    await expect(
      ListingEditPage({ params: Promise.resolve({ id: "listing-1" }) }),
    ).rejects.toThrow("not-found");
  });
});
