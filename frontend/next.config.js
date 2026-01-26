/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API calls go directly to backend now (CORS enabled)
  // No proxy needed - avoids redirect/header issues
}

module.exports = nextConfig
