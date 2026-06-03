import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "./handlers"
import * as routes from "./routes"

const channelsRouter = createRouter()
  .openapi(routes.listChannels, handlers.listChannels)
  .openapi(routes.createChannel, handlers.createChannel)
  .openapi(routes.reorderChannels, handlers.reorderChannels)
  .openapi(routes.getChannel, handlers.getChannel)
  .openapi(routes.updateChannel, handlers.updateChannel)
  .openapi(routes.deleteChannel, handlers.deleteChannel)
  .openapi(routes.listChannelMessages, handlers.listChannelMessages)
  .openapi(routes.toggleMessagePin, handlers.toggleMessagePin)
  .openapi(routes.listPinnedMessages, handlers.listPinnedMessages)
  .openapi(routes.listThreadReplies, handlers.listThreadReplies)

export default channelsRouter
