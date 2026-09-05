/**
 * Single source of truth for brand identity.
 * Swapping the whole visual identity should only ever require editing this file
 * (plus the matching CSS custom properties in src/app/globals.css).
 */

export const brand = {
  name: "Hercules",
  legalName: "Hercules Research Co.",
  tagline: "Research-grade peptides, verified batch by batch.",
  domain: "hercules.example",
  supportEmail: "support@hercules.example",

  /** Minimum age asserted at the compliance gate. */
  minimumAge: 21,

  /**
   * Domestic shipping, in minor units (cents).
   *
   * Both must match the shipping option priced in Medusa, which enforces the
   * threshold itself: the storefront quotes these on the cart, Medusa charges
   * the order, and a mismatch shows the customer one number and bills
   * another.
   */
  flatShipping: 900,
  freeShippingOver: 2_500,

  /** Default storefront region. Routes are prefixed /{region}. */
  defaultRegion: "us",

  purityClaim: "99%+",
  assayCount: 8,
} as const;

/**
 * Navigation. Kept here so the header, footer and sitemap never drift apart.
 */
export const primaryNav = [
  { label: "Store", href: "/us/store" },
  { label: "Bundles", href: "/us/bundles" },
  { label: "Quality", href: "/us/quality" },
  { label: "COA", href: "/us/coa" },
  { label: "Research", href: "/us/research" },
  { label: "FAQ", href: "/us/faq" },
] as const;

export const footerNav = [
  {
    heading: "Shop",
    links: [
      { label: "All products", href: "/us/store" },
      { label: "Bundles", href: "/us/bundles" },
      { label: "Subscription box", href: "/us/subscription-box" },
      { label: "Bulk orders", href: "/us/bulk" },
    ],
  },
  {
    heading: "Quality",
    links: [
      { label: "Quality assurance", href: "/us/quality" },
      { label: "Certificates of analysis", href: "/us/coa" },
      { label: "Research library", href: "/us/research" },
      { label: "Research use only", href: "/us/research-use" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Contact", href: "/us/contact" },
      { label: "Shipping", href: "/us/shipping" },
      { label: "Returns", href: "/us/returns" },
      { label: "FAQ", href: "/us/faq" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms of service", href: "/us/terms" },
      { label: "Privacy policy", href: "/us/privacy" },
      { label: "Disclaimer", href: "/us/disclaimer" },
    ],
  },
] as const;

/** Shown verbatim in the footer and on the compliance gate. */
export const researchUseDisclaimer =
  `All products supplied by ${brand.legalName} are sold strictly for in vitro ` +
  `laboratory research use. They are not for human or veterinary use, not for ` +
  `use in diagnostic procedures, and have not been evaluated by the U.S. Food ` +
  `and Drug Administration.`;
