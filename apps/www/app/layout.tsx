import type { Metadata } from "next"
import { Cinzel, Fraunces } from "next/font/google"
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
const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://lor.chat"),
  title: "Lor — The AI multiplayer workspace for teams",
  description:
    "Lor is the AI multiplayer workspace for teams. Every conversation, decision, and integration becomes searchable lore your team can ask anything of.",
  icons: {
    // Castle mark (purple rounded square, transparent corners). Crisp SVG
    // primary, PNG fallback + apple-touch.
    icon: [
      { url: "/lor-icon.svg", type: "image/svg+xml" },
      { url: "/lor-bg-removed-square.png", type: "image/png" },
    ],
    shortcut: "/lor-icon.svg",
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
        className={`${geistSans.className} ${geistMono.variable} ${fraunces.variable} ${cinzel.variable} antialiased`}
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
