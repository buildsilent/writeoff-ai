import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { StructuredData } from "@/components/StructuredData";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxsnapper.com';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'TaxSnapper — Find Hidden Tax Deductions Instantly',
    template: '%s | TaxSnapper',
  },
  description:
    'AI-powered receipt scanner that finds and categorizes tax deductions for freelancers, creators, and small business owners. Try free.',
  keywords: ['tax deductions', 'receipt scanner', 'freelancer taxes', 'small business', 'AI tax', 'expense tracking'],
  authors: [{ name: 'TaxSnapper', url: appUrl }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: appUrl,
    siteName: 'TaxSnapper',
    title: 'TaxSnapper — Find Hidden Tax Deductions Instantly',
    description:
      'AI-powered receipt scanner that finds and categorizes tax deductions for freelancers, creators, and small business owners. Try free.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'TaxSnapper' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaxSnapper — Find Hidden Tax Deductions Instantly',
    description:
      'AI-powered receipt scanner that finds and categorizes tax deductions for freelancers, creators, and small business owners. Try free.',
  },
  robots: {
    index: true,
    follow: true,
  },
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
          <StructuredData />
          {children}
          <UpgradeBanner />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
