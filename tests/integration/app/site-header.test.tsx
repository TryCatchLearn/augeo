import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getSession: vi.fn(),
  push: vi.fn(),
  pathname: "/",
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    usePathname: () => hoisted.pathname,
    useRouter: () => ({
      push: hoisted.push,
    }),
    useSearchParams: () => hoisted.searchParams,
  };
});

vi.mock("@/features/auth/session", () => ({
  getSession: hoisted.getSession,
}));

vi.mock("@/components/user-nav", () => ({
  UserNav: () => <div>User nav</div>,
}));

describe("SiteHeader", () => {
  beforeEach(() => {
    hoisted.getSession.mockReset();
    hoisted.getSession.mockResolvedValue(null);
    hoisted.push.mockReset();
    hoisted.pathname = "/";
    hoisted.searchParams = new URLSearchParams();
  });

  it("renders the always-visible listing search in the header", async () => {
    const { SiteHeader } = await import("@/components/site-header");

    render(await SiteHeader());

    expect(
      screen.getByRole("searchbox", { name: "Search listings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit listing search" }),
    ).toBeInTheDocument();
  });

  it("submits only on explicit submit from non-listings routes", async () => {
    hoisted.pathname = "/sell";

    const { SiteHeader } = await import("@/components/site-header");

    render(await SiteHeader());

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search listings" }),
      {
        target: { value: "  camera  " },
      },
    );

    expect(hoisted.push).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Submit listing search" }),
    );

    expect(hoisted.push).toHaveBeenCalledWith("/listings?q=camera");
  });

  it("preserves browse state and resets page when submitting from /listings", async () => {
    hoisted.pathname = "/listings";
    hoisted.searchParams = new URLSearchParams(
      "status=scheduled&category=electronics&price=lt_50&sort=price_desc&page=3&pageSize=12",
    );

    const { SiteHeader } = await import("@/components/site-header");

    render(await SiteHeader());

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search listings" }),
      {
        target: { value: "desk lamp" },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Submit listing search" }),
    );

    expect(hoisted.push).toHaveBeenCalledWith(
      "/listings?status=scheduled&q=desk+lamp&category=electronics&price=lt_50&sort=price_desc&pageSize=12",
    );
  });

  it("routes an empty trimmed query back to browse on non-listings pages", async () => {
    hoisted.pathname = "/dashboard";

    const { SiteHeader } = await import("@/components/site-header");

    render(await SiteHeader());

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search listings" }),
      {
        target: { value: "   " },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Submit listing search" }),
    );

    expect(hoisted.push).toHaveBeenCalledWith("/listings");
  });
});
