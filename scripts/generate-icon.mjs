import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "build-resources", "icon.svg");
const pngPath = path.join(root, "build-resources", "icon.png");
const icoPath = path.join(root, "build-resources", "icon.ico");

const svg = readFileSync(svgPath);

// Generate all required sizes for ICO
const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = await Promise.all(
  sizes.map((size) => sharp(svg).resize(size, size).png().toBuffer())
);

// Save 256px PNG for reference
writeFileSync(pngPath, pngs[pngs.length - 1]);

// Convert to ICO
const ico = await pngToIco(pngs);
writeFileSync(icoPath, ico);

console.log("✓ icon.ico generated");
