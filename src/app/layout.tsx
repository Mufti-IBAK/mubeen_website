import type { Metadata } from "next";
import { Exo_2, Lato } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Script from "next/script";
import { SignUpModal } from "@/components/SignUpModal"; // Import the modal
import { Toaster } from "@/components/ui/toaster";

const fontHeading = Exo_2({ subsets: ["latin"], display: 'swap', variable: '--font-heading' });
const fontBody = Lato({ subsets: ["latin"], display: 'swap', weight: ['400', '700'], variable: '--font-body' });

export const metadata: Metadata = {
  title: "Mubeen Academy - Online Quran & Islamic Studies",
  description: "Join Mubeen Academy for comprehensive online Quran and Islamic studies. Expert teachers, flexible schedules, and structured learning for all ages.",
  keywords: ["Quran", "Islamic Studies", "Online Classes", "Mubeen Academy", "Tajweed", "Hifz"],
  authors: [{ name: "Mubeen Academy" }],
  openGraph: {
    title: "Mubeen Academy - Online Quran & Islamic Studies",
    description: "Join Mubeen Academy for comprehensive online Quran and Islamic studies.",
    type: "website",
    siteName: "Mubeen Academy",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en" className={`${fontHeading.variable} ${fontBody.variable}`}>
      <body className="bg-[hsl(var(--background))] text-[hsl(var(--foreground))] font-sans antialiased transition-colors">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-white text-black p-2 rounded">Skip to main content</a>
        <SignUpModal />
        <div className="flex flex-col min-h-screen">
          <Header />
          <main id="main-content" className="relative flex-1">{children}</main>
          <Footer />
        </div>
        <Toaster />
        <Script src="https://checkout.flutterwave.com/v3.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
