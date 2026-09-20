import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const { prisma } = await import("../client/prisma");
const { importAudioReciters, importAudioTracks } =
  await import("./audio-importer");

try {
  await importAudioReciters();
  await importAudioTracks();
} finally {
  await prisma.$disconnect();
}
