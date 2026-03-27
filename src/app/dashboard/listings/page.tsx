import Link from "next/link";
import { requireSession } from "@/features/auth/session";
import {
  createDashboardListingsSearchParams,
  normalizeDashboardListingsQuery,
} from "@/features/listings/browse";
import { ListingCardGrid } from "@/features/listings/components/listing-card-grid";
import { ListingsPagination } from "@/features/listings/components/listings-pagination";
import {
  type ListingStatus,
  listingStatuses,
} from "@/features/listings/domain";
import { listSellerListingCards } from "@/features/listings/queries";
import { cn } from "@/lib/utils";

type DashboardListingsPageProps = {
  searchParams?: Promise<{
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
};

const dashboardTabLabels: Record<ListingStatus, string> = {
  draft: "Drafts",
  active: "Active",
  scheduled: "Scheduled",
  ended: "Ended",
};

export default async function DashboardListingsPage({
  searchParams,
}: DashboardListingsPageProps) {
  const session = await requireSession("/dashboard/listings");
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = normalizeDashboardListingsQuery(resolvedSearchParams);
  const listings = await listSellerListingCards(
    session.user.id,
    resolvedSearchParams,
  );

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm font-medium tracking-[0.22em] uppercase text-primary">
          My Listings
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Manage inventory by status.
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          Drafts stay private, and every tab keeps the same listing card view so
          sellers can scan inventory without changing context.
        </p>
      </div>

      <nav
        aria-label="Listing status tabs"
        className="mt-10 flex flex-wrap gap-3 rounded-3xl border border-border/80 bg-muted/15 p-3"
      >
        {listingStatuses.map((status) => {
          const isActive = query.status === status;
          const nextSearchParams = createDashboardListingsSearchParams({
            ...query,
            status,
            page: 1,
          });
          const queryString = nextSearchParams.toString();

          return (
            <Link
              key={status}
              href={
                queryString.length > 0
                  ? `/dashboard/listings?${queryString}`
                  : "/dashboard/listings"
              }
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_24%,transparent),0_0_22px_color-mix(in_oklab,var(--color-primary)_20%,transparent)]"
                  : "bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {dashboardTabLabels[status]}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8">
        <ListingCardGrid listings={listings.items} />
      </div>

      <ListingsPagination
        pathname="/dashboard/listings"
        searchParams={createDashboardListingsSearchParams(query)}
        pagination={listings}
      />
    </section>
  );
}
