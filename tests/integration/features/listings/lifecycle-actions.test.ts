// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  runAuctionLifecycle: vi.fn(),
}));

vi.mock("@/server/auctions/lifecycle", () => ({
  runAuctionLifecycle: hoisted.runAuctionLifecycle,
}));

describe("runAuctionLifecycleDevAction", () => {
  beforeEach(() => {
    hoisted.runAuctionLifecycle.mockReset();
  });

  it("returns the shared lifecycle summary in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    hoisted.runAuctionLifecycle.mockResolvedValue({
      activatedCount: 1,
      closedCount: 2,
      soldCount: 1,
      unsoldCount: 1,
      reserveNotMetCount: 0,
    });

    const { runAuctionLifecycleDevAction } = await import(
      "@/features/listings/lifecycle-actions"
    );

    await expect(runAuctionLifecycleDevAction()).resolves.toEqual({
      activatedCount: 1,
      closedCount: 2,
      soldCount: 1,
      unsoldCount: 1,
      reserveNotMetCount: 0,
    });
    expect(hoisted.runAuctionLifecycle).toHaveBeenCalledTimes(1);
  });

  it("rejects manual lifecycle runs outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const { runAuctionLifecycleDevAction } = await import(
      "@/features/listings/lifecycle-actions"
    );

    await expect(runAuctionLifecycleDevAction()).rejects.toThrow(
      "Auction lifecycle can only be triggered manually in development.",
    );
    expect(hoisted.runAuctionLifecycle).not.toHaveBeenCalled();
  });
});
