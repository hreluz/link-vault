import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { VaultProvider } from "@/lib/context/VaultContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Link Vault",
  description: "Your personal link bookmarking app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full overscroll-y-none antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var isDark=localStorage.getItem('theme')==='dark';if(isDark)document.documentElement.classList.add('dark');var a=localStorage.getItem(isDark?'accent_dark':'accent_light');if(a)document.documentElement.dataset.accent=a;var s=localStorage.getItem('surface_family');if(s)document.documentElement.dataset.surface=s}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-surface-50 dark:bg-surface-950">
        <ThemeProvider>
          <VaultProvider>
            {children}
            <Toaster position="bottom-right" richColors />
          </VaultProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
