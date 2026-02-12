if (process.env.NODE_ENV !== "production") {
  const { resolve } = await import("node:path")
  const dotenv = await import("dotenv")
  dotenv.config({ path: resolve(import.meta.dirname, "../../.env") })
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
  },
}

export default nextConfig
