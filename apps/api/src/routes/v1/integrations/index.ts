import { createRouter } from "@/lib/helpers/app/create-app"
import githubRouter from "./github/index"

// Aggregates per-provider integration routers. Add new providers here as their
// own subfolder + router (e.g. ./linear/index).
const integrationsRouter = createRouter().route("/", githubRouter)

export default integrationsRouter
