import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize native modules
      config.externals = [...(config.externals || []), 'better-sqlite3']
    }
    return config
  },
};

export default nextConfig;
