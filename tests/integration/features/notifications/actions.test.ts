// @vitest-environment node

import { randomUUID } from "node:crypto";
import { eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notification } from "@/db/schema";
import { insertUser } from "../../../factories/user";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../../helpers/database";

const hoisted = vi.hoisted(() => ({
  requireAuthenticatedSession: vi.fn(),
  db: null as TestDatabase["db"] | null,
}));

vi.mock("@/features/auth/session", () => ({
  requireAuthenticatedSession: hoisted.requireAuthenticatedSession,
}));

vi.mock("@/db/client", () => ({
  get db() {
    return hoisted.db;
  },
}));

describe("notification actions", () => {
  let testDatabase: TestDatabase;

  beforeEach(async () => {
    testDatabase = await createTestDatabase();
    hoisted.db = testDatabase.db;
    hoisted.requireAuthenticatedSession.mockReset();
  });

  afterEach(async () => {
    hoisted.db = null;
    await testDatabase.cleanup();
  });

  it("marks one unread notification as read for the current user", async () => {
    const user = await insertUser(testDatabase.db);
    const otherUser = await insertUser(testDatabase.db);
    const targetNotification = buildNotification({ userId: user.id });

    await testDatabase.db
      .insert(notification)
      .values([
        targetNotification,
        buildNotification({ userId: otherUser.id }),
      ]);
    hoisted.requireAuthenticatedSession.mockResolvedValue({
      user: { id: user.id },
      session: { id: "session-1" },
    });

    const { markNotificationReadAction } = await import(
      "@/features/notifications/actions"
    );

    await markNotificationReadAction(targetNotification.id);

    const [updatedNotification] = await testDatabase.db
      .select()
      .from(notification)
      .where(eq(notification.id, targetNotification.id));
    const unreadRows = await testDatabase.db
      .select()
      .from(notification)
      .where(isNull(notification.readAt));

    expect(updatedNotification?.readAt).not.toBeNull();
    expect(unreadRows).toHaveLength(1);
    expect(unreadRows[0]?.userId).toBe(otherUser.id);
  });

  it("marks all unread notifications as read for the current user", async () => {
    const user = await insertUser(testDatabase.db);
    const otherUser = await insertUser(testDatabase.db);

    await testDatabase.db.insert(notification).values([
      buildNotification({ userId: user.id, readAt: null }),
      buildNotification({ userId: user.id, readAt: null }),
      buildNotification({
        userId: user.id,
        readAt: new Date("2026-04-02T12:30:00.000Z"),
      }),
      buildNotification({ userId: otherUser.id, readAt: null }),
    ]);
    hoisted.requireAuthenticatedSession.mockResolvedValue({
      user: { id: user.id },
      session: { id: "session-1" },
    });

    const { markAllNotificationsReadAction } = await import(
      "@/features/notifications/actions"
    );

    await markAllNotificationsReadAction();

    const userNotifications = await testDatabase.db
      .select()
      .from(notification)
      .where(eq(notification.userId, user.id));
    const otherUserUnread = await testDatabase.db
      .select()
      .from(notification)
      .where(eq(notification.userId, otherUser.id));

    expect(userNotifications.every((row) => row.readAt !== null)).toBe(true);
    expect(otherUserUnread[0]?.readAt).toBeNull();
  });
});

function buildNotification(
  overrides: Partial<typeof notification.$inferInsert> & { userId: string },
): typeof notification.$inferInsert {
  return {
    id: overrides.id ?? randomUUID(),
    userId: overrides.userId,
    type: overrides.type ?? "outbid",
    dedupeKey: overrides.dedupeKey ?? randomUUID(),
    payload:
      overrides.payload ??
      JSON.stringify({
        listingId: "listing-1",
        listingTitle: "Collector Camera",
        acceptedBidId: "bid-1",
        currentBidCents: 50_000,
        minimumNextBidCents: 51_000,
        bidCount: 2,
      }),
    readAt: overrides.readAt ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-04-02T12:00:00.000Z"),
  };
}
