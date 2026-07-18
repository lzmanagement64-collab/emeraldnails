import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

const entries = [
  { path: "/", changefreq: "weekly" as const, priority: "1.0" },
  { path: "/prestations", changefreq: "monthly" as const, priority: "0.9" },
  { path: "/galerie", changefreq: "weekly" as const, priority: "0.8" },
  { path: "/a-propos", changefreq: "monthly" as const, priority: "0.7" },
  { path: "/faq", changefreq: "monthly" as const, priority: "0.6" },
  { path: "/mentions-legales", changefreq: "yearly" as const, priority: "0.2" },
  { path: "/confidentialite", changefreq: "yearly" as const, priority: "0.2" },
  { path: "/conditions", changefreq: "yearly" as const, priority: "0.2" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            `    <changefreq>${e.changefreq}</changefreq>`,
            `    <priority>${e.priority}</priority>`,
            `  </url>`,
          ].join("\n"),
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
