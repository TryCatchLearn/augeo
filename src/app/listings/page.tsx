import { LinkButton } from "@/components/ui/button";

const placeholderListings = [
  {
    title: "Vintage brass desk lamp",
    category: "Design",
    status: "Preview",
  },
  {
    title: "Signed abstract lithograph",
    category: "Art",
    status: "Coming soon",
  },
  {
    title: "Rare mechanical wristwatch",
    category: "Collectibles",
    status: "Coming soon",
  },
];

export default function ListingsPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
      <div className="max-w-2xl space-y-4">
        <p className="text-sm font-medium tracking-[0.22em] uppercase text-primary">
          Listings
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Upcoming items, curated simply.
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          This page is a lightweight placeholder for future inventory. It gives
          us a clear destination from the navbar while the broader auction
          experience takes shape.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {placeholderListings.map((listing) => (
          <article
            key={listing.title}
            className="rounded-3xl border border-border bg-card p-6"
          >
            <p className="text-sm text-muted-foreground">{listing.category}</p>
            <h2 className="mt-3 text-xl font-semibold">{listing.title}</h2>
            <p className="mt-6 inline-flex rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
              {listing.status}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-10">
        <LinkButton href="/" variant="outline" size="lg">
          Back to home
        </LinkButton>
      </div>
    </section>
  );
}
