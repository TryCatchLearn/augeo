import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusBadgeClasses = {
  preview:
    "border-accent/25 bg-accent/12 text-accent shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-accent)_30%,transparent),0_0_20px_color-mix(in_oklab,var(--color-accent)_16%,transparent)]",
  comingSoon:
    "border-border/80 bg-muted/80 text-muted-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-border)_65%,transparent)]",
  openingSoon:
    "border-primary/25 bg-primary/12 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_28%,transparent),0_0_22px_color-mix(in_oklab,var(--color-primary)_18%,transparent)]",
} as const;

type StatusTone = keyof typeof statusBadgeClasses;

type StatusBadgeProps = {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
};

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium",
        statusBadgeClasses[tone],
        className,
      )}
    >
      {children}
    </Badge>
  );
}
