import React from "react"
import type { Metadata } from 'next'
import { GeistPixelLine } from 'geist/font/pixel'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Huginn — Your World Cup in WhatsApp',
  description: 'Live goals, red cards, odds shifts, and AI commentary delivered to your WhatsApp group. No app. No signup. Just football.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

import { PushNotifications } from "@/components/push-notifications"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..800&family=Tourney:wght@600;800&display=swap" rel="stylesheet" />
      </head>
      <body className={`font-sans antialiased ${GeistPixelLine.variable}`}>
        {children}
        <PushNotifications />
        <Analytics />
      </body>
    </html>
  )
}
