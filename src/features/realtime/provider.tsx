"use client";

import {
  type InboundMessage,
  Realtime,
  type RealtimeChannel,
  type RealtimeClient,
} from "ably";
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
import { formatListingPrice } from "@/features/listings/utils";
import {
  ABLY_LISTING_EVENT_NAME,
  ABLY_OUTBID_EVENT_NAME,
  type AuctionOutbidEvent,
  getListingChannelName,
  getUserChannelName,
  type ListingBidPlacedEvent,
} from "@/features/realtime/events";
import { getRealtimeConnectionMode } from "@/features/realtime/policy";

type RealtimeContextValue = {
  client: RealtimeClient | null;
};

type RealtimeProviderProps = {
  children: React.ReactNode;
  viewerId?: string | null;
  createClient?: () => RealtimeClient;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  client: null,
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
  const seenOutbidEventsRef = useRef(new Set<string>());

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

  const showOutbidToast = useEffectEvent((event: AuctionOutbidEvent) => {
    const dedupeKey = `${event.listingId}:${event.acceptedBidId}`;

    if (seenOutbidEventsRef.current.has(dedupeKey)) {
      return;
    }

    seenOutbidEventsRef.current.add(dedupeKey);

    toast.custom(
      () => (
        <div className="w-full max-w-sm rounded-3xl border border-border/70 bg-background/95 p-4 shadow-xl backdrop-blur">
          <p className="text-sm font-medium tracking-[0.18em] uppercase text-primary">
            You&apos;ve been outbid
          </p>
          <p className="mt-2 text-base font-semibold text-foreground">
            {event.listingTitle}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            New current bid {formatListingPrice(event.currentBidCents)} across{" "}
            {event.bidCount} bid{event.bidCount === 1 ? "" : "s"}.
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs tracking-[0.14em] uppercase text-muted-foreground">
              Next bid {formatListingPrice(event.minimumNextBidCents)}
            </span>
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
        id: dedupeKey,
      },
    );
  });

  useEffect(() => {
    if (!client || !viewerId) {
      return;
    }

    const channel: RealtimeChannel = client.channels.get(
      getUserChannelName(viewerId),
    );
    const listener = (message: InboundMessage) => {
      showOutbidToast(message.data as AuctionOutbidEvent);
    };

    void channel.subscribe(ABLY_OUTBID_EVENT_NAME, listener);

    return () => {
      channel.unsubscribe(ABLY_OUTBID_EVENT_NAME, listener);
    };
  }, [client, showOutbidToast, viewerId]);

  const value = useMemo(
    () => ({
      client,
    }),
    [client],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
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
