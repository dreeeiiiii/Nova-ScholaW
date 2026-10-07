import type { Metadata } from "next";
import { DM_Sans, Raleway } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
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
