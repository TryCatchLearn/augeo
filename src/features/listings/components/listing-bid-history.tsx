import type { BidHistoryRow } from "@/features/listings/queries";
import {
  formatBidTimestamp,
  formatListingPrice,
} from "@/features/listings/utils";

type ListingBidHistoryProps = {
  bids: BidHistoryRow[];
};

export function ListingBidHistory({ bids }: ListingBidHistoryProps) {
  return (
    <div className="space-y-4">
      {bids.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-background/40 p-5">
          <p className="text-sm leading-7 text-muted-foreground">
            No bids yet. The first accepted bid will appear here.
          </p>
        </div>
      ) : (
        <div className="max-h-[25rem] space-y-3 overflow-y-auto pr-1">
          {bids.map((bid) => (
            <div
              key={bid.id}
              className="rounded-2xl border border-border/70 bg-background/55 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{bid.bidderName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatBidTimestamp(bid.createdAt)}
                  </p>
                </div>
                <p className="text-lg font-semibold">
                  {formatListingPrice(bid.amountCents)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
