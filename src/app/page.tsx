import { LinkButton } from "@/components/ui/button";

export default function Home() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,oklch(0.19_0.015_80_/_0.35))]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-6xl items-center px-6 py-20 sm:py-24">
        <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center rounded-full border border-border bg-card/80 px-4 py-2 text-sm text-muted-foreground">
              Live soon: curated auctions for art, design, collectibles, and
              more
            </div>

            <div className="space-y-5">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                Bid on remarkable pieces without the noise.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                Augeo is a simple auction marketplace built to spotlight
                standout listings, clear timelines, and confident bidding from
                first preview to final hammer.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/listings" size="lg">
                Browse upcoming listings
              </LinkButton>
              <LinkButton href="/listings" variant="outline" size="lg">
                Learn how auctions work
              </LinkButton>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card/85 p-6 shadow-2xl shadow-black/10">
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Featured preview
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Mid-century walnut sideboard
                  </h2>
                </div>
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                  Opening soon
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">Starting bid</p>
                  <p className="mt-2 text-2xl font-semibold">$1,200</p>
                </div>
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-sm text-muted-foreground">Auction opens</p>
                  <p className="mt-2 text-2xl font-semibold">March 28</p>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-border p-5">
                <p className="text-sm leading-7 text-muted-foreground">
                  Thoughtful photography, transparent reserve details, and
                  bidding windows designed to feel focused instead of frantic.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
