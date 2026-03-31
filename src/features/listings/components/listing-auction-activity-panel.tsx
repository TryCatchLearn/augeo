import { formatListingPrice } from "@/features/listings/utils";

type ListingAuctionActivityPanelProps = {
  currentPriceCents: number;
  minimumNextBidCents: number;
  bidCount: number;
  highestBidderLabel: string;
  message: string;
};

export function ListingAuctionActivityPanel({
  currentPriceCents,
  minimumNextBidCents,
  bidCount,
  highestBidderLabel,
  message,
}: ListingAuctionActivityPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
        <p className="text-sm leading-7 text-muted-foreground">{message}</p>
      </div>

      <dl className="grid gap-3">
        <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
          <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
            Current Price
          </dt>
          <dd className="mt-2 text-lg font-semibold">
            {formatListingPrice(currentPriceCents)}
          </dd>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
          <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
            Next Minimum Bid
          </dt>
          <dd className="mt-2 text-lg font-semibold">
            {formatListingPrice(minimumNextBidCents)}
          </dd>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
          <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
            Highest Bidder
          </dt>
          <dd className="mt-2 text-lg font-semibold">{highestBidderLabel}</dd>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
          <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
            Total Bids
          </dt>
          <dd className="mt-2 text-lg font-semibold">{bidCount}</dd>
        </div>
      </dl>
    </div>
  );
}
