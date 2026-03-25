// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  drizzleAdapter: vi.fn(),
  betterAuth: vi.fn(),
  nextCookies: vi.fn(),
  getRequiredEnv: vi.fn(),
}));

vi.mock("@better-auth/drizzle-adapter", () => ({
  drizzleAdapter: hoisted.drizzleAdapter,
}));

vi.mock("better-auth", () => ({
  betterAuth: hoisted.betterAuth,
}));

vi.mock("better-auth/next-js", () => ({
  nextCookies: hoisted.nextCookies,
}));

vi.mock("@/db/client", () => ({
  db: { kind: "db" },
}));

vi.mock("@/db/schema", () => ({
  user: { name: "user" },
}));

vi.mock("@/lib/env", () => ({
  getRequiredEnv: hoisted.getRequiredEnv,
}));

describe("server auth configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    hoisted.drizzleAdapter.mockReset();
    hoisted.betterAuth.mockReset();
    hoisted.nextCookies.mockReset();
    hoisted.getRequiredEnv.mockReset();
  });

  it("configures Better Auth with the drizzle adapter, env values, and next cookies", async () => {
    hoisted.getRequiredEnv.mockImplementation(
      (name: string) => `${name}-value`,
    );
    hoisted.drizzleAdapter.mockReturnValue({ kind: "adapter" });
    hoisted.nextCookies.mockReturnValue({ kind: "next-cookies" });
    hoisted.betterAuth.mockReturnValue({ kind: "auth" });

    const { auth } = await import("@/server/auth");

    expect(hoisted.drizzleAdapter).toHaveBeenCalledWith(
      { kind: "db" },
      {
        provider: "sqlite",
        schema: { user: { name: "user" } },
      },
    );
    expect(hoisted.betterAuth).toHaveBeenCalledWith({
      secret: "BETTER_AUTH_SECRET-value",
      baseURL: "BETTER_AUTH_URL-value",
      database: { kind: "adapter" },
      emailAndPassword: {
        enabled: true,
        autoSignIn: true,
      },
      plugins: [{ kind: "next-cookies" }],
    });
    expect(auth).toEqual({ kind: "auth" });
  });
});
