/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
      // FIX: Added a new pattern for your Supabase Storage hostname
      {
        protocol: 'https',
        hostname: 'zcqnricmurrigkinbpsm.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;