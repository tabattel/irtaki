#!/usr/bin/env python3

import json
import sqlite3
from pathlib import Path

LAYOUT_DB = Path("/tmp/qpc-layout/qpc-v2-15-lines.db")
WORDS_DB = Path("/tmp/qpc-words/qpc-hafs-word-by-word.db")

OUTPUT_DIR = Path(
    "storage/mushaf/layout/kfgqpc-v2-1421h"
)

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def load_words():
    db = sqlite3.connect(WORDS_DB)
    db.row_factory = sqlite3.Row

    rows = db.execute(
        """
        SELECT
          id,
          location,
          surah,
          ayah,
          word,
          text
        FROM words
        ORDER BY id
        """
    ).fetchall()

    db.close()

    return {
        row["id"]: {
            "id": row["id"],
            "key": row["location"],
            "surah": row["surah"],
            "ayah": row["ayah"],
            "word": row["word"],
            "text": row["text"],
        }
        for row in rows
    }


def build_page(page_number, layout_db, words):
    rows = layout_db.execute(
        """
        SELECT
          page_number,
          line_number,
          line_type,
          is_centered,
          first_word_id,
          last_word_id,
          surah_number
        FROM pages
        WHERE page_number = ?
        ORDER BY line_number
        """,
        (page_number,),
    ).fetchall()

    lines = []

    for row in rows:
        line = {
            "line": row["line_number"],
            "type": row["line_type"],
            "centered": bool(row["is_centered"]),
            "surahNumber": row["surah_number"],
            "words": [],
        }

        first_word_id = row["first_word_id"]
        last_word_id = row["last_word_id"]

        if (
            row["line_type"] == "ayah"
            and first_word_id is not None
            and last_word_id is not None
        ):
            for word_id in range(first_word_id, last_word_id + 1):
                word = words.get(word_id)

                if word is None:
                    raise RuntimeError(
                        f"Missing word id {word_id} "
                        f"on page {page_number}, "
                        f"line {row['line_number']}"
                    )

                line["words"].append(word)

        lines.append(line)

    return {
        "page": page_number,
        "lines": lines,
    }


def main():
    words = load_words()

    layout_db = sqlite3.connect(LAYOUT_DB)
    layout_db.row_factory = sqlite3.Row

    page_numbers = [
        row[0]
        for row in layout_db.execute(
            "SELECT DISTINCT page_number "
            "FROM pages "
            "ORDER BY page_number"
        )
    ]

    if page_numbers != list(range(1, 605)):
        raise RuntimeError(
            f"Expected pages 1..604, got "
            f"{len(page_numbers)} pages"
        )

    for page_number in page_numbers:
        page = build_page(page_number, layout_db, words)

        output = OUTPUT_DIR / f"page-{page_number:03d}.json"

        output.write_text(
            json.dumps(
                page,
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

    layout_db.close()

    print(
        f"Generated {len(page_numbers)} Mushaf pages "
        f"under {OUTPUT_DIR}"
    )


if __name__ == "__main__":
    main()
