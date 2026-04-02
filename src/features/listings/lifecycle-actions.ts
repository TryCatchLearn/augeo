"use server";

import { runAuctionLifecycle } from "@/server/auctions/lifecycle";

export async function runAuctionLifecycleDevAction() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Auction lifecycle can only be triggered manually in development.",
    );
  }

  return runAuctionLifecycle();
}
