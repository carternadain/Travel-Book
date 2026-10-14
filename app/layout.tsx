import type { Metadata, Viewport } from "next";
import { Inter, Shippori_Mincho } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Providers } from "@/components/Providers";
import { ScrollProgress } from "@/components/motion";
import { Seigaiha } from "@/components/Japan";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mincho = Shippori_Mincho({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-mincho", display: "swap" });

export const metadata: Metadata = {
  title: "Travel Book",
  description: "Plan trips to the 7 wonders, hidden gems and weekend escapes, see real costs, and keep a memory book of everywhere you've been.",
  appleWebApp: { capable: true, title: "Travel Book", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1013" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mincho.variable}`}>
      <body className="grain min-h-dvh">
        <Providers>
          <ScrollProgress />
          <Nav />
          <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4 sm:px-6 md:pt-24">{children}</main>
          <footer className="relative mt-16 overflow-hidden border-t border-edge">
            <Seigaiha className="absolute inset-0 text-edge2 opacity-60 [mask-image:linear-gradient(to_bottom,transparent,black_70%)]" />
            <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pb-32 pt-10 text-xs text-faint sm:px-6 md:pb-12">
              <p className="jp text-2xl text-dim" lang="ja">
                一期一会 <span className="ml-2 font-sans text-xs tracking-normal text-faint">ichi-go ichi-e · one time, one meeting</span>
              </p>
              <p>
            Photos by{" "}
            <a className="underline underline-offset-2 hover:text-dim" href="https://commons.wikimedia.org" target="_blank" rel="noreferrer">
              Wikimedia Commons
            </a>{" "}
            and Wikipedia contributors, used under their free licences (mostly CC BY-SA). Maps © OpenStreetMap, CARTO.
            Weather by Open-Meteo.
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
