import { resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: resolve(import.meta.dirname, "../../.env") });

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
};

export default nextConfig;
