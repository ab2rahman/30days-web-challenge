import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SideMenu from "@/components/SideMenu";
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
  title: "30 Days Web Challenge — Day 2: ASCII Donut Math",
  description:
    "Community-built website. 30 days. 30 features. Strangers decide what gets built. Day 2: A spinning ASCII donut replaces the title, with glitch effects and explosions.",
  openGraph: {
    title: "30 Days Web Challenge — Day 2: ASCII Donut Math",
    description:
      "Community-built website. 30 days. 30 features. Strangers decide what gets built. Day 2: A spinning ASCII donut replaces the title, with glitch effects and explosions.",
    url: "https://abduarrahman.com/30days-web-challenge",
    siteName: "30 Days Web Challenge",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full" style={{ background: "#050B18", color: "#F5F7FA" }}>
        <SideMenu />
        {children}
      </body>
    </html>
  );
}
