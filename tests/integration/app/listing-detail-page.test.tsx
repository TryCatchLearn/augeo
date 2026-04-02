import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createMockSession } from "../../helpers/auth/session";

const hoisted = vi.hoisted(() => ({
  getSession: vi.fn(),
  getListingDetailForViewer: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
}));

vi.mock("@/features/auth/session", () => ({
  getSession: hoisted.getSession,
}));

vi.mock("@/features/listings/queries", () => ({
  getListingDetailForViewer: hoisted.getListingDetailForViewer,
}));

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    useRouter: hoisted.useRouter,
    notFound: hoisted.notFound,
  };
});

function createListingDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: "listing-1",
    sellerId: "seller-1",
    sellerName: "Seller One",
    title: "Collector Camera",
    description: "Beautiful condition and ready for bidding.",
    location: "Portland, OR",
    category: "electronics",
    condition: "like_new",
    status: "active",
    startingBidCents: 45000,
    currentBidCents: null,
    currentPriceCents: 45000,
    minimumNextBidCents: 45000,
    bidCount: 0,
    highestBidderId: null,
    viewerBidStatus: "none",
    canPlaceBid: true,
    reservePriceCents: null,
    startsAt: null,
    outcome: null,
    winnerUserId: null,
    winningBidId: null,
    endsAt: new Date("2026-04-10T12:00:00.000Z"),
    bidHistory: [],
    images: [],
    ...overrides,
  };
}

