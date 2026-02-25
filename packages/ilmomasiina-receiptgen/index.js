/* eslint-disable import/no-dynamic-require */

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const require = createRequire(import.meta.url);

const addonPath = path.join(dirname, "index.node");

if (!fs.existsSync(addonPath)) {
  throw new Error(`Native addon not found at ${addonPath}. Run: pnpm --filter ilmomasiina-receiptgen build`);
}

const { createReceiptPdf } = require(addonPath);

export { createReceiptPdf };
export default { createReceiptPdf };
