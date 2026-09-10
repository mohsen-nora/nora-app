import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nora | دستیار هوشمند",
    short_name: "Nora",
    description: "دستیار هوشمند شخصی نورا",
    start_url: "/chat",
    display: "standalone",
    background_color: "#1a1626",
    theme_color: "#1a1626",
    lang: "fa",
    dir: "rtl",
  }
}
