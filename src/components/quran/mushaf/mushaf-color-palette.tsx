"use client";

import { useEffect, useState, type FormEvent } from "react";

export const MUSHAF_COLOR_OPTIONS = [
  { id: "c01", label: "Jaune Fluo", value: "#FFFF33" },
  { id: "c02", label: "Vert Lime", value: "#CCFF00" },
  { id: "c03", label: "Orange Électrique", value: "#FF9137" },
  { id: "c04", label: "Rose Fluo", value: "#FF6EC7" },
  { id: "c05", label: "Bleu Pastel", value: "#A8C3FF" },
  { id: "c06", label: "Violet Lilas", value: "#EDBEF7" },
  { id: "c07", label: "Turquoise Clair", value: "#7DF9FF" },
  { id: "c08", label: "Abricot Doux", value: "#FFE2A4" },
  { id: "c09", label: "Rouge", value: "#FF0000" },
  { id: "c10", label: "Marron", value: "#8B4505" },
  { id: "c11", label: "Gris Clair", value: "#D3D3D3" },
  { id: "c12", label: "Gris Foncé", value: "#A9A9A9" },
] as const;

type ColorAction = "colors" | "highlight";
type SelectionType = "ayah" | "word" | "selection";

type MushafColorPaletteProps = {
  action: ColorAction;
  mode: string;
  selectionType: SelectionType;
  open: boolean;
  labels: Record<string, string>;
  onToggle: () => void;
  onSelect: (color: string) => void;
  onLabelChange: (id: string, label: string) => void;
};

const COLOR_STORAGE_KEY = "irtaki.mushaf.color-palette-values.v3";
const PREVIOUS_COLOR_STORAGE_KEY = "irtaki.mushaf.color-palette-values.v2";
const LEGACY_COLOR_STORAGE_KEY = "irtaki.mushaf.color-palette-values.v1";

function sanitizeColors(value: unknown): Record<string, string> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [id, color] of Object.entries(value)) {
    if (
      /^c(?:0[1-9]|1[0-2])$/.test(id) &&
      typeof color === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(color)
    ) {
      result[id] = color;
    }
  }
  return result;
}

function readStoredPalettes(
  storageKey: string,
  scopedByMode: boolean,
): Record<string, Record<string, string>> {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    const result: Record<string, Record<string, string>> = {};
    const keyPattern = scopedByMode
      ? /^.+\.(ayah|word|selection)\.(colors|highlight)$/
      : /^(ayah|word|selection)\.(colors|highlight)$/;

    for (const [key, value] of Object.entries(parsed)) {
      if (keyPattern.test(key)) {
        result[key] = sanitizeColors(value);
      }
    }

    return result;
  } catch {
    return {};
  }
}

