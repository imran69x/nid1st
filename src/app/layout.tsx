import type { Metadata } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { UserAuthProvider } from "@/lib/services/userAuthContext";
import { HeaderAndSidebar } from "@/components/layout/HeaderAndSidebar";
import { AccountLockedModal } from "@/components/auth/AccountLockedModal";
import { DailyWelcomeModal } from "@/components/layout/DailyWelcomeModal";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-noto-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bangladesh NID & Birth Certificate Smart Scanner",
  description: "Fast, accurate AI OCR scanner for Bangladeshi National ID and Birth Registration Certificates.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="bn"
      className={`${inter.variable} ${notoSansBengali.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900 flex flex-col"
        suppressHydrationWarning
      >
        <UserAuthProvider>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          <AccountLockedModal />
          <DailyWelcomeModal />
          <HeaderAndSidebar />
          <main className="flex-1">{children}</main>
          <footer className="py-4 border-t border-slate-200/80 bg-white/70 text-center text-xs text-slate-500">
            <span>Developer: </span>
            <a
              href="https://wa.me/8801706338181"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors ml-1"
              title="WhatsApp: 01706338181"
            >
              MD IMRAN HOSSAIN NOYON
            </a>
          </footer>
        </UserAuthProvider>
      </body>
    </html>
  );
}
