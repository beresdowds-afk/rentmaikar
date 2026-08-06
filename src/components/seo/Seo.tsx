import { Helmet } from "react-helmet-async";

export const SITE_URL = "https://rentmaikar.com";

interface SeoProps {
  title: string;
  description: string;
  /** Route path, e.g. "/faq". Used for canonical + og:url. */
  path: string;
  image?: string;
  type?: "website" | "article";
  /** Optional JSON-LD object(s) for this route. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

/**
 * Per-route head tags: unique title/description, self-referencing canonical
 * and og:url, absolute social images, and optional JSON-LD.
 */
export default function Seo({
  title,
  description,
  path,
  image = `${SITE_URL}/og-image.png`,
  type = "website",
  jsonLd,
  noindex,
}: SeoProps) {
  const url = `${SITE_URL}${path === "/" ? "/" : path}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {blocks.map((block, i) => (
        <script type="application/ld+json" key={i}>
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
