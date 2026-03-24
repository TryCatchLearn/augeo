import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/features/auth/session";
import { ListingImageGallery } from "@/features/listings/components/listing-image-gallery";
import { ListingSellerControls } from "@/features/listings/components/listing-seller-controls";
import {
  formatListingPrice,
  getListingTimeMeta,
  getPlaceholderPricing,
} from "@/features/listings/domain";
import { getListingDetailForViewer } from "@/features/listings/queries";

type ListingDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ListingDetailPage({
  params,
}: ListingDetailPageProps) {
  const { id } = await params;
  const session = await getSession();
  const listing = await getListingDetailForViewer(id, session?.user.id);

  if (!listing) {
    notFound();
  }

  const isOwner = session?.user.id === listing.sellerId;
  const pricing = getPlaceholderPricing(listing.startingBidCents);
  const timeMeta = getListingTimeMeta(
    listing.status,
    listing.endsAt,
    listing.startsAt,
  );

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
          <StatusBadge
            status={listing.status}
            className="shrink-0 rounded-full border border-white/12 px-6 py-3 text-base font-semibold tracking-[0.22em] uppercase shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_16%,transparent),0_20px_44px_rgba(0,0,0,0.34)] sm:px-7 sm:py-3.5 sm:text-lg"
          />
        </div>
      </div>

      <dl className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.75rem] border border-border/70 bg-background/55 p-4">
          <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
            Current Bid
          </dt>
          <dd className="mt-2 text-xl font-semibold">
            {formatListingPrice(pricing.currentBidCents)}
          </dd>
        </div>
        <div className="rounded-[1.75rem] border border-border/70 bg-background/55 p-4">
          <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
            Minimum Bid
          </dt>
          <dd className="mt-2 text-xl font-semibold">
            {formatListingPrice(pricing.minimumBidCents)}
          </dd>
        </div>
        <div className="rounded-[1.75rem] border border-border/70 bg-background/55 p-4">
          <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
            {timeMeta.label}
          </dt>
          <dd className="mt-2 text-xl font-semibold">{timeMeta.value}</dd>
        </div>
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
        <Card className="rounded-[2rem] py-0">
          <CardContent className="space-y-6 px-6 py-6">
            <ListingImageGallery
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

        <Card className="rounded-[2rem]">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="text-xl">
              {isOwner ? "Seller Controls" : "Place A Bid"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            {isOwner ? (
              <ListingSellerControls listing={listing} />
            ) : (
              <>
                <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                  <p className="text-sm leading-7 text-muted-foreground">
                    Bidding is placeholder-only in Phase 1. Buyers can review
                    the item, track the starting price, and get ready for the
                    live controls in a later phase.
                  </p>
                </div>
                <dl className="grid gap-3">
                  <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                    <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
                      Starting Bid
                    </dt>
                    <dd className="mt-2 text-lg font-semibold">
                      {formatListingPrice(listing.startingBidCents)}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                    <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
                      Bid Count
                    </dt>
                    <dd className="mt-2 text-lg font-semibold">
                      {pricing.bidCount} bids
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
