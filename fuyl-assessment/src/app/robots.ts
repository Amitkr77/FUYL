import type { MetadataRoute } from "next";

/** Only the landing page is for search engines; the assessment, reports, admin and API are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/q", "/summary", "/result/", "/resume/", "/go/", "/chat"] }],
  };
}
