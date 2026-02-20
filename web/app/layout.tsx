import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import PwaRegister from "@/components/PwaRegister";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "SAVR - AI-Powered Smart Cooking Assistant",
  description: "Transform your pantry into restaurant-quality meals with AI-powered recipe generation. Smart inventory, personalized recipes, meal planning, and pet-safe treats.",
  keywords: "AI cooking, recipe generator, meal planning, smart kitchen, pet recipes, pantry management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased">
        {/* Google Analytics - G-WXDLLPJ8T2 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-WXDLLPJ8T2"
          strategy="afterInteractive"
        />
        <Script id="gtag-1" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-WXDLLPJ8T2');
          `}
        </Script>

        {/* Google Analytics - G-2HGG95TESN */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2HGG95TESN"
          strategy="afterInteractive"
        />
        <Script id="gtag-2" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-2HGG95TESN');
          `}
        </Script>

        <PwaRegister />
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
