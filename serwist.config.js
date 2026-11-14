// @ts-check
import { serwist } from "@serwist/next/config";

export default serwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Les pages seront automatiquement précachées après le build de Next.js.
  // Vous pouvez ajouter des entrées supplémentaires si nécessaire.
});
