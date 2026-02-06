import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "SAVR - Smart Assistant for Virtual Recipes",
  description: "AI cooking assistant for you and your pets. Recipes from your pantry, meal plans, and pet-safe treats.",
  manifest: "/manifest.json",
  themeColor: "#ea580c",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <PwaRegister />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
