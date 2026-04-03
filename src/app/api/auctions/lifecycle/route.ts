import { NextResponse } from "next/server";
import { getRequiredEnv } from "@/lib/env";
import { runAuctionLifecycle } from "@/server/auctions/lifecycle";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = getRequiredEnv("AUCTION_LIFECYCLE_CRON_SECRET");

  if (
    !authHeader?.startsWith("Bearer ") ||
    authHeader.slice("Bearer ".length).trim() !== expectedSecret
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const summary = await runAuctionLifecycle();

  return NextResponse.json(summary, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
