#!/usr/bin/env node
/**
 * Standalone PDF→PNG converter. Called via child_process from the worker
 * to avoid hoisting pdfjs-dist into the root node_modules (which breaks
 * Remotion's webpack bundler).
 *
 * Usage:
 *   node pdf-to-png.mjs <input.pdf> <output.png> [scale]
 *
 * Requires pdf-to-img to be installed globally or via npx. The worker
 * pre-installs it in a local cache dir on the box.
 */
import { writeFileSync } from "node:fs";

const [,, inputPdf, outputPng, scaleStr] = process.argv;
if (!inputPdf || !outputPng) {
  console.error("Usage: pdf-to-png.mjs <input.pdf> <output.png> [scale]");
  process.exit(1);
}

const scale = parseFloat(scaleStr || "2");

const { pdf } = await import("pdf-to-img");
const doc = await pdf(inputPdf, { scale });
const firstPage = await doc.getPage(1);
if (!firstPage) {
  console.error("No pages in PDF");
  process.exit(1);
}
writeFileSync(outputPng, firstPage);
console.log(`OK ${firstPage.byteLength}`);
