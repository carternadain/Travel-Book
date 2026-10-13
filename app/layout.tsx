import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "Travel Book",
  description: "Plan trips to the 7 wonders and hidden gems, see real costs, and keep a memory book of everywhere you've been.",
  appleWebApp: { capable: true, title: "Travel Book", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0b0a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body className="grain min-h-dvh">
        <Providers>
          <Nav />
          <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4 sm:px-6 md:pt-24">{children}</main>
          <footer className="mx-auto w-full max-w-6xl px-4 pb-32 pt-8 text-xs text-faint sm:px-6 md:pb-12">
            Photos by{" "}
            <a className="underline underline-offset-2 hover:text-dim" href="https://commons.wikimedia.org" target="_blank" rel="noreferrer">
              Wikimedia Commons
            </a>{" "}
            and Wikipedia contributors, used under their free licences (mostly CC BY-SA). Maps © OpenStreetMap, CARTO.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
