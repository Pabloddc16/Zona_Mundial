/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracing: false,
  transpilePackages: ['@pablo/ui', '@pablo/types', '@pablo/validators', '@pablo/db'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
}

export default nextConfig
