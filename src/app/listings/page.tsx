import { ListingCardGrid } from "@/features/listings/components/listing-card-grid";
import { listPublicListingCards } from "@/features/listings/queries";

export default async function ListingsPage() {
  const listings = await listPublicListingCards();

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

      <div className="mt-10">
        <ListingCardGrid listings={listings} />
      </div>
    </section>
  );
}
