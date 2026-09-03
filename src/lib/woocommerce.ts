/**
 * WooCommerce Store API client.
 *
 * Talks to the public, unauthenticated Store API (`/wp-json/wc/store/v1`) on
 * the WooCommerce site that now owns the product catalog. Maps its response
 * shape onto this app's existing `Product`/`ProductVariant` types so nothing
 * downstream — `src/lib/db`, components — has to change.
 *
 * Known gap: the Store API does not expose per-variation pricing on a plain
 * GET (Woo's own block frontend only resolves variation price once an item
 * is added to the cart). Variable products are therefore collapsed to a
 * single purchasable line at their minimum price rather than modelling each
 * variation. Full variant selection would need the authenticated `wc/v3`
 * REST API instead.
 */

import type { Product, ProductVariant } from "@/data/products";

/*
 * The WordPress/WooCommerce install keeps the apex (hbb-labs.com); this
 * storefront is served from the shop subdomain. Those two must stay
 * distinct — pointing this at the host the app itself answers on would
 * make it request its own catalog from itself.
 */
const WC_URL = (process.env.WOOCOMMERCE_URL ?? "https://hbb-labs.com").replace(/\/$/, "");
const STORE_API = `${WC_URL}/wp-json/wc/store/v1`;

interface WcPriceRange {
  min_amount: string;
  max_amount: string;
}

interface WcPrices {
  price: string;
  regular_price: string;
  sale_price: string;
  price_range: WcPriceRange | null;
  currency_minor_unit: number;
}

interface WcImage {
  id: number;
  src: string;
  name: string;
  alt: string;
}

interface WcCategory {
  id: number;
  name: string;
  slug: string;
  link: string;
}

interface WcVariationRef {
  id: number;
  attributes: { name: string; value: string }[];
}

