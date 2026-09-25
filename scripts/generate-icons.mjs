import { mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";

const source = await readFile("src/app/icon.svg");
await mkdir("public/icons", { recursive: true });

for (const size of [192, 512]) {
  await sharp(source).resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
}

await sharp(source).resize(180, 180).png().toFile("src/app/apple-icon.png");

await sharp({ create: { width: 512, height: 512, channels: 4, background: "#235b49" } })
  .composite([
    { input: await sharp(source).resize(340, 340).toBuffer(), gravity: "centre" },
  ])
  .png()
  .toFile("public/icons/icon-maskable.png");

console.log("Ikon aplikasi dibuat.");
