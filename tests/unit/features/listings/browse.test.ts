import { describe, expect, it } from "vitest";
import {
  getListingCategoryLabel,
  getPublicListingPriceThresholdCents,
  normalizePublicListingsQuery,
  publicListingSortOptions,
} from "@/features/listings/browse";

describe("public listings browse contract", () => {
  it("normalizes invalid values to the public defaults", () => {
    expect(
      normalizePublicListingsQuery({
        status: "mystery",
        q: "   ",
        category: "unknown",
        price: "expensive",
        sort: "popular",
        page: "0",
        pageSize: "999",
      }),
    ).toEqual({
      status: "active",
      q: "",
      category: null,
      price: null,
      sort: "newest",
      page: 1,
      pageSize: 6,
    });
  });

  it("keeps valid values and trims the search query", () => {
    expect(
      normalizePublicListingsQuery({
        status: "scheduled",
        q: "  camera body  ",
        category: "electronics",
        price: "lt_100",
        sort: "price_desc",
        page: "3",
        pageSize: "24",
      }),
    ).toEqual({
      status: "scheduled",
      q: "camera body",
      category: "electronics",
      price: "lt_100",
      sort: "price_desc",
      page: 3,
      pageSize: 24,
    });
  });

  it("maps listing categories to user-facing labels", () => {
    expect(getListingCategoryLabel("home_garden")).toBe("Home & Garden");
    expect(getListingCategoryLabel("jewelry_watches")).toBe(
      "Jewelry & Watches",
    );
  });

  it("maps price filters to starting-bid thresholds in cents", () => {
    expect(getPublicListingPriceThresholdCents("lt_10")).toBe(1_000);
    expect(getPublicListingPriceThresholdCents("lt_500")).toBe(50_000);
  });

  it("keeps the temporary most-bids option in the sort contract", () => {
    expect(
      publicListingSortOptions.find((option) => option.value === "most_bids"),
    ).toEqual({
      value: "most_bids",
      label: "Most Bids",
    });
  });
});
