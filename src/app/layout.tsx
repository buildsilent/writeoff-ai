import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaxSnapper - Snap your receipts. Keep your money.",
  description: "Snap your receipts. Keep your money. AI-powered receipt analysis for freelancers and small business owners.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInForceRedirectUrl={`${appUrl}/dashboard`}
      signUpFallbackRedirectUrl={`${appUrl}/dashboard`}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
          <UpgradeBanner />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
