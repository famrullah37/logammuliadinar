import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://logammuliadinar.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/login", "/checkout", "/pesanan", "/nota", "/api/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
