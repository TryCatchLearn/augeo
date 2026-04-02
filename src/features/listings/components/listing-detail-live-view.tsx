"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListingAuctionActivityPanel } from "@/features/listings/components/listing-auction-activity-panel";
import { ListingBidForm } from "@/features/listings/components/listing-bid-form";
import { ListingBidHistory } from "@/features/listings/components/listing-bid-history";
import { ListingCountdown } from "@/features/listings/components/listing-countdown";
import { ListingImageGallery } from "@/features/listings/components/listing-image-gallery";
import { ListingImageUploadPanel } from "@/features/listings/components/listing-image-upload-panel";
import { ListingSellerControls } from "@/features/listings/components/listing-seller-controls";
import {
  canPlaceBid,
  getMinimumNextBidCents,
  getViewerBidStatus,
  type ViewerBidStatus,
} from "@/features/listings/domain";
import type {
  BidHistoryRow,
  ListingDetailData,
} from "@/features/listings/queries";
import {
  type CountdownUrgencyTier,
  formatListingPrice,
  getListingEndStateCopy,
} from "@/features/listings/utils";
import {
  useListingBidPlacedSubscription,
  useListingLifecycleChangedSubscription,
} from "@/features/realtime/provider";
import { cn } from "@/lib/utils";

type ListingDetailLiveViewProps = {
  initialListing: ListingDetailData;
  viewerId?: string | null;
};

function hasViewerBid(
  bidHistory: BidHistoryRow[],
  viewerId?: string | null,
  viewerBidStatus?: ViewerBidStatus,
) {
  if (!viewerId) {
    return false;
  }

  if (viewerBidStatus && viewerBidStatus !== "none") {
    return true;
  }

  return bidHistory.some((bid) => bid.bidderId === viewerId);
}

