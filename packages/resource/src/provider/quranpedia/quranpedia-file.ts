export interface QuranpediaFile {
  readonly name: string;
  readonly relativePath: string;
  readonly format: "json" | "json.gz" | "zip" | "md";
}

export function createQuranpediaFile(
  name: string,
  relativePath: string,
  format: QuranpediaFile["format"],
): QuranpediaFile {
  return {
    name,
    relativePath,
    format,
  };
}
