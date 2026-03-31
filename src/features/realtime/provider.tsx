"use client";

import {
  type InboundMessage,
  Realtime,
  type RealtimeChannel,
  type RealtimeClient,
} from "ably";
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
import {
  ABLY_LISTING_EVENT_NAME,
  getListingChannelName,
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
