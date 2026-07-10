/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure the synthetic log files are bundled into the serverless function
  // so the chat route can read them at runtime on Vercel.
  outputFileTracingIncludes: {
    '/api/chat': ['./logs/**/*'],
  },
}

export default nextConfig
