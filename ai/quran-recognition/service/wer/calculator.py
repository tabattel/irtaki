from __future__ import annotations

from dataclasses import dataclass


WER_ALGORITHM_VERSION = "word-edit-distance-v1"


@dataclass(frozen=True, slots=True)
class WERResult:
    substitutions: int
    deletions: int
    insertions: int
    reference_word_count: int
    hypothesis_word_count: int

    @property
    def edit_distance(self) -> int:
        return self.substitutions + self.deletions + self.insertions

    @property
    def wer(self) -> float:
        return self.edit_distance / self.reference_word_count

    @property
    def wer_percent(self) -> float:
        return self.wer * 100.0


def calculate_wer(reference: str, hypothesis: str) -> WERResult:
    """
    Calculate word error rate using Levenshtein alignment.

    Inputs must already be normalized by the selected normalization
    profile. Words are separated by whitespace.

    WER = (substitutions + deletions + insertions) / reference words.

    WER is deliberately not capped at 100%.
    """

    if not isinstance(reference, str):
        raise TypeError("reference must be a string")

    if not isinstance(hypothesis, str):
        raise TypeError("hypothesis must be a string")

    reference_words = reference.split()
    hypothesis_words = hypothesis.split()

    if not reference_words:
        raise ValueError("reference must contain at least one word")

    n = len(reference_words)
    m = len(hypothesis_words)

    # Dynamic programming matrix.
    distance = [[0] * (m + 1) for _ in range(n + 1)]

    for i in range(n + 1):
        distance[i][0] = i

    for j in range(m + 1):
        distance[0][j] = j

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            substitution_cost = (
                0 if reference_words[i - 1] == hypothesis_words[j - 1]
                else 1
            )

            distance[i][j] = min(
                distance[i - 1][j] + 1,
                distance[i][j - 1] + 1,
                distance[i - 1][j - 1] + substitution_cost,
            )

    # Backtrace to classify substitutions, deletions and insertions.
    i = n
    j = m

    substitutions = 0
    deletions = 0
    insertions = 0

    while i > 0 or j > 0:

        # Exact match.
        if (
            i > 0
            and j > 0
            and reference_words[i - 1] == hypothesis_words[j - 1]
            and distance[i][j] == distance[i - 1][j - 1]
        ):
            i -= 1
            j -= 1
            continue

        # Substitution.
        if (
            i > 0
            and j > 0
            and distance[i][j] == distance[i - 1][j - 1] + 1
        ):
            substitutions += 1
            i -= 1
            j -= 1
            continue

        # Deletion.
        if (
            i > 0
            and distance[i][j] == distance[i - 1][j] + 1
        ):
            deletions += 1
            i -= 1
            continue

        # Insertion.
        if (
            j > 0
            and distance[i][j] == distance[i][j - 1] + 1
        ):
            insertions += 1
            j -= 1
            continue

        raise RuntimeError("Unable to reconstruct WER alignment")

    result = WERResult(
        substitutions=substitutions,
        deletions=deletions,
        insertions=insertions,
        reference_word_count=n,
        hypothesis_word_count=m,
    )

    if result.edit_distance != distance[n][m]:
        raise RuntimeError("WER alignment consistency check failed")

    return result
