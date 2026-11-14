import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageNumber: string }> }
) {
  const { pageNumber } = await params;
  const page = parseInt(pageNumber, 10);

  if (isNaN(page) || page < 1 || page > 604) {
    return new Response("Numéro de page invalide", { status: 400 });
  }

  // ⚠️ IMPORTANT : Remplacez cette logique par la vôtre.
  // Vous devez lire le texte de la page depuis votre base de données
  // ou votre stockage local (storage/mushaf/...).
  //
  // Exemple si vous avez un fichier JSON par page dans storage/mushaf/ :
  // const fs = await import("fs/promises");
  // const path = await import("path");
  // const filePath = path.join(process.cwd(), "storage", "mushaf", `page-${page}.txt`);
  // const text = await fs.readFile(filePath, "utf-8");
  // return new Response(text, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });

  // Pour l'instant, on renvoie un placeholder pour que le bouton ne plante plus.
  // Vous devrez implémenter la vraie lecture.
  const placeholderText = `[Texte de la page ${page} — à remplacer par votre logique de lecture]`;
  
  return new Response(placeholderText, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
