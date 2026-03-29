import { ListingCardGrid } from "@/features/listings/components/listing-card-grid";
import { ListingsPagination } from "@/features/listings/components/listings-pagination";
import { PublicListingStatusTabs } from "@/features/listings/components/public-listing-status-tabs";
import { PublicListingsControls } from "@/features/listings/components/public-listings-controls";
import { normalizePublicListingsQuery } from "@/features/listings/helpers/browse-query";
import { createPublicListingsSearchParams } from "@/features/listings/helpers/browse-search-params";
import { getPublicListingsQueryInput } from "@/features/listings/helpers/query-input";
import { listPublicListingCards } from "@/features/listings/queries";

type ListingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ListingsPage({
  searchParams,
}: ListingsPageProps = {}) {
  const resolvedSearchParams = (searchParams ? await searchParams : {}) ?? {};
  const queryInput = getPublicListingsQueryInput(resolvedSearchParams);
  const query = normalizePublicListingsQuery(queryInput);
  const listings = await listPublicListingCards(queryInput);

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm font-medium tracking-[0.22em] uppercase text-primary">
          Listings
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Live, scheduled, and recently closed lots.
        </h1>
      </div>

      <div className="mt-10 flex flex-row flex-wrap items-center justify-between gap-3 rounded-3xl border border-border/80 bg-muted/15 p-3">
        <PublicListingStatusTabs query={query} />
        <PublicListingsControls query={query} />
      </div>

      <div className="mt-10">
        <ListingCardGrid listings={listings.items} />
      </div>

      <ListingsPagination
        pathname="/listings"
        searchParams={createPublicListingsSearchParams(query)}
        pagination={listings}
      />
    </section>
  );
}
