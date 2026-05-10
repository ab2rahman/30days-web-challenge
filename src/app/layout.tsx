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
  title: "30 Days Web Challenge — Day 4: Zoro Santoryu Splash",
  description:
    "Community-built website. 30 days. 30 features. Strangers decide what gets built. Day 4: Pixel art Zoro from One Piece greets you with a cinematic splash screen — running, santoryu reveal, and 3 sword slashes that shatter the screen.",
  openGraph: {
    title: "30 Days Web Challenge — Day 4: Zoro Santoryu Splash",
    description:
      "Community-built website. 30 days. 30 features. Strangers decide what gets built. Day 4: Pixel art Zoro from One Piece greets you with a cinematic splash screen — running, santoryu reveal, and 3 sword slashes that shatter the screen.",
    url: "https://30days.abduarrahman.com",
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
