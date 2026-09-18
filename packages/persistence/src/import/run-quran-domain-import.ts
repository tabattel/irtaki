import { prisma } from "../client/prisma";
import { importQuranDomain } from "./quran-domain-importer";

try {
  await importQuranDomain();
  console.log("Quran Domain import completed.");
} finally {
  await prisma.$disconnect();
}
