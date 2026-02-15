import { auth } from "@repo/auth"
import { env } from "@repo/env/server"
import { cors } from "hono/cors"
import createApp from "@/lib/helpers/app/create-app"
import configureOpenAPI from "@/lib/helpers/openapi/configure-openapi"
import channelsRouter from "@/routes/channels/index"
import index from "@/routes/index.route"
import waitlistRouter from "@/routes/waitlist/index"

const app = createApp()

app.use(
  "*",
  cors({
    origin:
      env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : env.NEXT_PUBLIC_API_URL,
    credentials: true,
  })
)

app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw))

configureOpenAPI(app)

// Health check at root
app.route("/", index)

// Internal routes (not versioned)
const internalRoutes = [waitlistRouter] as const
for (const route of internalRoutes) {
  app.route("/", route)
}

// Versioned public API routes
const v1Routes = [channelsRouter] as const
for (const route of v1Routes) {
  app.route("/v1", route)
}

const allRoutes = [...internalRoutes, ...v1Routes] as const

export type AppType = (typeof allRoutes)[number]

export default app
