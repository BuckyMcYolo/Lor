import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "@/routes/v1/channels/handlers"
import * as routes from "@/routes/v1/channels/routes"

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
  .openapi(routes.listThreadActivity, handlers.listThreadActivity)
  .openapi(routes.getMessageLocation, handlers.getMessageLocation)

export default channelsRouter
