import { createRouter } from "@/lib/helpers/app/create-app"
import * as handlers from "@/routes/v1/privacy-settings/handlers"
import * as routes from "@/routes/v1/privacy-settings/routes"

const privacySettingsRouter = createRouter()
  .openapi(routes.getPrivacySettings, handlers.getPrivacySettings)
  .openapi(routes.updatePrivacySettings, handlers.updatePrivacySettings)

export default privacySettingsRouter
