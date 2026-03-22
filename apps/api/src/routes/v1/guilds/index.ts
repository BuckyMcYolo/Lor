import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "@/routes/v1/guilds/handlers"
import * as routes from "@/routes/v1/guilds/routes"

const guildsRouter = createRouter()
  .openapi(routes.listGuildMembers, handlers.listGuildMembers)
  .openapi(routes.searchMessages, handlers.searchMessages)
  .openapi(routes.updateGuildMemberRole, handlers.updateGuildMemberRole)
  .openapi(routes.kickGuildMember, handlers.kickGuildMember)
  .openapi(routes.banGuildMember, handlers.banGuildMember)
  .openapi(routes.timeoutGuildMember, handlers.timeoutGuildMember)
  .openapi(routes.clearGuildMemberTimeout, handlers.clearGuildMemberTimeout)

export default guildsRouter
