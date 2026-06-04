/**
 * Manual utility to regenerate the Foto Kenangan stego image.
 * Usage: npm run generate:foto -w backend
 */
import { existsSync, unlinkSync } from "node:fs";
import {
  ensureKenanganImage,
  getKenanganImagePath,
} from "../src/challenges/foto-kenangan/generate-image.js";

const outputPath = getKenanganImagePath();

if (existsSync(outputPath)) {
  unlinkSync(outputPath);
}

ensureKenanganImage();
console.log(`Stego image generated: ${outputPath}`);
