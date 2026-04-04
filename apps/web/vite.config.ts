import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"

const BUILD_ID = Date.now().toString()

function versionPlugin(): Plugin {
  return {
    name: "version-file",
    writeBundle(options) {
      const outDir = options.dir ?? resolve(__dirname, "dist")
      writeFileSync(
        resolve(outDir, "version.json"),
        JSON.stringify({ buildId: BUILD_ID })
      )
    },
  }
}

export default defineConfig(({ mode }) => {
  const monorepoRoot = resolve(__dirname, "../..")
  const env = {
    ...loadEnv(mode, monorepoRoot, "NEXT_PUBLIC_"),
    ...loadEnv(mode, __dirname, "NEXT_PUBLIC_"),
  }

  return {
    plugins: [tanstackRouter(), react(), versionPlugin()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    server: {
      allowedHosts: true,
    },
    preview: {
      allowedHosts: true,
    },
    define: {
      "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(
        env.NEXT_PUBLIC_API_URL
      ),
      "process.env.NEXT_PUBLIC_REALTIME_URL": JSON.stringify(
        env.NEXT_PUBLIC_REALTIME_URL
      ),
      "process.env.NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE": JSON.stringify(
        env.NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE
      ),
      __BUILD_ID__: JSON.stringify(BUILD_ID),
    },
  }
})
