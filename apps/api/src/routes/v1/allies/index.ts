import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "@/routes/v1/allies/handlers"
import * as routes from "@/routes/v1/allies/routes"

const alliesRouter = createRouter()
  .openapi(routes.sendAllyRequest, handlers.sendAllyRequest)
  .openapi(routes.listAllyRequests, handlers.listAllyRequests)
  .openapi(routes.acceptAllyRequest, handlers.acceptAllyRequest)
  .openapi(routes.declineAllyRequest, handlers.declineAllyRequest)
  .openapi(routes.listAllies, handlers.listAllies)
  .openapi(routes.removeAlly, handlers.removeAlly)

export default alliesRouter
