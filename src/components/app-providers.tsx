"use client";

import { Toaster } from "sonner";
import { RealtimeProvider } from "@/features/realtime/provider";

type AppProvidersProps = {
  children: React.ReactNode;
  viewerId?: string | null;
};

export function AppProviders({ children, viewerId }: AppProvidersProps) {
  return (
    <RealtimeProvider viewerId={viewerId}>
      {children}
      <Toaster richColors position="top-right" />
    </RealtimeProvider>
  );
}
