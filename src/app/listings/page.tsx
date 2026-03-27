import Link from "next/link";
import { ListingCardGrid } from "@/features/listings/components/listing-card-grid";
import { listingStatusLabels } from "@/features/listings/domain";
import {
  listPublicListingCards,
  normalizePublicListingsQuery,
  publicListingStatuses,
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
  const selectedStatus = normalizePublicListingsQuery({
    status: getSingleSearchParamValue(resolvedSearchParams.status),
    page: getSingleSearchParamValue(resolvedSearchParams.page),
    pageSize: getSingleSearchParamValue(resolvedSearchParams.pageSize),
  });
  const listings = await listPublicListingCards({
    status: getSingleSearchParamValue(resolvedSearchParams.status),
    page: getSingleSearchParamValue(resolvedSearchParams.page),
    pageSize: getSingleSearchParamValue(resolvedSearchParams.pageSize),
  });

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
      <div className="max-w-2xl space-y-4">
        <p className="text-sm font-medium tracking-[0.22em] uppercase text-primary">
          Listings
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Live, scheduled, and recently closed lots.
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          Browse the marketplace as it exists today. Draft listings stay private
          to their owners, while published inventory appears here with price,
          seller, and timing details.
        </p>
      </div>

      <nav
        aria-label="Public listing status tabs"
        className="mt-10 flex flex-wrap gap-3 rounded-3xl border border-border/80 bg-muted/15 p-3"
      >
        {publicListingStatuses.map((status) => {
          const isActive = selectedStatus.status === status;

          return (
            <Link
              key={status}
              href={buildStatusHref(resolvedSearchParams, status)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_24%,transparent),0_0_22px_color-mix(in_oklab,var(--color-primary)_20%,transparent)]"
                  : "bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {listingStatusLabels[status]}
            </Link>
          );
        })}
      </nav>

      <div className="mt-10">
        <ListingCardGrid listings={listings.items} />
      </div>
    </section>
  );
}
