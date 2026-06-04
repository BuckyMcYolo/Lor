import { Generator, getConfig } from "@tanstack/router-generator"

const root = process.cwd()
const config = getConfig({}, root)
const generator = new Generator({ config, root })

await generator.run()
