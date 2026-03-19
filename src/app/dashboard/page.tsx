import { requireSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireSession("/dashboard");

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
        <article className="rounded-3xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Current user</p>
          <h2 className="mt-3 text-2xl font-semibold">{session.user.name}</h2>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-3">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{session.user.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-3">
              <dt className="text-muted-foreground">Email verified</dt>
              <dd>{session.user.emailVerified ? "Yes" : "No"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Session expires</dt>
              <dd>{session.session.expiresAt.toLocaleString()}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-3xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Session payload</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-border/80 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
            {JSON.stringify(session.user, null, 2)}
          </pre>
        </article>
      </div>
    </section>
  );
}
