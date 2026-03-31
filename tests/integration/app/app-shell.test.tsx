import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";
import NotFound from "@/app/not-found";
import Template from "@/app/template";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    ViewTransition: ({ children }: { children: unknown }) => <>{children}</>,
  };
});

vi.mock("next/font/google", () => ({
  Geist: () => ({
    variable: "--font-geist-sans",
  }),
  Geist_Mono: () => ({
    variable: "--font-geist-mono",
  }),
}));

vi.mock("@/components/site-header", () => ({
  SiteHeader: () => <div>Site header</div>,
}));

vi.mock("@/components/site-footer", () => ({
  SiteFooter: () => <div>Site footer</div>,
}));

vi.mock("@/components/app-providers", () => ({
  AppProviders: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/features/auth/session", () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));

describe("app shell", () => {
  it("renders the root layout chrome", async () => {
    render(await RootLayout({ children: <div>Page content</div> }));

    expect(screen.getByText("Site header")).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.getByText("Site footer")).toBeInTheDocument();
  });

  it("renders the route template wrapper", () => {
    render(
      <Template>
        <div>Template content</div>
      </Template>,
    );

    expect(screen.getByText("Template content")).toBeInTheDocument();
  });

  it("renders the not-found page actions", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", {
        name: "That route fell through the floorboards.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("link", { name: "Browse listings" }),
    ).toHaveAttribute("href", "/listings");
  });
});
