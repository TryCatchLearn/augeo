import type { NotificationRecord } from "@/features/notifications/domain";
import { getNotificationPresentation } from "@/features/notifications/domain";
import type { NotificationCreatedEvent } from "@/features/realtime/events";

export type NotificationListItem = {
  id: string;
  type: NotificationRecord["type"];
  title: string;
  message: string;
  listingId: string;
  listingUrl: string;
  createdAt: Date;
  readAt: Date | null;
};

export function toNotificationListItem(
  record: NotificationRecord,
): NotificationListItem {
  const presentation = getNotificationPresentation(record);

  return {
    id: record.id,
    type: record.type,
    title: presentation.title,
    message: presentation.message,
    listingId: presentation.listingId,
    listingUrl: presentation.listingUrl,
    createdAt: record.createdAt,
    readAt: record.readAt,
  };
}

export function toNotificationListItemFromEvent(
  event: NotificationCreatedEvent,
): NotificationListItem {
  return {
    id: event.notificationId,
    type: event.type,
    title: event.title,
    message: event.message,
    listingId: event.listingId,
    listingUrl: event.listingUrl,
    createdAt: new Date(event.createdAt),
    readAt: event.readAt ? new Date(event.readAt) : null,
  };
}
