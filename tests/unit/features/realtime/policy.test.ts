import { describe, expect, it } from "vitest";
import {
  getRealtimeConnectionMode,
  isGuestRealtimePath,
} from "@/features/realtime/policy";

describe("isGuestRealtimePath", () => {
  it("accepts the public listings index", () => {
    expect(isGuestRealtimePath("/listings")).toBe(true);
  });

  it("accepts listing detail pages", () => {
    expect(isGuestRealtimePath("/listings/listing-1")).toBe(true);
  });

  it("rejects listing edit pages", () => {
    expect(isGuestRealtimePath("/listings/listing-1/edit")).toBe(false);
  });

  it("rejects unrelated routes", () => {
    expect(isGuestRealtimePath("/dashboard")).toBe(false);
  });
});

describe("getRealtimeConnectionMode", () => {
  it("keeps authenticated users connected on any route", () => {
    expect(
      getRealtimeConnectionMode({
        pathname: "/dashboard/listings",
        viewerId: "user-1",
      }),
    ).toBe("authenticated");
  });

  it("connects guests on public listing routes", () => {
    expect(
      getRealtimeConnectionMode({
        pathname: "/listings/listing-1",
        viewerId: null,
      }),
    ).toBe("guest");
  });

  it("disconnects guests off listing routes", () => {
    expect(
      getRealtimeConnectionMode({
        pathname: "/",
        viewerId: null,
      }),
    ).toBe("none");
  });
});
