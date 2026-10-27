import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep verification builds separate from any active development server.
  distDir: process.env.S3_ISOLATED_BUILD === "true" ? ".next-s3-check" : ".next",
  reactStrictMode: false,

  eslint: {
    ignoreDuringBuilds: true,
  },

  allowedDevOrigins: ["192.168.0.197"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
};

export default nextConfig;
