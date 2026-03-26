import { describe, expect, it } from "vitest";
import {
  buildManualDraftDefaults,
  buildSmartListingDraftDefaults,
} from "@/features/listings/mutations";

describe("draft creation defaults", () => {
  it("builds the locked manual fallback payload", () => {
    const now = new Date("2026-03-22T12:00:00.000Z");
    const draft = buildManualDraftDefaults(now);

    expect(draft).toMatchObject({
      title: "Untitled draft",
      description: "Add a seller-written description before publishing.",
      location: "Add location",
      category: "other",
      condition: "good",
      startingBidCents: 100,
      reservePriceCents: null,
      startsAt: null,
      status: "draft",
    });
    expect(draft.endsAt.toISOString()).toBe("2026-03-29T12:00:00.000Z");
  });

  it("normalizes smart listing output into the saved draft shape", () => {
    const now = new Date("2026-03-22T12:00:00.000Z");
    const draft = buildSmartListingDraftDefaults(
      {
        title: "  Polaroid Camera  ",
        description: "  Instant camera shown with strap attached.  ",
        category: "home and garden",
        condition: "Like New",
        suggestedStartingPriceCents: 12550.2,
      },
      now,
    );

    expect(draft).toMatchObject({
      title: "Polaroid Camera",
      description: "Instant camera shown with strap attached.",
      location: "Add location",
      category: "home_garden",
      condition: "like_new",
      startingBidCents: 12550,
      reservePriceCents: null,
      startsAt: null,
      status: "draft",
    });
    expect(draft.endsAt.toISOString()).toBe("2026-03-29T12:00:00.000Z");
  });
});
