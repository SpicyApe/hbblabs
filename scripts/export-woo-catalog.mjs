#!/usr/bin/env node
/**
 * Dumps the *live WooCommerce catalog* to JSON for the Medusa backend.
 *
 * The counterpart to export-catalog.mjs, which exports the 50-compound seed
 * catalog. This one exports only what is actually published in WooCommerce,
 * for migrating a real store rather than seeding a demo one.
 *
 * WooCommerce is authoritative for identity, prices and variants, so edits
 * made in wp-admin survive the move. Where a handle also exists in
 * src/data/products.ts, the peptide fields WooCommerce cannot store —
 * aliases, form, storage, sequence, CAS — are merged in from there. Medusa
 * keeps them as metadata; WooCommerce never could.
 *
 * Prices convert here: the Store API returns minor units as strings ("6999"),
 * Medusa takes decimal amounts (69.99).
 *
 * Usage:
 *   node scripts/export-woo-catalog.mjs ../hercules-medusa/apps/backend/src/migration-scripts/catalog.json
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const STORE = (process.env.WOOCOMMERCE_URL ?? "https://hbb-labs.com").replace(/\/$/, "");
const API = `${STORE}/wp-json/wc/store/v1`;

const out = process.argv[2];
if (!out) {
  console.error("Usage: node scripts/export-woo-catalog.mjs <output.json>");
  process.exitCode = 1;
} else {
  const stripHtml = (html) =>
    (html ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

  const toDecimal = (minorUnits) => Number.parseInt(minorUnits, 10) / 100;

  const get = async (path) => {
    const res = await fetch(`${API}${path}`);
    if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${res.statusText}`);
    return res.json();
  };

  // Seed-catalog metadata, keyed by handle, for products that have it.
  const { productsByHandle } = await import("../src/data/products.ts");

  const products = await get("/products?per_page=100");
  console.log(`WooCommerce has ${products.length} published product(s).`);

  const payload = [];

  for (const p of products) {
    let variants;

    if (p.has_options && p.variations?.length) {
      /*
       * Variation prices are absent from the parent payload, but each
       * variation is itself fetchable and carries its own price.
       */
      variants = await Promise.all(
        p.variations.map(async (ref) => {
          const detail = await get(`/products/${ref.id}`);
          const onSale =
            detail.prices.sale_price &&
            detail.prices.sale_price !== detail.prices.regular_price;
          return {
            title: ref.attributes.map((a) => a.value).join(" / ") || "Standard",
            amount: toDecimal(detail.prices.price),
            ...(onSale
              ? { compare_at_amount: toDecimal(detail.prices.regular_price) }
              : {}),
          };
        }),
      );
    } else {
      const onSale =
        p.prices.sale_price && p.prices.sale_price !== p.prices.regular_price;
      variants = [
        {
          title: "Standard",
          amount: toDecimal(p.prices.price),
          ...(onSale ? { compare_at_amount: toDecimal(p.prices.regular_price) } : {}),
        },
      ];
    }

    const seed = productsByHandle.get(p.slug);
    const metadata = {
      ...(seed?.aliases?.length ? { aliases: seed.aliases.join(", ") } : {}),
      ...(seed?.form ? { form: seed.form } : {}),
      ...(seed?.storage ? { storage: seed.storage } : {}),
      ...(seed?.sequence ? { sequence: seed.sequence } : {}),
      ...(seed?.cas ? { cas: seed.cas } : {}),
      ...(seed?.featured ? { featured: "true" } : {}),
    };

    payload.push({
      handle: p.slug,
      title: p.name,
      subtitle: stripHtml(p.short_description),
      description: stripHtml(p.description),
      category: p.categories?.[0]?.slug ?? "uncategorized",
      metadata,
      featured: Boolean(seed?.featured),
      variants,
    });

    const enriched = Object.keys(metadata).length ? "with seed metadata" : "no metadata match";
    console.log(
      `  ${p.slug.padEnd(22)} ${String(variants.length).padStart(2)} variant(s)  ${enriched}`,
    );
  }

  const path = resolve(out);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(payload, null, 2));
  console.log(`\nWrote ${payload.length} products to ${path}`);
}
