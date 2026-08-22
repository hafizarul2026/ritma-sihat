import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Ritma — Kalori, Air & Senaman Harian",
    template: "%s · Ritma",
  },
  description:
    "Pantau kalori, air dan senaman mengikut rentak hari biasa, puasa atau kerja luar.",  applicationName: "Ritma",
  manifest: "/manifest.webmanifest",
  themeColor: "#18232a",
  appleWebApp: { capable: true, title: "Ritma", statusBarStyle: "default" },
  keywords: [
    "kira kalori",
    "water intake",
    "senaman harian",
    "makanan Malaysia",
    "nasi campur",
  ],
  openGraph: {
    title: "Ritma — Kalori kena pantau",
    description:
      "Catat kalori, air dan senaman ikut rentak anda—hari biasa, puasa atau kerja luar.",
    type: "website",
    locale: "ms_MY",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ritma — Kalori kena pantau",
    description: "Pantau kalori, air dan senaman setiap hari.",
  },
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
    <html lang="ms">
      <body className={[geistSans.variable, geistMono.variable].join(" ")}>
        {children}
      </body>
    </html>
  );
}