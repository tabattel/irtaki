import tempfile
import unittest
from pathlib import Path

from service.inference.transformers_whisper import (
    TransformersWhisperEngine,
    prepare_waveform,
)


class WaveformPreparationTests(unittest.TestCase):

    def test_valid_waveform(self):
        audio = prepare_waveform([0.0, 0.25, -0.25, 0.5])
        self.assertEqual(audio.ndim, 1)
        self.assertEqual(str(audio.dtype), "float32")
        self.assertEqual(audio.size, 4)

    def test_wrong_sample_rate(self):
        with self.assertRaises(ValueError):
            prepare_waveform([0.1, 0.2], sample_rate=48000)

    def test_empty_waveform(self):
        with self.assertRaises(ValueError):
            prepare_waveform([])

    def test_stereo_waveform_rejected(self):
        with self.assertRaises(ValueError):
            prepare_waveform([[0.1, 0.2], [0.3, 0.4]])

    def test_out_of_range_samples_rejected(self):
        with self.assertRaises(ValueError):
            prepare_waveform([0.1, 1.5])

    def test_nan_samples_rejected(self):
        with self.assertRaises(ValueError):
            prepare_waveform([0.1, float("nan")])

    def test_boolean_sample_rate_rejected(self):
        with self.assertRaises(ValueError):
            prepare_waveform([0.1], sample_rate=True)


class TransformersWhisperConfigurationTests(unittest.TestCase):

    def test_missing_model_directory_rejected(self):
        with self.assertRaises(FileNotFoundError):
            TransformersWhisperEngine("/nonexistent/tilawa-model")

    def test_model_directory_requires_config(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(FileNotFoundError):
                TransformersWhisperEngine(directory)

    def test_valid_local_configuration(self):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, "config.json").write_text("{}", encoding="utf-8")

            engine = TransformersWhisperEngine(
                directory,
                model_id="openai/whisper-large-v3-turbo",
                device="cuda",
                dtype="float16",
                model_version="test-snapshot",
            )

            self.assertFalse(engine.is_loaded)
            self.assertEqual(engine.model_version, "test-snapshot")

    def test_invalid_dtype_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, "config.json").write_text("{}", encoding="utf-8")
            with self.assertRaises(ValueError):
                TransformersWhisperEngine(directory, dtype="int8")

    def test_cpu_device_configuration(self):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, "config.json").write_text("{}", encoding="utf-8")
            engine = TransformersWhisperEngine(directory, device="cpu")
            self.assertEqual(engine.device, "cpu")


if __name__ == "__main__":
    unittest.main()
