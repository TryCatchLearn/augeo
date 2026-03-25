// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  toNextJsHandler: vi.fn(),
}));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: hoisted.toNextJsHandler,
}));

vi.mock("@/server/auth", () => ({
  auth: { kind: "auth" },
}));

describe("auth api route", () => {
  it("exports the handler methods returned by Better Auth", async () => {
    const handlers = {
      GET: vi.fn(),
      POST: vi.fn(),
      DELETE: vi.fn(),
      PATCH: vi.fn(),
      PUT: vi.fn(),
    };
    hoisted.toNextJsHandler.mockReturnValue(handlers);

    const route = await import("@/app/api/auth/[...all]/route");

    expect(hoisted.toNextJsHandler).toHaveBeenCalledWith({ kind: "auth" });
    expect(route.GET).toBe(handlers.GET);
    expect(route.POST).toBe(handlers.POST);
    expect(route.DELETE).toBe(handlers.DELETE);
    expect(route.PATCH).toBe(handlers.PATCH);
    expect(route.PUT).toBe(handlers.PUT);
  });
});
