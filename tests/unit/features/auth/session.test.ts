// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSession } from "../../../helpers/auth/session";

const mockGetSession = vi.fn();
const mockRedirect = vi.fn();
const mockHeaders = vi.fn();

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/server/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

describe("session helpers", () => {
  beforeEach(() => {
    mockHeaders.mockResolvedValue(new Headers([["cookie", "session=value"]]));
  });

  it("fetches the current session from BetterAuth using request headers", async () => {
    const session = createMockSession();

    mockGetSession.mockResolvedValue(session);

    const { getSession } = await import("@/features/auth/session");

    await expect(getSession()).resolves.toEqual(session);
    expect(mockGetSession).toHaveBeenCalledWith({
      headers: expect.any(Headers),
    });
  });

  it("redirects anonymous users to login with the next path", async () => {
    mockGetSession.mockResolvedValue(null);

    const { requireSession } = await import("@/features/auth/session");

    await requireSession("/sell");

    expect(mockRedirect).toHaveBeenCalledWith("/login?next=%2Fsell");
  });

  it("throws for unauthenticated server actions", async () => {
    mockGetSession.mockResolvedValue(null);

    const { requireAuthenticatedSession } = await import(
      "@/features/auth/session"
    );

    await expect(requireAuthenticatedSession()).rejects.toThrow("Unauthorized");
  });
});
