import { format } from "date-fns";
import type { ListingOutcome } from "@/features/listings/domain";

export const countdownUrgencyTiers = [
  "neutral",
  "warning",
  "urgent",
  "critical",
  "ended",
] as const;

export type CountdownUrgencyTier = (typeof countdownUrgencyTiers)[number];

type ListingEndStateCopy = {
  eyebrow: string;
  title: string;
  description: string;
};

export function dollarsToCents(value: number) {
  return Math.round(value * 100);
}

export function centsToDollars(value: number) {
  return value / 100;
}

export function localDateTimeToIsoString(value: string) {
  return new Date(value).toISOString();
}

export function formatDateTimeLocalInput(value: Date | null) {
  if (!value) {
    return "";
  }

  return format(value, "yyyy-MM-dd'T'HH:mm");
}

export function formatListingPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatBidTimestamp(value: Date) {
  return format(value, "MMM d, h:mm a");
}

export function formatTimeRemaining(endsAt: Date, now = new Date()) {
  const diffMs = endsAt.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Ended";
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s left`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s left`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s left`;
  }

  return `${Math.max(seconds, 1)}s left`;
}

export function getCountdownUrgencyTier(targetAt: Date, now = new Date()) {
  const diffMs = targetAt.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "ended";
  }

  if (diffMs <= 1000 * 60 * 5) {
    return "critical";
  }

  if (diffMs <= 1000 * 60 * 60) {
    return "urgent";
  }

  if (diffMs <= 1000 * 60 * 60 * 24) {
    return "warning";
  }

  return "neutral";
}

export function getListingEndStateCopy(input: {
  outcome: ListingOutcome | null;
  bidCount: number;
  isSeller: boolean;
  isWinner?: boolean;
  isFinalizing?: boolean;
}): ListingEndStateCopy {
  if (input.isFinalizing) {
    return {
      eyebrow: "Finalizing",
      title: "Auction closing now",
      description:
        "Bidding is locked while the final result is confirmed on the server.",
    };
  }

  if (input.outcome === "sold") {
    if (input.isWinner) {
      return {
        eyebrow: "Auction Won",
        title: "You won this lot",
        description:
          "The auction has ended and the winning bid is now locked in.",
      };
    }

    return {
      eyebrow: input.isSeller ? "Item Sold" : "Auction Ended",
      title: input.isSeller ? "Your item sold" : "Winning bid confirmed",
      description: input.isSeller
        ? "The auction closed successfully with a confirmed winning bidder."
        : "This lot closed with a confirmed winning bid.",
    };
  }

  if (input.outcome === "reserve_not_met" && input.isSeller) {
    return {
      eyebrow: "Reserve Not Met",
      title: "The reserve was not met",
      description:
        "Bidding ended below your reserve price, so the lot did not sell.",
    };
  }

  if (input.bidCount === 0) {
    return {
      eyebrow: "Auction Ended",
      title: "Ended without bids",
      description: "This listing closed without receiving any bids.",
    };
  }

  return {
    eyebrow: "Auction Ended",
    title: "This lot did not sell",
    description:
      "Bidding has closed and the listing ended without a completed sale.",
  };
}
