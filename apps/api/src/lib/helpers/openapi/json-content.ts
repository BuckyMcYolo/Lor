import type { ZodType } from "zod"

const jsonContent = <T extends ZodType>({
  schema,
  description,
}: {
  schema: T
  description: string
}) => {
  return {
    content: {
      "application/json": {
        schema,
      },
    },
    description,
  }
}

export default jsonContent
