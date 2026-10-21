import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const source = dirname(require.resolve("pdfjs-dist/package.json"));
for (const folder of ["cmaps", "standard_fonts", "wasm"]) {
  const destination = resolve("public/pdfjs", folder);
  await mkdir(destination, { recursive: true });
  await cp(resolve(source, folder), destination, { recursive: true });
}
