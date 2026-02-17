import type { Metadata, Viewport } from "next";
import { Outfit, Geist_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import GlobalLogicWrapper from "@/components/GlobalLogicWrapper";
import BackgroundWrapper from "@/components/BackgroundWrapper";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "PEAK AI — Designed by Sathwik",
  description:
    "Experience the future of search. AI-powered answers, blazing fast, completely free.",
  keywords: ["search engine", "AI search", "Peak", "free search", "Sathwik"],
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "PEAK AI — Designed by Sathwik",
    description: "Experience the future of search. AI-powered answers, blazing fast, completely free.",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = {
  themeColor: "#030312",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${geistMono.variable} ${orbitron.variable} font-sans antialiased`}
      >
        <ClientProviders>
          <BackgroundWrapper />
          <GlobalLogicWrapper />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