interface WcProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  sku: string;
  prices: WcPrices;
  images: WcImage[];
  categories: WcCategory[];
  type: string;
  has_options: boolean;
  is_in_stock: boolean;
  /** Present on variable products: the ids and attributes of each variation. */
  variations?: WcVariationRef[];
  /** Present on a variation fetched directly, e.g. "Size: 4mg". */
  variation?: string;
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): URL {
  const url = new URL(`${STORE_API}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}

/**
 * Reads from the Store API, returning `fallback` if the store cannot be
 * reached or answers with an error.
 *
 * Deliberately fails soft. The catalog lives on a different host to the
 * storefront, so a DNS change, an expired certificate or WordPress being
 * down would otherwise take every catalog page down with it. An empty
 * catalog renders as "no products"; a thrown error renders as a 500.
 */
async function wcFetch<T>(
  path: string,
  fallback: T,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  try {
    const res = await fetch(buildUrl(path, params), { next: { revalidate: 60 } });
    if (!res.ok) {
      console.error(`WooCommerce Store API ${path} failed: ${res.status} ${res.statusText}`);
      return fallback;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`WooCommerce Store API ${path} unreachable:`, error);
    return fallback;
  }
}

/** As `wcFetch`, but a 404 is a real answer — the resource does not exist. */
async function wcFetchOptional<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T | null> {
  try {
    const res = await fetch(buildUrl(path, params), { next: { revalidate: 60 } });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(`WooCommerce Store API ${path} failed: ${res.status} ${res.statusText}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`WooCommerce Store API ${path} unreachable:`, error);
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toMinorUnits(amount: string): number {
  const parsed = Number.parseInt(amount, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function simpleVariant(product: WcProduct, label: string, amount?: string): ProductVariant {
  const onSale =
    product.prices.sale_price && product.prices.sale_price !== product.prices.regular_price;

  return {
    id: String(product.id),
    label,
    price: toMinorUnits(amount ?? product.prices.price),
    compareAt: onSale ? toMinorUnits(product.prices.regular_price) : undefined,
    inStock: product.is_in_stock,
  };
}

/**
 * Builds the purchasable lines for a product.
 *
 * A variable product lists its variations as ids and attributes only — no
 * prices. Each variation is however a product in its own right, so its
 * price comes from fetching it directly. That is one request per variation,
 * so callers that only need a "from" price (cards, listings) pass
 * `withVariations: false` and get a single line at the range minimum.
 */
async function toVariants(
  product: WcProduct,
  withVariations: boolean,
): Promise<ProductVariant[]> {
  if (!product.has_options) {
    return [simpleVariant(product, "Standard")];
  }

  const rangeMinimum = () => [
    simpleVariant(
      product,
      "From",
      product.prices.price_range?.min_amount ?? product.prices.price,
    ),
  ];

  if (!withVariations || !product.variations?.length) return rangeMinimum();

  const details = await Promise.all(
    product.variations.map((ref) => wcFetchOptional<WcProduct>(`/products/${ref.id}`)),
  );

  const variants = product.variations
    .map((ref, index): ProductVariant | null => {
      const detail = details[index];
      if (!detail) return null;

      const onSale =
        detail.prices.sale_price && detail.prices.sale_price !== detail.prices.regular_price;

      return {
        id: String(ref.id),
        label: ref.attributes.map((a) => a.value).join(" / ") || detail.name,
        price: toMinorUnits(detail.prices.price),
        compareAt: onSale ? toMinorUnits(detail.prices.regular_price) : undefined,
        inStock: detail.is_in_stock,
      };
    })
    .filter((v): v is ProductVariant => v !== null);

  // Every variation lookup failed — better a "from" price than an unbuyable product.
  return variants.length ? variants : rangeMinimum();
}

async function mapWcProduct(product: WcProduct, withVariations = false): Promise<Product> {
  const description = stripHtml(product.description);
  const blurb = stripHtml(product.short_description) || description.slice(0, 140);

  return {
    handle: product.slug,
    name: product.name,
    aliases: [],
    category: product.categories[0]?.slug ?? "uncategorized",
    blurb,
    description,
    form: "",
    storage: "",
    variants: await toVariants(product, withVariations),
    featured: false,
  };
}

export async function listWcProducts(options?: {
  category?: string;
  search?: string;
  sort?: "featured" | "price-asc" | "price-desc" | "name";
  perPage?: number;
}): Promise<Product[]> {
  const sortParams: Record<string, string> = {
    featured: "menu_order",
    "price-asc": "price",
    "price-desc": "price",
    name: "title",
  };
  const order = options?.sort === "price-desc" ? "desc" : "asc";

  /*
   * "featured" is a sort, not a filter: it means featured first, then the
   * rest of the catalog. Passing WooCommerce featured=true here instead
   * hides every product that isn't flagged, emptying the store page.
   */
  const raw = await wcFetch<WcProduct[]>("/products", [], {
    category: options?.category,
    search: options?.search,
    orderby: options?.sort ? sortParams[options.sort] : undefined,
    order: options?.sort ? order : undefined,
    per_page: options?.perPage ?? 100,
  });

  return Promise.all(raw.map((p) => mapWcProduct(p)));
}

export async function getWcProductBySlug(slug: string): Promise<Product | null> {
  const raw = await wcFetch<WcProduct[]>("/products", [], { slug });
  const match = raw[0];
  // The detail page shows a size selector, so resolve every variation here.
  return match ? mapWcProduct(match, true) : null;
}

export async function getWcFeaturedProducts(limit = 6): Promise<Product[]> {
  const raw = await wcFetch<WcProduct[]>("/products", [], { featured: true, per_page: limit });
  return Promise.all(raw.map((p) => mapWcProduct(p)));
}

export async function getWcRelatedProducts(handle: string, limit = 4): Promise<Product[]> {
  const current = await getWcProductBySlug(handle);
  if (!current) return [];

  const raw = await wcFetch<WcProduct[]>("/products", [], {
    category: current.category,
    per_page: limit + 1,
  });

  const mapped = await Promise.all(raw.map((p) => mapWcProduct(p)));
  return mapped.filter((p) => p.handle !== handle).slice(0, limit);
}

/**
 * Looks up a product/variant pair by the variant id used as the cart line key.
 *
 * That id is a variation id for variable products and a product id for
 * simple ones. Both are fetchable at the same path — a variation comes back
 * as a product of type "variation" carrying its own price and its label in
 * the `variation` field ("Size: 4mg").
 */
export async function getWcProductAndVariant(
  variantId: string,
): Promise<{ product: Product; variant: ProductVariant } | null> {
  const raw = await wcFetchOptional<WcProduct>(`/products/${variantId}`);
  if (!raw) return null;

  const product = await mapWcProduct(raw);

  if (raw.type === "variation") {
    const label = (raw.variation ?? "")
      .split(",")
      .map((part) => part.split(":").pop()?.trim() ?? "")
      .filter(Boolean)
      .join(" / ");

    return {
      product,
      variant: { ...simpleVariant(raw, label || "Standard"), id: String(raw.id) },
    };
  }

  return { product, variant: product.variants[0] };
}

export async function listWcCategories(): Promise<{ slug: string; name: string }[]> {
  const raw = await wcFetch<WcCategory[]>("/products/categories", [], { per_page: 100 });
  return raw.map((c) => ({ slug: c.slug, name: c.name }));
}
