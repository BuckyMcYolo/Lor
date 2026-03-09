import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "./handlers"
import * as routes from "./routes"

const uploadsRouter = createRouter()
  .openapi(routes.presign, handlers.presign)
  .openapi(routes.avatarPresign, handlers.avatarPresign)

export default uploadsRouter
