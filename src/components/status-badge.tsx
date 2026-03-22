import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  type ListingStatus,
  listingStatusLabels,
} from "@/features/listings/domain";
import { cn } from "@/lib/utils";

const statusBadgeClasses = {
  draft:
    "border-border/85 bg-[color-mix(in_oklab,var(--color-card)_88%,black_12%)] text-foreground shadow-[0_10px_26px_rgba(0,0,0,0.24),inset_0_0_0_1px_color-mix(in_oklab,var(--color-border)_78%,transparent)]",
  scheduled:
    "border-accent/35 bg-[color-mix(in_oklab,var(--color-accent)_30%,black_70%)] text-[color-mix(in_oklab,var(--color-accent)_82%,white_18%)] shadow-[0_10px_26px_rgba(0,0,0,0.24),inset_0_0_0_1px_color-mix(in_oklab,var(--color-accent)_34%,transparent)]",
  active:
    "border-primary/38 bg-[color-mix(in_oklab,var(--color-primary)_34%,black_66%)] text-[color-mix(in_oklab,var(--color-primary)_86%,white_14%)] shadow-[0_10px_28px_rgba(0,0,0,0.24),inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_40%,transparent)]",
  ended:
    "border-foreground/15 bg-[color-mix(in_oklab,var(--color-foreground)_16%,black_84%)] text-foreground shadow-[0_10px_26px_rgba(0,0,0,0.22),inset_0_0_0_1px_color-mix(in_oklab,var(--color-foreground)_12%,transparent)]",
  preview:
    "border-accent/25 bg-accent/12 text-accent shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-accent)_30%,transparent),0_0_20px_color-mix(in_oklab,var(--color-accent)_16%,transparent)]",
  comingSoon:
    "border-border/80 bg-muted/80 text-muted-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-border)_65%,transparent)]",
  openingSoon:
    "border-primary/25 bg-primary/12 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_28%,transparent),0_0_22px_color-mix(in_oklab,var(--color-primary)_18%,transparent)]",
} as const;

type StatusTone = keyof typeof statusBadgeClasses;

type StatusBadgeProps = {
  status?: ListingStatus;
  tone?: StatusTone;
  children?: ReactNode;
  className?: string;
};

export function StatusBadge({
  status,
  tone = status,
  children,
  className,
}: StatusBadgeProps) {
  if (!tone) {
    return null;
  }

  return (
    <Badge
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium backdrop-blur-md",
        statusBadgeClasses[tone],
        className,
      )}
    >
      {children ?? (status ? listingStatusLabels[status] : null)}
    </Badge>
  );
}
