import { describe, expect, it } from "vitest";
import { buildFakeDraftDefaults } from "@/features/listings/mutations";

describe("buildFakeDraftDefaults", () => {
  it("returns deterministic defaults for the same seed", () => {
    const now = new Date("2026-03-22T12:00:00.000Z");
    const first = buildFakeDraftDefaults("seed-123", now);
    const second = buildFakeDraftDefaults("seed-123", now);

    expect(first).toEqual(second);
  });

  it("creates a publish-ready draft payload ending seven days later", () => {
    const now = new Date("2026-03-22T12:00:00.000Z");
    const draft = buildFakeDraftDefaults("seed-456", now);

    expect(draft.status).toBe("draft");
    expect(draft.reservePriceCents).toBeNull();
    expect(draft.startsAt).toBeNull();
    expect(draft.endsAt.toISOString()).toBe("2026-03-29T12:00:00.000Z");
    expect(draft.title.length).toBeGreaterThan(0);
    expect(draft.description.length).toBeGreaterThan(0);
    expect(draft.location.length).toBeGreaterThan(0);
    expect(draft.startingBidCents).toBeGreaterThan(0);
  });
});
