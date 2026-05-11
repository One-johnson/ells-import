import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SiteHeaderClient } from "@/components/site-header-client";
import { SiteFooter } from "@/components/site-footer";
import { StorefrontMain } from "@/components/storefront-main";
import { AuthProvider } from "@/providers/auth-provider";
import { GuestCartProvider } from "@/providers/guest-cart-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ConvexClientProvider } from "./ConvexClientProvider";
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
  applicationName: "Ells Import",
  title: {
    default: "Ells Import",
    template: "%s · Ells Import",
  },
  description: "Ells Import storefront",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ells Import",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ConvexClientProvider>
            <AuthProvider>
              <GuestCartProvider>
                <div className="flex min-h-full min-h-[100dvh] flex-1 flex-col">
                  <SiteHeaderClient />
                  <StorefrontMain>{children}</StorefrontMain>
                  <SiteFooter />
                  <MobileBottomNav />
                  <Toaster position="top-center" richColors closeButton />
                </div>
              </GuestCartProvider>
            </AuthProvider>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
