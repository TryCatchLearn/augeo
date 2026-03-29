import Link from "next/link";
import { listingStatusLabels } from "@/features/listings/domain";
import {
  type PublicListingsQuery,
  publicListingStatuses,
} from "@/features/listings/helpers/browse-query";
import { createPublicListingsSearchParams } from "@/features/listings/helpers/browse-search-params";
import { cn } from "@/lib/utils";

type PublicListingStatusTabsProps = {
  query: PublicListingsQuery;
};

export function PublicListingStatusTabs({
  query,
}: PublicListingStatusTabsProps) {
  return (
    <nav
      aria-label="Public listing status tabs"
      className="flex flex-wrap items-center gap-3"
    >
      {publicListingStatuses.map((status) => {
        const isActive = query.status === status;
        const nextSearchParams = createPublicListingsSearchParams({
          ...query,
          status,
          page: 1,
        });
        const queryString = nextSearchParams.toString();

        return (
          <Link
            key={status}
            href={
              queryString.length > 0 ? `/listings?${queryString}` : "/listings"
            }
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
  );
}
