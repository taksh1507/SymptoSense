import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "./context/AppContext";
import { Providers } from "./providers";
import { Source_Serif_4, IBM_Plex_Sans, Noto_Sans_Devanagari } from 'next/font/google';

const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });
const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body', display: 'swap' });
const devanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], weight: ['400', '500', '600', '700'], variable: '--font-devanagari', display: 'swap' });

export const metadata: Metadata = {
  title: "SymptoSense — Understand your next step",
  description: "Symptom triage in English, Hindi and Marathi. Understand urgency and prepare for a conversation with your doctor. Decision support only, not a diagnosis.",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg" },
  keywords: "symptom checker, triage, health assessment, medical, fastapi, nextjs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} ${devanagari.variable}`}>
        <Providers>
          <AppProvider>
            {children}
          </AppProvider>
        </Providers>
      </body>
    </html>
  );
}
