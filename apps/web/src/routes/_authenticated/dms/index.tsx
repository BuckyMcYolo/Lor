import { createFileRoute } from "@tanstack/react-router"
import { AlliesPage } from "@/components/allies/allies-page"

export const Route = createFileRoute("/_authenticated/dms/")({
  component: AlliesPage,
})
