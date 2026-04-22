import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.zyrosite.com',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      // Energy dashboard short-path aliases
      { source: "/dashboard", destination: "/energy-dashboard/dashboard" },
      { source: "/overview", destination: "/energy-dashboard/overview" },
      { source: "/monitor", destination: "/energy-dashboard/monitor" },
      { source: "/location", destination: "/energy-dashboard/location" },
      { source: "/devices-setting", destination: "/energy-dashboard/devices-setting" },
      { source: "/devices-setting/:path*", destination: "/energy-dashboard/devices-setting/:path*" },
      { source: "/meter-seting", destination: "/energy-dashboard/meter-seting" },
      { source: "/notifications", destination: "/energy-dashboard/notifications" },
    ];
  },
};

export default nextConfig;
