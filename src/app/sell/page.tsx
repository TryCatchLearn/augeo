import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/features/auth/session";

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

      <Card className="mt-10 rounded-3xl border border-border py-0">
        <CardHeader className="px-6 pt-6">
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <CardTitle className="mt-2 text-2xl font-semibold">
            {session.user.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <p className="text-muted-foreground">{session.user.email}</p>
        </CardContent>
      </Card>
    </section>
  );
}
