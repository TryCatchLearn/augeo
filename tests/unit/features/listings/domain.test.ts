import { describe, expect, it } from "vitest";
import {
  canReceiveBids,
  canReturnToDraft,
  formatTimeRemaining,
  isListingStatus,
  listingConditions,
  listingStatuses,
} from "@/features/listings/domain";

describe("listing status rules", () => {
  it("exports the supported listing enums", () => {
    expect(listingStatuses).toEqual(["draft", "scheduled", "active", "ended"]);
    expect(listingConditions).toEqual([
      "new",
      "like_new",
      "good",
      "fair",
      "poor",
    ]);
  });

  it("recognizes valid listing statuses", () => {
    expect(isListingStatus("draft")).toBe(true);
    expect(isListingStatus("active")).toBe(true);
    expect(isListingStatus("preview")).toBe(false);
  });

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

  it("formats time remaining for days, hours, minutes, and ended states", () => {
    const now = new Date("2026-03-21T12:00:00.000Z");

    expect(formatTimeRemaining(new Date("2026-03-24T15:30:00.000Z"), now)).toBe(
      "3d 3h left",
    );
    expect(formatTimeRemaining(new Date("2026-03-21T17:45:00.000Z"), now)).toBe(
      "5h 45m left",
    );
    expect(formatTimeRemaining(new Date("2026-03-21T12:10:00.000Z"), now)).toBe(
      "10m left",
    );
    expect(formatTimeRemaining(new Date("2026-03-21T11:59:00.000Z"), now)).toBe(
      "Ended",
    );
  });
});
