import { Gavel } from "lucide-react";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { getSession } from "@/lib/session";

const navLinks = [
  {
    href: "/listings",
    label: "Listings",
  },
];

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <span className="flex size-10 items-center justify-center rounded-full border border-border bg-card shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_20%,transparent)]">
            <Gavel aria-hidden="true" className="size-5 text-primary" />
          </span>
          <span className="text-lg font-semibold tracking-[0.18em] uppercase text-primary sm:text-xl">
            Augeo
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {session ? (
            <UserNav
              name={session.user.name}
              email={session.user.email}
              image={session.user.image}
            />
          ) : (
            <div className="flex items-center gap-2">
              <LinkButton href="/login" variant="secondary">
                Login
              </LinkButton>
              <LinkButton href="/register">Register</LinkButton>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
