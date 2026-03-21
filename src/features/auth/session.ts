import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/server/auth";

export const getSession = cache(async () => {
  const requestHeaders = new Headers(await headers());

  return auth.api.getSession({
    headers: requestHeaders,
  });
});

export async function requireSession(redirectTo?: string) {
  const session = await getSession();

  if (!session) {
    const next = redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : "";

    redirect(`/login${next}`);
  }

  return session;
}

export type AppSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;
