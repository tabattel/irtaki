from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True, slots=True)
class RecognitionResult:
    """Standard result returned by every Tilawa recognition engine."""

    model_id: str
    model_version: str
    transcription: str
    language: str
    inference_duration_ms: float
    processing_device: str
    audio_duration_ms: float

    def __post_init__(self) -> None:
        for field_name in (
            "model_id",
            "model_version",
            "language",
            "processing_device",
        ):
            value = getattr(self, field_name)
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"{field_name} must be a non-empty string")

        if not isinstance(self.transcription, str):
            raise TypeError("transcription must be a string")

        for field_name in ("inference_duration_ms", "audio_duration_ms"):
            value = getattr(self, field_name)

            if (
                not isinstance(value, (int, float))
                or isinstance(value, bool)
                or not math.isfinite(value)
                or value < 0
            ):
                raise ValueError(f"{field_name} must be a finite non-negative number")


class RecognitionEngine(Protocol):
    """Common interface for Transformers and Faster-Whisper engines."""

    def load(self) -> None:
        ...

    def transcribe_waveform(
        self,
        waveform: Any,
        sample_rate: int = 16000,
        language: str = "ar",
    ) -> RecognitionResult:
        ...

    def unload(self) -> None:
        ...
