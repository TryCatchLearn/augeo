import Link from "next/link";
import { publicListingStatuses } from "@/features/listings/browse";
import { ListingCardGrid } from "@/features/listings/components/listing-card-grid";
import { PublicListingsControls } from "@/features/listings/components/public-listings-controls";
import { listingStatusLabels } from "@/features/listings/domain";
import {
  listPublicListingCards,
  normalizePublicListingsQuery,
} from "@/features/listings/queries";
import { cn } from "@/lib/utils";

type ListingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleSearchParamValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildStatusHref(
  searchParams: Record<string, string | string[] | undefined>,
  status: (typeof publicListingStatuses)[number],
) {
  const nextSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    const resolvedValue = getSingleSearchParamValue(value);

    if (!resolvedValue || key === "status" || key === "page") {
      continue;
    }

    nextSearchParams.set(key, resolvedValue);
  }

  nextSearchParams.set("status", status);

  return `/listings?${nextSearchParams.toString()}`;
}

export default async function ListingsPage({
  searchParams,
}: ListingsPageProps = {}) {
  const resolvedSearchParams = (searchParams ? await searchParams : {}) ?? {};
  const query = normalizePublicListingsQuery({
    status: getSingleSearchParamValue(resolvedSearchParams.status),
    q: getSingleSearchParamValue(resolvedSearchParams.q),
    category: getSingleSearchParamValue(resolvedSearchParams.category),
    price: getSingleSearchParamValue(resolvedSearchParams.price),
    sort: getSingleSearchParamValue(resolvedSearchParams.sort),
    page: getSingleSearchParamValue(resolvedSearchParams.page),
    pageSize: getSingleSearchParamValue(resolvedSearchParams.pageSize),
  });
  const listings = await listPublicListingCards({
    status: getSingleSearchParamValue(resolvedSearchParams.status),
    q: getSingleSearchParamValue(resolvedSearchParams.q),
    category: getSingleSearchParamValue(resolvedSearchParams.category),
    price: getSingleSearchParamValue(resolvedSearchParams.price),
    sort: getSingleSearchParamValue(resolvedSearchParams.sort),
    page: getSingleSearchParamValue(resolvedSearchParams.page),
    pageSize: getSingleSearchParamValue(resolvedSearchParams.pageSize),
  });

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
        <nav
          aria-label="Public listing status tabs"
          className="flex flex-wrap items-center gap-3"
        >
          {publicListingStatuses.map((status) => {
            const isActive = query.status === status;

            return (
              <Link
                key={status}
                href={buildStatusHref(resolvedSearchParams, status)}
                className={cn(
                  "flex h-8 items-center rounded-lg border border-input/90 bg-input/45 px-3 text-sm font-medium shadow-[inset_0_1px_0_color-mix(in_oklab,white_5%,transparent),0_0_0_1px_color-mix(in_oklab,var(--color-accent)_8%,transparent)] transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  isActive
                    ? "border-primary/35 bg-primary/12 text-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,white_8%,transparent),0_0_0_1px_color-mix(in_oklab,var(--color-primary)_16%,transparent)]"
                    : "text-muted-foreground hover:border-primary/25 hover:bg-muted/80 hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {listingStatusLabels[status]}
              </Link>
            );
          })}
        </nav>

        <PublicListingsControls query={query} />
      </div>

      <div className="mt-10">
        <ListingCardGrid listings={listings.items} />
      </div>
    </section>
  );
}
