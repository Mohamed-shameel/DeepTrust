"""
main.py — FastAPI backend for DeepTrust scam-call detection.

DeepTrust Detection Pipeline:
  Audio File → Resampling/Downmixing → Vosk STT → Transcript
                                      ↘ Authenticity (wav2vec2)
                                      ↘ Semantic Intent (DistilBERT)
                                        → Aggregated Risk Score → API Response

Privacy principle: audio is processed entirely in-memory — nothing is saved to disk.
"""

import json
import logging
import os

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from vosk import Model, KaldiRecognizer

from risk_engine import calculate_risk
from utils.audio_utils import validate_and_read_wav, AudioValidationError
from authenticity_model import get_authenticity_score, is_model_loaded as is_auth_loaded
from intent_model import classify_intent, is_model_loaded as is_intent_loaded

# ── Logging setup ───────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
)
logger = logging.getLogger("deeptrust")

# ── Vosk model — loaded ONCE at startup ─────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model")

logger.info("Loading Vosk speech model from %s …", MODEL_PATH)
try:
    vosk_model = Model(MODEL_PATH)
    logger.info("Vosk speech model loaded successfully.")
except Exception as e:
    logger.critical("Failed to load Vosk model: %s", e)
    vosk_model = None

# ── FastAPI application ────────────────────────────────────────────────────
app = FastAPI(
    title="DeepTrust — AI Scam Detection Engine",
    description="Multimodal scam detection using acoustic authenticity and semantic intent analysis.",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Detailed health check for all pipeline components."""
    return {
        "status": "ok",
        "vosk_loaded": vosk_model is not None,
        "authenticity_loaded": is_auth_loaded(),
        "intent_loaded": is_intent_loaded(),
    }


@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    """
    Analyze call recording for scam risk.
    """

    if vosk_model is None:
        raise HTTPException(status_code=503, detail="Vosk STT model not available.")

    # 1. Read in-memory
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Read error: {e}")

    # 2. Resample / Validate
    try:
        pcm_frames, sample_rate = validate_and_read_wav(file_bytes)
    except AudioValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 3. Speech-to-Text (Vosk)
    recognizer = KaldiRecognizer(vosk_model, sample_rate)
    recognizer.SetWords(True)
    CHUNK_SIZE = 8000
    for i in range(0, len(pcm_frames), CHUNK_SIZE):
        chunk = pcm_frames[i : i + CHUNK_SIZE]
        recognizer.AcceptWaveform(chunk)

    final_result = json.loads(recognizer.FinalResult())
    transcript = final_result.get("text", "").strip()

    # 4. Neural Audio Authenticity (wav2vec2)
    auth_result = get_authenticity_score(file_bytes)
    trust_score = auth_result["trust_score"]

    # 5. Semantic Intent Analysis (DistilBERT)
    # Note: Added note for future: streaming NLP can replace batch classification here.
    intent_result = classify_intent(transcript)
    
    # 6. Final Risk Aggregration
    risk = calculate_risk(
        transcript=transcript,
        semantic_intent=intent_result["intent"],
        semantic_confidence=intent_result["confidence"],
        trust_score=trust_score
    )

    # 7. Log and Return
    logger.info("═══ PIPELINE RESULT ═══")
    logger.info(f"Risk: {risk['score']} ({risk['level']})")
    
    return {
        "transcript": transcript,
        "intent": intent_result["intent"],
        "intent_confidence": intent_result["confidence"],
        "keyword_score": risk["keyword_score"],
        "trust_score": trust_score,
        "authenticity_status": auth_result["authenticity_status"],
        "risk_score": risk["score"],
        "risk_level": risk["level"]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
