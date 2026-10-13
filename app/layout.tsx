import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "./context/AppContext";
import { Providers } from "./providers";


export const metadata: Metadata = {
  title: "SymptoSense – Smart Symptom Triage System",
  description: "AI-powered smart symptom triage system built with FastAPI, SQLite and Next.js. Decision support for health assessment.",
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
      <body>
        <Providers>
          <AppProvider>
            {children}
          </AppProvider>
        </Providers>
      </body>
    </html>
  );
}