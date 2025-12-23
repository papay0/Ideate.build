import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import "./globals.css";

/**
 * Typography Configuration
 *
 * OpenDesign uses a refined editorial typography system:
 * - Playfair Display: Elegant serif for headlines and display text
 * - Geist: Modern sans-serif for body text and UI elements
 * - Geist Mono: Monospace for code and technical content
 */

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://opendesign.build"),
  title: {
    default: "OpenDesign - AI App Designer | Create Mobile & Desktop Mockups",
    template: "%s | OpenDesign",
  },
  description:
    "Turn your ideas into beautiful mobile and desktop app mockups instantly with AI. Open source, free to use. Bring your own API key. No design skills required.",
  keywords: [
    "AI app designer",
    "AI mockup generator",
    "AI UI design",
    "app design tool",
    "mobile app mockup",
    "desktop app design",
    "free AI design tool",
    "open source design",
    "UI mockup generator",
    "app prototype",
  ],
  authors: [{ name: "OpenDesign" }],
  creator: "OpenDesign",
  publisher: "OpenDesign",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://opendesign.build",
    siteName: "OpenDesign",
    title: "OpenDesign - AI App Designer | Mobile & Desktop Mockups in Minutes",
    description:
      "Turn your ideas into beautiful app mockups instantly with AI. Open source, free to use, bring your own API key.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "OpenDesign - AI App Designer",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenDesign - AI App Designer",
    description:
      "Turn ideas into beautiful mobile & desktop app mockups with AI. Open source & free.",
    images: ["/api/og"],
    creator: "@opendesignai",
    site: "@opendesignai",
  },
  alternates: {
    canonical: "https://opendesign.build",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "OpenDesign",
  description:
    "AI-powered app design mockup generator for mobile and desktop. Create beautiful UI mockups from text descriptions.",
  url: "https://opendesign.build",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "AI-powered design generation",
    "Mobile and desktop mockups",
    "Real-time streaming preview",
    "BYOK (Bring Your Own Key)",
    "HTML + Tailwind CSS export",
    "Open source",
  ],
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "OpenDesign",
  url: "https://opendesign.build",
  logo: "https://opendesign.build/logo.png",
  sameAs: ["https://github.com/papay0/opendesign"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <Script
            id="json-ld-software"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
            }}
          />
          <Script
            id="json-ld-organization"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
            }}
          />
        </head>
        <body
          className={`${playfair.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
