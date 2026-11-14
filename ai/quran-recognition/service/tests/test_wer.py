import unittest

from service.normalization.arabic import normalize_arabic
from service.wer.calculator import (
    WER_ALGORITHM_VERSION,
    calculate_wer,
)


class WERTests(unittest.TestCase):

    def test_version(self):
        self.assertEqual(
            WER_ALGORITHM_VERSION,
            "word-edit-distance-v1",
        )

    def test_exact_match(self):
        result = calculate_wer("الحمد لله", "الحمد لله")

        self.assertEqual(result.edit_distance, 0)
        self.assertEqual(result.wer, 0.0)
        self.assertEqual(result.wer_percent, 0.0)

    def test_one_substitution(self):
        result = calculate_wer(
            "بسم الله الرحمن الرحيم",
            "بسم الله الكريم الرحيم",
        )

        self.assertEqual(result.substitutions, 1)
        self.assertEqual(result.deletions, 0)
        self.assertEqual(result.insertions, 0)
        self.assertEqual(result.wer, 0.25)

    def test_one_deletion(self):
        result = calculate_wer(
            "بسم الله الرحمن",
            "بسم الرحمن",
        )

        self.assertEqual(result.deletions, 1)
        self.assertEqual(result.wer, 1 / 3)

    def test_one_insertion(self):
        result = calculate_wer(
            "بسم الرحمن",
            "بسم الله الرحمن",
        )

        self.assertEqual(result.insertions, 1)
        self.assertEqual(result.wer, 0.5)

    def test_wer_can_exceed_100_percent(self):
        result = calculate_wer(
            "الله",
            "بسم الله الرحمن الرحيم",
        )

        self.assertGreater(result.wer_percent, 100.0)
        self.assertEqual(result.insertions, 3)

    def test_empty_hypothesis(self):
        result = calculate_wer("بسم الله الرحمن", "")

        self.assertEqual(result.deletions, 3)
        self.assertEqual(result.wer, 1.0)

    def test_empty_reference_is_rejected(self):
        with self.assertRaises(ValueError):
            calculate_wer("", "الحمد لله")

    def test_normalization_and_wer_combined(self):
        reference = normalize_arabic("ٱلْحَمْدُ لِلَّٰهِ")
        hypothesis = normalize_arabic("ٱلحمد لله")

        result = calculate_wer(reference, hypothesis)

        self.assertEqual(result.wer, 0.0)

    def test_rejects_non_string(self):
        with self.assertRaises(TypeError):
            calculate_wer(None, "الحمد لله")


if __name__ == "__main__":
    unittest.main()
