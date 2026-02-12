import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "./handlers"
import * as routes from "./routes"

const waitlistRouter = createRouter().openapi(
  routes.createWaitlistEntry,
  handlers.createWaitlistEntry
)

export default waitlistRouter
