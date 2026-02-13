import type { Metadata } from "next"
import localFont from "next/font/local"
// import { ThemeProvider } from "./components/theme-provider";
import "@repo/ui/globals.css"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
})
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "Townhall — Community chat. Nothing else.",
  description:
    "A free, open source chat app for communities of any size. No ads, no AI, no identity verification.",
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
        {/* <ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				> */}
        {children}
        {/* </ThemeProvider> */}
      </body>
    </html>
  )
}
