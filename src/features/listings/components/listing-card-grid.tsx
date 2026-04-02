import { ListingCard } from "@/features/listings/components/listing-card";
import type { ListingCardData } from "@/features/listings/queries";

type ListingCardGridProps = {
  listings: ListingCardData[];
  viewerId?: string | null;
};

export function ListingCardGrid({ listings, viewerId }: ListingCardGridProps) {
  if (listings.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border/80 bg-muted/20 px-8 py-14 text-center">
        <h2 className="text-xl font-semibold tracking-tight">
          No listings yet
        </h2>
        <p className="mt-3 text-muted-foreground">
          Listings will appear here once inventory is available.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} viewerId={viewerId} />
      ))}
    </div>
  );
}
