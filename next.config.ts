import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Almost every page here is personal (it depends on who is signed in),
  // so the scaffold's static caching options are left off to keep things simple.
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
