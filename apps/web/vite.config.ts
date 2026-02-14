import { resolve } from "node:path"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const monorepoRoot = resolve(__dirname, "../..")
  const env = {
    ...loadEnv(mode, monorepoRoot, "NEXT_PUBLIC_"),
    ...loadEnv(mode, __dirname, "NEXT_PUBLIC_"),
  }

  return {
    plugins: [tanstackRouter(), react()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    define: {
      "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(
        env.NEXT_PUBLIC_API_URL
      ),
      "process.env.NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE": JSON.stringify(
        env.NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE
      ),
    },
  }
})
