import Link from "next/link";
import { requireSession } from "@/features/auth/session";
import { ListingCardGrid } from "@/features/listings/components/listing-card-grid";
import {
  isListingStatus,
  type ListingStatus,
  listingStatuses,
} from "@/features/listings/domain";
import { listSellerListingCards } from "@/features/listings/queries";
import { cn } from "@/lib/utils";

type DashboardListingsPageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

function getSelectedStatus(status: string | undefined): ListingStatus {
  return status && isListingStatus(status) ? status : "draft";
}

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
  const selectedStatus = getSelectedStatus(resolvedSearchParams?.status);
  const listings = await listSellerListingCards(
    session.user.id,
    selectedStatus,
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
          const isActive = selectedStatus === status;

          return (
            <Link
              key={status}
              href={`/dashboard/listings?status=${status}`}
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
        <ListingCardGrid listings={listings} />
      </div>
    </section>
  );
}
