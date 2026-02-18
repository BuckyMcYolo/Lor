import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "./handlers"
import * as routes from "./routes"

const dmsRouter = createRouter().openapi(routes.listDMs, handlers.listDMs)

export default dmsRouter
