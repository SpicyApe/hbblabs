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
 *
 * `check` needs only Read permission. `create-test-product` needs Write.
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
    categories: [{ name: "Test" }],
  };

  const created = await wc("/products", { method: "POST", body: product });
  console.log(`✓ Created #${created.id} "${created.name}" (${created.status})`);
  console.log(`  slug:  ${created.slug}`);
  console.log(`  price: regular ${created.regular_price}, sale ${created.sale_price}`);
  console.log(`  admin: ${BASE}/wp-admin/post.php?post=${created.id}&action=edit`);
  console.log(`\nStorefront picks it up within ~60s (the Store API cache window).`);
}

const commands = { check, "create-test-product": createTestProduct };
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
