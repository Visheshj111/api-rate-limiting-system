import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "QueueShield",
  description: "Distributed API rate limiting & job scheduling",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="app-bg min-h-screen font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
