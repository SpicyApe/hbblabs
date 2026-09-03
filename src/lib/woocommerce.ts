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
 * The catalog lives on the WordPress/WooCommerce install, which sits on its
 * own hostname: hbb-labs.com itself serves this storefront, so pointing at
 * the apex would make the app ask itself for its own catalog.
 */
const WC_URL = (process.env.WOOCOMMERCE_URL ?? "https://cms.hbb-labs.com").replace(/\/$/, "");
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

function toVariants(product: WcProduct): ProductVariant[] {
  if (product.has_options) {
    const min = product.prices.price_range?.min_amount ?? product.prices.price;
    return [
      {
        id: String(product.id),
        label: "From",
        price: toMinorUnits(min),
        inStock: product.is_in_stock,
      },
    ];
  }

  const onSale =
    product.prices.sale_price && product.prices.sale_price !== product.prices.regular_price;

  return [
    {
      id: String(product.id),
      label: "Standard",
      price: toMinorUnits(product.prices.price),
      compareAt: onSale ? toMinorUnits(product.prices.regular_price) : undefined,
      inStock: product.is_in_stock,
    },
  ];
}

function mapWcProduct(product: WcProduct): Product {
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
    variants: toVariants(product),
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

  const raw = await wcFetch<WcProduct[]>("/products", [], {
    category: options?.category,
    search: options?.search,
    featured: options?.sort === "featured" ? true : undefined,
    orderby: options?.sort ? sortParams[options.sort] : undefined,
    order: options?.sort ? order : undefined,
    per_page: options?.perPage ?? 100,
  });

  return raw.map(mapWcProduct);
}

export async function getWcProductBySlug(slug: string): Promise<Product | null> {
  const raw = await wcFetch<WcProduct[]>("/products", [], { slug });
  const match = raw[0];
  return match ? mapWcProduct(match) : null;
}

export async function getWcFeaturedProducts(limit = 6): Promise<Product[]> {
  const raw = await wcFetch<WcProduct[]>("/products", [], { featured: true, per_page: limit });
  return raw.map(mapWcProduct);
}

export async function getWcRelatedProducts(handle: string, limit = 4): Promise<Product[]> {
  const current = await getWcProductBySlug(handle);
  if (!current) return [];

  const raw = await wcFetch<WcProduct[]>("/products", [], {
    category: current.category,
    per_page: limit + 1,
  });

  return raw.map(mapWcProduct).filter((p) => p.handle !== handle).slice(0, limit);
}

/** Looks up a product/variant pair by the variant id used as the cart line key. */
export async function getWcProductAndVariant(
  variantId: string,
): Promise<{ product: Product; variant: ProductVariant } | null> {
  const raw = await wcFetchOptional<WcProduct>(`/products/${variantId}`);
  if (!raw) return null;
  const product = mapWcProduct(raw);
  return { product, variant: product.variants[0] };
}

export async function listWcCategories(): Promise<{ slug: string; name: string }[]> {
  const raw = await wcFetch<WcCategory[]>("/products/categories", [], { per_page: 100 });
  return raw.map((c) => ({ slug: c.slug, name: c.name }));
}
