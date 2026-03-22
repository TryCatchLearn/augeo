import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ListingCardData } from "@/features/listings/queries";
import { createMockSession } from "../../helpers/auth/session";

const mockRequireSession = vi.fn();
const mockListSellerListingCards =
  vi.fn<(sellerId: string, status: string) => Promise<ListingCardData[]>>();

vi.mock("@/features/auth/session", () => ({
  requireSession: mockRequireSession,
}));

vi.mock("@/features/listings/queries", () => ({
  listSellerListingCards: mockListSellerListingCards,
}));

describe("Dashboard listings page", () => {
  it("protects the route behind the session requirement", async () => {
    mockRequireSession.mockRejectedValue(new Error("redirected"));

    const { default: DashboardListingsPage } = await import(
      "@/app/dashboard/listings/page"
    );

    await expect(DashboardListingsPage({})).rejects.toThrow("redirected");
    expect(mockListSellerListingCards).not.toHaveBeenCalled();
  });

  it("filters listings by the selected status tab", async () => {
    const session = createMockSession();

    mockRequireSession.mockResolvedValue(session);
    mockListSellerListingCards.mockResolvedValue([
      {
        id: "listing-1",
        title: "Seller Active",
        status: "active",
        startingBidCents: 42000,
        bidCount: 0,
        sellerName: session.user.name,
        endsAt: new Date("2026-03-22T18:00:00.000Z"),
        imageUrl: "https://picsum.photos/seed/seller-active/1200/900",
      },
    ]);

    const { default: DashboardListingsPage } = await import(
      "@/app/dashboard/listings/page"
    );

    render(
      await DashboardListingsPage({
        searchParams: Promise.resolve({ status: "active" }),
      }),
    );

    expect(mockRequireSession).toHaveBeenCalledWith("/dashboard/listings");
    expect(mockListSellerListingCards).toHaveBeenCalledWith(
      session.user.id,
      "active",
    );
    expect(screen.getByText("Seller Active")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Active" })).toHaveAttribute(
      "href",
      "/dashboard/listings?status=active",
    );
  });

  it("shows an empty state when the selected tab has no listings", async () => {
    mockRequireSession.mockResolvedValue(createMockSession());
    mockListSellerListingCards.mockResolvedValue([]);

    const { default: DashboardListingsPage } = await import(
      "@/app/dashboard/listings/page"
    );

    render(
      await DashboardListingsPage({
        searchParams: Promise.resolve({ status: "scheduled" }),
      }),
    );

    expect(screen.getByText("No listings yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Listings will appear here once inventory is available.",
      ),
    ).toBeInTheDocument();
  });
});
