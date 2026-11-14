from __future__ import annotations

import asyncio
import hmac
import math
import os
import re
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, Header, HTTPException, Request
from starlette.concurrency import run_in_threadpool

from ..inference.transformers_whisper import TransformersWhisperEngine
from ..normalization.arabic import normalize_arabic
from .audio import (
    MAX_AUDIO_BYTES,
    TARGET_SAMPLE_RATE,
    decode_float32_pcm,
    resample_to_16khz,
)


RECOGNITION_MODEL_ID = "openai/whisper-large-v3-turbo"
SESSION_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,128}$")

MODULE_DIR = Path(__file__).resolve().parents[2]
REPOSITORY_ROOT = MODULE_DIR.parents[1]

MODEL_PATH = Path(
    os.environ.get(
        "TILAWA_RECOGNITION_MODEL_PATH",
        str(MODULE_DIR / "models" / "openai-whisper-large-v3-turbo"),
    )
).expanduser()

TOKEN_PATH = Path(
    os.environ.get(
        "TILAWA_RECOGNITION_TOKEN_FILE",
        str(Path.home() / ".config" / "irtaki" / "tilawa-recognition.token"),
    )
).expanduser()

MODEL_DEVICE = os.environ.get("TILAWA_RECOGNITION_DEVICE", "cuda")
MODEL_DTYPE = os.environ.get("TILAWA_RECOGNITION_DTYPE", "float16")

INFERENCE_LOCK = threading.Lock()


def load_service_token() -> str:
    """Load the private local token without exposing its value in logs."""

    value = os.environ.get("TILAWA_RECOGNITION_TOKEN", "").strip()

    if not value:
        try:
            value = TOKEN_PATH.read_text().strip()
        except OSError as exc:
            raise RuntimeError(
                "Tilawa recognition token file is unavailable"
            ) from exc

    if not re.fullmatch(r"[0-9a-f]{64}", value):
        raise RuntimeError("Tilawa recognition token is invalid")

    return value


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    token = load_service_token()

    if not MODEL_PATH.is_dir():
        raise RuntimeError("Tilawa recognition model directory is missing")

    engine = TransformersWhisperEngine(
        model_path=MODEL_PATH,
        model_id=RECOGNITION_MODEL_ID,
        device=MODEL_DEVICE,
        dtype=MODEL_DTYPE,
        max_new_tokens=128,
    )

    await run_in_threadpool(engine.load)

    application.state.recognition_engine = engine
    application.state.service_token = token

    try:
        yield
    finally:
        await run_in_threadpool(engine.unload)


app = FastAPI(
    title="IRTAKI Tilawa Recognition",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health(request: Request):
    engine = getattr(request.app.state, "recognition_engine", None)

    return {
        "status": "ready" if engine is not None and engine.is_loaded else "starting",
        "model": RECOGNITION_MODEL_ID,
        "device": MODEL_DEVICE,
        "loaded": engine is not None and engine.is_loaded,
    }


@app.post("/v1/recognize")
async def recognize(
    request: Request,
    authorization: str | None = Header(default=None),
    x_tilawa_session_id: str | None = Header(default=None),
    x_tilawa_sequence: str | None = Header(default=None),
    x_tilawa_sample_rate: str | None = Header(default=None),
    x_tilawa_start_seconds: str | None = Header(default=None),
    x_tilawa_end_seconds: str | None = Header(default=None),
    x_tilawa_is_final: str | None = Header(default=None),
):
    expected_token = getattr(request.app.state, "service_token", None)

    if (
        not expected_token
        or not authorization
        or not authorization.startswith("Bearer ")
        or not hmac.compare_digest(
            authorization[7:],
            expected_token,
        )
    ):
        raise HTTPException(status_code=401, detail="UNAUTHORIZED")

    if (
        not x_tilawa_session_id
        or not SESSION_PATTERN.fullmatch(x_tilawa_session_id)
    ):
        raise HTTPException(status_code=400, detail="INVALID_SESSION_ID")

    try:
        sequence = int(x_tilawa_sequence or "")
        source_sample_rate = int(x_tilawa_sample_rate or "")
        start_seconds = float(x_tilawa_start_seconds or "")
        end_seconds = float(x_tilawa_end_seconds or "")
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="INVALID_SEGMENT_METADATA")

    if sequence < 0 or sequence > 1_000_000:
        raise HTTPException(status_code=400, detail="INVALID_SEQUENCE")

    if (
        not math.isfinite(start_seconds)
        or not math.isfinite(end_seconds)
        or start_seconds < 0
        or end_seconds < start_seconds
        or end_seconds - start_seconds > 5.0
    ):
        raise HTTPException(status_code=400, detail="INVALID_SEGMENT_TIMING")

    if x_tilawa_is_final not in {"true", "false"}:
        raise HTTPException(status_code=400, detail="INVALID_FINAL_FLAG")

    content_length = request.headers.get("content-length")

    if content_length:
        try:
            declared_length = int(content_length)
        except ValueError:
            raise HTTPException(status_code=400, detail="INVALID_CONTENT_LENGTH")

        if declared_length < 1 or declared_length > MAX_AUDIO_BYTES:
            raise HTTPException(status_code=413, detail="AUDIO_TOO_LARGE")

    chunks: list[bytes] = []
    received_bytes = 0

    async for chunk in request.stream():
        received_bytes += len(chunk)

        if received_bytes > MAX_AUDIO_BYTES:
            raise HTTPException(status_code=413, detail="AUDIO_TOO_LARGE")

        chunks.append(chunk)

    payload = b"".join(chunks)

    try:
        source_waveform = decode_float32_pcm(
            payload,
            source_sample_rate,
        )
        waveform = resample_to_16khz(
            source_waveform,
            source_sample_rate,
        )
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    engine = getattr(request.app.state, "recognition_engine", None)

    if engine is None or not engine.is_loaded:
        raise HTTPException(status_code=503, detail="MODEL_NOT_READY")

    def perform_inference():
        # Une seule inférence GPU active à la fois.
        with INFERENCE_LOCK:
            return engine.transcribe_waveform(
                waveform,
                sample_rate=TARGET_SAMPLE_RATE,
                language="ar",
            )

    try:
        result = await run_in_threadpool(perform_inference)
    except Exception as exc:
        # Ne jamais envoyer les chemins internes ou la trace GPU au navigateur.
        print(f"Tilawa inference failed: {type(exc).__name__}")
        raise HTTPException(
            status_code=503,
            detail="RECOGNITION_FAILED",
        ) from exc

    return {
        "sessionId": x_tilawa_session_id,
        "sequence": sequence,
        "startSeconds": start_seconds,
        "endSeconds": end_seconds,
        "isFinal": x_tilawa_is_final == "true",
        "transcription": result.transcription,
        "normalizedTranscription": normalize_arabic(result.transcription),
        "language": result.language,
        "modelId": result.model_id,
        "modelVersion": result.model_version,
        "processingDevice": result.processing_device,
        "inferenceDurationMs": result.inference_duration_ms,
        "audioDurationMs": result.audio_duration_ms,
        "sourceSampleRate": source_sample_rate,
        "recognitionSampleRate": TARGET_SAMPLE_RATE,
        "sourceFrameCount": int(source_waveform.size),
        "recognitionFrameCount": int(waveform.size),
    }
