import { randomUUID } from "node:crypto";
import type { AppSession } from "@/features/auth/session";

export function createMockSession(overrides?: Partial<AppSession>): AppSession {
  const now = new Date("2026-03-21T00:00:00.000Z");

  return {
    session: {
      id: randomUUID(),
      token: `token-${randomUUID()}`,
      userId: "user-test-id",
      expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
      createdAt: now,
      updatedAt: now,
      ...overrides?.session,
    },
    user: {
      id: "user-test-id",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      image: null,
      ...overrides?.user,
    },
  };
}
