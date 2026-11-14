import unittest

from service.normalization.arabic import (
    NORMALIZATION_VERSION,
    normalize_arabic,
)


class ArabicNormalizationTests(unittest.TestCase):

    def test_version(self):
        self.assertEqual(NORMALIZATION_VERSION, "quran-ar-v1")

    def test_removes_harakat(self):
        source = "ٱلْحَمْدُ لِلَّٰهِ"
        self.assertEqual(normalize_arabic(source), "ٱلحمد لله")

    def test_removes_punctuation(self):
        source = "بِسْمِ اللَّهِ، الرَّحْمَٰنِ."
        self.assertEqual(normalize_arabic(source), "بسم الله الرحمن")

    def test_removes_tatweel(self):
        self.assertEqual(normalize_arabic("الرَّحْمَٰنــــ"), "الرحمن")

    def test_collapses_whitespace(self):
        source = "  الحمد   لله\nرب\tالعالمين  "
        self.assertEqual(
            normalize_arabic(source),
            "الحمد لله رب العالمين",
        )

    def test_preserves_letter_distinctions(self):
        source = "أ إ آ ٱ ا ة ه ى ي"
        self.assertEqual(normalize_arabic(source), source)

    def test_removes_quranic_annotation_signs(self):
        self.assertEqual(normalize_arabic("الحمد ۞ لله"), "الحمد لله")

    def test_rejects_non_string(self):
        with self.assertRaises(TypeError):
            normalize_arabic(None)


if __name__ == "__main__":
    unittest.main()
