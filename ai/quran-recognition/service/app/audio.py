from __future__ import annotations

from math import gcd

import numpy as np
from scipy.signal import resample_poly


TARGET_SAMPLE_RATE = 16000
MIN_SOURCE_SAMPLE_RATE = 8000
MAX_SOURCE_SAMPLE_RATE = 96000
MAX_AUDIO_DURATION_SECONDS = 5.0
MAX_AUDIO_BYTES = 2_000_000


def decode_float32_pcm(payload: bytes, sample_rate: int) -> np.ndarray:
    """Decode mono little-endian float32 PCM received over HTTP."""

    if not isinstance(payload, bytes):
        raise TypeError("payload must be bytes")

    if (
        not isinstance(sample_rate, int)
        or isinstance(sample_rate, bool)
        or not MIN_SOURCE_SAMPLE_RATE <= sample_rate <= MAX_SOURCE_SAMPLE_RATE
    ):
        raise ValueError("unsupported source sample rate")

    if not payload:
        raise ValueError("audio payload must not be empty")

    if len(payload) > MAX_AUDIO_BYTES:
        raise ValueError("audio payload is too large")

    if len(payload) % 4 != 0:
        raise ValueError("float32 PCM payload must be aligned to four bytes")

    sample_count = len(payload) // 4

    if sample_count > sample_rate * MAX_AUDIO_DURATION_SECONDS:
        raise ValueError("audio segment exceeds maximum duration")

    if sample_count < int(sample_rate * 0.25):
        raise ValueError("audio segment is too short")

    waveform = np.frombuffer(payload, dtype="<f4").astype(
        np.float32,
        copy=True,
    )

    if waveform.ndim != 1 or waveform.size == 0:
        raise ValueError("audio must be mono")

    if not np.isfinite(waveform).all():
        raise ValueError("audio contains non-finite samples")

    if float(np.max(np.abs(waveform))) > 1.0001:
        raise ValueError("audio samples must be normalized to [-1, 1]")

    return np.ascontiguousarray(waveform)


def resample_to_16khz(
    waveform: np.ndarray,
    source_sample_rate: int,
) -> np.ndarray:
    """Resample mono float32 PCM to the exact Whisper input rate."""

    if (
        not isinstance(source_sample_rate, int)
        or isinstance(source_sample_rate, bool)
        or not MIN_SOURCE_SAMPLE_RATE <= source_sample_rate <= MAX_SOURCE_SAMPLE_RATE
    ):
        raise ValueError("unsupported source sample rate")

    audio = np.asarray(waveform, dtype=np.float32)

    if audio.ndim != 1 or audio.size == 0:
        raise ValueError("waveform must be non-empty and mono")

    if not np.isfinite(audio).all():
        raise ValueError("waveform contains non-finite samples")

    if float(np.max(np.abs(audio))) > 1.0001:
        raise ValueError("waveform samples must be normalized to [-1, 1]")

    if source_sample_rate == TARGET_SAMPLE_RATE:
        return np.ascontiguousarray(audio)

    divisor = gcd(source_sample_rate, TARGET_SAMPLE_RATE)

    up = TARGET_SAMPLE_RATE // divisor
    down = source_sample_rate // divisor

    resampled = resample_poly(audio, up, down)
    resampled = np.asarray(resampled, dtype=np.float32)

    if not np.isfinite(resampled).all():
        raise ValueError("resampling produced non-finite samples")

    # Absorbe uniquement les très légers dépassements du filtre de
    # rééchantillonnage, afin de respecter le contrat du moteur Whisper.
    np.clip(resampled, -1.0, 1.0, out=resampled)

    return np.ascontiguousarray(resampled)
