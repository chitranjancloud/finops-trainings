import type { MetadataRoute } from "next";

const staticRoutes = [
  "",
  "/about",
  "/contact",
  "/feedback",
  "/partners",
  "/internship-program",
  "/job-assistance",
  "/blog",
  "/careers",
  "/case-studies",
  "/privacy-policy",
  "/terms-and-conditions",
  "/refund-policy",
  "/learning/live-online-training",
  "/learning/classroom-training",
  "/learning/one-on-one-training",
  "/learning/customized-training",
  "/learning/upcoming-webinars",
  "/learning/webinar-service",
  "/learning/finops",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://finopstrainings.com";

  return staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}
