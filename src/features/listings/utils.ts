import type { ListingStatus } from "@/features/listings/domain";

export function dollarsToCents(value: number) {
  return Math.round(value * 100);
}

export function localDateTimeToIsoString(value: string) {
  return new Date(value).toISOString();
}

export function formatDateTimeLocalInput(value: Date | null) {
  if (!value) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function formatListingPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatTimeRemaining(endsAt: Date, now = new Date()) {
  const diffMs = endsAt.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Ended";
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  return `${Math.max(minutes, 1)}m left`;
}

export function getListingTimeMeta(
  status: ListingStatus,
  endsAt: Date,
  startsAt?: Date | null,
  now = new Date(),
) {
  if (status === "scheduled" && startsAt) {
    return {
      label: "Starts In",
      value: formatTimeRemaining(startsAt, now),
    };
  }

  return {
    label: status === "ended" ? "Auction Ended" : "Time Remaining",
    value: formatTimeRemaining(endsAt, now),
  };
}
