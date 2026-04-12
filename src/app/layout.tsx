import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conversation to Action",
};

function Nav() {
  return (
    <nav className="border-b bg-white">
      <div className="max-w-3xl mx-auto px-4 h-12 flex items-center gap-6">
        <Link href="/" className="font-bold text-gray-900 text-sm">
          C2A
        </Link>
        <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
          Feed
        </Link>
        <Link href="/stats" className="text-sm text-gray-600 hover:text-gray-900">
          Stats
        </Link>
        <Link href="/settings" className="text-sm text-gray-600 hover:text-gray-900">
          Settings
        </Link>
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
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
