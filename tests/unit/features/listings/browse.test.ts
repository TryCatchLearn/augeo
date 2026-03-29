import { describe, expect, it } from "vitest";
import {
  getPublicListingPriceThresholdCents,
  publicListingSortOptions,
} from "@/features/listings/helpers/browse-options";
import {
  normalizeDashboardListingsQuery,
  normalizePublicListingsQuery,
} from "@/features/listings/helpers/browse-query";
import {
  createDashboardListingsSearchParams,
  createPublicListingsSearchParams,
} from "@/features/listings/helpers/browse-search-params";
import {
  getPaginationWindow,
  getResultCountRange,
} from "@/features/listings/helpers/pagination";

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

  it("normalizes invalid dashboard values to the seller defaults", () => {
    expect(
      normalizeDashboardListingsQuery({
        status: "mystery",
        page: "-4",
        pageSize: "999",
      }),
    ).toEqual({
      status: "draft",
      page: 1,
      pageSize: 6,
    });
  });

  it("maps price filters to starting-bid thresholds in cents", () => {
    expect(getPublicListingPriceThresholdCents("lt_10")).toBe(1_000);
    expect(getPublicListingPriceThresholdCents("lt_500")).toBe(50_000);
  });

  it("keeps only implemented sort options in the sort contract", () => {
    expect(publicListingSortOptions.map((option) => option.value)).toEqual([
      "newest",
      "ending_soonest",
      "price_asc",
      "price_desc",
    ]);
  });

  it("builds a centered pagination window for the current page", () => {
    expect(getPaginationWindow(4, 8)).toEqual({
      pageCount: 8,
      pageNumbers: [2, 3, 4, 5, 6],
    });
    expect(getPaginationWindow(8, 8)).toEqual({
      pageCount: 8,
      pageNumbers: [4, 5, 6, 7, 8],
    });
  });

  it("computes result counts for empty and partial pages", () => {
    expect(getResultCountRange(1, 6, 0)).toEqual({ start: 0, end: 0 });
    expect(getResultCountRange(2, 6, 3)).toEqual({ start: 7, end: 9 });
  });

  it("serializes public and dashboard search params using the shared defaults", () => {
    expect(
      createPublicListingsSearchParams({
        status: "scheduled",
        q: "desk lamp",
        category: "electronics",
        price: "lt_50",
        sort: "price_desc",
        page: 2,
        pageSize: 12,
      }).toString(),
    ).toBe(
      "status=scheduled&q=desk+lamp&category=electronics&price=lt_50&sort=price_desc&page=2&pageSize=12",
    );
    expect(
      createDashboardListingsSearchParams({
        status: "active",
        page: 1,
        pageSize: 24,
      }).toString(),
    ).toBe("status=active&pageSize=24");
  });
});
