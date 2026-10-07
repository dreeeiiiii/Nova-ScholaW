import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const dmSans = localFont({
  src: "./_fonts/dm-sans-latin.woff2",
  variable: "--font-dm-sans",
  weight: "100 1000",
  display: "swap",
});

const raleway = localFont({
  src: "./_fonts/raleway-latin.woff2",
  variable: "--font-raleway",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nova Schola Hub: A Web-Based Announcement and Event Management System for Nova Schola Tanauan",
  description: "Official announcements and image-only Event Management for Nova Schola Tanauan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${raleway.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">
        <a href="#main-content" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
