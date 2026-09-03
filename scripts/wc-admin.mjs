#!/usr/bin/env node
/**
 * WooCommerce admin API (wc/v3) helper.
 *
 * The storefront reads the public Store API and needs no credentials. This
 * script talks to the *authenticated* admin API, which is what catalog
 * writes require.
 *
 * Credentials come from the environment and are never printed:
 *
 *   WOOCOMMERCE_URL              https://hbb-labs.com
 *   WOOCOMMERCE_CONSUMER_KEY     ck_...
 *   WOOCOMMERCE_CONSUMER_SECRET  cs_...
 *
 * Generate them in wp-admin under
 * WooCommerce -> Settings -> Advanced -> REST API -> Add key.
 *
 * Usage:
 *   node --env-file=.env.local scripts/wc-admin.mjs check
 *   node --env-file=.env.local scripts/wc-admin.mjs create-test-product
 *   node --env-file=.env.local scripts/wc-admin.mjs push-product glp-3
 *
 * `check` needs only Read permission; the others need Write.
 *
 * push-product reads src/data/products.ts directly (Node strips the types),
 * so the seed catalog stays the single source of truth rather than product
 * data being restated here.
 */

const BASE = (process.env.WOOCOMMERCE_URL ?? "https://hbb-labs.com").replace(/\/$/, "");
const KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

function requireCredentials() {
  const missing = [
    !KEY && "WOOCOMMERCE_CONSUMER_KEY",
    !SECRET && "WOOCOMMERCE_CONSUMER_SECRET",
  ].filter(Boolean);

  if (missing.length) {
    console.error(`Missing ${missing.join(" and ")}.`);
    console.error("Set them in .env.local (gitignored) and pass --env-file=.env.local,");
    console.error("or export them into the environment before running.");
    process.exit(1);
  }
}

/*
 * Basic auth over HTTPS. WooCommerce also accepts the key and secret as query
 * parameters, which is not used here: query strings end up in access logs,
 * browser history and Referer headers.
 */
function authHeader() {
  return `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString("base64")}`;
}

async function wc(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}/wp-json/wc/v3${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!res.ok) {
    const detail = payload?.message ?? payload;
    throw new Error(`${method} ${path} -> ${res.status} ${res.statusText}: ${detail}`);
  }
  return payload;
}

async function check() {
  requireCredentials();
  console.log(`Store: ${BASE}`);

  const products = await wc("/products?per_page=5");
  console.log(`✓ Credentials accepted — ${products.length} product(s) visible.`);

  for (const p of products) {
    console.log(`  · ${p.id}  ${p.name}  [${p.status}]  ${p.price || "no price"}`);
  }
  if (!products.length) {
    console.log("  (catalog is empty — nothing published yet)");
  }

  /*
   * Deliberately not probing write access. The only way to test it is to
   * attempt a write, and a POST with an empty body may well succeed —
   * WordPress does not require a post title — leaving a junk draft in a
   * live store. If the key is Read-only, create-test-product says so.
   */
  console.log("\nRead access confirmed. Write access is exercised by create-test-product.");
}

/**
 * Resolves a category name to its id, creating it if absent.
 *
 * Products reference categories by id. Passing `{ name }` on the product
 * payload is silently ignored, which is how the first test product ended up
 * uncategorised.
 */
async function resolveCategory(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const existing = await wc(`/products/categories?slug=${encodeURIComponent(slug)}`);
  if (existing.length) return existing[0].id;

  const created = await wc("/products/categories", { method: "POST", body: { name, slug } });
  console.log(`  created category "${name}" (#${created.id})`);
  return created.id;
}

/** Minor units (the catalog's storage format) to the decimal string the API wants. */
const toDecimal = (cents) => (cents / 100).toFixed(2);

/**
 * Pushes one product from src/data/products.ts into WooCommerce.
 *
 * Multi-variant products become WooCommerce variable products: one "Size"
 * attribute whose options are the variant labels, plus a variation per
 * label carrying that variant's price.
 */
