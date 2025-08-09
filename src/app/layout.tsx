import type { Metadata } from "next";
import { Exo_2, Lato } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Script from "next/script";
import { SignUpModal } from "@/components/SignUpModal"; // Import the modal

const fontHeading = Exo_2({ subsets: ["latin"], display: 'swap', variable: '--font-heading' });
const fontBody = Lato({ subsets: ["latin"], display: 'swap', weight: ['400', '700'], variable: '--font-body' });

export const metadata: Metadata = { /* ... */ };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en" className={`${fontHeading.variable} ${fontBody.variable}`}>
      <body className="bg-brand-bg font-body">
        <SignUpModal /> {/* Render the modal here */}
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="relative">{children}</main>
          <Footer />
        </div>
        <Script src="https://checkout.flutterwave.com/v3.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}