import { Gavel } from "lucide-react";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { db } from "@/db/client";
import { getSession } from "@/features/auth/session";
import { AuctionLifecycleDevButton } from "@/features/listings/components/auction-lifecycle-dev-button";
import { NavbarSearch } from "@/features/listings/components/navbar-search";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/actions";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import {
  getUnreadNotificationCount,
  listRecentNotifications,
} from "@/features/notifications/queries";
import { runAuctionLifecycle } from "@/server/auctions/lifecycle";

const navLinks = [
  {
    href: "/listings",
    label: "Listings",
  },
];

async function runAuctionLifecycleDevAction() {
  "use server";

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Auction lifecycle can only be triggered manually in development.",
    );
  }

  return runAuctionLifecycle();
}

export async function SiteHeader() {
  const session = await getSession();
  const [unreadNotificationCount, recentNotifications] = session
    ? await Promise.all([
        getUnreadNotificationCount(session.user.id, db),
        listRecentNotifications(session.user.id, db),
      ])
    : [0, []];

  return (
    <header className="sticky top-0 z-1000 isolate border-b border-border/70 bg-[color-mix(in_oklab,var(--color-background)_94%,black_6%)] shadow-[0_12px_38px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mx-auto w-full max-w-6xl px-6 py-4">
        <div className="flex flex-wrap items-center gap-3 md:grid md:grid-cols-[auto_minmax(18rem,30rem)_auto] md:items-center md:gap-6">
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <span className="flex size-10 items-center justify-center rounded-full border border-primary/25 bg-card shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_24%,transparent),0_0_22px_color-mix(in_oklab,var(--color-primary)_16%,transparent)]">
              <Gavel aria-hidden="true" className="size-5 text-primary" />
            </span>
            <span className="text-lg font-semibold tracking-[0.26em] uppercase text-primary sm:text-xl">
              Augeo
            </span>
          </Link>

          <div className="order-3 w-full md:order-0 md:justify-self-center">
            <NavbarSearch />
          </div>

          <div className="ml-auto flex items-center gap-3 md:ml-0 md:justify-self-end">
            <nav className="flex items-center gap-6 text-sm font-medium">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {process.env.NODE_ENV !== "production" ? (
              <AuctionLifecycleDevButton
                runAction={runAuctionLifecycleDevAction}
              />
            ) : null}

            {session ? (
              <>
                <NotificationBell
                  initialUnreadCount={unreadNotificationCount}
                  initialNotifications={recentNotifications}
                  markNotificationReadAction={markNotificationReadAction}
                  markAllNotificationsReadAction={
                    markAllNotificationsReadAction
                  }
                />
                <UserNav
                  name={session.user.name}
                  email={session.user.email}
                  image={session.user.image}
                />
              </>
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
      </div>
    </header>
  );
}
