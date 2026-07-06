import './globals.css'
import type { Metadata, Viewport } from 'next'
import { siteConfig } from '@/lib/site'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { PwaRegister } from '@/components/pwa/PwaRegister'
import { getSiteUrl } from '@/lib/url'

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteConfig.name,
  title: {
    default: `${siteConfig.name} | Hyra, köpa och publicera bostäder`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'sv_SE',
    url: '/',
    siteName: siteConfig.name,
    title: `${siteConfig.name} | Hyra, köpa och publicera bostäder`,
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} | Hyra, köpa och publicera bostäder`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#111827',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="sv" data-scroll-behavior="smooth">
      <body className="pb-16 md:pb-0">
        <Header />
        <main>{children}</main>
        <Footer />
        <MobileBottomNav />
        <PwaRegister />
      </body>
    </html>
  )
}
