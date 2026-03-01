import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { QueryProvider } from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "Cricket Scoring",
  description: "Local cricket match scoring app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-800">
        <div className="relative min-h-screen">
          {/* App-wide background image (same as login screen) */}
          <div
            className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/api/bg')" }}
            aria-hidden
          />
          <div
            className="fixed inset-0 z-[1] bg-black/40"
            aria-hidden
          />
          <div className="relative z-10 min-h-screen">
            <SessionProvider>
              <QueryProvider>{children}</QueryProvider>
            </SessionProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
