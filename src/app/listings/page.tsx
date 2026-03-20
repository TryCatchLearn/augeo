import { StatusBadge } from "@/components/status-badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const placeholderListings = [
  {
    title: "Vintage brass desk lamp",
    category: "Design",
    status: "Preview",
    tone: "preview",
  },
  {
    title: "Signed abstract lithograph",
    category: "Art",
    status: "Coming soon",
    tone: "comingSoon",
  },
  {
    title: "Rare mechanical wristwatch",
    category: "Collectibles",
    status: "Coming soon",
    tone: "comingSoon",
  },
] as const;

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
          <Card
            key={listing.title}
            className="rounded-3xl border border-border py-0"
          >
            <CardHeader className="px-6 pt-6">
              <p className="text-sm text-muted-foreground">
                {listing.category}
              </p>
              <CardTitle className="mt-3 text-xl font-semibold">
                {listing.title}
              </CardTitle>
            </CardHeader>
            <CardFooter className="border-t-0 bg-transparent px-6 pb-6 pt-0">
              <StatusBadge tone={listing.tone}>{listing.status}</StatusBadge>
            </CardFooter>
          </Card>
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
