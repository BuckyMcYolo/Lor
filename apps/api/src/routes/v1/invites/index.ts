import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "@/routes/v1/invites/handlers"
import * as routes from "@/routes/v1/invites/routes"

const invitesRouter = createRouter()
  // Guild-scoped routes
  .openapi(routes.createInvite, handlers.createInvite)
  .openapi(routes.listInvites, handlers.listInvites)
  .openapi(routes.deleteInvite, handlers.deleteInvite)
  // Public routes (session-only)
  .openapi(routes.previewInvite, handlers.previewInvite)
  .openapi(routes.acceptInvite, handlers.acceptInvite)

export default invitesRouter
