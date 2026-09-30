import type { Metadata, Viewport } from "next"
import { DM_Sans, Geist_Mono, Inter_Tight } from "next/font/google"
import "./globals.css"

// Free look-alikes for Félix Pago's licensed fonts: Saans -> DM Sans, Plain -> Inter Tight.
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" })
const interTight = Inter_Tight({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-inter-tight" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "Félix · SRE AI Agent — Log Ingestion & Optimization",
  description: "Ingest, compress, and semantically search Kubernetes and AWS logs. AI-powered incident detection and root-cause analysis for SRE teams.",
  icons: { icon: "/brand/felix-icon.svg" },
}

export const viewport: Viewport = {
  themeColor: "#fefcf9",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${interTight.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
