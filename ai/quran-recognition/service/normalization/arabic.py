from __future__ import annotations

import unicodedata


NORMALIZATION_VERSION = "quran-ar-v1"


def normalize_arabic(text: str) -> str:
    """
    Normalize Arabic Quranic transcription for word comparison.

    Policy quran-ar-v1:
    - Unicode NFC normalization.
    - Remove Arabic combining marks.
    - Remove Quranic annotation signs.
    - Remove tatweel.
    - Replace punctuation with spaces.
    - Remove Unicode formatting controls.
    - Collapse whitespace.

    Important:
    Arabic letter identities are preserved. Alef/hamza variants,
    ta marbuta, ya and alef maqsurah are not folded together.
    """

    if not isinstance(text, str):
        raise TypeError("text must be a string")

    text = unicodedata.normalize("NFC", text)

    output: list[str] = []

    for char in text:
        codepoint = ord(char)
        category = unicodedata.category(char)

        # Tatweel.
        if codepoint == 0x0640:
            continue

        # Quranic annotation signs and recitation symbols.
        if 0x06D6 <= codepoint <= 0x06ED:
            continue

        # Arabic combining marks, including harakat.
        if (
            category in {"Mn", "Me"}
            and 0x0600 <= codepoint <= 0x08FF
        ):
            continue

        # Punctuation must separate words, not merge them.
        if category.startswith("P"):
            output.append(" ")
            continue

        # Remove invisible direction and formatting controls.
        if category == "Cf":
            continue

        output.append(char)

    return " ".join("".join(output).split())
