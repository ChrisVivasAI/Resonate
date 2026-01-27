'use client'

import { Bebas_Neue, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${inter.variable} ${jetbrains.variable}`}>
      <head>
        <title>RESONATE | Creative Agency</title>
        <meta name="description" content="We create visuals, stories, and sound that cut through the noise and connect deeply." />
        <link rel="icon" href="/favicon.png" />
      </head>
      <body className="font-body">
        <Providers>
          {/* Subtle background for dashboard pages */}
          <div className="fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-0 bg-[#1a1a1a]" />
            <div className="absolute top-0 -left-40 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[128px] animate-float" />
            <div className="absolute bottom-0 -right-40 w-[500px] h-[500px] bg-white/[0.015] rounded-full blur-[128px] animate-float-delayed" />
          </div>

          {children}
        </Providers>
      </body>
    </html>
  )
}
