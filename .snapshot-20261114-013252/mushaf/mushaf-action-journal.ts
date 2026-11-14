export type MushafActionJournalEvent = {
  id: string;
  occurredAt: string;
  action: string;
  label: string;
  references: string[];
  details?: string;
};

const STORAGE_KEY = "irtaki.mushaf.action-journal.v1";
const CHANGE_EVENT = "irtaki:mushaf-action-journal";
const MAX_EVENTS = 1000;

export function readMushafActionJournal(): MushafActionJournalEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is MushafActionJournalEvent =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "string" &&
        "occurredAt" in item &&
        typeof item.occurredAt === "string" &&
        "action" in item &&
        typeof item.action === "string" &&
        "label" in item &&
        typeof item.label === "string" &&
        "references" in item &&
        Array.isArray(item.references) &&
        item.references.every((reference: unknown) => typeof reference === "string"),
    );
  } catch {
    return [];
  }
}

export function recordMushafActionJournalEvent(
  event: Omit<MushafActionJournalEvent, "id" | "occurredAt">,
): void {
  if (typeof window === "undefined") return;

  try {
    const previous = readMushafActionJournal();
    const next: MushafActionJournalEvent[] = [
      ...previous,
      {
        ...event,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        occurredAt: new Date().toISOString(),
      },
    ].slice(-MAX_EVENTS);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Le Mushaf doit rester utilisable si le stockage local est indisponible.
  }
}

export const MUSHAF_ACTION_JOURNAL_CHANGE_EVENT = CHANGE_EVENT;
