import { createOpenAI } from "@ai-sdk/openai"
import { env } from "@repo/env/server"
import { embed } from "ai"

// OpenAI-compatible embedding provider. Self-hosters can set MERLIN_EMBED_BASE_URL
// to any compatible endpoint (Ollama, LocalAI, …) + MERLIN_EMBED_MODEL. The model
// MUST output 1536-dim vectors to match the brain_node.embedding column.
const provider = createOpenAI({ baseURL: env.MERLIN_EMBED_BASE_URL })

// Must match the brain_node.embedding column width.
const EMBED_DIM = 1536

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: provider.embedding(env.MERLIN_EMBED_MODEL),
    value: text,
  })
  if (embedding.length !== EMBED_DIM) {
    throw new Error(
      `embedding model "${env.MERLIN_EMBED_MODEL}" returned ${embedding.length} dims; expected ${EMBED_DIM}`
    )
  }
  return embedding
}
