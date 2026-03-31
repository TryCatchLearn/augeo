"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { placeBidAction } from "@/features/listings/actions";
import {
  centsToDollars,
  dollarsToCents,
  formatListingPrice,
} from "@/features/listings/utils";
import { cn } from "@/lib/utils";

type ListingBidFormProps = {
  listingId: string;
  minimumNextBidCents: number;
  currentPriceCents: number;
  bidCount: number;
  viewerBidStatus: "highest" | "outbid" | "none";
};

type BidFormValues = {
  amountDollars: number;
};

const bidFormSchema = z.object({
  amountDollars: z
    .number({
      error: "Enter a valid bid amount.",
    })
    .finite("Enter a valid bid amount.")
    .positive("Enter a valid bid amount."),
});

export function ListingBidForm({
  listingId,
  minimumNextBidCents,
  currentPriceCents,
  bidCount,
  viewerBidStatus,
}: ListingBidFormProps) {
  const router = useRouter();
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BidFormValues>({
    resolver: zodResolver(bidFormSchema),
    defaultValues: {
      amountDollars: centsToDollars(minimumNextBidCents),
    },
  });

  useEffect(() => {
    reset({
      amountDollars: centsToDollars(minimumNextBidCents),
    });
  }, [minimumNextBidCents, reset]);

  const onSubmit = async (values: BidFormValues) => {
    startTransition(async () => {
      setIsSubmittingAction(true);

      try {
        const result = await placeBidAction({
          listingId,
          amountCents: dollarsToCents(values.amountDollars),
        });

        if (result.status === "error") {
          setError("root", { message: result.errorMessage });
          return;
        }

        router.refresh();
      } finally {
        setIsSubmittingAction(false);
      }
    });
  };

  const statusPanelClassName =
    viewerBidStatus === "highest"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-100 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_6%,transparent),inset_0_1px_0_rgba(255,255,255,0.04)]"
      : viewerBidStatus === "outbid"
        ? "border-amber-500/40 bg-amber-500/12 text-amber-50 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_6%,transparent),inset_0_1px_0_rgba(255,255,255,0.04)]"
        : "border-border/70 bg-background/55 text-foreground";

  const statusLabel =
    viewerBidStatus === "highest"
      ? "You Are Highest Bidder"
      : viewerBidStatus === "outbid"
        ? "You Have Been Outbid"
        : "Ready To Bid";

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className={`rounded-2xl border p-4 ${statusPanelClassName}`}>
        <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-90">
          {statusLabel}
        </p>
        <p className="mt-2 text-sm leading-7">
          {viewerBidStatus === "highest"
            ? "You currently lead this auction. You can still raise your bid if you want extra cushion."
            : viewerBidStatus === "outbid"
              ? "You’ve been outbid. Enter at least the next minimum amount to move back into first place."
              : "Enter the next valid bid amount to join the auction."}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
          <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
            Current Price
          </dt>
          <dd className="mt-2 text-lg font-semibold">
            {formatListingPrice(currentPriceCents)}
          </dd>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
          <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
            Bid Count
          </dt>
          <dd className="mt-2 text-lg font-semibold">{bidCount} bids</dd>
        </div>
      </dl>

      <FieldGroup>
        <Field data-invalid={Boolean(errors.amountDollars)}>
          <FieldLabel htmlFor="listing-bid-amount">Your Bid</FieldLabel>
          <FieldContent>
            <div
              data-slot="input-group"
              className={cn(
                "flex w-full items-center rounded-2xl border border-input/90 bg-input/45 shadow-[inset_0_1px_0_color-mix(in_oklab,white_5%,transparent),0_0_0_1px_color-mix(in_oklab,var(--color-accent)_8%,transparent)] transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                errors.amountDollars &&
                  "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
              )}
            >
              <div
                data-slot="input-group-addon"
                className="flex h-14 shrink-0 items-center pl-4 text-2xl font-semibold text-primary"
              >
                $
              </div>
              <input
                id="listing-bid-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={centsToDollars(minimumNextBidCents)}
                aria-invalid={Boolean(errors.amountDollars)}
                className="h-14 w-full min-w-0 rounded-r-2xl border-0 bg-transparent px-2 pr-4 text-2xl font-semibold text-primary outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-3xl"
                {...register("amountDollars", { valueAsNumber: true })}
              />
            </div>
            <FieldDescription>
              Minimum acceptable bid: {formatListingPrice(minimumNextBidCents)}
            </FieldDescription>
            <FieldError errors={[errors.amountDollars]} />
          </FieldContent>
        </Field>
      </FieldGroup>

      <FieldError errors={[errors.root]} />

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting || isSubmittingAction}
      >
        Place Bid
      </Button>
    </form>
  );
}
