const { resolve } = await import("node:path")
const dotenv = await import("dotenv")
dotenv.config({ path: resolve(import.meta.dirname, "../../.env") })

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default nextConfig
