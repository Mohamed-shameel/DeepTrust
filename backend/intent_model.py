"""
intent_model.py — Semantic intent classification for DeepTrust.

Uses a zero-shot classification transformer (DistilBERT base MNLI) to determine
whether the transcript content is "normal", "suspicious", or a "scam attempt".

The model is loaded once at startup and uses CPU inference for portability.
Inference uses torch.no_grad() for performance.

Future extensibility:
  • This batch classification could be replaced with streaming NLP inference
    using lighter models or a specialized sequence classification model if
    domain-specific scam datasets become available for training.
"""

import logging
import torch
from transformers import pipeline

logger = logging.getLogger(__name__)

# ── Model name ──────────────────────────────────────────────────────────────
_MODEL_NAME = "typeform/distilbert-base-uncased-mnli"

# ── Labels for zero-shot classification ─────────────────────────────────────
LABELS = [
    "normal conversation",
    "suspicious conversation",
    "scam or fraud attempt"
]

# ── Load classifier globally ────────────────────────────────────────────────
logger.info("Loading DistilBERT intent classification model: %s …", _MODEL_NAME)
try:
    # Use CPU by default for portability in this prototype
    _classifier = pipeline(
        "zero-shot-classification",
        model=_MODEL_NAME,
        device=-1  # Force CPU
    )
    logger.info("Intent classification model loaded successfully.")
    _model_ready = True
except Exception as e:
    logger.error("Failed to load intent model: %s", e)
    _classifier = None
    _model_ready = False


def is_model_loaded() -> bool:
    """Check whether the intent model is available."""
    return _model_ready


def classify_intent(text: str) -> dict:
    """
    Classify the semantic intent of the transcript.

    Returns
    -------
    dict
        {
            "intent": str,       # Highest probability label
            "confidence": float  # Score from 0.0 to 1.0
        }
    """
    if not _model_ready:
        logger.warning("Intent model not loaded — returning fallback.")
        return {"intent": "unknown", "confidence": 0.0}

    if not text or not text.strip():
        return {"intent": "empty/unknown", "confidence": 0.0}

    try:
        # Limit to 512 tokens (roughly 512 words for uncased BERT)
        # to stay within model limits and ensure performance.
        text_truncated = " ".join(text.split()[:512])

        with torch.no_grad():
            result = _classifier(text_truncated, LABELS)

        top_label = result["labels"][0]
        top_score = float(result["scores"][0])

        logger.info(
            "Intent analysis: intent='%s', confidence=%.4f",
            top_label, top_score,
        )

        return {
            "intent": top_label,
            "confidence": top_score
        }

    except Exception as e:
        logger.error("Intent classification failed: %s", e)
        return {"intent": "error", "confidence": 0.0}
