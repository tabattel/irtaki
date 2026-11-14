"use client";

// Stocke le texte du mushaf dans IndexedDB pour un accès hors-ligne.
const DB_NAME = 'irtaki-mushaf';
const STORE_NAME = 'pages';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePageText(pageNumber: number, text: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(text, pageNumber);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPageText(pageNumber: number): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(pageNumber);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// Télécharge le texte d'une page depuis votre API et le stocke localement.
export async function downloadPage(pageNumber: number): Promise<void> {
  const res = await fetch(`/api/mushaf/page/${pageNumber}`);
  if (!res.ok) throw new Error(`Erreur page ${pageNumber}: ${res.status}`);
  const text = await res.text();
  await savePageText(pageNumber, text);
}

// Télécharge toutes les pages (604 pour le mushaf standard).
export async function downloadAllPages(
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const total = 604;
  for (let i = 1; i <= total; i++) {
    await downloadPage(i);
    onProgress?.(i, total);
    // Petite pause pour ne pas surcharger le serveur
    if (i % 10 === 0) await new Promise((r) => setTimeout(r, 100));
  }
}
