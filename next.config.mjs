import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const projectRoot = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so Turbopack doesn't misinfer it and stop recompiling.
  turbopack: {
    root: projectRoot,
  },
  // Ensure the synthetic log files are bundled into the serverless function
  // so the chat route can read them at runtime on Vercel.
  outputFileTracingIncludes: {
    '/api/chat': ['./logs/**/*'],
  },
}

export default nextConfig
