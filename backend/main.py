"""
main.py — FastAPI backend for DeepTrust scam-call detection.

Pipeline:
  Audio File → WAV Validation → Vosk STT → Transcript
                              ↘ Neural Authenticity (wav2vec2)
                                → Risk Aggregation → JSON

Privacy principle: audio is processed entirely in-memory — nothing is saved to disk.

Future extensibility:
  • The authenticity module can be swapped for specialised deepfake detectors
    (e.g. ASVspoof, RawNet2) without changing the API contract.
  • Streaming audio support could be added via a WebSocket endpoint that feeds
    audio chunks to Vosk incrementally instead of waiting for the full file.
"""

import json
import logging
import os

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from vosk import Model, KaldiRecognizer

from risk_engine import calculate_risk
from utils.audio_utils import validate_and_read_wav, AudioValidationError
from authenticity_model import get_authenticity_score, is_model_loaded

# ── Logging setup ───────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
)
logger = logging.getLogger("deeptrust")

# ── Vosk model — loaded ONCE at startup ─────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model")

logger.info("Loading Vosk model from %s …", MODEL_PATH)
try:
    vosk_model = Model(MODEL_PATH)
    logger.info("Vosk model loaded successfully.")
except Exception as e:
    logger.critical("Failed to load Vosk model: %s", e)
    vosk_model = None

# ── FastAPI application ────────────────────────────────────────────────────
app = FastAPI(
    title="DeepTrust — Scam Call Detector",
    description=(
        "Privacy-first AI backend that analyses call recordings for scam intent "
        "using speech recognition, keyword scoring, and neural audio authenticity."
    ),
    version="0.2.0",
)

# Allow all origins for mobile / React Native development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═════════════════════════════════════════════════════════════════════════════
# Endpoints
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    """Simple health/readiness probe for the frontend."""
    return {
        "status": "ok",
        "vosk_model_loaded": vosk_model is not None,
        "authenticity_model_loaded": is_model_loaded(),
    }


@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    """
    Accept a WAV audio upload, transcribe it, run authenticity analysis,
    and return a combined risk assessment.

    Expected audio format: WAV, mono, 16 kHz, 16-bit PCM.

    Returns
    -------
    JSON
        {
            "transcript": str,
            "intent_score": int,
            "trust_score": int,
            "authenticity_status": str,
            "risk_score": int,
            "risk_level": str
        }
    """

    # ── Guard: Vosk model must be loaded ────────────────────────────────
    if vosk_model is None:
        raise HTTPException(
            status_code=503,
            detail="Speech recognition model is not loaded. Server cannot process audio.",
        )

    # ── Read file bytes (in-memory only — no disk write) ────────────────
    try:
        file_bytes = await file.read()
    except Exception as e:
        logger.error("Failed to read uploaded file: %s", e)
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # ── Validate WAV format ─────────────────────────────────────────────
    try:
        pcm_frames, sample_rate = validate_and_read_wav(file_bytes)
    except AudioValidationError as e:
        logger.warning("Audio validation failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

    # ── Run Vosk speech recognition ─────────────────────────────────────
    recognizer = KaldiRecognizer(vosk_model, sample_rate)
    recognizer.SetWords(True)

    CHUNK_SIZE = 4000  # bytes per chunk
    for i in range(0, len(pcm_frames), CHUNK_SIZE):
        chunk = pcm_frames[i : i + CHUNK_SIZE]
        recognizer.AcceptWaveform(chunk)

    final_result = json.loads(recognizer.FinalResult())
    transcript = final_result.get("text", "").strip()

    logger.info("═══ TRANSCRIPT ═══")
    logger.info(transcript if transcript else "(empty)")

    # ── Run neural authenticity analysis ────────────────────────────────
    # Uses the same in-memory bytes — no temp file needed
    auth_result = get_authenticity_score(file_bytes)
    trust_score = auth_result["trust_score"]
    authenticity_status = auth_result["authenticity_status"]

    logger.info("═══ AUTHENTICITY ═══")
    logger.info("Trust: %d | Status: %s", trust_score, authenticity_status)

    # ── Handle empty transcript ─────────────────────────────────────────
    if not transcript:
        logger.warning("Vosk returned an empty transcript.")
        return {
            "transcript": "",
            "intent_score": 0,
            "trust_score": trust_score,
            "authenticity_status": authenticity_status,
            "risk_score": 0,
            "risk_level": "safe",
            "message": "No speech detected in the audio.",
        }

    # ── Calculate combined risk score ───────────────────────────────────
    risk = calculate_risk(transcript, trust_score=trust_score)

    logger.info("═══ RISK RESULT ═══")
    logger.info(
        "Intent: %d | Trust: %d | Final: %d | Level: %s",
        risk["intent_score"], trust_score, risk["score"], risk["level"],
    )

    # ── Return result ───────────────────────────────────────────────────
    return {
        "transcript": transcript,
        "intent_score": risk["intent_score"],
        "trust_score": trust_score,
        "authenticity_status": authenticity_status,
        "risk_score": risk["score"],
        "risk_level": risk["level"],
    }


# ═════════════════════════════════════════════════════════════════════════════
# Dev server entry point
# ═════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
