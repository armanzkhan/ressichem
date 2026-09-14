/** @type {import("next").NextConfig} */
const nextConfig = {
  // Minimal configuration to avoid webpack issues
  reactStrictMode: false,
  
  // Output configuration for Vercel (default - no output needed)
  // Vercel handles Next.js deployment automatically

  images: {
    // Allow quality={100} used by logo Image components (required in Next.js 16+)
    qualities: [75, 100],
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.VERCEL ? 'https://mern-stack-dtgy.vercel.app' : 'http://127.0.0.1:5000'),
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || (process.env.VERCEL ? 'https://mern-stack-dtgy.vercel.app' : 'http://127.0.0.1:5000'),
  },
  
  // Simple webpack config
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
