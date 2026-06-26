import type { schema } from "@repo/db"
import { githubProvider } from "./github"
import type { SourceProvider } from "./types"

type Provider = (typeof schema.integrationProviderEnum.enumValues)[number]

// Register a connection here once you implement its SourceProvider.
const providers: Partial<Record<Provider, SourceProvider>> = {
  github: githubProvider,
}

export function getSourceProvider(provider: Provider): SourceProvider | null {
  return providers[provider] ?? null
}

export type { ConnectionRef, SourceProvider, SourceRef } from "./types"
