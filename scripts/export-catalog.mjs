#!/usr/bin/env node
/**
 * Dumps the seed catalog to JSON for the Medusa backend to import.
 *
 * The catalog in src/data/products.ts stays the single source of truth. The
 * Medusa project is a separate workspace with its own tsconfig, so it reads a
 * generated JSON file rather than importing across project boundaries.
 *
 * Prices convert here: this catalog stores minor units (6999), Medusa takes
 * decimal amounts (69.99).
 *
 * Usage:
 *   node scripts/export-catalog.mjs ../hercules-medusa/apps/backend/src/migration-scripts/catalog.json
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const out = process.argv[2];
if (!out) {
  console.error("Usage: node scripts/export-catalog.mjs <output.json>");
  process.exitCode = 1;
} else {
  const { products } = await import("../src/data/products.ts");

  const payload = products.map((p) => ({
    handle: p.handle,
    title: p.name,
    subtitle: p.blurb,
    description: p.description,
    category: p.category,
    /*
     * Kept as plain metadata. Medusa has no column for a peptide sequence or
     * a CAS number, but metadata is first-class, so these survive the move
     * rather than being dropped as they were under WooCommerce.
     */
    metadata: {
      aliases: p.aliases.join(", "),
      form: p.form,
      storage: p.storage,
      ...(p.sequence ? { sequence: p.sequence } : {}),
      ...(p.cas ? { cas: p.cas } : {}),
      /*
       * Medusa has no "featured" flag. Carrying it as metadata keeps the
       * homepage's featured row working without inventing a collection
       * whose only purpose is to hold six products. Stringified because
       * metadata values are strings.
       */
      ...(p.featured ? { featured: "true" } : {}),
    },
    featured: Boolean(p.featured),
    variants: p.variants.map((v) => ({
      title: v.label,
      amount: v.price / 100,
      ...(v.compareAt ? { compare_at_amount: v.compareAt / 100 } : {}),
    })),
  }));

  const path = resolve(out);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(payload, null, 2));

  const variants = payload.reduce((n, p) => n + p.variants.length, 0);
  console.log(`Wrote ${payload.length} products (${variants} variants) to ${path}`);
}
