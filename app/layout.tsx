import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roulette Standings",
  description: "Commissioner dashboard for Sleeper roulette standings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#07140c] text-white">
        <header className="border-b border-white/10">
          <nav className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3 text-sm">
            <a href="/" className="font-semibold text-emerald-100">
              Roulette
            </a>
            <a href="/admin" className="text-emerald-100/70 hover:text-emerald-50">
              Admin
            </a>
            <a href="/weekly" className="text-emerald-100/70 hover:text-emerald-50">
              Weekly
            </a>
            <a href="/bracket" className="text-emerald-100/70 hover:text-emerald-50">
              Bracket
            </a>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
