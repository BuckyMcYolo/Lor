import { z } from "zod";

const clientSchema = z.object({
	NEXT_PUBLIC_API_URL: z.string().url(),
});

export const env = clientSchema.parse({
	NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
