import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Creative Intelligence Workspace",
  description: "Analyze short-form video content with precision",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
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
