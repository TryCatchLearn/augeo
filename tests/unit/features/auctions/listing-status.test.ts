import { describe, expect, it } from "vitest";
import {
  canReceiveBids,
  canReturnToDraft,
} from "@/features/auctions/domain/listing-status";

describe("listing status rules", () => {
  it("allows bids only for active listings that have not ended", () => {
    const now = new Date("2026-03-21T12:00:00.000Z");

    expect(
      canReceiveBids("active", new Date("2026-03-21T12:05:00.000Z"), now),
    ).toBe(true);
    expect(
      canReceiveBids("scheduled", new Date("2026-03-21T12:05:00.000Z"), now),
    ).toBe(false);
    expect(
      canReceiveBids("active", new Date("2026-03-21T11:59:59.000Z"), now),
    ).toBe(false);
  });

  it("allows returning to draft only before any bids exist", () => {
    expect(canReturnToDraft("scheduled", 0)).toBe(true);
    expect(canReturnToDraft("active", 0)).toBe(true);
    expect(canReturnToDraft("draft", 0)).toBe(false);
    expect(canReturnToDraft("active", 1)).toBe(false);
  });
});
