/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.pexels.com', pathname: '/**' },
      { protocol: 'https', hostname: 'zcqnricmurrigkinbpsm.supabase.co', pathname: '/**' },
    ],
  },
};

module.exports = nextConfig;
