/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/r-server/:path*',
        destination: process.env.NEXT_PUBLIC_R_SERVER_URL + '/:path*'
      },
      {
        source: '/api/n8n/:path*',
        destination: process.env.NEXT_PUBLIC_N8N_URL + '/:path*'
      }
    ]
  },
  // Ensure we can use environment variables in the client
  env: {
    NEXT_PUBLIC_R_SERVER_URL: process.env.NEXT_PUBLIC_R_SERVER_URL || 'http://localhost:3001',
    NEXT_PUBLIC_N8N_URL: process.env.NEXT_PUBLIC_N8N_URL || 'http://localhost:5678'
  }
}

module.exports = nextConfig 