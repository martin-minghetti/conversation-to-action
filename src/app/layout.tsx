import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Conversation to Action",
};

function Nav() {
  return (
    <nav className="bg-surface-0">
      <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-8">
        <Link href="/" className="font-bold text-accent tracking-tight text-sm font-mono shadow-[var(--shadow-neu-sm)] rounded-xl px-4 py-2 bg-surface-0">
          C2A
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/" className="text-sm text-text-secondary hover:text-text-primary transition-colors px-4 py-2 rounded-xl hover:shadow-[var(--shadow-neu-sm)]">
            Feed
          </Link>
          <Link href="/stats" className="text-sm text-text-secondary hover:text-text-primary transition-colors px-4 py-2 rounded-xl hover:shadow-[var(--shadow-neu-sm)]">
            Stats
          </Link>
          <Link href="/settings" className="text-sm text-text-secondary hover:text-text-primary transition-colors px-4 py-2 rounded-xl hover:shadow-[var(--shadow-neu-sm)]">
            Settings
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
