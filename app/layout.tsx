import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import SiteChrome from "@/components/SiteChrome";
import Feedback from "@/components/Feedback";

import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://finopstrainings.com"),
  title: {
    default: "FinOps Trainings | Cloud, AI, Security & Corporate Training",
    template: "%s | FinOps Trainings",
  },
  description:
    "Premium instructor-led training for FinOps, cloud, AI, cybersecurity, Microsoft, AWS, Cisco, ISO, and corporate upskilling programs.",
  keywords: [
    "FinOps training",
    "cloud training",
    "corporate training",
    "Microsoft certification",
    "AWS training",
    "cyber security training",
    "AI training",
  ],
  authors: [{ name: "FinOps Trainings" }],
  creator: "FinOps Trainings",
  publisher: "FinOps Trainings",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "FinOps Trainings",
    title: "FinOps Trainings | Premium Technology Training",
    description:
      "Build job-ready skills with expert-led cloud, AI, security, and corporate training programs.",
    images: [
      {
        url: "/hero.jpg",
        width: 1200,
        height: 630,
        alt: "FinOps Trainings",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FinOps Trainings | Premium Technology Training",
    description:
      "Expert-led training programs for cloud, AI, cybersecurity, and enterprise teams.",
    images: ["/hero.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >


      <body className="min-h-full flex flex-col">
        <SiteChrome>{children}</SiteChrome>
        <Feedback />
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}    