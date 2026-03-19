import { requireSession } from "@/lib/session";

export default async function SellPage() {
  const session = await requireSession("/sell");

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm font-medium tracking-[0.22em] uppercase text-primary">
          Sell My Item
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Seller tooling will land here next.
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          This placeholder route is protected and ready for the future item
          submission flow.
        </p>
      </div>

      <div className="mt-10 rounded-3xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="mt-2 text-2xl font-semibold">{session.user.name}</p>
        <p className="mt-2 text-muted-foreground">{session.user.email}</p>
      </div>
    </section>
  );
}
