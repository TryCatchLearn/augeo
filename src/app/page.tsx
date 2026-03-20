import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <section className="surface-grid relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--color-primary)_20%,transparent),transparent_34%),linear-gradient(180deg,transparent,color-mix(in_oklab,var(--color-background)_75%,black))]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-6xl items-center px-6 py-20 sm:py-24">
        <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-2xl space-y-8">
            <Badge
              variant="outline"
              className="rounded-full border-primary/20 bg-card/70 px-4 py-2 text-sm text-muted-foreground shadow-[0_0_18px_color-mix(in_oklab,var(--color-primary)_10%,transparent)]"
            >
              Live soon: curated auctions for art, design, collectibles, and
              more
            </Badge>

            <div className="space-y-5">
              <h1 className="text-4xl font-semibold tracking-[-0.03em] text-foreground sm:text-5xl md:text-6xl">
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

          <Card className="rounded-3xl border border-border/80 bg-card/85 py-0 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <CardHeader className="px-6 pt-6">
              <CardDescription>Featured preview</CardDescription>
              <CardTitle className="mt-2 text-2xl font-semibold">
                Mid-century walnut sideboard
              </CardTitle>
              <CardAction>
                <StatusBadge tone="openingSoon">Opening soon</StatusBadge>
              </CardAction>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              <Separator className="mb-6" />

              <div className="grid gap-4 sm:grid-cols-2">
                <Card
                  size="sm"
                  className="rounded-2xl border border-border/80 bg-background/65 py-0 ring-0"
                >
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Starting bid
                    </p>
                    <p className="mt-2 text-2xl font-semibold">$1,200</p>
                  </CardContent>
                </Card>

                <Card
                  size="sm"
                  className="rounded-2xl border border-border/80 bg-background/65 py-0 ring-0"
                >
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Auction opens
                    </p>
                    <p className="mt-2 text-2xl font-semibold">March 28</p>
                  </CardContent>
                </Card>
              </div>

              <Card
                size="sm"
                className="mt-4 rounded-2xl border border-dashed border-border/80 bg-transparent py-0 ring-0"
              >
                <CardContent className="p-5">
                  <p className="text-sm leading-7 text-muted-foreground">
                    Thoughtful photography, transparent reserve details, and
                    bidding windows designed to feel focused instead of frantic.
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
