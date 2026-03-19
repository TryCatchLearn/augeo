"use client";

import { Popover } from "@base-ui/react/popover";
import { ChevronDown, LayoutDashboard, LogOut, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type UserNavProps = {
  name: string;
  email: string;
  image?: string | null;
};

export function UserNav({ name, email, image }: UserNavProps) {
  const router = useRouter();
  const [isSigningOut, startSignOutTransition] = useTransition();

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();

    if (error) {
      return;
    }

    startSignOutTransition(() => {
      router.push("/");
      router.refresh();
    });
  };

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="Open account menu"
        className={cn(
          buttonVariants({
            variant: "outline",
            size: "default",
          }),
          "h-11 gap-2 rounded-full px-2 pr-3",
        )}
      >
        <Avatar name={name} image={image} className="size-8 border-border/80" />
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-none">{name}</span>
        </span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner align="end" sideOffset={10}>
          <Popover.Popup className="w-72 rounded-2xl border border-border/80 bg-popover p-2 text-popover-foreground shadow-2xl shadow-black/20 outline-none">
            <div className="rounded-xl bg-card/70 px-4 py-3">
              <p className="text-sm font-semibold">{name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{email}</p>
            </div>

            <div className="mt-2 flex flex-col gap-1">
              <Link
                href="/sell"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <PlusCircle className="size-4 text-primary" />
                Sell my item
              </Link>

              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <LayoutDashboard className="size-4 text-primary" />
                My dashboard
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                <LogOut className="size-4 text-primary" />
                Sign out
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
