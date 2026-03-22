import { Compass, House, SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--color-primary)_16%,transparent),transparent_28%),radial-gradient(circle_at_85%_20%,color-mix(in_oklab,var(--color-accent)_16%,transparent),transparent_22%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-18rem)] w-full max-w-5xl items-center px-6 py-16 sm:py-20">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-medium tracking-[0.22em] uppercase text-primary">
              Not Found
            </p>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                That route fell through the floorboards.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                The page you asked for is missing, private, or has not been
                built yet. Let&apos;s get you back to something visible.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/" size="lg">
                <House data-icon="inline-start" />
                Back home
              </LinkButton>
              <LinkButton href="/listings" variant="outline" size="lg">
                <Compass data-icon="inline-start" />
                Browse listings
              </LinkButton>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-card)_92%,white_4%),color-mix(in_oklab,var(--color-card)_96%,black))] p-8 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_10%,transparent),0_24px_70px_rgba(0,0,0,0.32)]">
            <div className="flex items-center gap-4 rounded-[1.5rem] border border-border/70 bg-background/50 p-5">
              <div className="flex size-12 items-center justify-center rounded-full border border-primary/25 bg-primary/12">
                <SearchX className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  Error 404
                </p>
                <p className="mt-1 text-lg font-semibold">
                  No visible page here
                </p>
              </div>
            </div>
            <p className="mt-6 text-sm leading-7 text-muted-foreground">
              Draft listing pages are also intentionally hidden from the public,
              so this state is expected in a few seller-only flows.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
