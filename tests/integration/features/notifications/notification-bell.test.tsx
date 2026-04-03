import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import type { NotificationListItem } from "@/features/notifications/queries";

const hoisted = vi.hoisted(() => ({
  push: vi.fn(),
  subscription: null as ((event: Record<string, unknown>) => void) | null,
}));

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    useRouter: () => ({
      push: hoisted.push,
    }),
  };
});

vi.mock("@/features/realtime/provider", () => ({
  useUserNotificationCreatedSubscription: (
    callback: (event: Record<string, unknown>) => void,
  ) => {
    hoisted.subscription = callback;
  },
}));

describe("NotificationBell", () => {
  beforeEach(() => {
    hoisted.push.mockReset();
    hoisted.subscription = null;
  });

  it("caps the unread badge at 9+", () => {
    render(
      <NotificationBell
        initialUnreadCount={12}
        initialNotifications={buildNotifications(2)}
        markNotificationReadAction={vi.fn()}
        markAllNotificationsReadAction={vi.fn()}
      />,
    );

    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("renders the popover content and marks all notifications as read", async () => {
    const markAllNotificationsReadAction = vi.fn().mockResolvedValue({
      readAt: "2026-04-02T12:15:00.000Z",
    });

    render(
      <NotificationBell
        initialUnreadCount={2}
        initialNotifications={buildNotifications(2)}
        markNotificationReadAction={vi.fn()}
        markAllNotificationsReadAction={markAllNotificationsReadAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open notifications" }));

    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Listing update 0")).toBeInTheDocument();
    expect(screen.getByText("Listing update 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));

    await waitFor(() => {
      expect(markAllNotificationsReadAction).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  it("marks a row as read, closes the popover, and navigates", async () => {
    const markNotificationReadAction = vi.fn().mockResolvedValue({
      notificationId: "notification-0",
      readAt: "2026-04-02T12:10:00.000Z",
    });

    render(
      <NotificationBell
        initialUnreadCount={1}
        initialNotifications={buildNotifications(1)}
        markNotificationReadAction={markNotificationReadAction}
        markAllNotificationsReadAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open notifications" }));
    fireEvent.click(screen.getByRole("button", { name: "Listing update 0" }));

    await waitFor(() => {
      expect(markNotificationReadAction).toHaveBeenCalledWith("notification-0");
    });
    expect(hoisted.push).toHaveBeenCalledWith("/listings/listing-0");
  });

  it("prepends live notifications, increments the badge, and trims to 10 rows", async () => {
    render(
      <NotificationBell
        initialUnreadCount={0}
        initialNotifications={buildNotifications(10)}
        markNotificationReadAction={vi.fn()}
        markAllNotificationsReadAction={vi.fn()}
      />,
    );

    await act(async () => {
      hoisted.subscription?.({
        notificationId: "notification-live",
        type: "auction_won",
        listingId: "listing-live",
        listingUrl: "/listings/listing-live",
        title: "Live winner update",
        message: "You won a live auction.",
        createdAt: "2026-04-02T13:00:00.000Z",
        readAt: null,
        outcome: "sold",
      });
    });

    expect(screen.getByText("1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open notifications" }));
    expect(screen.getByText("Live winner update")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Listing update 9" }),
    ).not.toBeInTheDocument();
  });
});

function buildNotifications(count: number): NotificationListItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `notification-${index}`,
    type: "outbid",
    title: `Listing update ${index}`,
    message: `Message ${index}`,
    listingId: `listing-${index}`,
    listingUrl: `/listings/listing-${index}`,
    createdAt: new Date(`2026-04-02T12:0${Math.min(index, 9)}:00.000Z`),
    readAt: null,
    isRead: false,
  }));
}
