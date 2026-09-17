import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { isAdmin } from "@/lib/admin";
import { getUsernameCookie } from "@/lib/username";
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
  description: "Public roulette standings for hosted Sleeper leagues.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [username, admin] = await Promise.all([getUsernameCookie(), isAdmin()]);
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
            <span className="ml-auto text-emerald-100/60" suppressHydrationWarning>
              {username ? (
                <a href="/?change=1" className="hover:text-emerald-50">
                  {username}
                </a>
              ) : admin ? (
                "commissioner"
              ) : null}
            </span>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
