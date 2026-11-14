from __future__ import annotations

import copy
import gc
import time
from pathlib import Path
from typing import Any

from .base import RecognitionResult


SAMPLE_RATE = 16000

MODEL_ID = "openai/whisper-large-v3-turbo"


def prepare_waveform(waveform: Any, sample_rate: int = SAMPLE_RATE):
    """
    Validate and prepare mono floating-point PCM audio.

    Expected input:
    - one-dimensional waveform;
    - sample rate exactly 16000 Hz;
    - finite float samples in [-1, 1].

    Resampling and audio decoding belong to the audio preparation layer.
    """

    if (
        not isinstance(sample_rate, int)
        or isinstance(sample_rate, bool)
        or sample_rate != SAMPLE_RATE
    ):
        raise ValueError("waveform must have a sample rate of 16000 Hz")

    try:
        import numpy as np
        audio = np.asarray(waveform, dtype=np.float32)
    except (ImportError, TypeError, ValueError) as exc:
        raise ValueError("waveform cannot be converted to float32 audio") from exc

    if audio.ndim != 1:
        raise ValueError("waveform must be mono and one-dimensional")

    if audio.size == 0:
        raise ValueError("waveform must not be empty")

    if not np.isfinite(audio).all():
        raise ValueError("waveform contains NaN or infinite values")

    if np.max(np.abs(audio)) > 1.0001:
        raise ValueError("waveform samples must be normalized between -1 and 1")

    return np.ascontiguousarray(audio)


class TransformersWhisperEngine:
    """
    Local Transformers implementation of the Tilawa recognition interface.

    The returned transcription is raw ASR output:
    no Quran normalization, reference comparison or WER is applied here.
    """

    def __init__(
        self,
        model_path: str | Path,
        model_id: str = MODEL_ID,
        device: str = "cuda",
        dtype: str = "float16",
        max_new_tokens: int | None = None,
        model_version: str | None = None,
    ) -> None:

        self.model_path = Path(model_path).expanduser().resolve(strict=True)

        if not self.model_path.is_dir():
            raise ValueError("model_path must be a directory")

        if not (self.model_path / "config.json").is_file():
            raise FileNotFoundError("model config.json is missing")

        if not isinstance(model_id, str) or not model_id.strip():
            raise ValueError("model_id must not be empty")

        if device != "cpu" and not device.startswith("cuda"):
            raise ValueError("device must be cpu or a CUDA device")

        if dtype not in {"float16", "bfloat16", "float32"}:
            raise ValueError("unsupported model dtype")

        if max_new_tokens is not None and (
            not isinstance(max_new_tokens, int)
            or max_new_tokens < 1
        ):
            raise ValueError("max_new_tokens must be a positive integer or None")

        self.model_id = model_id
        self.model_version = model_version or self.model_path.name
        self.device = device
        self.dtype_name = dtype
        self.max_new_tokens = max_new_tokens

        self._torch = None
        self._model = None
        self._processor = None
        self._dtype = None

    @property
    def is_loaded(self) -> bool:
        return self._model is not None and self._processor is not None

    def load(self) -> None:
        if self.is_loaded:
            return

        try:
            import torch
            from transformers import (
                AutoModelForSpeechSeq2Seq,
                AutoProcessor,
            )
        except ImportError as exc:
            raise RuntimeError(
                "PyTorch and Transformers must be installed in the Tilawa environment"
            ) from exc

        if self.device.startswith("cuda") and not torch.cuda.is_available():
            raise RuntimeError("CUDA is unavailable")

        dtype = getattr(torch, self.dtype_name)

        processor = AutoProcessor.from_pretrained(
            str(self.model_path),
            local_files_only=True,
        )

        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            str(self.model_path),
            local_files_only=True,
            dtype=dtype,
            low_cpu_mem_usage=True,
        )

        model.to(self.device)
        model.eval()

        self._torch = torch
        self._dtype = dtype
        self._processor = processor
        self._model = model

    def transcribe_waveform(
        self,
        waveform: Any,
        sample_rate: int = SAMPLE_RATE,
        language: str = "ar",
    ) -> RecognitionResult:

        if not self.is_loaded:
            raise RuntimeError("Recognition model is not loaded")

        if not isinstance(language, str) or not language.strip():
            raise ValueError("language must not be empty")

        audio = prepare_waveform(waveform, sample_rate)

        torch = self._torch
        processor = self._processor
        model = self._model

        whisper_language = {
            "ar": "arabic",
            "arabic": "arabic",
        }.get(language.lower(), language)

        if self.device.startswith("cuda"):
            torch.cuda.synchronize(self.device)

        started = time.perf_counter()

        encoded = processor.feature_extractor(
            audio,
            sampling_rate=SAMPLE_RATE,
            return_tensors="pt",
            return_attention_mask=True,
        )

        features = encoded.input_features.to(
            device=self.device,
            dtype=self._dtype,
        )

        attention_mask = encoded.attention_mask.to(
            device=self.device,
        )

        # Ne jamais modifier la configuration partagée du modèle.
        generation_config = copy.deepcopy(model.generation_config)

        if self.max_new_tokens is not None:
            generation_config.max_length = None
            generation_config.max_new_tokens = self.max_new_tokens

        with torch.inference_mode():
            generated_ids = model.generate(
                input_features=features,
                attention_mask=attention_mask,
                language=whisper_language,
                task="transcribe",
                generation_config=generation_config,
            )

        if self.device.startswith("cuda"):
            torch.cuda.synchronize(self.device)

        transcription = processor.batch_decode(
            generated_ids,
            skip_special_tokens=True,
        )[0].strip()

        elapsed_ms = (time.perf_counter() - started) * 1000.0

        return RecognitionResult(
            model_id=self.model_id,
            model_version=self.model_version,
            transcription=transcription,
            language=language,
            inference_duration_ms=elapsed_ms,
            processing_device=self.device,
            audio_duration_ms=(audio.size / SAMPLE_RATE) * 1000.0,
        )

    def unload(self) -> None:
        self._model = None
        self._processor = None
        self._dtype = None

        if self._torch is not None:
            if self.device.startswith("cuda") and self._torch.cuda.is_available():
                self._torch.cuda.empty_cache()

        self._torch = None
        gc.collect()
