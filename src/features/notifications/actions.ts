"use server";

import { db } from "@/db/client";
import { requireAuthenticatedSession } from "@/features/auth/session";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/mutations";

export async function markNotificationReadAction(notificationId: string) {
  const session = await requireAuthenticatedSession();
  const readAt = new Date();

  await markNotificationRead(notificationId, session.user.id, db);

  return {
    notificationId,
    readAt: readAt.toISOString(),
  };
}

export async function markAllNotificationsReadAction() {
  const session = await requireAuthenticatedSession();
  const readAt = new Date();

  await markAllNotificationsRead(session.user.id, db);

  return {
    readAt: readAt.toISOString(),
  };
}
