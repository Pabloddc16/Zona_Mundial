/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracing: false,
  transpilePackages: ['@pablo/ui', '@pablo/types', '@pablo/validators', '@pablo/db'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  async redirects() {
    return [
      { source: '/login', destination: '/admin/login', permanent: true },
      { source: '/forgot-password', destination: '/admin/forgot-password', permanent: true },
      { source: '/reset-password', destination: '/admin/reset-password', permanent: true },
    ]
  },
}

export default nextConfig
