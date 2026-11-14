import unittest
from dataclasses import FrozenInstanceError

from service.inference.base import RecognitionResult


class RecognitionResultTests(unittest.TestCase):

    def make_result(self, **changes):
        values = {
            "model_id": "openai/whisper-large-v3-turbo",
            "model_version": "local-snapshot-123",
            "transcription": "الحمد لله رب العالمين",
            "language": "ar",
            "inference_duration_ms": 125.5,
            "processing_device": "cuda:0",
            "audio_duration_ms": 4200.0,
        }
        values.update(changes)
        return RecognitionResult(**values)

    def test_valid_result(self):
        result = self.make_result()
        self.assertEqual(result.language, "ar")
        self.assertEqual(result.transcription, "الحمد لله رب العالمين")

    def test_empty_transcription_is_allowed(self):
        result = self.make_result(transcription="")
        self.assertEqual(result.transcription, "")

    def test_result_is_immutable(self):
        result = self.make_result()
        with self.assertRaises(FrozenInstanceError):
            result.transcription = "modified"

    def test_empty_model_id_is_rejected(self):
        with self.assertRaises(ValueError):
            self.make_result(model_id="")

    def test_empty_model_version_is_rejected(self):
        with self.assertRaises(ValueError):
            self.make_result(model_version="")

    def test_negative_duration_is_rejected(self):
        with self.assertRaises(ValueError):
            self.make_result(inference_duration_ms=-1)

    def test_infinite_duration_is_rejected(self):
        with self.assertRaises(ValueError):
            self.make_result(audio_duration_ms=float("inf"))

    def test_non_string_transcription_is_rejected(self):
        with self.assertRaises(TypeError):
            self.make_result(transcription=None)


if __name__ == "__main__":
    unittest.main()
