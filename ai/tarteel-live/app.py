from __future__ import annotations

import asyncio
import gc
import logging
import os
import time
from pathlib import Path
from typing import Any

import numpy as np
import torch
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("irtaki.tarteel")

SAMPLE_RATE = 16000
PACKET_SECONDS = 0.2
INFERENCE_INTERVAL = 0.8
MIN_AUDIO_SECONDS = 1.2
WINDOW_SECONDS = 20

ROOT = Path(__file__).resolve().parents[2]

TRANSFORMERS_MODEL = Path(
    os.environ.get(
        "TARTEEL1_MODEL_PATH",
        str(
            ROOT
            / "ai/quran-recognition/models/openai-whisper-large-v3-turbo"
        ),
    )
).expanduser()

FASTER_MODEL = Path(
    os.environ.get(
        "TARTEEL2_MODEL_PATH",
        str(
            Path.home()
            / ".cache/huggingface/hub/"
              "models--mobiuslabsgmbh--faster-whisper-large-v3-turbo/"
              "snapshots/0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf"
        ),
    )
).expanduser()

MODEL_INFO = {
    "tarteel1": {
        "id": "whisper-large-v3-turbo-transformers",
        "label": "Whisper Large-v3 Turbo — Transformers",
        "path": TRANSFORMERS_MODEL,
    },
    "tarteel2": {
        "id": "faster-large-v3-turbo",
        "label": "Faster-Whisper Large-v3 Turbo",
        "path": FASTER_MODEL,
    },
}

app = FastAPI(
    title="IRTAKI Tarteel Live",
    version="0.1.0",
    description="Reconnaissance coranique en direct avec deux moteurs Whisper.",
)

# Un seul modèle peut occuper le GPU à la fois.
gpu_session_lock = asyncio.Lock()


def load_engine(mode: str) -> dict[str, Any]:
    spec = MODEL_INFO[mode]
    model_path = spec["path"]

    if not model_path.is_dir():
        raise FileNotFoundError(f"Modèle introuvable : {model_path}")

    logger.info("Chargement de %s depuis %s", mode, model_path)

    if mode == "tarteel1":
        from transformers import (
            WhisperForConditionalGeneration,
            WhisperProcessor,
        )

        processor = WhisperProcessor.from_pretrained(
            str(model_path),
            local_files_only=True,
        )

        model = WhisperForConditionalGeneration.from_pretrained(
            str(model_path),
            local_files_only=True,
            dtype=torch.float16,
        )

        model.to("cuda")
        model.eval()

        return {
            "mode": mode,
            "processor": processor,
            "model": model,
            "forced_decoder_ids": processor.get_decoder_prompt_ids(
                language="ar",
                task="transcribe",
            ),
        }

    from faster_whisper import WhisperModel

    model = WhisperModel(
        str(model_path),
        device="cuda",
        device_index=0,
        compute_type="float16",
        local_files_only=True,
    )

    return {
        "mode": mode,
        "model": model,
    }


def infer(engine: dict[str, Any], audio: np.ndarray) -> str:
    if engine["mode"] == "tarteel1":
        processor = engine["processor"]
        model = engine["model"]

        prepared = processor(
            audio,
            sampling_rate=SAMPLE_RATE,
            return_tensors="pt",
        )

        input_features = prepared.input_features.to(
            device="cuda",
            dtype=torch.float16,
        )

        with torch.inference_mode():
            generated = model.generate(
                input_features=input_features,
                forced_decoder_ids=engine["forced_decoder_ids"],
                max_new_tokens=180,
                num_beams=1,
                do_sample=False,
            )

        return processor.batch_decode(
            generated,
            skip_special_tokens=True,
        )[0].strip()

    segments, _info = engine["model"].transcribe(
        audio,
        language="ar",
        task="transcribe",
        beam_size=1,
        vad_filter=False,
        condition_on_previous_text=False,
    )

    return " ".join(
        segment.text.strip()
        for segment in segments
        if segment.text.strip()
    ).strip()


def release_engine(engine: dict[str, Any] | None) -> None:
    if engine is None:
        return

    engine.clear()
    gc.collect()

    if torch.cuda.is_available():
        torch.cuda.empty_cache()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "irtaki-tarteel-live",
        "cuda_available": torch.cuda.is_available(),
        "gpu": (
            torch.cuda.get_device_name(0)
            if torch.cuda.is_available()
            else None
        ),
        "sample_rate": SAMPLE_RATE,
        "packet_seconds": PACKET_SECONDS,
        "inference_interval_seconds": INFERENCE_INTERVAL,
        "window_seconds": WINDOW_SECONDS,
        "models": {
            mode: {
                "id": spec["id"],
                "label": spec["label"],
                "available": spec["path"].is_dir(),
            }
            for mode, spec in MODEL_INFO.items()
        },
    }


