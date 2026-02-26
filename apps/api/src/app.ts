import { auth } from "@repo/auth"
import { cors } from "hono/cors"
import createApp from "@/lib/helpers/app/create-app"
import configureOpenAPI from "@/lib/helpers/openapi/configure-openapi"
import index from "@/routes/index.route"
import channelsRouter from "@/routes/v1/channels/index"
import dmsRouter from "@/routes/v1/dms/index"
import guildsRouter from "@/routes/v1/guilds/index"
import waitlistRouter from "@/routes/waitlist/index"

const app = createApp()

app.use(
  "*",
  cors({
    origin: (origin) => origin,
    credentials: true,
  })
)

app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw))

configureOpenAPI(app)

// Health check at root
app.route("/", index)

// Route mounting — chained for Hono RPC type inference
const routes = app
  .route("/", waitlistRouter)
  .route("/v1", channelsRouter)
  .route("/v1", guildsRouter)
  .route("/v1", dmsRouter)

export type AppType = typeof routes

// // Internal routes (not versioned)
// const internalRoutes = [waitlistRouter] as const
// for (const route of internalRoutes) {
//   app.route("/", route)
// }
//
// // Versioned public API routes
// const v1Routes = [channelsRouter] as const
// for (const route of v1Routes) {
//   app.route("/v1", route)
// }
//
// const allRoutes = [...internalRoutes, ...v1Routes] as const
//
// export type AppType = (typeof allRoutes)[number]

export default app
