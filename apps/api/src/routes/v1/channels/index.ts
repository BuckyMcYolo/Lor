import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "./handlers"
import * as routes from "./routes"

const channelsRouter = createRouter()
  .openapi(routes.listChannels, handlers.listChannels)
  .openapi(routes.createChannel, handlers.createChannel)

export default channelsRouter
