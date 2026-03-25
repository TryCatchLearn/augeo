// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  createAuthClient: vi.fn(),
}));

vi.mock("better-auth/react", () => ({
  createAuthClient: hoisted.createAuthClient,
}));

describe("auth client", () => {
  it("creates the Better Auth client once at module load", async () => {
    const client = {
      signIn: {},
      signUp: {},
    };
    hoisted.createAuthClient.mockReturnValue(client);

    const { authClient } = await import("@/features/auth/client");

    expect(hoisted.createAuthClient).toHaveBeenCalledTimes(1);
    expect(authClient).toBe(client);
  });
});
