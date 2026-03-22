import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "@/routes/v1/blocks/handlers"
import * as routes from "@/routes/v1/blocks/routes"

const blocksRouter = createRouter()
  .openapi(routes.blockUser, handlers.blockUser)
  .openapi(routes.unblockUser, handlers.unblockUser)
  .openapi(routes.listBlockedUsers, handlers.listBlockedUsers)

export default blocksRouter
