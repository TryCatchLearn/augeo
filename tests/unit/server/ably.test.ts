// @vitest-environment node

import { describe, expect, it } from "vitest";
import { getAblyTokenCapability } from "@/server/ably";

describe("getAblyTokenCapability", () => {
  it("grants guests listing subscriptions only", () => {
    expect(getAblyTokenCapability()).toEqual({
      "listing:*": ["subscribe"],
    });
  });

  it("grants authenticated users listing and user subscriptions", () => {
    expect(getAblyTokenCapability("user-123")).toEqual({
      "listing:*": ["subscribe"],
      "user:user-123": ["subscribe"],
    });
  });
});
