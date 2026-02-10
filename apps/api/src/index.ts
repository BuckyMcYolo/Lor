import { serve } from "@hono/node-server";
import { env } from "@repo/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import waitlist from "./routes/waitlist.js";

const app = new Hono();

app.use("*", cors());

app.route("/waitlist", waitlist);

app.get("/", (c) => {
	return c.json({ status: "ok" });
});

console.log(`API server running on port ${env.PORT}`);
serve({ fetch: app.fetch, port: env.PORT });
