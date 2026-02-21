"""
risk_engine.py — Scam intent risk scorer for DeepTrust.

Combines two signals to produce a final risk score:
  1. Intent score   — keyword matching against known scam phrases (70% weight)
  2. Trust score    — neural audio authenticity from wav2vec2   (30% weight)

Intent Scoring:
  - Base risk = 0
  - +15 per keyword match (case-insensitive substring search)
  - +5 if transcript is longer than 50 words
  - Capped at 100

Combined Formula:
  final_risk = intent_score * 0.7 + (100 - trust_score) * 0.3
  Capped at 100

Risk levels:
  0–30  → "safe"
  31–60 → "suspicious"
  61–100 → "high"

Future extensibility:
  - Sentiment analysis or urgency-tone detection could add additional signal.
  - The weights (0.7 / 0.3) could be tuned based on labelled data.
"""

import json
import os
import logging

logger = logging.getLogger(__name__)

# ── Load keywords once at module level ──────────────────────────────────────
_KEYWORDS_PATH = os.path.join(os.path.dirname(__file__), "keywords.json")

try:
    with open(_KEYWORDS_PATH, "r", encoding="utf-8") as f:
        _KEYWORDS: list[str] = json.load(f)["keywords"]
    logger.info("Loaded %d scam keywords from keywords.json", len(_KEYWORDS))
except FileNotFoundError:
    logger.error("keywords.json not found at %s", _KEYWORDS_PATH)
    _KEYWORDS = []
except (json.JSONDecodeError, KeyError) as e:
    logger.error("Failed to parse keywords.json: %s", e)
    _KEYWORDS = []

# ── Scoring constants ───────────────────────────────────────────────────────
KEYWORD_WEIGHT = 15          # Points per keyword match
LONG_TRANSCRIPT_BONUS = 5    # Extra points if transcript exceeds word threshold
WORD_COUNT_THRESHOLD = 50    # Word count that triggers the bonus
MAX_SCORE = 100              # Hard cap

# Weights for combining intent and authenticity scores
INTENT_WEIGHT = 0.7
AUTHENTICITY_WEIGHT = 0.3


def calculate_intent_score(transcript: str) -> dict:
    """
    Compute intent-only risk score from keyword matching.

    Returns
    -------
    dict
        {
            "score": int,
            "matched_keywords": list[str]
        }
    """
    if not transcript or not transcript.strip():
        return {"score": 0, "matched_keywords": []}

    transcript_lower = transcript.lower()
    matched: list[str] = []

    # ── Keyword matching (case-insensitive substring) ───────────────────
    for keyword in _KEYWORDS:
        if keyword.lower() in transcript_lower:
            matched.append(keyword)

    # ── Calculate score ─────────────────────────────────────────────────
    score = len(matched) * KEYWORD_WEIGHT

    # Bonus for long transcripts (longer calls give scammers more room)
    word_count = len(transcript.split())
    if word_count > WORD_COUNT_THRESHOLD:
        score += LONG_TRANSCRIPT_BONUS

    # Hard cap
    score = min(score, MAX_SCORE)

    return {"score": score, "matched_keywords": matched}


def calculate_risk(transcript: str, trust_score: int = -1) -> dict:
    """
    Analyse a transcript and return a combined risk score + level.

    When a valid trust_score (0–100) is provided from the authenticity model,
    the final risk is a weighted blend of intent and authenticity signals:
        final_risk = intent_score * 0.7 + (100 - trust_score) * 0.3

    When trust_score is -1 (model unavailable), falls back to intent-only scoring.

    Parameters
    ----------
    transcript : str
        The speech-to-text output from the audio file.
    trust_score : int
        Authenticity trust score (0–100). -1 means model unavailable.

    Returns
    -------
    dict
        {
            "score": int,               # 0–100  (final combined risk)
            "intent_score": int,        # 0–100  (keyword-only risk)
            "level": str,               # "safe" | "suspicious" | "high"
            "matched_keywords": list[str]
        }
    """
    if not transcript or not transcript.strip():
        return {
            "score": 0,
            "intent_score": 0,
            "level": "safe",
            "matched_keywords": [],
        }

    # ── Step 1: Intent scoring ──────────────────────────────────────────
    intent = calculate_intent_score(transcript)
    intent_score = intent["score"]

    # ── Step 2: Combine with authenticity if available ───────────────────
    if trust_score >= 0:
        # Higher trust_score means more human → lower risk contribution
        # Lower trust_score means more synthetic → higher risk contribution
        final_score = int(
            intent_score * INTENT_WEIGHT
            + (100 - trust_score) * AUTHENTICITY_WEIGHT
        )
    else:
        # Fallback: intent-only scoring when authenticity model unavailable
        final_score = intent_score

    # Hard cap
    final_score = min(final_score, MAX_SCORE)

    # ── Step 3: Determine risk level ────────────────────────────────────
    if final_score <= 30:
        level = "safe"
    elif final_score <= 60:
        level = "suspicious"
    else:
        level = "high"

    logger.info(
        "Risk analysis: intent=%d, trust=%d, final=%d, level=%s, matched=%s",
        intent_score, trust_score, final_score, level, intent["matched_keywords"],
    )

    return {
        "score": final_score,
        "intent_score": intent_score,
        "level": level,
        "matched_keywords": intent["matched_keywords"],
    }
