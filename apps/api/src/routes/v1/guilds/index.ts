import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "./handlers"
import * as routes from "./routes"

const guildsRouter = createRouter().openapi(
  routes.listGuildMembers,
  handlers.listGuildMembers
)

export default guildsRouter
