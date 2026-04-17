#!/usr/bin/env node
/**
 * Standalone PDF→PNG converter. Called via child_process from the worker.
 *
 * MUST be run with cwd=/opt/pdf-tools so Node's ESM resolver finds
 * pdf-to-img in the local node_modules (keeping pdfjs-dist out of the
 * monorepo tree where it breaks Remotion's webpack bundler).
 *
 * Usage:
 *   cd /opt/pdf-tools && node /path/to/pdf-to-png.mjs <input.pdf> <output.png> [scale]
 */
import { writeFileSync } from "node:fs";
import { pdf } from "pdf-to-img";

const [, , inputPdf, outputPng, scaleStr] = process.argv;
if (!inputPdf || !outputPng) {
  console.error("Usage: pdf-to-png.mjs <input.pdf> <output.png> [scale]");
  process.exit(1);
}

const scale = parseFloat(scaleStr || "2");
const doc = await pdf(inputPdf, { scale });
const firstPage = await doc.getPage(1);
if (!firstPage) {
  console.error("No pages in PDF");
  process.exit(1);
}
writeFileSync(outputPng, firstPage);
console.log(`OK ${firstPage.byteLength}`);
