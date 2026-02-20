import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");
const appDir = join(root, "src", "app");
const source = join(publicDir, "logo-source.png");

async function generateIcons() {
  const sizes = [
    { size: 32, out: join(appDir, "icon.png") },
    { size: 180, out: join(appDir, "apple-icon.png") },
    { size: 192, out: join(publicDir, "icons", "icon-192.png") },
    { size: 512, out: join(publicDir, "icons", "icon-512.png") },
  ];

  await mkdir(dirname(sizes[1].out), { recursive: true });

  for (const { size, out } of sizes) {
    await sharp(source)
      .resize(size, size)
      .png()
      .toFile(out);
    console.log(`Generated ${out} (${size}x${size})`);
  }
}

generateIcons().catch((err) => {
  console.error(err);
  process.exit(1);
});
