/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  assetPrefix: process.env.BASE_PATH || "",
  basePath: process.env.BASE_PATH || "",
  trailingSlash: true,
  publicRuntimeConfig: {
    root: process.env.BASE_PATH || "",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vroid-hub.pximg.net",
      },
    ],
  },
  // Thêm cấu hình rewrites
  async rewrites() {
    return [
      {
        source: "/api/lmstudio/:path*",
        destination: "http://127.0.0.1:1234/v1/:path*",
      },
    ];
  },
};

module.exports = nextConfig;