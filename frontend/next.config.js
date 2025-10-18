/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disabled to prevent Google Maps DOM errors in development
  // Google Maps API is not designed for React 18 Strict Mode double-mounting
  reactStrictMode: false,
}

module.exports = nextConfig