@app.websocket("/ws/{mode}")
async def live_recognition(websocket: WebSocket, mode: str) -> None:
    await websocket.accept()

    if mode not in MODEL_INFO:
        await websocket.send_json({
            "type": "error",
            "message": "Mode inconnu. Utilisez tarteel1 ou tarteel2.",
        })
        await websocket.close(code=1008)
        return

    engine = None
    lock_acquired = False

    try:
        # Le premier message doit être configure.
        first_message = await websocket.receive_json()

        if first_message.get("type") != "configure":
            await websocket.send_json({
                "type": "error",
                "message": "Le premier message doit être configure.",
            })
            await websocket.close(code=1008)
            return

        requested_rate = int(first_message.get("sample_rate", 0))

        if requested_rate != SAMPLE_RATE:
            await websocket.send_json({
                "type": "error",
                "message": "Le navigateur doit envoyer du PCM mono à 16000 Hz.",
            })
            await websocket.close(code=1008)
            return

        started = time.monotonic()

        await gpu_session_lock.acquire()
        lock_acquired = True

        engine = await asyncio.to_thread(load_engine, mode)

        await websocket.send_json({
            "type": "ready",
            "mode": mode,
            "model_id": MODEL_INFO[mode]["id"],
            "model_label": MODEL_INFO[mode]["label"],
            "load_seconds": round(time.monotonic() - started, 2),
            "sample_rate": SAMPLE_RATE,
            "packet_seconds": PACKET_SECONDS,
            "inference_interval_seconds": INFERENCE_INTERVAL,
            "window_seconds": WINDOW_SECONDS,
        })

        audio_buffer = np.empty(0, dtype=np.float32)
        total_samples = 0
        last_inference_samples = 0
        speech_active = False
        paused = False
        sequence = 0

        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                break

            payload = message.get("bytes")

            if payload is not None:
                if not speech_active or paused:
                    continue

                if len(payload) % 4 != 0:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Paquet PCM float32 invalide.",
                    })
                    continue

                packet = np.frombuffer(payload, dtype="<f4").copy()
                packet = np.nan_to_num(
                    packet,
                    nan=0.0,
                    posinf=0.0,
                    neginf=0.0,
                )
                packet = np.clip(packet, -1.0, 1.0)

                if packet.size == 0:
                    continue

                total_samples += packet.size
                audio_buffer = np.concatenate((audio_buffer, packet))

                max_samples = WINDOW_SECONDS * SAMPLE_RATE
                if audio_buffer.size > max_samples:
                    audio_buffer = audio_buffer[-max_samples:]

                new_audio_seconds = (
                    total_samples - last_inference_samples
                ) / SAMPLE_RATE

                total_audio_seconds = total_samples / SAMPLE_RATE

                if (
                    total_audio_seconds >= MIN_AUDIO_SECONDS
                    and new_audio_seconds >= INFERENCE_INTERVAL
                ):
                    started_inference = time.monotonic()

                    text = await asyncio.to_thread(
                        infer,
                        engine,
                        audio_buffer.copy(),
                    )

                    last_inference_samples = total_samples
                    sequence += 1

                    await websocket.send_json({
                        "type": "result",
                        "mode": mode,
                        "sequence": sequence,
                        "text": text,
                        "final": False,
                        "audio_seconds": round(total_audio_seconds, 2),
                        "window_start_seconds": round(
                            max(
                                0.0,
                                total_audio_seconds
                                - audio_buffer.size / SAMPLE_RATE,
                            ),
                            2,
                        ),
                        "inference_seconds": round(
                            time.monotonic() - started_inference,
                            2,
                        ),
                    })

                continue

            text_message = message.get("text")
            if not text_message:
                continue

            import json
            command = json.loads(text_message)
            command_type = command.get("type")

            if command_type == "speech_start":
                speech_active = True
                paused = False
                continue

            if command_type == "pause":
                if speech_active:
                    paused = True
                    logger.info("Session %s mise en pause", mode)
                continue

            if command_type == "resume":
                if speech_active:
                    paused = False
                    logger.info("Session %s reprise", mode)
                continue

            if command_type == "stop":
                if (
                    speech_active
                    and total_samples >= MIN_AUDIO_SECONDS * SAMPLE_RATE
                    and total_samples > last_inference_samples
                ):
                    started_inference = time.monotonic()

                    text = await asyncio.to_thread(
                        infer,
                        engine,
                        audio_buffer.copy(),
                    )

                    sequence += 1

                    await websocket.send_json({
                        "type": "result",
                        "mode": mode,
                        "sequence": sequence,
                        "text": text,
                        "final": True,
                        "audio_seconds": round(
                            total_samples / SAMPLE_RATE,
                            2,
                        ),
                        "window_start_seconds": round(
                            max(
                                0.0,
                                total_samples / SAMPLE_RATE
                                - audio_buffer.size / SAMPLE_RATE,
                            ),
                            2,
                        ),
                        "inference_seconds": round(
                            time.monotonic() - started_inference,
                            2,
                        ),
                    })

                await websocket.send_json({
                    "type": "stopped",
                    "mode": mode,
                    "total_audio_seconds": round(
                        total_samples / SAMPLE_RATE,
                        2,
                    ),
                })
                break

    except WebSocketDisconnect:
        logger.info("Client déconnecté : %s", mode)

    except Exception as exc:
        logger.exception("Erreur WebSocket %s", mode)
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"{type(exc).__name__}: {exc}",
            })
        except Exception:
            pass

    finally:
        if engine is not None:
            await asyncio.to_thread(release_engine, engine)

        if lock_acquired:
            gpu_session_lock.release()

        try:
            await websocket.close()
        except Exception:
            pass
