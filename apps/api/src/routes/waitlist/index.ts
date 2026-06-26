import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "@/routes/waitlist/handlers"
import * as routes from "@/routes/waitlist/routes"

const waitlistRouter = createRouter().openapi(
  routes.createWaitlistEntry,
  handlers.createWaitlistEntry
)

export default waitlistRouter
