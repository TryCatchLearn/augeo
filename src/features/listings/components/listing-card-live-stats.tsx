"use client";

import { BadgeDollarSign, Gavel } from "lucide-react";
import { useEffect, useState } from "react";
import { formatListingPrice } from "@/features/listings/utils";
import { useListingBidPlacedSubscription } from "@/features/realtime/provider";

type ListingCardLiveStatsProps = {
  listingId: string;
  currentPriceCents: number;
  bidCount: number;
};

export function ListingCardLiveStats({
  listingId,
  currentPriceCents,
  bidCount,
}: ListingCardLiveStatsProps) {
  const [liveStats, setLiveStats] = useState({
    currentPriceCents,
    bidCount,
  });

  useEffect(() => {
    setLiveStats({
      currentPriceCents,
      bidCount,
    });
  }, [bidCount, currentPriceCents]);

  useListingBidPlacedSubscription(listingId, (event) => {
    setLiveStats({
      currentPriceCents: event.currentBidCents,
      bidCount: event.bidCount,
    });
  });

  return (
    <dl className="grid grid-cols-2 gap-3 text-sm">
      <div className="rounded-2xl border border-border/70 bg-background/55 px-3 py-2.5">
        <dt className="sr-only">Current price</dt>
        <dd className="flex items-center gap-2 font-semibold">
          <BadgeDollarSign className="size-4 text-primary/90" />
          <span>{formatListingPrice(liveStats.currentPriceCents)}</span>
        </dd>
      </div>
      <div className="rounded-2xl border border-border/70 bg-background/55 px-3 py-2.5">
        <dt className="sr-only">Bid count</dt>
        <dd className="flex items-center gap-2 font-semibold">
          <Gavel className="size-4 text-primary/90" />
          <span>{liveStats.bidCount}</span>
        </dd>
      </div>
    </dl>
  );
}
