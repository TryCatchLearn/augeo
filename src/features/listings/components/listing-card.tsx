import { BadgeDollarSign, Clock3, Gavel, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatListingPrice,
  formatTimeRemaining,
} from "@/features/listings/domain";
import type { ListingCardData } from "@/features/listings/queries";

type ListingCardProps = {
  listing: ListingCardData;
};

export function ListingCard({ listing }: ListingCardProps) {
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
          <StatusBadge
            status={listing.status}
            className="absolute left-4 top-4 border border-white/10 shadow-lg"
          />
        </div>

        <CardContent className="space-y-4 px-6 py-5">
          <h2 className="overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold tracking-tight transition-colors group-hover:text-primary group-focus-visible:text-primary">
            {listing.title}
          </h2>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-border/70 bg-background/55 px-3 py-2.5">
              <dt className="sr-only">Current price</dt>
              <dd className="flex items-center gap-2 font-semibold">
                <BadgeDollarSign className="size-4 text-primary/90" />
                <span>{formatListingPrice(listing.startingBidCents)}</span>
              </dd>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/55 px-3 py-2.5">
              <dt className="sr-only">Bid count</dt>
              <dd className="flex items-center gap-2 font-semibold">
                <Gavel className="size-4 text-primary/90" />
                <span>{listing.bidCount}</span>
              </dd>
            </div>
          </dl>

          <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-3 text-sm text-muted-foreground">
            <p className="flex min-w-0 items-center gap-2">
              <UserRound className="size-4 shrink-0 text-primary/80" />
              <span className="truncate">{listing.sellerName}</span>
            </p>
            <p className="flex shrink-0 items-center gap-2">
              <Clock3 className="size-4 text-primary/80" />
              <span>{formatTimeRemaining(listing.endsAt)}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
