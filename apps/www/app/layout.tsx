import type { Metadata } from "next"
import { Fraunces } from "next/font/google"
import localFont from "next/font/local"
import "@repo/ui/globals.css"
import { Grain } from "./components/grain"
import { SiteHeader } from "./components/site-header"
import { ThemeProvider } from "./components/theme-provider"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
})
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
})
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://lor.chat"),
  title: "Lor — The AI multiplayer workspace for teams",
  description:
    "Lor is the AI multiplayer workspace for teams. Every conversation, decision, and integration becomes searchable lore your team can ask anything of.",
  icons: {
    // SVG icon — color-scheme aware (defined inline in the SVG via
    // prefers-color-scheme media query)
    icon: [
      { url: "/lor-icon.svg", type: "image/svg+xml" },
      // Fallback for browsers that don't render SVG favicons
      { url: "/lor-bg-removed-square.png", type: "image/png" },
    ],
    shortcut: "/lor-icon.svg",
    // Apple touch icon (iOS home screen) ignores prefers-color-scheme
    // anyway — keep the PNG variant for it
    apple: "/lor-bg-removed-square.png",
  },
  openGraph: {
    title: "Lor — The AI multiplayer workspace for teams",
    description:
      "The AI multiplayer workspace for teams. Open source, self-hostable, AGPL.",
    url: "https://lor.chat",
    siteName: "Lor",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.className} ${geistMono.variable} ${fraunces.variable} antialiased`}
      >
        <ThemeProvider attribute="class" forcedTheme="dark">
          <SiteHeader />
          {children}
          <Grain />
        </ThemeProvider>
      </body>
    </html>
  )
}
