import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/publicar",
        "/publicar/",
        "/profile",
        "/email/",
        "/api/",
        "/unsubscribe",
      ],
    },
    sitemap: "https://rheckypolitan.es/sitemap.xml",
  };
}