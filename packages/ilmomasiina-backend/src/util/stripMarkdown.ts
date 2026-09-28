let processor: ((md: string) => string) | null = null;

export async function getStripMarkdownProcessor() {
  if (!processor) {
    // These are all ESM-only libraries. As long as ilmomasiina compiles down to CommonJS,
    // these libraries have to be dynamically imported.
    const { remark } = await import("remark");
    const { default: strip } = await import("strip-markdown");
    const { default: remarkGfm } = await import("remark-gfm");
    processor = (md) => remark().use(remarkGfm).use(strip).processSync(md).toString();
  }
  return processor;
}
