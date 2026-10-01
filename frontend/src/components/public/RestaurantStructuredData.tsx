/**
 * RestaurantStructuredData
 *
 * UI responsibility: emits a schema.org/Restaurant JSON-LD block built
 * from live RestaurantSettings data. This is what allows Google (and
 * other engines that support rich results) to surface hours, address,
 * and a link to the menu directly in search results, rather than just a
 * blue link. Rendered once, on the home page.
 */
import { siteUrl } from "@/lib/site";

interface RestaurantStructuredDataProps {
  name: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  openingHours?: string | null;
}

export function RestaurantStructuredData({
  name,
  description,
  address,
  phone,
  openingHours,
}: RestaurantStructuredDataProps) {
  const baseUrl = siteUrl();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name,
    description: description ?? undefined,
    url: baseUrl,
    telephone: phone ?? undefined,
    address: address
      ? {
          "@type": "PostalAddress",
          streetAddress: address,
        }
      : undefined,
    servesCuisine: undefined,
    hasMenu: `${baseUrl}/menu`,
    acceptsReservations: `${baseUrl}/book`,
    openingHours: openingHours ?? undefined,
  };

  // JSON.stringify can't be injected as-is into a <script> tag safely —
  // "</script>" inside a string value would prematurely close the tag.
  // This is the standard escape for that case.
  const json = JSON.stringify(structuredData).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
