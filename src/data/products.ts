/**
 * Seed catalog.
 *
 * SCAFFOLD: a static in-repo catalog so the storefront renders without a
 * database. `src/lib/db` reads from here today; swapping in a real datastore
 * means reimplementing that module, not touching the UI.
 *
 * Prices are in minor units (USD cents) to keep money out of floating point.
 */

/**
 * Seed-catalog categories are a closed set; WooCommerce-sourced products (see
 * `src/lib/woocommerce.ts`) carry whatever category slug the store defines,
 * so this is a plain string with the seed set as known values only.
 */
export type ProductCategory = string;

export interface ProductVariant {
  /** Stable id, used as the cart line key. */
  id: string;
  /** e.g. "5mg", "10mg", "30ml" */
  label: string;
  price: number;
  /** Optional strike-through reference price. */
  compareAt?: number;
  inStock: boolean;
}

export interface Product {
  handle: string;
  name: string;
  aliases: string[];
  category: ProductCategory;
  /** One line, used on cards. */
  blurb: string;
  /** Two or three sentences, used on the detail page. */
  description: string;
  /** Empty string for WooCommerce-sourced products that don't carry this. */
  form: string;
  sequence?: string;
  cas?: string;
  storage: string;
  variants: ProductVariant[];
  featured?: boolean;
}

const v = (
  handle: string,
  rows: Array<[label: string, price: number, compareAt?: number]>,
): ProductVariant[] =>
  rows.map(([label, price, compareAt]) => ({
    id: `${handle}--${label.toLowerCase().replace(/\s+/g, "-")}`,
    label,
    price,
    compareAt,
    inStock: true,
  }));

const COLD = "Store lyophilized at -20°C. Reconstituted, refrigerate at 2-8°C and use within 30 days.";
const COLD_DARK = "Store lyophilized at -20°C, protected from light.";
const COLD_PLAIN = "Store lyophilized at -20°C.";
const SOLUTION = "Refrigerate at 2-8°C. Use within 60 days of opening.";
const SOLUTION_DARK = "Refrigerate at 2-8°C, protected from light.";

