import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "@/routes/v1/dms/handlers"
import * as routes from "@/routes/v1/dms/routes"

const dmsRouter = createRouter()
  .openapi(routes.createDM, handlers.createDM)
  .openapi(routes.listDMs, handlers.listDMs)
  .openapi(routes.searchDMMessages, handlers.searchDMMessages)
  .openapi(routes.getDM, handlers.getDM)
  .openapi(routes.listDMMessages, handlers.listDMMessages)
  .openapi(routes.listDMThreadReplies, handlers.listDMThreadReplies)

export default dmsRouter
