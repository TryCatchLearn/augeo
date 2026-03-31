import { NextResponse } from "next/server";
import { getSession } from "@/features/auth/session";
import { createAblyTokenRequest } from "@/server/ably";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const tokenRequest = await createAblyTokenRequest(session?.user.id);

  return NextResponse.json(tokenRequest, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
