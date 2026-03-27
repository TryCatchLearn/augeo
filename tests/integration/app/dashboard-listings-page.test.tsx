import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaginatedListingCardResult } from "@/features/listings/queries";
import { createMockSession } from "../../helpers/auth/session";

const mockRequireSession = vi.fn();
const mockListSellerListingCards =
  vi.fn<
    (
      sellerId: string,
      input?: { status?: string; page?: string; pageSize?: string },
    ) => Promise<PaginatedListingCardResult>
  >();
const mockListingsPagination = vi.fn();

vi.mock("@/features/auth/session", () => ({
  requireSession: mockRequireSession,
}));

vi.mock("@/features/listings/queries", () => ({
  listSellerListingCards: mockListSellerListingCards,
}));

vi.mock("@/features/listings/components/listings-pagination", () => ({
  ListingsPagination: (props: unknown) => {
    mockListingsPagination(props);

    return <div data-testid="listings-pagination" />;
  },
}));

function createListingsResult(
  items: PaginatedListingCardResult["items"],
): PaginatedListingCardResult {
  return {
    items,
    totalCount: items.length,
    page: 1,
    pageSize: 6,
    startResult: items.length > 0 ? 1 : 0,
    endResult: items.length,
    pageCount: items.length > 0 ? 1 : 0,
    pageNumbers: items.length > 0 ? [1] : [],
    hasPreviousPage: false,
    hasNextPage: false,
  };
}

describe("Dashboard listings page", () => {
  beforeEach(() => {
    mockRequireSession.mockReset();
    mockListSellerListingCards.mockReset();
    mockListingsPagination.mockReset();
  });

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
    mockListSellerListingCards.mockResolvedValue(
      createListingsResult([
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
      ]),
    );

    const { default: DashboardListingsPage } = await import(
      "@/app/dashboard/listings/page"
    );

    render(
      await DashboardListingsPage({
        searchParams: Promise.resolve({ status: "active" }),
      }),
    );

    expect(mockRequireSession).toHaveBeenCalledWith("/dashboard/listings");
    expect(mockListSellerListingCards).toHaveBeenCalledWith(session.user.id, {
      status: "active",
    });
    expect(screen.getByText("Seller Active")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Active" })).toHaveAttribute(
      "href",
      "/dashboard/listings?status=active",
    );
    expect(screen.getByTestId("listings-pagination")).toBeInTheDocument();
  });

  it("shows an empty state when the selected tab has no listings", async () => {
    mockRequireSession.mockResolvedValue(createMockSession());
    mockListSellerListingCards.mockResolvedValue(createListingsResult([]));

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

  it("keeps the existing seller tab normalization when status is invalid", async () => {
    const session = createMockSession();

    mockRequireSession.mockResolvedValue(session);
    mockListSellerListingCards.mockResolvedValue(createListingsResult([]));

    const { default: DashboardListingsPage } = await import(
      "@/app/dashboard/listings/page"
    );

    render(
      await DashboardListingsPage({
        searchParams: Promise.resolve({ status: "mystery" }),
      }),
    );

    expect(mockListSellerListingCards).toHaveBeenCalledWith(session.user.id, {
      status: "mystery",
    });
    expect(screen.getByRole("link", { name: "Drafts" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("passes seller status and page size into pagination links", async () => {
    const session = createMockSession();

    mockRequireSession.mockResolvedValue(session);
    mockListSellerListingCards.mockResolvedValue(createListingsResult([]));

    const { default: DashboardListingsPage } = await import(
      "@/app/dashboard/listings/page"
    );

    render(
      await DashboardListingsPage({
        searchParams: Promise.resolve({
          status: "scheduled",
          page: "2",
          pageSize: "12",
        }),
      }),
    );

    const paginationProps = mockListingsPagination.mock.calls.at(-1)?.[0] as {
      pathname: string;
      searchParams: URLSearchParams;
    };

    expect(paginationProps.pathname).toBe("/dashboard/listings");
    expect(paginationProps.searchParams.toString()).toBe(
      "status=scheduled&page=2&pageSize=12",
    );
  });
});
