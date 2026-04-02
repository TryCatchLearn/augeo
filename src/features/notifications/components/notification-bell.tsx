"use client";

import {
  BadgeDollarSign,
  Bell,
  CircleAlert,
  Gavel,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { NotificationListItem } from "@/features/notifications/queries";
import type { NotificationCreatedEvent } from "@/features/realtime/events";
import { useUserNotificationCreatedSubscription } from "@/features/realtime/provider";
import { cn } from "@/lib/utils";

type NotificationBellProps = {
  initialUnreadCount: number;
  initialNotifications: NotificationListItem[];
  markNotificationReadAction: (
    notificationId: string,
  ) => Promise<{ notificationId: string; readAt: string }>;
  markAllNotificationsReadAction: () => Promise<{ readAt: string }>;
};

type NotificationInboxItem = NotificationListItem & {
  icon: NotificationCreatedEvent["icon"];
};

export function NotificationBell({
  initialUnreadCount,
  initialNotifications,
  markNotificationReadAction,
  markAllNotificationsReadAction,
}: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState(() =>
    initialNotifications.map(toInboxItem),
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useUserNotificationCreatedSubscription((event) => {
    setNotifications((currentNotifications) => {
      if (
        currentNotifications.some(
          (notification) => notification.id === event.notificationId,
        )
      ) {
        return currentNotifications;
      }

      const nextNotifications = [
        {
          id: event.notificationId,
          type: event.type,
          icon: event.icon,
          title: event.title,
          message: event.message,
          listingId: event.listingId,
          listingUrl: event.listingUrl,
          createdAt: new Date(event.createdAt),
          readAt: event.readAt ? new Date(event.readAt) : null,
          isRead: event.readAt !== null,
        } satisfies NotificationInboxItem,
        ...currentNotifications,
      ];

      return nextNotifications.slice(0, 10);
    });

    if (event.readAt === null) {
      setUnreadCount((currentUnreadCount) => currentUnreadCount + 1);
    }
  });

  const badgeText = useMemo(() => {
    if (unreadCount <= 0) {
      return null;
    }

    return unreadCount > 9 ? "9+" : String(unreadCount);
  }, [unreadCount]);

  const handleNotificationClick = (notification: NotificationInboxItem) => {
    startTransition(async () => {
      try {
        const result = await markNotificationReadAction(notification.id);
        const readAt = new Date(result.readAt);

        setNotifications((currentNotifications) =>
          currentNotifications.map((currentNotification) =>
            currentNotification.id === notification.id
              ? {
                  ...currentNotification,
                  readAt,
                  isRead: true,
                }
              : currentNotification,
          ),
        );
        setUnreadCount((currentUnreadCount) =>
          notification.isRead
            ? currentUnreadCount
            : Math.max(0, currentUnreadCount - 1),
        );
        setOpen(false);
        router.push(notification.listingUrl);
      } catch {
        toast.error("We couldn't mark that notification as read.");
      }
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      try {
        const result = await markAllNotificationsReadAction();
        const readAt = new Date(result.readAt);

        setNotifications((currentNotifications) =>
          currentNotifications.map((notification) => ({
            ...notification,
            readAt,
            isRead: true,
          })),
        );
        setUnreadCount(0);
      } catch {
        toast.error("We couldn't mark all notifications as read.");
      }
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Open notifications"
        className={cn(
          "relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-border/90 bg-background/55 text-muted-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-accent)_10%,transparent),inset_0_1px_0_color-mix(in_oklab,white_6%,transparent)] backdrop-blur-sm transition-all outline-none hover:border-primary/35 hover:bg-muted/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:border-primary/35 data-popup-open:bg-muted data-popup-open:text-foreground",
        )}
      >
        <Bell aria-hidden="true" className="size-4" />
        {badgeText ? (
          <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full border border-background bg-primary px-1.5 py-0.5 text-[0.65rem] font-semibold leading-none text-primary-foreground">
            {badgeText}
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent className="w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden p-0">
        <div className="border-b border-border/70 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-primary">
                Notifications
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Recent auction updates for your account.
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              disabled={unreadCount === 0 || isPending}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-foreground">
              No notifications yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Auction updates will appear here as bidding and closing events
              happen.
            </p>
          </div>
        ) : (
          <div className="max-h-112 overflow-y-auto p-2">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.icon);

              return (
                <button
                  key={notification.id}
                  type="button"
                  aria-label={notification.title}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors outline-none hover:bg-accent/55 focus-visible:bg-accent/55",
                    notification.isRead
                      ? "opacity-80"
                      : "bg-primary/6 ring-1 ring-primary/12",
                  )}
                  onClick={() => handleNotificationClick(notification)}
                  disabled={isPending}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border",
                      notification.isRead
                        ? "border-border/70 bg-muted/60 text-muted-foreground"
                        : "border-primary/20 bg-primary/10 text-primary",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        {notification.title}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeTime(notification.createdAt, now)}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {notification.message}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function toInboxItem(
  notification: NotificationListItem,
): NotificationInboxItem {
  return {
    ...notification,
    icon: getNotificationIconName(notification.type),
  };
}

function getNotificationIconName(type: NotificationListItem["type"]) {
  switch (type) {
    case "outbid":
      return "gavel";
    case "auction_won":
      return "trophy";
    case "item_sold":
      return "badge-dollar-sign";
    case "item_not_sold":
      return "circle-alert";
  }
}

function getNotificationIcon(icon: NotificationCreatedEvent["icon"]) {
  switch (icon) {
    case "gavel":
      return Gavel;
    case "trophy":
      return Trophy;
    case "badge-dollar-sign":
      return BadgeDollarSign;
    case "circle-alert":
      return CircleAlert;
  }
}

function formatRelativeTime(date: Date, now: number) {
  const deltaSeconds = Math.round((date.getTime() - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
  });
  const absoluteSeconds = Math.abs(deltaSeconds);

  if (absoluteSeconds < 60) {
    return formatter.format(deltaSeconds, "second");
  }

  const deltaMinutes = Math.round(deltaSeconds / 60);

  if (Math.abs(deltaMinutes) < 60) {
    return formatter.format(deltaMinutes, "minute");
  }

  const deltaHours = Math.round(deltaMinutes / 60);

  if (Math.abs(deltaHours) < 24) {
    return formatter.format(deltaHours, "hour");
  }

  const deltaDays = Math.round(deltaHours / 24);

  return formatter.format(deltaDays, "day");
}
