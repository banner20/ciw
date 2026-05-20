import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SM Tool — Creative Intelligence",
  description: "Analyse short-form video content with precision",
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'SM Tool',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0d0d0f" />
      </head>
      <body className={`${inter.className} h-full bg-[#0d0d0f] text-zinc-100 antialiased`}>
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1a1a1f',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#e4e4e7',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  );
}
