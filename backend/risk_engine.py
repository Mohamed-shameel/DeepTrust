"""
risk_engine.py — Scam intent risk scorer for DeepTrust.

Combines three signals to produce a final risk score:
  1. Semantic Intent — DistilBERT NLP classification (50% weight)
  2. Keyword Intent  — multilingual keyword matches      (20% weight)
  3. Authenticity   — neural audio trust score            (30% weight)

1. Semantic Score Mapping:
  - "scam or fraud attempt" → confidence * 100
  - "suspicious conversation" → confidence * 60
  - "normal conversation" → confidence * 20

2. Keyword Scoring:
  - Base risk = 0
  - +15 per keyword match (case-insensitive substring search)
  - Capped at 100

3. Authenticity Score:
  - Trust score (0–100) from wav2vec2 model
  - Risk factor = (100 - trust_score)

Final Risk Aggregation:
  final_risk = (semantic_score * 0.5) + (keyword_score * 0.2) + ((100 - trust_score) * 0.3)
  Capped at 100

Risk levels:
  0–30  → "safe"
  31–60 → "suspicious"
  61–100 → "high"
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
MAX_SCORE = 100              # Hard cap

# Weights for final risk aggregation
SEMANTIC_WEIGHT = 0.5
KEYWORD_ONLY_WEIGHT = 0.2
AUTHENTICITY_WEIGHT = 0.3


def calculate_keyword_score(transcript: str) -> dict:
    """
    Compute keyword-only intent score.
    """
    if not transcript or not transcript.strip():
        return {"score": 0, "matched_keywords": []}

    transcript_lower = transcript.lower()
    matched: list[str] = []

    for keyword in _KEYWORDS:
        if keyword.lower() in transcript_lower:
            matched.append(keyword)

    score = min(len(matched) * KEYWORD_WEIGHT, MAX_SCORE)
    return {"score": score, "matched_keywords": matched}


def calculate_semantic_score(intent: str, confidence: float) -> int:
    """
    Map transformer intent classification to 0–100 score.
    """
    if intent == "scam or fraud attempt":
        return int(confidence * 100)
    elif intent == "suspicious conversation":
        return int(confidence * 60)
    elif intent == "normal conversation":
        return int(confidence * 20)
    return 0


def calculate_risk(
    transcript: str, 
    semantic_intent: str = "unknown", 
    semantic_confidence: float = 0.0,
    trust_score: int = -1
) -> dict:
    """
    Analyse transcript and authenticity to return a final aggregated risk score.

    Aggregation logic:
      final_risk = (semantic_score * 0.5) + (keyword_score * 0.2) + ((100 - trust_score) * 0.3)
    """
    if not transcript or not transcript.strip():
        return {
            "score": 0,
            "level": "safe",
            "semantic_score": 0,
            "keyword_score": 0,
            "matched_keywords": []
        }

    # 1. Keyword scoring
    kw_result = calculate_keyword_score(transcript)
    keyword_score = kw_result["score"]

    # 2. Semantic scoring from transformer result
    semantic_score = calculate_semantic_score(semantic_intent, semantic_confidence)

    # 3. Base authenticity risk (fallback to 0 if model unavailable)
    auth_risk = (100 - trust_score) if trust_score >= 0 else 0

    # 4. Aggregation
    final_score = int(
        (semantic_score * SEMANTIC_WEIGHT) +
        (keyword_score * KEYWORD_ONLY_WEIGHT) +
        (auth_risk * AUTHENTICITY_WEIGHT)
    )

    # Hard cap
    final_score = min(final_score, MAX_SCORE)

    # Determine risk level
    if final_score <= 30:
        level = "safe"
    elif final_score <= 60:
        level = "suspicious"
    else:
        level = "high"

    logger.info(
        "Risk aggregation: semantic=%d, keyword=%d, trust=%d, final=%d, level=%s",
        semantic_score, keyword_score, trust_score, final_score, level
    )

    return {
        "score": final_score,
        "level": level,
        "semantic_score": semantic_score,
        "keyword_score": keyword_score,
        "matched_keywords": kw_result["matched_keywords"]
    }
