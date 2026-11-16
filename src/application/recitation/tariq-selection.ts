// Règles de sélection Tariq / Wajh, partagées par l'interface et le serveur.
// Module pur : aucun import, pas de "use client" (importable des deux côtés).

export type RecitationMode = "tarteel1" | "tarteel2";

// Turuq ouverts dans Tarteel 2, par riwaya. Pour en ouvrir un : ajouter son id.
export const TARIQ_ENABLED: Readonly<Record<number, readonly number[]>> = {
  10: [101, 102], // حفص : الشاطبية، طيبة النشر
  2: [21, 22], // ورش : الأزرق، الأصبهاني
};

// Clés de préférence (par profil) lues par le détail Tarteel 2 et l'enregistreur.
export const TARIQ_KEY_PREFIX = "irtaki.mushaf.tarteel2.tariq.";
export const WAJH_KEY_PREFIX = "irtaki.mushaf.tarteel2.wajh.";

export function allowedTuruq(riwayaId: number): readonly number[] {
  return TARIQ_ENABLED[riwayaId] ?? [];
}

// Le choix est obligatoire : Tarteel 2 seulement, et seulement pour les
// riwayat dont les Turuq sont ouverts.
export function requiresTariq(mode: RecitationMode, riwayaId: number): boolean {
  return mode === "tarteel2" && allowedTuruq(riwayaId).length > 0;
}

export type SelectionInput = {
  mode: RecitationMode;
  riwayaId: number;
  tariqId: number | null;
  wajhId: number | null;
};

export type SelectionContext = {
  tariq: { id: number; riwayaId: number } | null;
  wujuh: readonly { id: number }[]; // Wujuh actifs du Tariq demandé
};

export type SelectionError =
  | "TARIQ_REQUIRED"
  | "TARIQ_NOT_ALLOWED"
  | "WAJH_REQUIRED"
  | "WAJH_NOT_ALLOWED";

export type SelectionResult =
  | { ok: true; tariqId: number | null; wajhId: number | null }
  | { ok: false; error: SelectionError };

export function evaluateSelection(
  input: SelectionInput,
  context: SelectionContext,
): SelectionResult {
  if (!requiresTariq(input.mode, input.riwayaId)) {
    return { ok: true, tariqId: null, wajhId: null };
  }

  const tariqId = input.tariqId;
  if (tariqId === null) return { ok: false, error: "TARIQ_REQUIRED" };

  if (
    !allowedTuruq(input.riwayaId).includes(tariqId) ||
    context.tariq === null ||
    context.tariq.id !== tariqId ||
    context.tariq.riwayaId !== input.riwayaId
  ) {
    return { ok: false, error: "TARIQ_NOT_ALLOWED" };
  }

  const wujuh = context.wujuh;

  if (wujuh.length === 0) {
    return input.wajhId === null
      ? { ok: true, tariqId, wajhId: null }
      : { ok: false, error: "WAJH_NOT_ALLOWED" };
  }

  const [only] = wujuh;
  if (wujuh.length === 1 && only !== undefined) {
    // Un seul Wajh : il est sélectionné d'office.
    return input.wajhId === null || input.wajhId === only.id
      ? { ok: true, tariqId, wajhId: only.id }
      : { ok: false, error: "WAJH_NOT_ALLOWED" };
  }

  if (input.wajhId === null) return { ok: false, error: "WAJH_REQUIRED" };
  const chosen = input.wajhId;
  if (!wujuh.some((item) => item.id === chosen)) {
    return { ok: false, error: "WAJH_NOT_ALLOWED" };
  }
  return { ok: true, tariqId, wajhId: chosen };
}