function readLegacyColors(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(LEGACY_COLOR_STORAGE_KEY);
    return raw ? sanitizeColors(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function readSavedColors(
  mode: string,
  selectionType: SelectionType,
  action: ColorAction,
): Record<string, string> {
  const scopedKey = `${mode}.${selectionType}.${action}`;
  const scopedPalettes = readStoredPalettes(COLOR_STORAGE_KEY, true);

  if (Object.prototype.hasOwnProperty.call(scopedPalettes, scopedKey)) {
    return scopedPalettes[scopedKey];
  }

  // Reprendre les préférences enregistrées par la version précédente,
  // sans les partager lorsque l'utilisateur personnalise un contexte.
  const previousKey = `${selectionType}.${action}`;
  const previousPalettes = readStoredPalettes(
    PREVIOUS_COLOR_STORAGE_KEY,
    false,
  );

  if (Object.prototype.hasOwnProperty.call(previousPalettes, previousKey)) {
    return previousPalettes[previousKey];
  }

  return readLegacyColors();
}

export function MushafColorPalette({
  action,
  mode,
  selectionType,
  open,
  labels,
  onToggle,
  onSelect,
  onLabelChange,
}: MushafColorPaletteProps) {
  const [customColors, setCustomColors] = useState<Record<string, string>>({});
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");

  useEffect(() => {
    setCustomColors(readSavedColors(mode, selectionType, action));
  }, [mode, selectionType, action]);

  function changeRectangleColor(id: string, color: string) {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;

    const next = { ...customColors, [id]: color };
    setCustomColors(next);

    try {
      const palettes = readStoredPalettes(COLOR_STORAGE_KEY, true);
      palettes[`${mode}.${selectionType}.${action}`] = next;
      window.localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(palettes));
    } catch {
      // La couleur reste visible pendant la session si le stockage échoue.
    }
  }

  function beginEditing(id: string) {
    const labelKey = `${mode}.${selectionType}.${action}.${id}`;
    setEditingColorId(id);
    setDraftLabel(
      labels[labelKey] ??
        labels[`${selectionType}.${action}.${id}`] ??
        labels[id] ??
        "",
    );
  }

  function saveLabel(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    onLabelChange(
      `${mode}.${selectionType}.${action}.${id}`,
      draftLabel.trim().slice(0, 40),
    );
    setEditingColorId(null);
  }

  const buttonLabel = action === "colors" ? "🎨 تلوين" : "🖍️ تظليل";

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className="rounded-lg border px-3 py-2"
        aria-expanded={open}
        aria-haspopup="true"
        aria-pressed={open}
        onClick={onToggle}
      >
        {buttonLabel}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 z-[70] mt-2 grid max-h-[70vh] w-[min(88vw,28rem)] grid-cols-3 gap-2 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 shadow-xl sm:grid-cols-4"
          role="group"
          aria-label="اختيار لون وتخصيصه"
          dir="rtl"
        >
          {MUSHAF_COLOR_OPTIONS.map((option, index) => {
            const color = customColors[option.id] ?? option.value;
            const specification =
              labels[
                `${mode}.${selectionType}.${action}.${option.id}`
              ]?.trim() ??
              labels[`${selectionType}.${action}.${option.id}`]?.trim() ??
              labels[option.id]?.trim() ??
              "";

            return (
              <div
                key={option.id}
                className="relative h-16 min-w-0 overflow-hidden rounded-lg border border-black/30 shadow-sm"
                style={{ backgroundColor: color }}
              >
                {/* Cliquer sur le rectangle applique sa couleur. */}
                <button
                  type="button"
                  className="absolute inset-0 z-0 h-full w-full rounded-lg"
                  title={`Appliquer ${option.label}`}
                  aria-label={`Appliquer la couleur ${index + 1} : ${option.label}`}
                  onClick={() => onSelect(color)}
                >
                  {specification ? (
                    <span className="pointer-events-none absolute inset-x-1 top-8 bottom-1 line-clamp-2 text-center text-[10px] leading-tight font-semibold break-words text-black">
                      {specification}
                    </span>
                  ) : null}
                </button>

                {/* Stylo : ajouter ou modifier la spécification. */}
                <button
                  type="button"
                  className="absolute top-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded bg-white text-base text-black shadow"
                  title="Écrire ou modifier la spécification"
                  aria-label={`Modifier la spécification du rectangle ${index + 1}`}
                  onClick={() => beginEditing(option.id)}
                >
                  ✎
                </button>

                {/* Pinceau : modifier uniquement la couleur du rectangle. */}
                <label
                  className="absolute top-1 left-1 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded bg-white text-sm text-black shadow"
                  title="Modifier la couleur du rectangle"
                  aria-label={`Modifier la couleur du rectangle ${index + 1}`}
                >
                  <span aria-hidden="true">🖌️</span>
                  <input
                    type="color"
                    value={color}
                    aria-label={`Nouvelle couleur pour le rectangle ${index + 1}`}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    onChange={(event) =>
                      changeRectangleColor(option.id, event.target.value)
                    }
                  />
                </label>

                {editingColorId === option.id && (
                  <form
                    className="absolute inset-0 z-20 flex flex-col justify-center gap-1 bg-white/95 p-1 text-black"
                    onSubmit={(event) => saveLabel(event, option.id)}
                  >
                    <input
                      autoFocus
                      value={draftLabel}
                      maxLength={40}
                      className="w-full min-w-0 rounded border px-1 py-1 text-center text-xs"
                      placeholder="Spécification"
                      aria-label="Spécification du rectangle"
                      onChange={(event) => setDraftLabel(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.preventDefault();
                          setEditingColorId(null);
                        }
                      }}
                    />
                    <div className="flex justify-center gap-1">
                      <button
                        type="submit"
                        className="rounded border px-2 py-0.5 text-xs"
                      >
                        حفظ
                      </button>
                      <button
                        type="button"
                        className="rounded border px-2 py-0.5 text-xs"
                        onClick={() => setEditingColorId(null)}
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
