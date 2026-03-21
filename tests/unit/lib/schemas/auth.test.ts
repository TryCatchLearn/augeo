// @vitest-environment node

import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/schemas/auth";

describe("auth schemas", () => {
  it("accepts valid login values", () => {
    expect(
      loginSchema.parse({
        email: "seller@example.com",
        password: "secret",
      }),
    ).toEqual({
      email: "seller@example.com",
      password: "secret",
    });
  });

  it("rejects mismatched register passwords", () => {
    const result = registerSchema.safeParse({
      displayName: "Augeo",
      email: "seller@example.com",
      password: "secret",
      confirmPassword: "different",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Passwords do not match.");
    }
  });
});