export const products: Product[] = [
  {
    handle: "glp-3",
    name: "GLP-3 (RT)",
    aliases: ["LY3437943", "Retatrutide"],
    category: "metabolic",
    blurb: "39-amino-acid triple agonist targeting GIP, GLP-1 and glucagon receptors.",
    description:
      "A single-chain peptide that engages three incretin receptors at once, making it a common tool compound in metabolic and body-composition research. Supplied lyophilized under nitrogen with a full certificate of analysis.",
    form: "Lyophilized powder",
    storage: COLD,
    variants: v("glp-3", [["4mg", 6999], ["8mg", 11999], ["12mg", 15999], ["20mg", 23999]]),
    featured: true,
  },
  {
    handle: "bpc-157",
    name: "BPC-157",
    aliases: ["Body Protection Compound-157", "PL-14736", "PLD-116", "Bepecin"],
    category: "repair",
    blurb: "15-amino-acid gastric peptide studied for tissue protection in animal models.",
    description:
      "A pentadecapeptide fragment derived from human gastric juice. One of the most widely cited compounds in preclinical tissue-repair literature, and a staple reference standard in regenerative research.",
    form: "Lyophilized powder",
    sequence: "GEPPPGKPADDAGLV",
    storage: COLD,
    variants: v("bpc-157", [["5mg", 3999], ["10mg", 5999], ["10mg × 5", 26999, 29995]]),
    featured: true,
  },
  {
    handle: "tb-500",
    name: "TB-500",
    aliases: ["Thymosin Beta-4", "Tβ4", "TB4"],
    category: "repair",
    blurb: "43-amino-acid thymosin beta-4 fragment; regulates actin polymerization.",
    description:
      "A synthetic fragment of thymosin beta-4 that binds G-actin and influences cell migration in culture. Frequently paired with BPC-157 in comparative regenerative studies.",
    form: "Lyophilized powder",
    storage: COLD,
    variants: v("tb-500", [["5mg", 3999], ["10mg", 6499], ["10mg × 5", 28999, 32495]]),
    featured: true,
  },
  {
    handle: "ghk-cu",
    name: "GHK-Cu",
    aliases: ["Copper Tripeptide-1", "Glycyl-L-histidyl-L-lysine Copper"],
    category: "cosmetic",
    blurb: "Naturally occurring copper tripeptide used in matrix-remodeling research.",
    description:
      "A copper-binding tripeptide present in human plasma. Widely used in in vitro studies of collagen synthesis and extracellular matrix turnover. Ships as a deep-blue lyophilized cake.",
    form: "Lyophilized powder",
    sequence: "GHK",
    storage: COLD_DARK,
    variants: v("ghk-cu", [["50mg", 2999], ["100mg", 4999], ["200mg", 8499]]),
    featured: true,
  },
  {
    handle: "nad-plus",
    name: "NAD+",
    aliases: ["Nicotinamide Adenine Dinucleotide", "Coenzyme I", "Beta-NAD"],
    category: "longevity",
    blurb: "Dinucleotide coenzyme central to sirtuin activity and mitochondrial function.",
    description:
      "An essential redox cofactor and sirtuin substrate. A standard input for cellular-energy and mitochondrial-function assays. Supplied at research grade with HPLC verification.",
    form: "Lyophilized powder",
    cas: "53-84-9",
    storage: "Store lyophilized at -20°C. Hygroscopic — keep sealed until use.",
    variants: v("nad-plus", [["100mg", 6999], ["500mg", 17999], ["1000mg", 29999]]),
    featured: true,
  },
  {
    handle: "tesamorelin",
    name: "Tesamorelin",
    aliases: ["EGRIFTA", "TH9507"],
    category: "metabolic",
    blurb: "44-amino-acid GHRH analog studied for visceral adipose tissue.",
    description:
      "A stabilized analog of growth-hormone-releasing hormone. Used as a reference compound in pituitary-axis and adipose-distribution research.",
    form: "Lyophilized powder",
    storage: "Store lyophilized at -20°C. Reconstituted, refrigerate at 2-8°C and use within 21 days.",
    variants: v("tesamorelin", [["5mg", 6999], ["10mg", 11999]]),
  },
  {
    handle: "melanotan-ii",
    name: "Melanotan II",
    aliases: ["MT-II", "MT-2", "Melanotan 2"],
    category: "cosmetic",
    blurb: "Cyclic α-MSH analog binding melanocortin receptors.",
    description:
      "A cyclic lactam analog of alpha-melanocyte-stimulating hormone with broad melanocortin receptor affinity. Used in melanogenesis pathway research.",
    form: "Lyophilized powder",
    cas: "121062-08-6",
    storage: COLD_DARK,
    variants: v("melanotan-ii", [["10mg", 2995], ["10mg × 5", 12995, 14975]]),
  },
  {
    handle: "aod-9604",
    name: "AOD-9604",
    aliases: ["Anti-Obesity Drug 9604", "hGH Fragment 177-191"],
    category: "metabolic",
    blurb: "15-amino-acid hGH C-terminal fragment studied for lipolysis.",
    description:
      "A modified fragment of the human growth hormone C-terminus that retains lipolytic activity without the full hormone's receptor profile. Common in adipocyte research.",
    form: "Lyophilized powder",
    storage: COLD_PLAIN,
    variants: v("aod-9604", [["5mg", 4999], ["10mg", 8499]]),
  },
  {
    handle: "mots-c",
    name: "MOTS-c",
    aliases: ["Mitochondrial ORF of the 12S rRNA type-c"],
    category: "longevity",
    blurb: "16-amino-acid mitochondrial-derived peptide; exercise metabolism research.",
    description:
      "Encoded in the mitochondrial genome rather than the nuclear one. Studied for its role in metabolic homeostasis and AMPK signaling in rodent models.",
    form: "Lyophilized powder",
    sequence: "MRWQEMGYIFYPRKLR",
    storage: COLD_PLAIN,
    variants: v("mots-c", [["10mg", 3999], ["10mg × 5", 17999, 19995]]),
  },
  {
    handle: "cjc-ipa-no-dac",
    name: "CJC-1295 / Ipamorelin (No DAC)",
    aliases: ["Mod GRF 1-29 + Ipamorelin", "CJC/Ipa Blend"],
    category: "blend",
    blurb: "Paired GHRH analog and ghrelin receptor agonist in one vial.",
    description:
      "A two-compound blend combining a modified GRF(1-29) fragment with ipamorelin. Studied for synchronized activation of complementary secretagogue pathways.",
    form: "Lyophilized powder",
    storage: COLD,
    variants: v("cjc-ipa-no-dac", [["5mg/5mg", 5999], ["10mg/10mg", 9999]]),
  },
  {
    handle: "wolverine-stack",
    name: "BPC-157 / TB-500 Blend",
    aliases: ["Wolverine Blend", "BPC + TB4", "Regenerative Peptide Stack"],
    category: "blend",
    blurb: "The two most-cited repair peptides, pre-blended at a 1:1 ratio.",
    description:
      "Combines BPC-157 and TB-500 in a single lyophilized cake. Saves a reconstitution step in comparative tissue-repair protocols where both compounds are dosed together.",
    form: "Lyophilized powder",
    storage: COLD,
    variants: v("wolverine-stack", [["5mg/5mg", 7999], ["10mg/10mg", 13999]]),
    featured: true,
  },
  {
    handle: "glow",
    name: "GLOW Blend",
    aliases: ["Triple Regenerative Stack", "BPC-157 / TB-500 / GHK-Cu"],
    category: "blend",
    blurb: "Three-peptide blend spanning angiogenic, migratory and matrix pathways.",
    description:
      "BPC-157, TB-500 and GHK-Cu in one vial. Targets three complementary mechanisms studied in preclinical regeneration work — vessel formation, cell migration and matrix remodeling.",
    form: "Lyophilized powder",
    storage: COLD_DARK,
    variants: v("glow", [["Standard", 8999], ["Double", 15999]]),
  },
  {
    handle: "klow",
    name: "KLOW Blend",
    aliases: ["Quad Regenerative Stack", "GLOW + KPV"],
    category: "blend",
    blurb: "GLOW plus KPV — four compounds addressing repair and inflammatory signaling.",
    description:
      "Extends the GLOW blend with KPV, the C-terminal tripeptide of alpha-MSH. Used where an anti-inflammatory arm is wanted alongside the regenerative triad.",
    form: "Lyophilized powder",
    storage: COLD_DARK,
    variants: v("klow", [["Standard", 9999], ["Double", 17999]]),
  },
  {
    handle: "dsip",
    name: "DSIP",
    aliases: ["Delta-Sleep-Inducing Peptide", "Emideltide"],
    category: "cognitive",
    blurb: "Nonapeptide first isolated from rabbit cerebral venous blood.",
    description:
      "A nine-residue neuropeptide named for the slow-wave activity observed in its original isolation studies. Used in sleep-architecture and neuroendocrine research.",
    form: "Lyophilized powder",
    sequence: "WAGGDASGE",
    storage: COLD_PLAIN,
    variants: v("dsip", [["5mg", 2999], ["10mg", 4999]]),
  },
  {
    handle: "semax",
    name: "Semax",
    aliases: ["Met-Glu-His-Phe-Pro-Gly-Pro"],
    category: "cognitive",
    blurb: "Heptapeptide ACTH(4-10) analog used in neurotrophic research.",
    description:
      "A synthetic analog of the ACTH(4-10) fragment with a C-terminal Pro-Gly-Pro extension for stability. Studied for BDNF expression in rodent models.",
    form: "Lyophilized powder",
    storage: COLD_PLAIN,
    variants: v("semax", [["10mg", 2995], ["30mg", 6999]]),
  },
  {
    handle: "selank",
    name: "Selank",
    aliases: ["TP-7", "Selanc"],
    category: "cognitive",
    blurb: "Tuftsin analog studied for anxiolytic pathways in rodent models.",
    description:
      "A heptapeptide derived from the immunomodulatory fragment tuftsin, extended for peptidase resistance. Common in GABAergic and neuroimmune research.",
    form: "Lyophilized powder",
    sequence: "TKPRPGP",
    cas: "129954-34-3",
    storage: COLD_PLAIN,
    variants: v("selank", [["10mg", 2995], ["30mg", 6999]]),
  },
  {
    handle: "kpv",
    name: "KPV",
    aliases: ["Lysine-Proline-Valine", "α-MSH (11-13)"],
    category: "repair",
    blurb: "C-terminal tripeptide of alpha-MSH; inflammatory signaling research.",
    description:
      "The three-residue tail of alpha-melanocyte-stimulating hormone, retaining anti-inflammatory activity without pigmentary effects. Used in mucosal and dermal inflammation models.",
    form: "Lyophilized powder",
    sequence: "KPV",
    cas: "67727-97-3",
    storage: COLD_PLAIN,
    variants: v("kpv", [["10mg", 3999], ["20mg", 6999]]),
  },
  {
    handle: "pt-141",
    name: "PT-141",
    aliases: ["Bremelanotide", "Vyleesi"],
    category: "cosmetic",
    blurb: "Melanocortin receptor agonist; MC4R-focused research.",
    description:
      "A cyclic heptapeptide analog of alpha-MSH with selectivity toward MC4R. Used as a reference agonist in melanocortin receptor pharmacology.",
    form: "Lyophilized powder",
    cas: "189691-06-3",
    storage: COLD_DARK,
    variants: v("pt-141", [["10mg", 2999], ["10mg × 5", 12999, 14995]]),
  },
  {
    handle: "glutathione",
    name: "Glutathione",
    aliases: ["GSH", "L-Glutathione", "Reduced Glutathione"],
    category: "longevity",
    blurb: "Endogenous tripeptide antioxidant and redox buffer.",
    description:
      "The principal intracellular thiol antioxidant. Supplied in reduced form for oxidative-stress and redox-balance assays.",
    form: "Lyophilized powder",
    cas: "70-18-8",
    storage: "Store lyophilized at -20°C. Oxidizes on air exposure — keep sealed.",
    variants: v("glutathione", [["600mg", 5999], ["1500mg", 12999]]),
  },
  {
    handle: "ipamorelin",
    name: "Ipamorelin",
    aliases: ["NNC 26-0161"],
    category: "metabolic",
    blurb: "Selective ghrelin receptor agonist pentapeptide.",
    description:
      "A selective GHS-R1a agonist noted in the literature for minimal cortisol and prolactin cross-activation, which makes it a clean tool compound for secretagogue studies.",
    form: "Lyophilized powder",
    cas: "170851-70-4",
    storage: COLD_PLAIN,
    variants: v("ipamorelin", [["5mg", 4999], ["10mg", 8499]]),
  },
  {
    handle: "igf-1-lr3",
    name: "IGF-1 LR3",
    aliases: ["Long R3 IGF-1", "Long Arginine 3-IGF-1"],
    category: "repair",
    blurb: "83-amino-acid IGF-1 analog with extended serum half-life.",
    description:
      "An IGF-1 variant carrying an N-terminal extension and an Arg3 substitution that reduce IGFBP binding. A standard supplement in serum-free cell culture.",
    form: "Lyophilized powder",
    cas: "143045-27-6",
    storage: "Store lyophilized at -20°C. Do not vortex reconstituted solution.",
    variants: v("igf-1-lr3", [["1mg", 6999], ["5mg", 24999]]),
  },
  {
    handle: "cagrilintide",
    name: "Cagrilintide",
    aliases: ["NN9838", "ZP8396"],
    category: "metabolic",
    blurb: "Long-acting amylin analog used in satiety-signaling research.",
    description:
      "An acylated amylin receptor agonist engineered for extended duration. Frequently studied alongside incretin agonists in combination metabolic research.",
    form: "Lyophilized powder",
    cas: "1415456-99-3",
    storage: COLD_PLAIN,
    variants: v("cagrilintide", [["5mg", 6999], ["10mg", 11999]]),
  },
  {
    handle: "epithalon",
    name: "Epithalon",
    aliases: ["Epitalon", "Epithalone", "AEDG Peptide"],
    category: "longevity",
    blurb: "Tetrapeptide studied for telomerase activity in cell models.",
    description:
      "A four-residue peptide derived from the pineal extract epithalamin. Cited in telomere-length and circadian research originating from Russian gerontology work.",
    form: "Lyophilized powder",
    sequence: "AEDG",
    cas: "307297-39-8",
    storage: COLD_PLAIN,
    variants: v("epithalon", [["10mg", 2999], ["50mg", 9999]]),
  },
  {
    handle: "5-amino-1mq",
    name: "5-Amino-1MQ",
    aliases: ["5-Amino-1-Methylquinolinium", "NNMT inhibitor"],
    category: "metabolic",
    blurb: "Small-molecule NNMT inhibitor used in adipocyte research.",
    description:
      "A cell-permeable quinolinium that inhibits nicotinamide N-methyltransferase, raising intracellular NAD+ in treated adipocytes. Not a peptide — supplied as a small molecule.",
    form: "Lyophilized powder",
    cas: "42464-96-0",
    storage: "Store at -20°C, protected from light.",
    variants: v("5-amino-1mq", [["50mg", 4999], ["150mg", 12999]]),
  },
  {
    handle: "melanotan-i",
    name: "Melanotan I",
    aliases: ["MT-1", "Afamelanotide"],
    category: "cosmetic",
    blurb: "Linear α-MSH analog with MC1R selectivity.",
    description:
      "A 13-residue analog of alpha-MSH that is more receptor-selective than its cyclic counterpart. Used in melanogenesis and photoprotection research.",
    form: "Lyophilized powder",
    cas: "75921-69-6",
    storage: COLD_DARK,
    variants: v("melanotan-i", [["10mg", 2995], ["10mg × 5", 12995, 14975]]),
  },
  {
    handle: "thymosin-alpha-1",
    name: "Thymosin Alpha-1",
    aliases: ["Thymalfasin", "Tα1"],
    category: "longevity",
    blurb: "28-amino-acid thymic peptide used in immune-modulation research.",
    description:
      "An acetylated peptide derived from prothymosin alpha. Studied for T-cell maturation and toll-like receptor signaling in immunology models.",
    form: "Lyophilized powder",
    cas: "62304-98-7",
    storage: COLD_PLAIN,
    variants: v("thymosin-alpha-1", [["5mg", 3999], ["10mg", 6999]]),
  },
  {
    handle: "snap-8",
    name: "SNAP-8",
    aliases: ["Acetyl Octapeptide-3", "Acetyl Glutamyl Heptapeptide-1"],
    category: "cosmetic",
    blurb: "Octapeptide studied for SNARE complex modulation in vitro.",
    description:
      "An elongated analog of the SNAP-25 N-terminal fragment. Used in topical-formulation research on neurotransmitter vesicle docking.",
    form: "Lyophilized powder",
    cas: "868844-74-0",
    storage: COLD_PLAIN,
    variants: v("snap-8", [["10mg", 2999], ["50mg", 9999]]),
  },
  {
    handle: "sermorelin",
    name: "Sermorelin",
    aliases: ["GRF 1-29", "GHRH (1-29)"],
    category: "metabolic",
    blurb: "29-amino-acid GHRH fragment retaining full biological activity.",
    description:
      "The shortest fully active fragment of growth-hormone-releasing hormone. A long-standing reference compound in pituitary-axis research.",
    form: "Lyophilized powder",
    cas: "86168-78-7",
    storage: COLD_PLAIN,
    variants: v("sermorelin", [["5mg", 5999], ["10mg", 9999]]),
  },
  {
    handle: "dihexa",
    name: "Dihexa",
    aliases: ["PNB-0408", "N-hexanoic-Tyr-Ile-(6) aminohexanoic amide"],
    category: "cognitive",
    blurb: "Angiotensin IV analog studied for HGF/c-Met signaling.",
    description:
      "A small, highly lipophilic peptidomimetic derived from angiotensin IV. Cited in synaptogenesis research for its hepatocyte growth factor interaction.",
    form: "Lyophilized powder",
    storage: "Store at -20°C, protected from light.",
    variants: v("dihexa", [["10mg", 5999], ["20mg", 10999]]),
  },
  {
    handle: "ara-290",
    name: "ARA-290",
    aliases: ["Cibinetide", "Erythropoietin-derived peptide"],
    category: "repair",
    blurb: "11-amino-acid erythropoietin fragment; innate repair receptor research.",
    description:
      "A non-hematopoietic fragment of erythropoietin that engages the innate repair receptor. Studied in neuropathy and tissue-protection models.",
    form: "Lyophilized powder",
    storage: COLD_PLAIN,
    variants: v("ara-290", [["10mg", 4999], ["20mg", 8999]]),
  },
  {
    handle: "kisspeptin",
    name: "Kisspeptin-10",
    aliases: ["KP-10", "Metastin (45-54)"],
    category: "metabolic",
    blurb: "Decapeptide GPR54 agonist used in HPG axis research.",
    description:
      "The minimal active fragment of kisspeptin, signaling through GPR54 upstream of GnRH release. A standard tool in reproductive endocrinology.",
    form: "Lyophilized powder",
    storage: COLD_PLAIN,
    variants: v("kisspeptin", [["10mg", 4999], ["20mg", 8999]]),
  },
  {
    handle: "vip",
    name: "VIP",
    aliases: ["Vasoactive Intestinal Peptide", "Aviptadil"],
    category: "repair",
    blurb: "28-amino-acid neuropeptide of the secretin family.",
    description:
      "A broadly distributed signaling peptide acting at VPAC1 and VPAC2 receptors. Used in vasodilation, immune and pulmonary research models.",
    form: "Lyophilized powder",
    cas: "37221-79-7",
    storage: "Store lyophilized at -20°C. Highly labile in solution.",
    variants: v("vip", [["5mg", 4999], ["10mg", 8999]]),
  },
  {
    handle: "glp-2",
    name: "GLP-2 (TR)",
    aliases: ["Teduglutide", "ALX-0600"],
    category: "metabolic",
    blurb: "33-amino-acid GLP-2 analog with extended stability.",
    description:
      "A dipeptidyl-peptidase-resistant analog of glucagon-like peptide-2. Studied for intestinal epithelial growth in gastrointestinal research.",
    form: "Lyophilized powder",
    storage: COLD_PLAIN,
    variants: v("glp-2", [["5mg", 5999], ["10mg", 9999]]),
  },
  {
    handle: "glp-1",
    name: "GLP-1 (SM)",
    aliases: ["Semaglutide"],
    category: "metabolic",
    blurb: "Acylated GLP-1 receptor agonist with a long circulating half-life.",
    description:
      "A GLP-1 analog carrying a C18 diacid side chain that drives albumin binding. Among the most-referenced incretin tool compounds in metabolic research.",
    form: "Lyophilized powder",
    storage: COLD_PLAIN,
    variants: v("glp-1", [["5mg", 4999], ["10mg", 8499], ["20mg", 14999]]),
  },
  {
    handle: "ahk-cu",
    name: "AHK-Cu",
    aliases: ["Alanyl-Histidyl-Lysine Copper"],
    category: "cosmetic",
    blurb: "Copper tripeptide studied for follicular and vascular models.",
    description:
      "A copper-binding tripeptide closely related to GHK-Cu, differing at the first residue. Used in dermal papilla and angiogenesis research.",
    form: "Lyophilized powder",
    sequence: "AHK",
    storage: COLD_DARK,
    variants: v("ahk-cu", [["50mg", 3499], ["100mg", 5999]]),
  },
  {
    handle: "pinealon",
    name: "Pinealon",
    aliases: ["Glu-Asp-Arg", "EDR Peptide"],
    category: "cognitive",
    blurb: "Tripeptide bioregulator used in neuroprotection research.",
    description:
      "A short peptide from the Khavinson bioregulator series, studied for nuclear penetration and gene-expression effects in neuronal cultures.",
    form: "Lyophilized powder",
    sequence: "EDR",
    storage: COLD_PLAIN,
    variants: v("pinealon", [["20mg", 4999], ["50mg", 9999]]),
  },
  {
    handle: "cartalax",
    name: "Cartalax",
    aliases: ["Ala-Glu-Asp-Gly", "AEDG cartilage bioregulator"],
    category: "repair",
    blurb: "Tetrapeptide bioregulator studied in chondrocyte models.",
    description:
      "A short peptide from the same bioregulator family as Epithalon, directed at cartilage and connective tissue research.",
    form: "Lyophilized powder",
    storage: COLD_PLAIN,
    variants: v("cartalax", [["20mg", 6999], ["50mg", 13999]]),
  },
  {
    handle: "ll-37",
    name: "LL-37",
    aliases: ["Cathelicidin", "hCAP-18 (134-170)"],
    category: "repair",
    blurb: "37-residue human cathelicidin; antimicrobial peptide research.",
    description:
      "The only human cathelicidin-derived antimicrobial peptide, with a well-characterized amphipathic helix. Standard in innate-immunity and membrane-disruption assays.",
    form: "Lyophilized powder",
    storage: "Store lyophilized at -20°C. Use low-binding tubes when reconstituting.",
    variants: v("ll-37", [["5mg", 3499], ["10mg", 5999]]),
  },

  // ---- Research solutions --------------------------------------------------
  {
    handle: "nad-plus-spray",
    name: "NAD+ Spray",
    aliases: ["NAD+ research solution"],
    category: "spray",
    blurb: "Pre-dissolved NAD+ in a metered 30ml research solution.",
    description:
      "Supplied as a ready-to-use solution rather than a lyophilized cake, for protocols where reconstitution variance is a confound.",
    form: "Research solution",
    storage: SOLUTION,
    variants: v("nad-plus-spray", [["30ml", 4999]]),
  },
  {
    handle: "selank-spray",
    name: "Selank Spray",
    aliases: ["Selank research solution"],
    category: "spray",
    blurb: "Selank in a metered 30ml research solution.",
    description: "A pre-dissolved presentation of Selank for protocols requiring consistent per-actuation volume.",
    form: "Research solution",
    storage: SOLUTION,
    variants: v("selank-spray", [["30ml", 5999]]),
  },
  {
    handle: "semax-spray",
    name: "Semax Spray",
    aliases: ["Semax research solution"],
    category: "spray",
    blurb: "Semax in a metered 30ml research solution.",
    description: "A pre-dissolved presentation of Semax for protocols requiring consistent per-actuation volume.",
    form: "Research solution",
    storage: SOLUTION,
    variants: v("semax-spray", [["30ml", 5999]]),
  },
  {
    handle: "ghkcu-spray",
    name: "GHK-Cu Spray",
    aliases: ["Copper peptide research solution"],
    category: "spray",
    blurb: "GHK-Cu in a metered 30ml research solution.",
    description: "A pre-dissolved copper tripeptide solution for topical-model and matrix-remodeling research.",
    form: "Research solution",
    storage: SOLUTION_DARK,
    variants: v("ghkcu-spray", [["30ml", 4999]]),
  },
  {
    handle: "pt-141-spray",
    name: "PT-141 Spray",
    aliases: ["Bremelanotide research solution"],
    category: "spray",
    blurb: "PT-141 in a metered 30ml research solution.",
    description: "A pre-dissolved presentation of PT-141 for melanocortin receptor research.",
    form: "Research solution",
    storage: SOLUTION_DARK,
    variants: v("pt-141-spray", [["30ml", 5499]]),
  },
  {
    handle: "bpc-spray",
    name: "BPC-157 Spray",
    aliases: ["BPC-157 research solution"],
    category: "spray",
    blurb: "BPC-157 in a metered 30ml research solution.",
    description: "A pre-dissolved presentation of BPC-157 for protocols requiring consistent per-actuation volume.",
    form: "Research solution",
    storage: SOLUTION,
    variants: v("bpc-spray", [["30ml", 5999]]),
  },
  {
    handle: "bpc-tb-spray",
    name: "BPC-157 / TB-500 Spray",
    aliases: ["Wolverine research solution"],
    category: "spray",
    blurb: "The BPC-157 / TB-500 blend as a metered 30ml research solution.",
    description: "Both repair peptides pre-dissolved at a fixed ratio, removing a reconstitution step from paired protocols.",
    form: "Research solution",
    storage: SOLUTION,
    variants: v("bpc-tb-spray", [["30ml", 9999]]),
  },
  {
    handle: "dsip-spray",
    name: "DSIP Spray",
    aliases: ["DSIP research solution"],
    category: "spray",
    blurb: "DSIP in a metered 30ml research solution.",
    description: "A pre-dissolved presentation of the delta-sleep-inducing nonapeptide.",
    form: "Research solution",
    storage: SOLUTION,
    variants: v("dsip-spray", [["30ml", 5999]]),
  },
  {
    handle: "melanotan-ii-spray",
    name: "Melanotan II Spray",
    aliases: ["MT-2 research solution"],
    category: "spray",
    blurb: "Melanotan II in a metered 30ml research solution.",
    description: "A pre-dissolved presentation of the cyclic α-MSH analog for melanocortin research.",
    form: "Research solution",
    storage: SOLUTION_DARK,
    variants: v("melanotan-ii-spray", [["30ml", 5999]]),
  },
  {
    handle: "adamax-spray",
    name: "Adamax Spray",
    aliases: ["Semax + Dihexa research solution"],
    category: "spray",
    blurb: "Semax and Dihexa combined in a metered 30ml research solution.",
    description: "Pairs a neurotrophic heptapeptide with an angiotensin IV analog in one solution for cognitive-model research.",
    form: "Research solution",
    storage: SOLUTION_DARK,
    variants: v("adamax-spray", [["30ml", 8999]]),
  },
  {
    handle: "adalank-spray",
    name: "Adalank Spray",
    aliases: ["Selank + Dihexa research solution"],
    category: "spray",
    blurb: "Selank and Dihexa combined in a metered 30ml research solution.",
    description: "Pairs a tuftsin analog with an angiotensin IV analog in one solution for cognitive-model research.",
    form: "Research solution",
    storage: SOLUTION_DARK,
    variants: v("adalank-spray", [["30ml", 8999]]),
  },

  // ---- Accessories ---------------------------------------------------------
  {
    handle: "bacteriostatic-water",
    name: "Bacteriostatic Water",
    aliases: ["Bacteriostatic Water for Injection", "BAC water"],
    category: "accessory",
    blurb: "Sterile water with 0.9% benzyl alcohol for reconstitution.",
    description:
      "Multi-dose sterile diluent for reconstituting lyophilized peptides. The benzyl alcohol preservative allows repeated septum entry without compromising sterility.",
    form: "Bacteriostatic solution",
    storage: "Store at room temperature. Discard 28 days after first entry.",
    variants: v("bacteriostatic-water", [["10ml", 1999], ["30ml", 2999], ["10ml × 5", 8999, 9995]]),
  },
];

// ---- Derived lookups --------------------------------------------------------

export const categoryLabels: Record<string, string> = {
  repair: "Repair & Recovery",
  metabolic: "Metabolic",
  longevity: "Longevity",
  cognitive: "Cognitive",
  cosmetic: "Dermal & Cosmetic",
  blend: "Blends",
  spray: "Research Solutions",
  accessory: "Accessories",
};

/**
 * Display label for a category slug. Falls back to title-casing the slug for
 * categories that don't come from the seed catalog (e.g. anything defined in
 * WooCommerce), since those aren't known ahead of time.
 */
export const categoryLabel = (category: string): string =>
  categoryLabels[category] ??
  category
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

export const productsByHandle = new Map(products.map((p) => [p.handle, p]));

export const priceFrom = (product: Product): number =>
  Math.min(...product.variants.map((variant) => variant.price));

export const formatPrice = (cents: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
