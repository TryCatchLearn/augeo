import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireSession("/dashboard");
  const rows = [
    {
      label: "Email",
      value: session.user.email,
    },
    {
      label: "Email verified",
      value: session.user.emailVerified ? "Yes" : "No",
    },
    {
      label: "Session expires",
      value: session.session.expiresAt.toLocaleString(),
    },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm font-medium tracking-[0.22em] uppercase text-primary">
          Dashboard
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Signed in and ready to build from.
        </h1>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-3xl border border-border py-0">
          <CardHeader className="px-6 pt-6">
            <p className="text-sm text-muted-foreground">Current user</p>
            <CardTitle className="mt-3 text-2xl font-semibold">
              {session.user.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <dl className="text-sm">
              {rows.map((row, index) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                  {index < rows.length - 1 ? <Separator /> : null}
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border py-0">
          <CardHeader className="px-6 pt-6">
            <p className="text-sm text-muted-foreground">Session payload</p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <pre className="overflow-x-auto rounded-2xl border border-border/80 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
              {JSON.stringify(session.user, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
