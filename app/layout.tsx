import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MstrMnd — Crack the Number",
  description: "A fast, configurable number-code guessing game.",
  applicationName: "MstrMnd",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "MstrMnd" },
};

export const viewport: Viewport = { themeColor: "#151a16", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
