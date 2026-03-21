import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "@/routes/v1/users/handlers"
import * as routes from "@/routes/v1/users/routes"

const usersRouter = createRouter().openapi(
  routes.getUserProfile,
  handlers.getUserProfile
)

export default usersRouter
