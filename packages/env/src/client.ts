import { z } from "zod"

const addProtocol = (url: string) =>
  url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`

const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().min(1).transform(addProtocol),
})

export const env = clientSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
})
