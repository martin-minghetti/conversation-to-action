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
    <nav className="bg-surface-1 shadow-[var(--shadow-neu-sm)]">
      <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-8">
        <Link href="/" className="font-semibold text-accent tracking-tight text-sm font-mono">
          C2A
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Feed
          </Link>
          <Link href="/stats" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Stats
          </Link>
          <Link href="/settings" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
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
