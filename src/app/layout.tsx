import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "./theme-toggle";

// Runs synchronously during HTML parsing, before first paint: honor a saved
// choice, otherwise fall back to the OS preference. Prevents a theme flash.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(!t)t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rosin - Your Violin Accompanist",
  description: "A precision tuner for the returning violinist.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-50 border-b border-border backdrop-blur-md [background:color-mix(in_srgb,var(--bg)_88%,transparent)]">
          <div className="mx-auto flex w-full max-w-[960px] items-center justify-between px-[var(--sp-5)] py-[var(--sp-3)]">
            <div className="flex items-center gap-[var(--sp-6)]">
              <Link
                href="/"
                className="flex items-center gap-[var(--sp-3)] font-semibold tracking-[-0.02em]"
              >
                <span
                  className="inline-block h-[22px] w-[22px] rounded-[var(--r-sm)]"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--gold-bright), var(--gold-deep))",
                  }}
                />
                Rosin
              </Link>
              <nav className="flex items-center gap-[var(--sp-4)] font-mono text-xs uppercase tracking-[0.06em] text-text-mid">
                <Link
                  href="/"
                  className="transition-colors duration-[var(--dur-1)] hover:text-gold"
                >
                  Tuner
                </Link>
                <Link
                  href="/accompanist"
                  className="transition-colors duration-[var(--dur-1)] hover:text-gold"
                >
                  Accompanist
                </Link>
              </nav>
            </div>
            <ThemeToggle />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
