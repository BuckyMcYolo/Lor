import { db } from "@repo/db";
import { waitlist } from "@repo/db/schema";
import { Hono } from "hono";

const app = new Hono();

app.post("/", async (c) => {
	const body = await c.req.json();
	const email = body.email?.trim().toLowerCase();

	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return c.json({ error: "A valid email is required" }, 400);
	}

	try {
		await db.insert(waitlist).values({ email });
		return c.json({ success: true });
	} catch (err: unknown) {
		if (err instanceof Error && err.message.includes("unique")) {
			return c.json({ error: "This email is already on the waitlist" }, 409);
		}
		throw err;
	}
});

export default app;
