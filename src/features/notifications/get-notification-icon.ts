import {
  BadgeDollarSign,
  CircleAlert,
  Gavel,
  type LucideIcon,
  Trophy,
} from "lucide-react";
import type { NotificationType } from "@/features/notifications/domain";

const notificationIcons: Record<NotificationType, LucideIcon> = {
  outbid: Gavel,
  auction_won: Trophy,
  item_sold: BadgeDollarSign,
  item_not_sold: CircleAlert,
};

export function getNotificationIcon(type: NotificationType) {
  return notificationIcons[type];
}
