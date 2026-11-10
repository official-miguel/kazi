import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

/** Makes the app installable on phones and desktops. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description: brand.tagline,
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#faf6ec",
    theme_color: "#0f5c3f",
    lang: "en",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
