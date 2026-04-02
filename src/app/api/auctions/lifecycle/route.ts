import { NextResponse } from "next/server";
import { getRequiredEnv } from "@/lib/env";
import { runAuctionLifecycle } from "@/server/auctions/lifecycle";

export const dynamic = "force-dynamic";

function buildJsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function getBearerToken(headerValue: string | null) {
  if (!headerValue?.startsWith("Bearer ")) {
    return null;
  }

  return headerValue.slice("Bearer ".length).trim();
}

export async function POST(request: Request) {
  const providedSecret = getBearerToken(request.headers.get("authorization"));
  const expectedSecret = getRequiredEnv("AUCTION_LIFECYCLE_CRON_SECRET");

  if (!providedSecret) {
    return buildJsonResponse({ error: "Unauthorized" }, 401);
  }

  if (providedSecret !== expectedSecret) {
    return buildJsonResponse({ error: "Unauthorized" }, 401);
  }

  const summary = await runAuctionLifecycle();

  return buildJsonResponse(summary, 200);
}
