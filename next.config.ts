
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    allowedDevOrigins: [
      /\.replit\.dev$/,
      /\.repl\.co$/
    ]
  }
};

export default nextConfig;
