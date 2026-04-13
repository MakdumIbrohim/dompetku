import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dompetku",
  description: "Aplikasi manajemen keuangan harian",
};

import { ThemeProvider } from "./context/ThemeContext";
import { DataProvider } from "./context/DataContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`h-full antialiased ${inter.variable}`}>
      <body className="min-h-full flex flex-col">
        <DataProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </DataProvider>
      </body>
    </html>
  );
}
