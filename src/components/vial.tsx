/**
 * Stand-in product imagery.
 *
 * There is no product photography in this repo, so each compound gets a drawn
 * vial whose label and tint derive from its handle. Deterministic, so a product
 * keeps the same color across the grid, the detail page and the cart.
 *
 * Replace with real photos by swapping this component for <Image> — the call
 * sites pass a product name and handle, which is all a real asset lookup needs.
 */

import { products } from "@/data/products";

/*
 * Eight tints, spaced far enough apart in hue to stay distinguishable at card
 * size. Earlier revisions were prettier and useless: four of them read as the
 * same pale blush once shrunk into a grid.
 */
const TINTS = [
  { bg: "#e6e0f8", cap: "#bfb2e6", label: "#4c3a86" }, // violet
  { bg: "#d5e6f8", cap: "#a8c9e8", label: "#25547f" }, // blue
  { bg: "#cfeaea", cap: "#9fd2d2", label: "#1f5f60" }, // teal
  { bg: "#d5edd8", cap: "#a4d5ab", label: "#2b6135" }, // green
  { bg: "#f6ecc9", cap: "#e3d091", label: "#6f5c17" }, // sand
  { bg: "#fadfc6", cap: "#eeb98a", label: "#8a4d18" }, // amber
  { bg: "#fadde3", cap: "#f0b0bd", label: "#8d2f45" }, // rose
  { bg: "#ecdcef", cap: "#d4b3da", label: "#6b2f75" }, // plum
];

/**
 * Tint is assigned by catalog position rather than by hashing the handle.
 *
 * Hashing looked tidier but distributed badly over 50 short, similar strings —
 * one swatch drew twelve products and another drew none. Cycling the position
 * spreads them exactly evenly and guarantees adjacent cards in the grid never
 * land on the same color.
 */
const TINT_BY_HANDLE = new Map(
  products.map((product, index) => [product.handle, TINTS[index % TINTS.length]]),
);

/** FNV-1a — only reached for handles that aren't in the catalog. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function tintFor(handle: string) {
  return TINT_BY_HANDLE.get(handle) ?? TINTS[hash(handle) % TINTS.length];
}

interface VialProps {
  handle: string;
  name: string;
  /** "vial" for lyophilized powder, "spray" for research solutions. */
  shape?: "vial" | "spray";
  className?: string;
}

export function Vial({ handle, name, shape = "vial", className }: VialProps) {
  const tint = tintFor(handle);

  // Long names need to shrink to stay inside the label.
  const labelSize = name.length > 22 ? 9 : name.length > 14 ? 11 : 13;

  return (
    <svg
      viewBox="0 0 120 200"
      className={className}
      role="img"
      aria-label={`${name} — illustrative vial, not a photograph`}
    >
      <defs>
        {/* Glass: bright edge, body shading, specular highlight on the left. */}
        <linearGradient id={`glass-${handle}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.10" />
          <stop offset="14%" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="34%" stopColor="#fff" stopOpacity="0.10" />
          <stop offset="72%" stopColor="#000" stopOpacity="0.10" />
          <stop offset="92%" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.12" />
        </linearGradient>
        {/* Aluminium crimp cap: banded, not a flat fill. */}
        <linearGradient id={`cap-${handle}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8f949d" />
          <stop offset="12%" stopColor="#e8eaee" />
          <stop offset="32%" stopColor="#fbfbfc" />
          <stop offset="52%" stopColor="#c3c7ce" />
          <stop offset="74%" stopColor="#9aa0a9" />
          <stop offset="90%" stopColor="#dcdfe4" />
          <stop offset="100%" stopColor="#84898f" />
        </linearGradient>
      </defs>

      {/* Soft contact shadow */}
      <ellipse cx="60" cy="190" rx="30" ry="5" fill="#000" opacity="0.12" />

      {shape === "spray" ? (
        <>
          {/* Actuator */}
          <rect x="46" y="6" width="28" height="14" rx="4" fill="#dfe2e7" />
          <rect x="54" y="18" width="12" height="14" fill="#c2c6cd" />
          <rect x="40" y="30" width="40" height="14" rx="4" fill={`url(#cap-${handle})`} />
          {/* Bottle */}
          <rect x="24" y="44" width="72" height="140" rx="12" fill={tint.bg} />
          <rect x="24" y="44" width="72" height="140" rx="12" fill={`url(#glass-${handle})`} />
        </>
      ) : (
        <>
          {/* Crimp cap: flip-top, then the aluminium collar, then the neck. */}
          <rect x="42" y="6" width="36" height="9" rx="4" fill={tint.cap} />
          <rect x="38" y="13" width="44" height="22" rx="4" fill={`url(#cap-${handle})`} />
          <rect x="46" y="34" width="28" height="7" fill="#a9aeb6" />
          {/* Neck flaring into the body */}
          <path
            d="M48 40 h24 v8 l16 14 v112 a10 10 0 0 1 -10 10 h-36 a10 10 0 0 1 -10 -10 v-112 l16 -14 z"
            fill={tint.bg}
          />
          <path
            d="M48 40 h24 v8 l16 14 v112 a10 10 0 0 1 -10 10 h-36 a10 10 0 0 1 -10 -10 v-112 l16 -14 z"
            fill={`url(#glass-${handle})`}
          />
        </>
      )}

      {/* Label — rotated to read up the vial, the way the real ones print */}
      <g transform={`translate(60, ${shape === "spray" ? 116 : 124}) rotate(-90)`}>
        <text
          textAnchor="middle"
          fontSize={labelSize}
          fontWeight="700"
          letterSpacing="0.3"
          fill={tint.label}
          fontFamily="var(--font-sans), sans-serif"
        >
          {name}
        </text>
        <text
          y="13"
          textAnchor="middle"
          fontSize="6"
          letterSpacing="1.4"
          fill={tint.label}
          opacity="0.65"
          fontFamily="var(--font-mono), monospace"
        >
          RESEARCH USE ONLY
        </text>
      </g>
    </svg>
  );
}
