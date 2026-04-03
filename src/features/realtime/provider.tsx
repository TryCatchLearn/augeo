"use client";

import {
  type InboundMessage,
  Realtime,
  type RealtimeChannel,
  type RealtimeClient,
} from "ably";
import { BadgeDollarSign, CircleAlert, Gavel, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { getNotificationIconName } from "@/features/notifications/domain";
import {
  ABLY_LISTING_EVENT_NAME,
  ABLY_LISTING_LIFECYCLE_EVENT_NAME,
  ABLY_NOTIFICATION_CREATED_EVENT_NAME,
  getListingChannelName,
  getUserChannelName,
  type ListingBidPlacedEvent,
  type ListingLifecycleChangedEvent,
  type NotificationCreatedEvent,
} from "@/features/realtime/events";
import { getRealtimeConnectionMode } from "@/features/realtime/policy";

type RealtimeContextValue = {
  client: RealtimeClient | null;
  viewerId: string | null;
};

type RealtimeProviderProps = {
  children: React.ReactNode;
  viewerId?: string | null;
  createClient?: () => RealtimeClient;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  client: null,
  viewerId: null,
});

function createAblyRealtimeClient() {
  return new Realtime({
    authUrl: "/api/ably/token",
    authMethod: "GET",
    closeOnUnload: true,
    transports: ["web_socket"],
  });
}

export function RealtimeProvider({
  children,
  viewerId,
  createClient = createAblyRealtimeClient,
}: RealtimeProviderProps) {
  const pathname = usePathname();
  const [client, setClient] = useState<RealtimeClient | null>(null);
  const clientRef = useRef<RealtimeClient | null>(null);
  const modeRef = useRef<ReturnType<typeof getRealtimeConnectionMode>>("none");
  const seenNotificationEventsRef = useRef(new Set<string>());

  useEffect(() => {
    const nextMode = getRealtimeConnectionMode({
      pathname,
      viewerId,
    });

    if (nextMode === "none") {
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
        setClient(null);
      }

      modeRef.current = nextMode;
      return;
    }

    if (clientRef.current && modeRef.current === nextMode) {
      return;
    }

    if (clientRef.current) {
      clientRef.current.close();
    }

    const nextClient = createClient();

    clientRef.current = nextClient;
    modeRef.current = nextMode;
    setClient(nextClient);
  }, [createClient, pathname, viewerId]);

  useEffect(() => {
    return () => {
      if (!clientRef.current) {
        return;
      }

      clientRef.current.close();
      clientRef.current = null;
    };
  }, []);

  const showNotificationToast = useEffectEvent(
    (event: NotificationCreatedEvent) => {
      if (seenNotificationEventsRef.current.has(event.notificationId)) {
        return;
      }

      seenNotificationEventsRef.current.add(event.notificationId);

      const Icon = getNotificationIcon(event.type);

      toast.custom(
        () => (
          <div className="w-full max-w-sm rounded-3xl border border-border/70 bg-background/95 p-4 shadow-xl backdrop-blur">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium tracking-[0.18em] uppercase text-primary">
                  {event.title}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {event.message}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              <Link
                href={event.listingUrl}
                className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15"
              >
                View listing
              </Link>
            </div>
          </div>
        ),
        {
          id: event.notificationId,
        },
      );
    },
  );

  useEffect(() => {
    if (!client || !viewerId) {
      return;
    }

    const channel: RealtimeChannel = client.channels.get(
      getUserChannelName(viewerId),
    );
    const listener = (message: InboundMessage) => {
      showNotificationToast(message.data as NotificationCreatedEvent);
    };

    void channel.subscribe(ABLY_NOTIFICATION_CREATED_EVENT_NAME, listener);

    return () => {
      channel.unsubscribe(ABLY_NOTIFICATION_CREATED_EVENT_NAME, listener);
    };
  }, [client, showNotificationToast, viewerId]);

  const value = useMemo(
    () => ({
      client,
      viewerId: viewerId ?? null,
    }),
    [client, viewerId],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

function getNotificationIcon(type: NotificationCreatedEvent["type"]) {
  switch (getNotificationIconName(type)) {
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

export function useRealtime() {
  return useContext(RealtimeContext);
}

function useRealtimeEventSubscription<TEvent>(
  channelName: string,
  eventName: string,
  onEvent: (event: TEvent) => void,
) {
  const { client } = useRealtime();
  const handleEvent = useEffectEvent(onEvent);

  useEffect(() => {
    if (!client) {
      return;
    }

    const channel: RealtimeChannel = client.channels.get(channelName);
    const listener = (message: InboundMessage) => {
      handleEvent(message.data as TEvent);
    };

    void channel.subscribe(eventName, listener);

    return () => {
      channel.unsubscribe(eventName, listener);
    };
  }, [channelName, client, eventName, handleEvent]);
}

export function useListingBidPlacedSubscription(
  listingId: string,
  onEvent: (event: ListingBidPlacedEvent) => void,
) {
  useRealtimeEventSubscription<ListingBidPlacedEvent>(
    getListingChannelName(listingId),
    ABLY_LISTING_EVENT_NAME,
    onEvent,
  );
}

export function useListingLifecycleChangedSubscription(
  listingId: string,
  onEvent: (event: ListingLifecycleChangedEvent) => void,
) {
  useRealtimeEventSubscription<ListingLifecycleChangedEvent>(
    getListingChannelName(listingId),
    ABLY_LISTING_LIFECYCLE_EVENT_NAME,
    onEvent,
  );
}

export function useUserNotificationCreatedSubscription(
  onEvent: (event: NotificationCreatedEvent) => void,
) {
  const { client, viewerId } = useRealtime();
  const handleEvent = useEffectEvent(onEvent);

  useEffect(() => {
    if (!client || !viewerId) {
      return;
    }

    const channel: RealtimeChannel = client.channels.get(
      getUserChannelName(viewerId),
    );
    const listener = (message: InboundMessage) => {
      handleEvent(message.data as NotificationCreatedEvent);
    };

    void channel.subscribe(ABLY_NOTIFICATION_CREATED_EVENT_NAME, listener);

    return () => {
      channel.unsubscribe(ABLY_NOTIFICATION_CREATED_EVENT_NAME, listener);
    };
  }, [client, handleEvent, viewerId]);
}
