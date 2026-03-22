import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockRequireSession = vi.fn();

vi.mock("@/features/auth/session", () => ({
  requireSession: mockRequireSession,
}));

vi.mock("@/features/listings/components/create-listing-upload", () => ({
  CreateListingUpload: () => <div>Upload flow</div>,
}));

describe("Sell page", () => {
  it("protects the route behind the session requirement", async () => {
    mockRequireSession.mockRejectedValue(new Error("redirected"));

    const { default: SellPage } = await import("@/app/sell/page");

    await expect(SellPage()).rejects.toThrow("redirected");
  });

  it("renders the upload surface for authenticated users", async () => {
    mockRequireSession.mockResolvedValue({
      user: { id: "user-1" },
      session: { id: "session-1" },
    });

    const { default: SellPage } = await import("@/app/sell/page");

    render(await SellPage());

    expect(screen.getByText("Upload flow")).toBeInTheDocument();
  });
});
