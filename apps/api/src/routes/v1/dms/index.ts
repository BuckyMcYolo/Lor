import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "./handlers"
import * as routes from "./routes"

const dmsRouter = createRouter()
  .openapi(routes.createDM, handlers.createDM)
  .openapi(routes.listDMs, handlers.listDMs)
  .openapi(routes.searchDMMessages, handlers.searchDMMessages)
  .openapi(routes.getDM, handlers.getDM)
  .openapi(routes.listDMMessages, handlers.listDMMessages)

export default dmsRouter
