import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createReceiptPdf } from "../index";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

test("createReceiptPdf returns a non-empty PDF buffer", () => {
  const receiptJson = fs.readFileSync(path.join(dirname, "fixtures", "receipt.json"), "utf8");

  const pdf = createReceiptPdf(receiptJson);
  const buf = Buffer.from(pdf);

  assert.ok(buf.length > 100, "PDF should not be tiny");
  assert.equal(buf.subarray(0, 5).toString("ascii"), "%PDF-", "Should start with %PDF-");
});

test("writes a PDF artifact for inspection (gitignored)", () => {
  const receiptJson = fs.readFileSync(path.join(dirname, "fixtures", "receipt.json"), "utf8");

  const pdf = Buffer.from(createReceiptPdf(receiptJson));

  const outDir = path.join(dirname, "output");
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "receipt.test.pdf");
  fs.writeFileSync(outPath, pdf);

  assert.ok(fs.existsSync(outPath));
});
