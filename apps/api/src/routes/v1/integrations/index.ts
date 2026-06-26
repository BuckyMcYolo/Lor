import { createRouter } from "@/lib/helpers/app/create-app"
import githubRouter from "@/routes/v1/integrations/github/index"
import * as handlers from "@/routes/v1/integrations/handlers"
import * as routes from "@/routes/v1/integrations/routes"

// Webhook receivers live in per-provider subfolders (./github/index). The
// workspace-scoped management endpoints (list/connect/disconnect) are here.
const integrationsRouter = createRouter()
  .route("/", githubRouter)
  .openapi(routes.listIntegrations, handlers.listIntegrations)
  .openapi(routes.connectGithub, handlers.connectGithub)
  .openapi(routes.disconnectIntegration, handlers.disconnectIntegration)

export default integrationsRouter
