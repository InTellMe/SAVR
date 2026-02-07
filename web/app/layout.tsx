import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import PwaRegister from "@/components/PwaRegister";

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
        <PwaRegister />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
