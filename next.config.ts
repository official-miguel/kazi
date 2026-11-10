import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Almost every page here is personal (it depends on who is signed in),
  // so the scaffold's static caching options are left off to keep things simple.
  experimental: {
    // Photo and document uploads go through server actions (default limit is 1 MB).
    serverActions: { bodySizeLimit: "6mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