describe("Listing detail page", () => {
  it("renders public listing details with gallery thumbnails", async () => {
    hoisted.getSession.mockResolvedValue(null);
    hoisted.getListingDetailForViewer.mockResolvedValue(
      createListingDetail({
        canPlaceBid: false,
        images: [
          {
            id: "image-1",
            url: "https://picsum.photos/seed/camera-main/1200/900",
            isMain: true,
          },
          {
            id: "image-2",
            url: "https://picsum.photos/seed/camera-side/1200/900",
            isMain: false,
          },
        ],
      }),
    );

    const { default: ListingDetailPage } = await import(
      "@/app/listings/[id]/page"
    );

    render(
      await ListingDetailPage({ params: Promise.resolve({ id: "listing-1" }) }),
    );

    expect(
      screen.getByRole("heading", { name: "Collector Camera" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Auction Activity")).toBeInTheDocument();
    expect(screen.getAllByText("$450.00")).toHaveLength(4);
    expect(
      screen.getByRole("img", { name: "Collector Camera" }),
    ).toHaveAttribute("src", expect.stringContaining("camera-main"));

    fireEvent.click(screen.getByRole("button", { name: "View image 2" }));

    expect(
      screen.getByRole("img", { name: "Collector Camera" }),
    ).toHaveAttribute("src", expect.stringContaining("camera-side"));
  });

  it("renders the seller placeholder area for the listing owner", async () => {
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

    hoisted.getSession.mockResolvedValue(session);
    hoisted.getListingDetailForViewer.mockResolvedValue(
      createListingDetail({
        title: "Owner Draft",
        description: "Draft details",
        location: "Austin, TX",
        category: "other",
        condition: "good",
        status: "draft",
        startingBidCents: 18000,
        currentPriceCents: 18000,
        minimumNextBidCents: 18000,
      }),
    );

    const { default: ListingDetailPage } = await import(
      "@/app/listings/[id]/page"
    );

    render(
      await ListingDetailPage({ params: Promise.resolve({ id: "listing-1" }) }),
    );

    expect(screen.getByText("Seller Controls")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Refine Listing" }),
    ).toHaveAttribute("href", "/listings/listing-1/edit");
    expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByText("Add More Images")).toBeInTheDocument();
  });

  it("shows only return-to-draft for scheduled sellers", async () => {
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

    hoisted.getSession.mockResolvedValue(session);
    hoisted.getListingDetailForViewer.mockResolvedValue(
      createListingDetail({
        title: "Scheduled Draft",
        description: "Scheduled details",
        location: "Austin, TX",
        category: "other",
        condition: "good",
        status: "scheduled",
        startingBidCents: 18000,
        currentPriceCents: 18000,
        minimumNextBidCents: 18000,
        reservePriceCents: 22000,
        startsAt: new Date("2026-03-26T12:00:00.000Z"),
        endsAt: new Date("2026-03-27T12:00:00.000Z"),
      }),
    );

    const { default: ListingDetailPage } = await import(
      "@/app/listings/[id]/page"
    );

    render(
      await ListingDetailPage({ params: Promise.resolve({ id: "listing-1" }) }),
    );

    expect(
      screen.getByRole("button", { name: "Return to Draft" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Publish" }),
    ).not.toBeInTheDocument();
  });

  it("shows the image upload panel only for seller-owned drafts", async () => {
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

    hoisted.getSession.mockResolvedValue(session);
    hoisted.getListingDetailForViewer.mockResolvedValue(
      createListingDetail({
        title: "Owner Draft",
        description: "Draft details",
        location: "Austin, TX",
        category: "other",
        condition: "good",
        status: "draft",
        startingBidCents: 18000,
        currentPriceCents: 18000,
        minimumNextBidCents: 18000,
        images: [
          {
            id: "image-1",
            url: "https://picsum.photos/seed/camera-main/1200/900",
            isMain: true,
          },
        ],
      }),
    );

    const { default: ListingDetailPage } = await import(
      "@/app/listings/[id]/page"
    );

    render(
      await ListingDetailPage({ params: Promise.resolve({ id: "listing-1" }) }),
    );

    expect(screen.getByText("Add More Images")).toBeInTheDocument();
  });

  it("hides seller actions and image management for ended listings", async () => {
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

    hoisted.getSession.mockResolvedValue(session);
    hoisted.getListingDetailForViewer.mockResolvedValue(
      createListingDetail({
        title: "Ended Listing",
        description: "Ended details",
        location: "Austin, TX",
        category: "other",
        condition: "good",
        status: "ended",
        startingBidCents: 18000,
        currentPriceCents: 18000,
        minimumNextBidCents: 18000,
        canPlaceBid: false,
      }),
    );

    const { default: ListingDetailPage } = await import(
      "@/app/listings/[id]/page"
    );

    render(
      await ListingDetailPage({ params: Promise.resolve({ id: "listing-1" }) }),
    );

    expect(
      screen.queryByRole("button", { name: "Publish" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Return to Draft" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Add More Images")).not.toBeInTheDocument();
  });

  it("returns not found when the listing is unavailable to the viewer", async () => {
    hoisted.getSession.mockResolvedValue(null);
    hoisted.getListingDetailForViewer.mockResolvedValue(null);

    const { default: ListingDetailPage } = await import(
      "@/app/listings/[id]/page"
    );

    await expect(
      ListingDetailPage({ params: Promise.resolve({ id: "listing-1" }) }),
    ).rejects.toThrow("not-found");
  });

  it("replaces seller controls with auction activity after the first bid", async () => {
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

    hoisted.getSession.mockResolvedValue(session);
    hoisted.getListingDetailForViewer.mockResolvedValue(
      createListingDetail({
        bidCount: 1,
        currentBidCents: 18100,
        currentPriceCents: 18100,
        minimumNextBidCents: 18200,
        highestBidderId: "buyer-1",
        bidHistory: [
          {
            id: "bid-1",
            bidderId: "buyer-1",
            bidderName: "Buyer One",
            amountCents: 18100,
            createdAt: new Date("2026-03-21T12:00:00.000Z"),
          },
        ],
      }),
    );

    const { default: ListingDetailPage } = await import(
      "@/app/listings/[id]/page"
    );

    render(
      await ListingDetailPage({ params: Promise.resolve({ id: "listing-1" }) }),
    );

    expect(screen.getByText("Auction Activity")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Publish" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Buyer One")).toHaveLength(2);
  });
});
