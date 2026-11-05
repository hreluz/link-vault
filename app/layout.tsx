import type { Metadata, Viewport } from "next";
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

// viewportFit 'cover' lets env(safe-area-inset-*) report the iPhone home-indicator
// and notch insets, which the bottom nav, sheets and toasts pad by (SPEC 35).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
            __html: `try{var mode=localStorage.getItem('theme_mode')||'system';var isDark=mode==='dark'||(mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(isDark)document.documentElement.classList.add('dark');var a=localStorage.getItem(isDark?'accent_dark':'accent_light');if(a)document.documentElement.dataset.accent=a;var s=localStorage.getItem('surface_family');if(s)document.documentElement.dataset.surface=s}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-surface-50 dark:bg-surface-950">
        <ThemeProvider>
          <VaultProvider>
            {children}
            {/* On phones, lift toasts above the dashboard's fixed bottom nav (5rem + home indicator). */}
            <Toaster
              position="bottom-right"
              richColors
              mobileOffset={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
            />
          </VaultProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
