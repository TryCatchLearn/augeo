export function isGuestRealtimePath(pathname: string) {
  if (pathname === "/listings") {
    return true;
  }

  return /^\/listings\/[^/]+$/.test(pathname);
}

export function getRealtimeConnectionMode(input: {
  pathname: string;
  viewerId?: string | null;
}) {
  if (input.viewerId) {
    return "authenticated" as const;
  }

  if (isGuestRealtimePath(input.pathname)) {
    return "guest" as const;
  }

  return "none" as const;
}
