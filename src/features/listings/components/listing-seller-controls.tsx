"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Button, LinkButton } from "@/components/ui/button";
import {
  deleteDraftListingAction,
  publishListingAction,
  returnListingToDraftAction,
} from "@/features/listings/actions";
import {
  canDeleteListing,
  canPublishListing,
  canReturnToDraft,
  type ListingStatus,
} from "@/features/listings/domain";
import { formatListingPrice } from "@/features/listings/utils";

type ListingSellerControlsProps = {
  listing: {
    id: string;
    title: string;
    description: string;
    location: string;
    category: string;
    condition: string;
    status: ListingStatus;
    startingBidCents: number;
    bidCount: number;
    reservePriceCents: number | null;
    startsAt: Date | null;
    endsAt: Date;
  };
};

function getActionCopy(status: ListingStatus) {
  if (status === "draft") {
    return "Refine the draft on its own editing screen, keep it private until you are ready, and publish explicitly when the details are final.";
  }

  if (status === "scheduled") {
    return "This listing is scheduled. You can return it to draft if you need more edits before it goes live.";
  }

  if (status === "active") {
    return "This listing is active. Phase 1 still allows returning it to draft because no bids exist yet.";
  }

  return "This auction has ended, so seller actions are no longer available on this detail page.";
}

export function ListingSellerControls({ listing }: ListingSellerControlsProps) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const runAction = (
    setPending: (value: boolean) => void,
    action: () => Promise<unknown>,
    onSuccess?: () => void,
  ) => {
    startTransition(async () => {
      try {
        setPending(true);
        await action();
        onSuccess?.();
        router.refresh();
      } finally {
        setPending(false);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
        <p className="text-sm leading-7 text-muted-foreground">
          {getActionCopy(listing.status)}
        </p>
      </div>

      <dl className="grid gap-3">
        <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
          <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
            Starting Bid
          </dt>
          <dd className="mt-2 text-lg font-semibold">
            {formatListingPrice(listing.startingBidCents)}
          </dd>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
          <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
            Reserve Price
          </dt>
          <dd className="mt-2 text-lg font-semibold">
            {listing.reservePriceCents === null
              ? "No reserve"
              : formatListingPrice(listing.reservePriceCents)}
          </dd>
        </div>
      </dl>

      {canPublishListing(listing.status) ? (
        <div className="flex flex-col gap-3">
          <LinkButton href={`/listings/${listing.id}/edit`} size="lg">
            Refine Listing
          </LinkButton>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            disabled={isPublishing}
            onClick={() =>
              runAction(
                setIsPublishing,
                () => publishListingAction({ listingId: listing.id }),
                undefined,
              )
            }
          >
            Publish
          </Button>
          {canDeleteListing(listing.status) ? (
            <ConfirmActionDialog
              trigger={
                <Button variant="destructive" size="lg">
                  Delete
                </Button>
              }
              title="Delete Draft Listing"
              description="This permanently removes the listing and its uploaded images. This action cannot be undone."
              confirmLabel="Delete Draft"
              confirmVariant="destructive"
              confirmSize="lg"
              isPending={isDeleting}
              onConfirm={() =>
                runAction(
                  setIsDeleting,
                  () => deleteDraftListingAction({ listingId: listing.id }),
                  () => {
                    router.push("/dashboard/listings?status=draft");
                  },
                )
              }
            />
          ) : null}
        </div>
      ) : null}

      {canReturnToDraft(listing.status, listing.bidCount) ? (
        <ConfirmActionDialog
          trigger={
            <Button type="button" size="lg" variant="secondary">
              Return to Draft
            </Button>
          }
          title="Return Listing To Draft"
          description="Returning this listing to draft removes it from the live auction flow and prevents it from receiving bids until you publish it again."
          confirmLabel="Return to Draft"
          confirmVariant="secondary"
          confirmSize="lg"
          isPending={isReturning}
          onConfirm={() =>
            runAction(
              setIsReturning,
              () => returnListingToDraftAction({ listingId: listing.id }),
              undefined,
            )
          }
        />
      ) : null}
    </div>
  );
}
