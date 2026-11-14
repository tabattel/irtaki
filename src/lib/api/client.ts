import { getCached, setCached } from "./idb-cache";

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(path, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as T;
    // Mise en cache asynchrone, non bloquante
    void setCached(path, data);
    return data;
  } catch (err) {
    // Réseau ou serveur indisponible : on tente IndexedDB
    const cached = await getCached<T>(path);
    if (cached !== null) {
      return cached;
    }
    // Rien en cache : on propage l'erreur
    throw err;
  }
}
