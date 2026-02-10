import { resolve } from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Load .env from cwd first, then monorepo root as fallback
dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), "../../.env") });

const serverSchema = z.object({
	DATABASE_URL: z.string().url(),
	PORT: z.coerce.number().default(8080),
});

export const env = serverSchema.parse(process.env);
