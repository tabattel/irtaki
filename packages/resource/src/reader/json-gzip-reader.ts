import { readFile } from "node:fs/promises";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

const gunzipAsync = promisify(gunzip);

export interface JsonGzipReader {
  read<T>(filePath: string): Promise<T>;
}

export function createJsonGzipReader(): JsonGzipReader {
  return {
    async read<T>(filePath: string): Promise<T> {
      const compressed = await readFile(filePath);
      const decompressed = await gunzipAsync(compressed);
      const json = decompressed.toString("utf-8");

      return JSON.parse(json) as T;
    },
  };
}