async function pushProduct() {
  requireCredentials();

  const handle = process.argv[3];
  if (!handle) {
    console.error("Usage: push-product <handle>   e.g. push-product glp-3");
    process.exitCode = 1;
    return;
  }

  const { productsByHandle } = await import("../src/data/products.ts");
  const product = productsByHandle.get(handle);
  if (!product) {
    console.error(`No product with handle "${handle}" in src/data/products.ts`);
    process.exitCode = 1;
    return;
  }

  const existing = await wc(`/products?slug=${encodeURIComponent(handle)}`);
  if (existing.length) {
    console.log(`Already in WooCommerce: #${existing[0].id} "${existing[0].name}" — skipping.`);
    console.log("Delete it in wp-admin first if you want to re-push.");
    return;
  }

  console.log(`Pushing "${product.name}" (${handle})…`);
  const categoryId = await resolveCategory(product.category);

  const isVariable = product.variants.length > 1;
  const payload = {
    name: product.name,
    slug: product.handle,
    type: isVariable ? "variable" : "simple",
    status: "publish",
    short_description: product.blurb,
    description: product.description,
    categories: [{ id: categoryId }],
    ...(isVariable
      ? {
          attributes: [
            {
              name: "Size",
              position: 0,
              visible: true,
              variation: true,
              options: product.variants.map((v) => v.label),
            },
          ],
        }
      : {
          regular_price: toDecimal(product.variants[0].price),
        }),
  };

  const created = await wc("/products", { method: "POST", body: payload });
  console.log(`✓ Created #${created.id} (${created.type}, ${created.status})`);

  if (isVariable) {
    const result = await wc(`/products/${created.id}/variations/batch`, {
      method: "POST",
      body: {
        create: product.variants.map((v) => ({
          regular_price: toDecimal(v.price),
          attributes: [{ name: "Size", option: v.label }],
          manage_stock: false,
          stock_status: v.inStock ? "instock" : "outofstock",
        })),
      },
    });
    for (const v of result.create ?? []) {
      const size = v.attributes?.[0]?.option ?? "?";
      console.log(`  · variation #${v.id}  ${size}  $${v.regular_price}`);
    }
  }

  console.log(`\n  admin: ${BASE}/wp-admin/post.php?post=${created.id}&action=edit`);
  console.log("  Storefront picks it up within ~60s (the Store API cache window).");
}

async function createTestProduct() {
  requireCredentials();

  const product = {
    name: "Test Compound",
    type: "simple",
    status: "publish",
    regular_price: "49.99",
    sale_price: "39.99",
    short_description: "A published test product used to verify the storefront mapping.",
    description:
      "Created by scripts/wc-admin.mjs to confirm the WooCommerce Store API feed reaches the storefront. Exercises price scaling, sale pricing and category mapping. Safe to delete.",
  };

  product.categories = [{ id: await resolveCategory("Test") }];

  const created = await wc("/products", { method: "POST", body: product });
  console.log(`✓ Created #${created.id} "${created.name}" (${created.status})`);
  console.log(`  slug:  ${created.slug}`);
  console.log(`  price: regular ${created.regular_price}, sale ${created.sale_price}`);
  console.log(`  admin: ${BASE}/wp-admin/post.php?post=${created.id}&action=edit`);
  console.log(`\nStorefront picks it up within ~60s (the Store API cache window).`);
}

const commands = {
  check,
  "create-test-product": createTestProduct,
  "push-product": pushProduct,
};
const command = process.argv[2];

if (!commands[command]) {
  console.error(`Usage: node scripts/wc-admin.mjs <${Object.keys(commands).join("|")}>`);
  process.exit(1);
}

commands[command]().catch((error) => {
  console.error(`\n${error.message}`);
  /*
   * exitCode rather than exit(): calling exit() here tears the process down
   * while the fetch socket is still closing, which trips a libuv assertion
   * on Windows and reports 127 instead of the intended 1.
   */
  process.exitCode = 1;
});
