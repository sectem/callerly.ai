/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true
}

export default nextConfig
