import Image from "next/image";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/features/auth/session";
import {
  formatListingPrice,
  formatTimeRemaining,
} from "@/features/listings/domain";
import { getListingDetail } from "@/features/listings/queries";

type ListingDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ListingDetailPage({
  params,
}: ListingDetailPageProps) {
  const { id } = await params;
  const [listing, session] = await Promise.all([
    getListingDetail(id),
    getSession(),
  ]);

  if (!listing) {
    notFound();
  }

  const isOwner = session?.user.id === listing.sellerId;

  if (listing.status === "draft" && !isOwner) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-[0.22em] uppercase text-primary">
            Listing
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            {listing.title}
          </h1>
        </div>
        <StatusBadge status={listing.status} className="mt-1" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
        <Card className="rounded-[2rem] py-0">
          <div className="relative aspect-4/3 overflow-hidden bg-muted">
            {listing.imageUrl ? (
              <Image
                src={listing.imageUrl}
                alt={listing.title}
                fill
                sizes="(min-width: 1024px) 60rem, 100vw"
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                Image coming soon
              </div>
            )}
          </div>
          <CardHeader className="px-6 pt-6">
            <CardTitle className="text-2xl">{listing.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-6">
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
                  Current Bid
                </dt>
                <dd className="mt-2 text-lg font-semibold">
                  {formatListingPrice(listing.startingBidCents)}
                </dd>
              </div>
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
                  Time Remaining
                </dt>
                <dd className="mt-2 text-lg font-semibold">
                  {formatTimeRemaining(listing.endsAt)}
                </dd>
              </div>
            </dl>
            <p className="leading-8 text-muted-foreground">
              {listing.description}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem]">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="text-xl">
              {isOwner ? "Seller View" : "Buyer View"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
              <p className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
                Location
              </p>
              <p className="mt-2 font-medium">{listing.location}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
              <p className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
                Category
              </p>
              <p className="mt-2 font-medium capitalize">
                {listing.category.replaceAll("_", " ")}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
              <p className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
                Condition
              </p>
              <p className="mt-2 font-medium capitalize">
                {listing.condition.replaceAll("_", " ")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
