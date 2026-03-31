import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/features/auth/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Augeo Auctions",
  description: "A clean, modern auction marketplace for standout listings.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-screen overflow-hidden antialiased`}
      >
        <AppProviders viewerId={session?.user.id}>
          <div className="flex h-screen flex-col bg-background">
            <SiteHeader />
            <main className="app-scroll relative z-0 flex min-h-0 flex-1 flex-col overflow-y-auto isolate">
              <div className="flex-1">{children}</div>
              <SiteFooter />
            </main>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
