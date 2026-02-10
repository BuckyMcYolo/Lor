import { z } from "zod";

// In development, load .env files. In production, env vars are set by the platform.
if (process.env.NODE_ENV !== "production") {
	const { resolve } = await import("node:path");
	const dotenv = await import("dotenv");
	dotenv.config({ path: resolve(process.cwd(), ".env") });
	dotenv.config({ path: resolve(process.cwd(), "../../.env") });
}

const serverSchema = z.object({
	DATABASE_URL: z.string().url(),
	PORT: z.coerce.number().default(8080),
});

export const env = serverSchema.parse(process.env);
