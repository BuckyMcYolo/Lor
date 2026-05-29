import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "@/routes/v1/guilds/handlers"
import * as routes from "@/routes/v1/guilds/routes"

const guildsRouter = createRouter()
  .openapi(routes.listGuildMembers, handlers.listGuildMembers)
  .openapi(routes.searchMessages, handlers.searchMessages)
  .openapi(routes.updateGuild, handlers.updateGuild)
  .openapi(routes.updateGuildMemberRole, handlers.updateGuildMemberRole)
  .openapi(routes.kickGuildMember, handlers.kickGuildMember)

export default guildsRouter
