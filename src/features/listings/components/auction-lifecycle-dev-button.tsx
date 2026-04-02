"use client";

import { RefreshCcw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AuctionLifecycleSummary } from "@/server/auctions/lifecycle";

type AuctionLifecycleDevButtonProps = {
  runAction: () => Promise<AuctionLifecycleSummary>;
};

function formatSummary(summary: AuctionLifecycleSummary) {
  return [
    `${summary.activatedCount} activated`,
    `${summary.closedCount} closed`,
    `${summary.soldCount} sold`,
    `${summary.unsoldCount} unsold`,
    `${summary.reserveNotMetCount} reserve not met`,
  ].join(" • ");
}

export function AuctionLifecycleDevButton({
  runAction,
}: AuctionLifecycleDevButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      try {
        const summary = await runAction();

        toast.success("Auction lifecycle run complete.", {
          description: formatSummary(summary),
        });
      } catch (error) {
        toast.error("Auction lifecycle run failed.", {
          description:
            error instanceof Error ? error.message : "Unknown lifecycle error.",
        });
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Run auction lifecycle"
      title="Run auction lifecycle"
      disabled={isPending}
      onClick={handleClick}
    >
      <RefreshCcw className={isPending ? "animate-spin" : undefined} />
    </Button>
  );
}
