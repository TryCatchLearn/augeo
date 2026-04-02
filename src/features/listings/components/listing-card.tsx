"use client";

import { Clock3, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { ListingCardLiveStats } from "@/features/listings/components/listing-card-live-stats";
import { ListingCountdown } from "@/features/listings/components/listing-countdown";
import type { ListingCardData } from "@/features/listings/queries";
import {
  type CountdownUrgencyTier,
  getListingEndStateCopy,
} from "@/features/listings/utils";
import { useListingLifecycleChangedSubscription } from "@/features/realtime/provider";
import { cn } from "@/lib/utils";

type ListingCardProps = {
  listing: ListingCardData;
  viewerId?: string | null;
};

const countdownToneClasses: Record<CountdownUrgencyTier, string> = {
  neutral:
    "border-border/70 bg-background/55 text-muted-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-border)_50%,transparent)]",
  warning:
    "border-accent/30 bg-accent/12 text-accent shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-accent)_26%,transparent)]",
  urgent:
    "border-primary/30 bg-primary/12 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_24%,transparent)]",
  critical:
    "border-destructive/28 bg-destructive/10 text-destructive shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-destructive)_24%,transparent)]",
  ended:
    "border-border/70 bg-muted/50 text-muted-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-border)_50%,transparent)]",
};

export function ListingCard({
  listing: initialListing,
  viewerId,
}: ListingCardProps) {
  const router = useRouter();
  const [listing, setListing] = useState(initialListing);
  const [isLocallyFinalizing, setIsLocallyFinalizing] = useState(false);
  const refreshAttemptedRef = useRef(false);
  const isSeller = viewerId === listing.sellerId;
  const endedCopy = getListingEndStateCopy({
    outcome: listing.outcome,
    bidCount: listing.bidCount,
    isSeller,
    isFinalizing: isLocallyFinalizing,
  });

  useEffect(() => {
    setListing(initialListing);

    if (initialListing.status !== "active") {
      setIsLocallyFinalizing(false);
    }

    if (initialListing.status === "ended") {
      refreshAttemptedRef.current = false;
    }
  }, [initialListing]);

  useListingLifecycleChangedSubscription(listing.id, (event) => {
    setListing((currentListing) => ({
      ...currentListing,
      status: event.status,
      outcome: event.outcome,
      currentPriceCents:
        event.currentBidCents ?? currentListing.currentPriceCents,
      bidCount: event.bidCount,
    }));

    if (event.status === "ended") {
      setIsLocallyFinalizing(false);
      refreshAttemptedRef.current = false;
    }
  });

  const handleCountdownEnd = () => {
    if (listing.status !== "active") {
      return;
    }

    setIsLocallyFinalizing(true);

    if (refreshAttemptedRef.current) {
      return;
    }

    refreshAttemptedRef.current = true;
    router.refresh();
  };

  const statusBadge = isLocallyFinalizing ? (
    <StatusBadge
      tone="ended"
      className="absolute left-4 top-4 border border-white/10 shadow-lg"
    >
      Finalizing
    </StatusBadge>
  ) : (
    <StatusBadge
      status={listing.status}
      className="absolute left-4 top-4 border border-white/10 shadow-lg"
    />
  );

  return (
    <Link
      href={`/listings/${listing.id}`}
      aria-label={listing.title}
      className="group block focus-visible:outline-none"
    >
      <Card className="overflow-hidden rounded-3xl border border-border/90 py-0 transition-transform duration-250 ease-out group-hover:-translate-y-1 group-hover:border-primary/35 group-hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_18%,transparent),0_24px_70px_rgba(0,0,0,0.34)] group-focus-visible:-translate-y-1 group-focus-visible:border-primary/35 group-focus-visible:shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_18%,transparent),0_24px_70px_rgba(0,0,0,0.34)]">
        <div className="relative aspect-4/3 overflow-hidden bg-muted">
          {listing.imageUrl ? (
            <Image
              src={listing.imageUrl}
              alt={listing.title}
              fill
              sizes="(min-width: 1280px) 23rem, (min-width: 768px) calc((100vw - 5.5rem) / 2), calc(100vw - 3rem)"
              className="size-full object-cover transition-transform duration-400 ease-out group-hover:scale-[1.04] group-focus-visible:scale-[1.04]"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-muted/80 text-sm text-muted-foreground">
              Image coming soon
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,20,0.04),transparent_38%,rgba(5,10,20,0.42))]" />
          {statusBadge}
        </div>

        <CardContent className="space-y-4 px-6 py-5">
          <h2 className="overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold tracking-tight transition-colors group-hover:text-primary group-focus-visible:text-primary">
            {listing.title}
          </h2>

          <ListingCardLiveStats
            listingId={listing.id}
            currentPriceCents={listing.currentPriceCents}
            bidCount={listing.bidCount}
          />

          <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-3 text-sm text-muted-foreground">
            <p className="flex min-w-0 items-center gap-2">
              <UserRound className="size-4 shrink-0 text-primary/80" />
              <span className="truncate">{listing.sellerName}</span>
            </p>
            {listing.status === "ended" || isLocallyFinalizing ? (
              <div className="max-w-52 rounded-2xl border border-border/70 bg-muted/35 px-3 py-2 text-right">
                <p className="text-[0.65rem] font-semibold tracking-[0.18em] uppercase text-primary/85">
                  {endedCopy.eyebrow}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {endedCopy.title}
                </p>
              </div>
            ) : (
              <ListingCountdown
                key={listing.endsAt.toISOString()}
                targetAt={listing.endsAt}
                onEnd={handleCountdownEnd}
              >
                {({ formatted, urgency }) => (
                  <p
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2",
                      countdownToneClasses[urgency],
                    )}
                  >
                    <Clock3 className="size-4" />
                    <span>{formatted}</span>
                  </p>
                )}
              </ListingCountdown>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
