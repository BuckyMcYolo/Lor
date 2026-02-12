import { cors } from "hono/cors"
import createApp from "@/lib/helpers/app/create-app"
import configureOpenAPI from "@/lib/helpers/openapi/configure-openapi"
import index from "@/routes/index.route"
import waitlistRouter from "@/routes/waitlist/index"

const app = createApp()

app.use("*", cors())

configureOpenAPI(app)

app.route("/", index)

const routes = [waitlistRouter] as const
for (const route of routes) {
  app.route("/", route)
}

export type AppType = (typeof routes)[number]

export default app
