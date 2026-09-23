import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intranet des agents · Ville du Lamentin",
  description: "Outils, documents et actualités des agents de la Ville du Lamentin.",
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
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
