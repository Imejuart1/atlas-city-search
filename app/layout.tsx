import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas — City Search",
  description: "A fast, accessible city autocomplete powered by Open-Meteo.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
