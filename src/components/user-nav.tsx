"use client";

import { ChevronDown, LayoutDashboard, LogOut, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <DropdownMenu>
      <DropdownMenuTrigger
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
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-72 rounded-2xl border border-border/80 p-2 shadow-2xl shadow-black/20"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="rounded-xl bg-card/70 px-4 py-3 text-left">
            <p className="text-sm font-semibold text-foreground">{name}</p>
            <p className="mt-1 text-sm font-normal text-muted-foreground">
              {email}
            </p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            className="gap-3 rounded-xl px-3 py-2.5"
            onClick={() => router.push("/sell")}
          >
            <PlusCircle className="size-4 text-primary" />
            Sell my item
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-3 rounded-xl px-3 py-2.5"
            onClick={() => router.push("/dashboard")}
          >
            <LayoutDashboard className="size-4 text-primary" />
            My dashboard
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="gap-3 rounded-xl px-3 py-2.5"
          variant="destructive"
          disabled={isSigningOut}
          onClick={handleSignOut}
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
