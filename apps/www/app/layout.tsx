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
  title: "Lor — The AI multiplayer workspace for teams",
  description:
    "Lor is the AI multiplayer workspace for teams. Every conversation, decision, and integration becomes searchable lore your team can ask anything of.",
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
