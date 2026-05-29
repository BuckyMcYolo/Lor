import type { Metadata } from "next"
import localFont from "next/font/local"
import "@repo/ui/globals.css"
import { Grain } from "./components/grain"
import { ThemeProvider } from "./components/theme-provider"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
})
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://lor.chat"),
  title: "Lor — Institutional memory for software teams",
  description:
    "Lor is a team chat platform with an AI memory built in. Every conversation, decision, and integration becomes searchable lore your team can ask anything of.",
  openGraph: {
    title: "Lor — Institutional memory for software teams",
    description:
      "The chat where your team's lore lives. Open source, self-hostable, AGPL.",
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
        className={`${geistSans.className} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" forcedTheme="dark">
          {children}
          <Grain />
        </ThemeProvider>
      </body>
    </html>
  )
}
