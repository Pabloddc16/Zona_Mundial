/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@pablo/ui', '@pablo/types', '@pablo/validators'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
}

export default nextConfig
