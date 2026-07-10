import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const projectRoot = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so Turbopack doesn't misinfer it in the multi-service layout.
  turbopack: {
    root: projectRoot,
  },
}

export default nextConfig
