import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "@/routes/v1/guilds/handlers"
import * as routes from "@/routes/v1/guilds/routes"

const guildsRouter = createRouter().openapi(
  routes.listGuildMembers,
  handlers.listGuildMembers
)

export default guildsRouter
