import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "@/db/schema";
import { notification } from "@/db/schema";
import {
  type NotificationRecord,
  parseNotificationPayload,
} from "@/features/notifications/domain";
import {
  type NotificationListItem,
  toNotificationListItem,
} from "@/features/notifications/list-item";

type Database = LibSQLDatabase<typeof schema>;

export async function listRecentNotifications(
  userId: string,
  database: Database,
) {
  const rows = await database
    .select({
      id: notification.id,
      type: notification.type,
      payload: notification.payload,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    })
    .from(notification)
    .where(eq(notification.userId, userId))
    .orderBy(desc(notification.createdAt))
    .limit(10);

  return rows.map((row) => {
    const record = {
      id: row.id,
      type: row.type,
      payload: parseNotificationPayload(row.type, row.payload),
      createdAt: row.createdAt,
      readAt: row.readAt,
    } satisfies NotificationRecord;

    return toNotificationListItem(record) satisfies NotificationListItem;
  });
}

export async function getUnreadNotificationCount(
  userId: string,
  database: Database,
) {
  const [result] = await database
    .select({
      count: sql<number>`count(*)`,
    })
    .from(notification)
    .where(and(eq(notification.userId, userId), isNull(notification.readAt)));

  return result?.count ?? 0;
}
