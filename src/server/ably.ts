import { type CapabilityOp, Rest } from "ably";
import {
  ABLY_LISTING_EVENT_NAME,
  getListingChannelName,
  type ListingBidPlacedEvent,
} from "@/features/realtime/events";
import { getRequiredEnv } from "@/lib/env";

let ablyRestClient: Rest | null = null;

function getAblyRestClient() {
  if (ablyRestClient) {
    return ablyRestClient;
  }

  ablyRestClient = new Rest({
    key: getRequiredEnv("ABLY_API_KEY"),
  });

  return ablyRestClient;
}

export function getAblyTokenCapability(userId?: string | null) {
  const subscribeCapability: CapabilityOp[] = ["subscribe"];

  if (userId) {
    return {
      "listing:*": subscribeCapability,
      [`user:${userId}`]: subscribeCapability,
    };
  }

  return {
    "listing:*": subscribeCapability,
  };
}

export async function createAblyTokenRequest(userId?: string | null) {
  const ably = getAblyRestClient();

  return ably.auth.createTokenRequest({
    capability: getAblyTokenCapability(userId),
  });
}

export async function publishListingBidPlaced(payload: ListingBidPlacedEvent) {
  const ably = getAblyRestClient();
  const channel = ably.channels.get(getListingChannelName(payload.listingId));

  await channel.publish(ABLY_LISTING_EVENT_NAME, payload);
}
