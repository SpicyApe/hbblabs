import { brand } from "@/lib/brand";

/**
 * Copy for the informational routes.
 *
 * SCAFFOLD: `quality`, `coa` and `faq` are written out properly because they
 * carry the trust story. The legal pages are placeholders — terms, privacy and
 * the disclaimer must be reviewed by a lawyer before this goes anywhere near
 * production, and the placeholder text says so on the page.
 */

export interface InfoSection {
  heading: string;
  body: string[];
  /** Optional definition list rendered after the body. */
  list?: Array<[string, string]>;
}

export interface InfoPage {
  slug: string;
  title: string;
  eyebrow: string;
  lede: string;
  sections: InfoSection[];
  placeholder?: boolean;
}

const LEGAL_NOTE =
  "This page is placeholder text. It has not been reviewed by counsel and is not fit for production use. Replace it before launch.";

export const infoPages: InfoPage[] = [
  {
    slug: "quality",
    title: "Quality assurance",
    eyebrow: "How we verify",
    lede: `Every batch is analyzed by an ISO 17025 accredited laboratory before it is released, and the report travels with the batch code printed on the vial.`,
    sections: [
      {
        heading: "The process, end to end",
        body: [
          "Nothing is released on a supplier's word. Material arrives, gets quarantined, gets tested, and only then gets a batch number and a release date.",
        ],
        list: [
          ["1 · Raw material verification", "Incoming material is checked against its documentation before anything proceeds."],
          ["2 · Controlled synthesis", "Manufacturing partners work under documented cleanroom procedures with batch records."],
          ["3 · HPLC purification", "Multiple purification passes, with in-process checks between them."],
          ["4 · Third-party assay panel", `${brand.assayCount} independent assays at an ISO 17025 accredited laboratory.`],
          ["5 · COA release", "Full results published against the batch code. A failing batch is not released."],
          ["6 · Sealed packaging", "Vials are nitrogen-sealed and crimped, then cold-stored until dispatch."],
        ],
      },
      {
        heading: "What a failing batch means",
        body: [
          `If a batch misses the ${brand.purityClaim} specification, it does not ship. It is not discounted, relabelled, or blended into a passing lot. That policy is the entire point of testing.`,
        ],
      },
    ],
  },
  {
    slug: "coa",
    title: "Certificates of analysis",
    eyebrow: "Documentation",
    lede: "Every vial carries a batch code. Every batch code resolves to the report that released it.",
    sections: [
      {
        heading: "What is on the certificate",
        body: ["Each released batch is documented against the same panel, so two batches of the same compound are directly comparable."],
        list: [
          ["HPLC purity", "Reversed-phase, area-percent at 214 nm"],
          ["Net peptide content", "Nitrogen determination, corrected for counter-ion"],
          ["Identity", "ESI-MS against the theoretical mass"],
          ["Appearance", "Visual inspection of the lyophilized cake"],
          ["Heavy metals", "ICP-MS, USP <232> element panel"],
          ["Sterility", "PCR bioburden screen"],
          ["Endotoxin", "LAL kinetic chromogenic"],
          ["Controlled substances", "Targeted screen, reported pass/fail"],
        ],
      },
      {
        heading: "Looking one up",
        body: [
          "SCAFFOLD: the batch lookup is not built yet. It needs the coa_documents table described in src/lib/db, keyed on batch code, with the released PDF in object storage.",
        ],
      },
    ],
  },
  {
    slug: "research-use",
    title: "Research use only",
    eyebrow: "Terms of supply",
    lede: `Everything ${brand.legalName} supplies is for in vitro laboratory research. There are no exceptions and no off-label reading of that sentence.`,
    sections: [
      {
        heading: "What this means",
        body: [
          "These materials are not drugs. They are not for human or veterinary use, not for use in diagnostic procedures, not for food or cosmetic use, and have not been evaluated by the U.S. Food and Drug Administration for any purpose.",
          "Purchasing requires you to affirm that you are a qualified researcher acquiring materials for laboratory work. That affirmation is a condition of sale, and orders that indicate otherwise are cancelled and refunded.",
        ],
      },
      {
        heading: "Handling",
        body: [
          "Treat every compound as a substance of unknown hazard. Use appropriate containment, personal protective equipment, and disposal procedures per your institution's requirements. We publish storage conditions on each product page; those are the conditions the stability data covers.",
        ],
      },
    ],
  },
  {
    slug: "research",
    title: "Research library",
    eyebrow: "Reference",
    lede: "Background reading and primary literature for the compounds in the catalog.",
    sections: [
      {
        heading: "Not yet built",
        body: [
          "SCAFFOLD: this route exists so navigation and the sitemap are complete. The intended shape is a collection of per-compound reference pages, each linking primary literature by DOI, with the mechanism summary that currently sits on the product page.",
        ],
      },
    ],
  },
  {
    slug: "shipping",
    title: "Shipping",
    eyebrow: "Logistics",
    lede: "Orders are processed in 0–2 business days and ship with tracking on every parcel.",
    sections: [
      {
        heading: "Rates and timing",
        body: ["Domestic only at present."],
        list: [
          ["Standard", "Flat $9.00, free on orders over $100"],
          ["2-day", "Rated at checkout"],
          ["Overnight", "Rated at checkout, order by 3:00 PM ET"],
          ["Processing", "0–2 business days before dispatch"],
        ],
      },
      {
        heading: "Cold chain and packaging",
        body: [
          "Lyophilized material is stable in transit at ambient temperature; it is the reconstituted solution that needs refrigeration. Parcels ship in unbranded outer cartons.",
          "Every order includes shipment protection. Lost, stolen, or damaged in transit means a replacement at no cost — send photographs of the packaging and we handle the rest.",
        ],
      },
    ],
  },
  {
    slug: "returns",
    title: "Returns and refunds",
    eyebrow: "Support",
    lede: "Sealed vials that arrive damaged or incorrect are replaced. Opened vials cannot be returned.",
    sections: [
      {
        heading: "What we replace",
        body: [
          "Damage in transit, a wrong item, or a batch that does not match its certificate: replaced at no cost, with no return shipment required. Photograph the outer carton and the vial and contact support within 14 days of delivery.",
        ],
      },
      {
        heading: "What we cannot take back",
        body: [
          "Once a vial's seal is broken, its chain of custody is gone and it cannot re-enter inventory. That is a sterility and integrity constraint, not a commercial one.",
        ],
      },
    ],
  },
  {
    slug: "faq",
    title: "Frequently asked questions",
    eyebrow: "Support",
    lede: "The questions that come up most often.",
    sections: [
      {
        heading: "Ordering and product",
        body: [],
        list: [
          ["Are these for human use?", "No. Every product is supplied strictly for in vitro laboratory research. This is a condition of sale, not a disclaimer."],
          ["What does 99%+ purity mean?", "Area-percent purity by reversed-phase HPLC at 214 nm, verified by an independent ISO 17025 laboratory on the specific batch you receive."],
          ["Do I get a certificate of analysis?", "Yes, for the batch code on your vial — not a generic sample report."],
          ["How should I store material?", "Lyophilized peptides keep at -20°C. Once reconstituted, refrigerate at 2-8°C and observe the window on the product page."],
          ["What is bacteriostatic water for?", "Reconstituting lyophilized material. The benzyl alcohol preservative allows repeated septum entry without compromising sterility."],
          ["Do you ship internationally?", "Not currently. Domestic only."],
        ],
      },
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    eyebrow: "Support",
    lede: `Questions about an order, a batch, or a certificate: ${brand.supportEmail}.`,
    sections: [
      {
        heading: "Response times",
        body: [
          "Support is staffed on U.S. business days and replies within one business day. Include your order number and, for anything batch-related, the batch code printed on the vial.",
        ],
      },
      {
        heading: "Bulk and institutional",
        body: [
          "Institutional purchase orders, standing supply arrangements, and quantities beyond the published bulk tiers are handled directly. Write to the same address with your requirements.",
        ],
      },
    ],
  },
  {
    slug: "subscription-box",
    title: "Standing orders",
    eyebrow: "New",
    lede: "Pick any four compounds and we ship them on the same date each month at 40% off list.",
    sections: [
      {
        heading: "Not yet built",
        body: [
          "SCAFFOLD: the builder UI and the recurring-billing logic are both outstanding. Recurring charges need a stored payment method at the gateway plus a scheduler, neither of which the mock provider models.",
        ],
      },
    ],
  },
  {
    slug: "bulk",
    title: "Bulk orders",
    eyebrow: "New",
    lede: "Ten units of any compound unlocks 40% off. Fifty drops the whole product to 50%.",
    sections: [
      {
        heading: "How the tiers work",
        body: ["Tiers apply per compound, not per order, and stack with nothing else."],
        list: [
          ["10+ units", "40% off that compound"],
          ["50+ units", "50% off that compound"],
          ["Delivery", "Free 2-day signed delivery on bulk orders"],
        ],
      },
      {
        heading: "Not yet built",
        body: [
          "SCAFFOLD: the quantity-break preview on the product page is live, but bulk pricing is not yet applied at checkout. The tier table currently lives in src/components/buy-box.tsx and should move onto the product record.",
        ],
      },
    ],
  },
  {
    slug: "bundles",
    title: "Research bundles",
    eyebrow: "New",
    lede: "Load several compounds onto one ticket and share a single link.",
    sections: [
      {
        heading: "Not yet built",
        body: [
          "SCAFFOLD: bundles need their own table and a share-token route. The reference implementation generates one page per bundle combination, which is worth reconsidering — a single dynamic route over a bundles table is far less to maintain.",
        ],
      },
    ],
  },
  {
    slug: "account",
    title: "Account",
    eyebrow: "Members",
    lede: "Order history, saved certificates, and standing orders.",
    sections: [
      {
        heading: "Not yet built",
        body: [
          "SCAFFOLD: there is no authentication in this build. Adding it means a users table, a session strategy, and scoping the order lookup in src/app/[region]/order/[id] to the signed-in user — that page currently reads any order whose id you know.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of service",
    eyebrow: "Legal",
    lede: LEGAL_NOTE,
    placeholder: true,
    sections: [
      {
        heading: "Placeholder",
        body: [
          "Terms of sale, limitation of liability, governing law, dispute resolution, and the researcher-attestation condition of sale all belong here. None of it is drafted.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    eyebrow: "Legal",
    lede: LEGAL_NOTE,
    placeholder: true,
    sections: [
      {
        heading: "Placeholder",
        body: [
          "This build sets two cookies: one recording the research-use attestation, one holding a cart identifier. Both are httpOnly and neither carries personal data. A real policy must also cover order data, email, analytics, processors, retention, and state-level privacy rights.",
        ],
      },
    ],
  },
  {
    slug: "disclaimer",
    title: "Disclaimer",
    eyebrow: "Legal",
    lede: LEGAL_NOTE,
    placeholder: true,
    sections: [
      {
        heading: "Research use only",
        body: [
          "Products are supplied for in vitro laboratory research only. They are not for human or veterinary use, not for use in diagnostic procedures, and have not been evaluated by the U.S. Food and Drug Administration. Nothing on this site is medical advice.",
          "Statements about compounds describe published research findings. They are not claims that any product diagnoses, treats, cures, or prevents anything.",
        ],
      },
    ],
  },
];

export const infoPagesBySlug = new Map(infoPages.map((page) => [page.slug, page]));