export function ListingDetailLiveView({
  initialListing,
  viewerId,
}: ListingDetailLiveViewProps) {
  const router = useRouter();
  const [listing, setListing] = useState(initialListing);
  const [isLocallyFinalizing, setIsLocallyFinalizing] = useState(false);
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);

  useEffect(() => {
    setListing(initialListing);

    if (initialListing.status !== "active") {
      setIsLocallyFinalizing(false);
    }

    if (initialListing.status === "ended") {
      setHasAttemptedRefresh(false);
    }
  }, [initialListing]);

  useListingBidPlacedSubscription(initialListing.id, (event) => {
    setListing((currentListing) => {
      const nextBidHistory = [
        {
          id: event.bid.id,
          bidderId: event.bid.bidderId,
          bidderName: event.bid.bidderName,
          amountCents: event.bid.amountCents,
          createdAt: new Date(event.bid.createdAt),
        },
        ...currentListing.bidHistory.filter((bid) => bid.id !== event.bid.id),
      ];
      const nextViewerBidStatus = getViewerBidStatus({
        viewerId,
        highestBidderId: event.highestBidderId,
        hasViewerBid: hasViewerBid(
          nextBidHistory,
          viewerId,
          currentListing.viewerBidStatus,
        ),
      });

      return {
        ...currentListing,
        currentBidCents: event.currentBidCents,
        currentPriceCents: event.currentBidCents,
        minimumNextBidCents: event.minimumNextBidCents,
        bidCount: event.bidCount,
        highestBidderId: event.highestBidderId,
        viewerBidStatus: nextViewerBidStatus,
        bidHistory: nextBidHistory,
      };
    });
  });

  useListingLifecycleChangedSubscription(initialListing.id, (event) => {
    setListing((currentListing) => {
      const currentBidCents =
        event.currentBidCents ?? currentListing.currentBidCents;

      return {
        ...currentListing,
        status: event.status,
        outcome: event.outcome,
        winnerUserId: event.winnerUserId,
        winningBidId: event.winningBidId,
        currentBidCents,
        currentPriceCents:
          event.currentBidCents ?? currentListing.currentPriceCents,
        minimumNextBidCents:
          event.currentBidCents === null
            ? currentListing.minimumNextBidCents
            : getMinimumNextBidCents(
                currentListing.startingBidCents,
                event.currentBidCents,
              ),
        bidCount: event.bidCount,
        highestBidderId: event.winnerUserId,
        canPlaceBid: canPlaceBid({
          sellerId: currentListing.sellerId,
          viewerId,
          status: event.status,
          endsAt: currentListing.endsAt,
        }),
      };
    });

    if (event.status === "ended") {
      setIsLocallyFinalizing(false);
      setHasAttemptedRefresh(false);
    }
  });

  const isOwner = viewerId === listing.sellerId;
  const canManageImages = isOwner && listing.status === "draft";
  const showSellerControls = isOwner && listing.bidCount === 0;
  const showEndedState = listing.status === "ended" || isLocallyFinalizing;
  const endedCopy = getListingEndStateCopy({
    outcome: listing.outcome,
    bidCount: listing.bidCount,
    isSeller: isOwner,
    isWinner:
      viewerId !== null && viewerId !== undefined
        ? viewerId === listing.winnerUserId
        : false,
    isFinalizing: isLocallyFinalizing,
  });
  const topCardTitle = showEndedState
    ? isLocallyFinalizing
      ? "Auction Finalizing"
      : "Auction Result"
    : isOwner
      ? showSellerControls
        ? "Seller Controls"
        : "Auction Activity"
      : listing.canPlaceBid
        ? "Place A Bid"
        : "Auction Activity";
  const highestBidderLabel = listing.highestBidderId
    ? listing.viewerBidStatus === "highest"
      ? "You"
      : (listing.bidHistory[0]?.bidderName ?? "Current leader")
    : "No bids yet";
  const buyerActivityMessage = viewerId
    ? listing.status !== "active"
      ? "Bidding is unavailable because this listing is not currently active."
      : "You can watch the live auction activity here, but bidding is unavailable for your account on this listing."
    : "Sign in to place a bid. You can still watch the current auction activity below.";
  const countdownToneClasses: Record<CountdownUrgencyTier, string> = {
    neutral:
      "border-border/70 bg-background/55 text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-border)_50%,transparent)]",
    warning:
      "border-accent/30 bg-accent/12 text-accent shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-accent)_26%,transparent)]",
    urgent:
      "border-primary/30 bg-primary/12 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_24%,transparent)]",
    critical:
      "border-destructive/28 bg-destructive/10 text-destructive shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-destructive)_24%,transparent)]",
    ended:
      "border-border/70 bg-muted/50 text-muted-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-border)_50%,transparent)]",
  };

  const handleCountdownEnd = () => {
    if (listing.status !== "active") {
      return;
    }

    setIsLocallyFinalizing(true);

    if (hasAttemptedRefresh) {
      return;
    }

    setHasAttemptedRefresh(true);
    router.refresh();
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium tracking-[0.22em] uppercase text-primary">
          Listing
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-semibold tracking-tight">
            {listing.title}
          </h1>
          {isLocallyFinalizing ? (
            <StatusBadge
              tone="ended"
              className="shrink-0 rounded-full border border-white/12 px-6 py-3 text-base font-semibold tracking-[0.22em] uppercase shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_16%,transparent),0_20px_44px_rgba(0,0,0,0.34)] sm:px-7 sm:py-3.5 sm:text-lg"
            >
              Finalizing
            </StatusBadge>
          ) : (
            <StatusBadge
              status={listing.status}
              className="shrink-0 rounded-full border border-white/12 px-6 py-3 text-base font-semibold tracking-[0.22em] uppercase shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_16%,transparent),0_20px_44px_rgba(0,0,0,0.34)] sm:px-7 sm:py-3.5 sm:text-lg"
            />
          )}
        </div>
      </div>

      <dl className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.75rem] border border-border/70 bg-background/55 p-4">
          <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
            Current Bid
          </dt>
          <dd className="mt-2 text-xl font-semibold">
            {formatListingPrice(listing.currentPriceCents)}
          </dd>
        </div>
        <div className="rounded-[1.75rem] border border-border/70 bg-background/55 p-4">
          <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
            Minimum Bid
          </dt>
          <dd className="mt-2 text-xl font-semibold">
            {formatListingPrice(listing.minimumNextBidCents)}
          </dd>
        </div>
        <div className="rounded-[1.75rem] border border-border/70 bg-background/55 p-4">
          {listing.status === "scheduled" && listing.startsAt ? (
            <ListingCountdown
              key={listing.startsAt.toISOString()}
              targetAt={listing.startsAt}
            >
              {({ formatted, urgency }) => (
                <>
                  <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
                    Starts In
                  </dt>
                  <dd
                    className={cn(
                      "mt-2 inline-flex rounded-full border px-3 py-1.5 text-xl font-semibold",
                      countdownToneClasses[urgency],
                    )}
                  >
                    {formatted}
                  </dd>
                </>
              )}
            </ListingCountdown>
          ) : showEndedState ? (
            <>
              <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
                {endedCopy.eyebrow}
              </dt>
              <dd className="mt-2 text-xl font-semibold">{endedCopy.title}</dd>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {endedCopy.description}
              </p>
            </>
          ) : (
            <ListingCountdown
              key={listing.endsAt.toISOString()}
              targetAt={listing.endsAt}
              onEnd={handleCountdownEnd}
            >
              {({ formatted, urgency }) => (
                <>
                  <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
                    Time Remaining
                  </dt>
                  <dd
                    className={cn(
                      "mt-2 inline-flex rounded-full border px-3 py-1.5 text-xl font-semibold",
                      countdownToneClasses[urgency],
                    )}
                  >
                    {formatted}
                  </dd>
                </>
              )}
            </ListingCountdown>
          )}
        </div>
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
        <Card className="rounded-[2rem] py-0">
          <CardContent className="space-y-6 px-6 py-6">
            <ListingImageGallery
              listingId={listing.id}
              canManage={canManageImages}
              title={listing.title}
              images={listing.images}
            />

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
                  Seller
                </dt>
                <dd className="mt-2 text-lg font-semibold">
                  {listing.sellerName}
                </dd>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
                  Location
                </dt>
                <dd className="mt-2 text-lg font-semibold">
                  {listing.location}
                </dd>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
                  Category
                </dt>
                <dd className="mt-2 text-lg font-semibold">
                  {listing.category.replaceAll("_", " ")}
                </dd>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
                  Condition
                </dt>
                <dd className="mt-2 text-lg font-semibold">
                  {listing.condition.replaceAll("_", " ")}
                </dd>
              </div>
            </dl>

            <div className="rounded-[1.75rem] border border-border/70 bg-background/55 p-5">
              <h2 className="text-sm font-medium tracking-[0.18em] uppercase text-muted-foreground">
                Description
              </h2>
              <p className="mt-3 leading-8 text-muted-foreground">
                {listing.description}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[2rem]">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-xl">{topCardTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6">
              {showEndedState ? (
                <div className="rounded-[1.75rem] border border-border/70 bg-background/55 p-5">
                  <p className="text-xs font-semibold tracking-[0.18em] uppercase text-primary/85">
                    {endedCopy.eyebrow}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    {endedCopy.title}
                  </h2>
                  <p className="mt-3 leading-7 text-muted-foreground">
                    {endedCopy.description}
                  </p>
                </div>
              ) : showSellerControls ? (
                <ListingSellerControls listing={listing} />
              ) : isOwner ? (
                <ListingAuctionActivityPanel
                  currentPriceCents={listing.currentPriceCents}
                  minimumNextBidCents={listing.minimumNextBidCents}
                  bidCount={listing.bidCount}
                  highestBidderLabel={highestBidderLabel}
                  message="Bids are live on this listing, so seller controls are now read-only. Review the current auction state and follow bid history below."
                />
              ) : listing.canPlaceBid ? (
                <ListingBidForm
                  listingId={listing.id}
                  minimumNextBidCents={listing.minimumNextBidCents}
                  currentPriceCents={listing.currentPriceCents}
                  bidCount={listing.bidCount}
                  viewerBidStatus={listing.viewerBidStatus}
                />
              ) : (
                <ListingAuctionActivityPanel
                  currentPriceCents={listing.currentPriceCents}
                  minimumNextBidCents={listing.minimumNextBidCents}
                  bidCount={listing.bidCount}
                  highestBidderLabel={highestBidderLabel}
                  message={buyerActivityMessage}
                />
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem]">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-xl">Bid History</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <ListingBidHistory bids={listing.bidHistory} />
            </CardContent>
          </Card>

          {canManageImages ? (
            <ListingImageUploadPanel
              listingId={listing.id}
              imageCount={listing.images.length}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
