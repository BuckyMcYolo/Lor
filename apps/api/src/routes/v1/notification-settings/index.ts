import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "@/routes/v1/notification-settings/handlers"
import * as routes from "@/routes/v1/notification-settings/routes"

const notificationSettingsRouter = createRouter()
  .openapi(routes.getNotificationSettings, handlers.getNotificationSettings)
  .openapi(
    routes.updateNotificationSettings,
    handlers.updateNotificationSettings
  )

export default notificationSettingsRouter
