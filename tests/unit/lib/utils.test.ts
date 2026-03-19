import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names and resolves conflicting Tailwind utilities", () => {
    expect(cn("px-2 py-1", undefined, "px-4", false, "font-medium")).toBe(
      "py-1 px-4 font-medium",
    );
  });
});
