import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "@/routes/v1/uploads/handlers"
import * as routes from "@/routes/v1/uploads/routes"

const uploadsRouter = createRouter()
  .openapi(routes.presign, handlers.presign)
  .openapi(routes.avatarPresign, handlers.avatarPresign)
  .openapi(routes.workspaceIconPresign, handlers.workspaceIconPresign)

export default uploadsRouter
