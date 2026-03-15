import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Julius - Smart Grocery",
  description: "Acompanhe preços, promoções e gastos nos mercados da sua região",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <Sidebar />
        <main className="md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
          {children}
        </main>
      </body>
    </html>
  );
}
