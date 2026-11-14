from __future__ import annotations

import unittest

import numpy as np

from service.app.audio import (
    decode_float32_pcm,
    resample_to_16khz,
)


class AudioPreparationTests(unittest.TestCase):
    def test_48khz_to_16khz(self):
        rate = 48000
        duration = 3.0
        time_axis = np.arange(int(rate * duration)) / rate

        waveform = (
            0.5 * np.sin(2 * np.pi * 440 * time_axis)
        ).astype(np.float32)

        decoded = decode_float32_pcm(
            waveform.astype("<f4").tobytes(),
            rate,
        )
        result = resample_to_16khz(decoded, rate)

        self.assertEqual(result.dtype, np.float32)
        self.assertEqual(result.ndim, 1)
        self.assertEqual(result.size, 48000)
        self.assertTrue(np.isfinite(result).all())

    def test_44100hz_to_16khz(self):
        waveform = np.zeros(44100, dtype=np.float32)
        result = resample_to_16khz(waveform, 44100)
        self.assertEqual(result.size, 16000)

    def test_32000hz_to_16khz(self):
        waveform = np.zeros(64000, dtype=np.float32)
        result = resample_to_16khz(waveform, 32000)
        self.assertEqual(result.size, 32000)

    def test_16000hz_is_preserved(self):
        waveform = np.zeros(16000, dtype=np.float32)
        result = resample_to_16khz(waveform, 16000)
        self.assertEqual(result.size, waveform.size)

    def test_rejects_unaligned_payload(self):
        with self.assertRaises(ValueError):
            decode_float32_pcm(b"\x00\x01\x02", 48000)

    def test_rejects_non_finite_samples(self):
        waveform = np.zeros(12000, dtype="<f4")
        waveform[-1] = np.nan

        with self.assertRaises(ValueError):
            decode_float32_pcm(waveform.tobytes(), 48000)

    def test_rejects_out_of_range_samples(self):
        waveform = np.full(12000, 1.5, dtype="<f4")

        with self.assertRaises(ValueError):
            decode_float32_pcm(waveform.tobytes(), 48000)

    def test_rejects_unsupported_sample_rate(self):
        with self.assertRaises(ValueError):
            decode_float32_pcm(bytes(16000 * 4), 192000)

    def test_rejects_audio_shorter_than_minimum(self):
        waveform = np.zeros(1000, dtype="<f4")

        with self.assertRaises(ValueError):
            decode_float32_pcm(waveform.tobytes(), 48000)


if __name__ == "__main__":
    unittest.main(verbosity=2)
