import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppProviders } from "@/components/app-providers";

const hoisted = vi.hoisted(() => ({
  realtimeProvider: vi.fn(
    ({ children }: { children: React.ReactNode; viewerId?: string | null }) => (
      <div data-testid="realtime-provider">{children}</div>
    ),
  ),
  toaster: vi.fn(() => <div data-testid="global-toaster" />),
}));

vi.mock("@/features/realtime/provider", () => ({
  RealtimeProvider: hoisted.realtimeProvider,
}));

vi.mock("sonner", () => ({
  Toaster: hoisted.toaster,
}));

describe("AppProviders", () => {
  it("mounts the realtime provider and global toaster", () => {
    render(
      <AppProviders viewerId="user-123">
        <div>Page content</div>
      </AppProviders>,
    );

    expect(screen.getByTestId("realtime-provider")).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.getByTestId("global-toaster")).toBeInTheDocument();
    expect(hoisted.realtimeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        viewerId: "user-123",
      }),
      undefined,
    );
    expect(hoisted.toaster).toHaveBeenCalledWith(
      expect.objectContaining({
        position: "top-right",
        richColors: true,
      }),
      undefined,
    );
  });
});
