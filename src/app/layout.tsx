import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "House Plan Analyzer",
  description:
    "Upload CAD files to estimate construction costs, timelines, and materials",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-cream text-ink dark:bg-charcoal-900 dark:text-stone-100">
        <Navbar />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
