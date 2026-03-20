import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusBadgeClasses = {
  preview:
    "bg-secondary text-secondary-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-border)_75%,transparent)]",
  comingSoon:
    "bg-muted text-muted-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-border)_75%,transparent)]",
  openingSoon:
    "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-primary)_28%,transparent)]",
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
