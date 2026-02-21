"""
authenticity_model.py — Neural audio authenticity scoring for DeepTrust.

Uses facebook/wav2vec2-base (HuggingFace) to generate audio embeddings and
derive a trust score indicating whether the voice is likely human or synthetic.

The model is loaded ONCE globally at import time to avoid per-request overhead.
Inference runs with torch.no_grad() for efficiency.

Scoring:
  trust_score = abs(mean_embedding) % 100
  > 70  → "Likely Human"
  40–70 → "Uncertain"
  < 40  → "Possibly Synthetic"

Future extensibility:
  • This module can be replaced with specialized deepfake detection models
    such as ASVspoof-based classifiers or RawNet2 for more accurate synthetic
    voice detection.  The interface (get_authenticity_score) should remain the
    same so the rest of the pipeline stays unchanged.
"""

import io
import wave
import logging
import struct

import torch
import numpy as np
from transformers import Wav2Vec2Processor, Wav2Vec2Model

logger = logging.getLogger(__name__)

# ── Model name ──────────────────────────────────────────────────────────────
_MODEL_NAME = "facebook/wav2vec2-base"

# ── Load model & processor ONCE at startup ──────────────────────────────────
logger.info("Loading wav2vec2 authenticity model: %s …", _MODEL_NAME)
try:
    _processor = Wav2Vec2Processor.from_pretrained(_MODEL_NAME)
    _model = Wav2Vec2Model.from_pretrained(_MODEL_NAME)
    _model.eval()  # inference mode — no dropout
    logger.info("wav2vec2 authenticity model loaded successfully.")
    _model_ready = True
except Exception as e:
    logger.error("Failed to load wav2vec2 model: %s", e)
    _processor = None
    _model = None
    _model_ready = False

# Expected sample rate for wav2vec2
_TARGET_SAMPLE_RATE = 16000


def is_model_loaded() -> bool:
    """Check whether the authenticity model is available."""
    return _model_ready


def _wav_bytes_to_float_tensor(wav_bytes: bytes) -> tuple[torch.Tensor, int]:
    """
    Read WAV bytes using stdlib wave and convert to float32 torch Tensor.
    Avoids torchaudio.load which requires torchcodec in newer versions.
    """
    buf = io.BytesIO(wav_bytes)
    try:
        with wave.open(buf, "rb") as wf:
            sample_rate = wf.getframerate()
            n_frames = wf.getnframes()
            sample_width = wf.getsampwidth()
            channels = wf.getnchannels()
            raw_frames = wf.readframes(n_frames)

        # Convert raw PCM bytes to numpy float32 in [-1.0, 1.0]
        if sample_width == 2:
            # 16-bit signed PCM
            samples = np.frombuffer(raw_frames, dtype=np.int16).astype(np.float32)
            samples /= 32768.0
        elif sample_width == 4:
            # 32-bit signed PCM
            samples = np.frombuffer(raw_frames, dtype=np.int32).astype(np.float32)
            samples /= 2147483648.0
        elif sample_width == 1:
            # 8-bit unsigned PCM
            samples = np.frombuffer(raw_frames, dtype=np.uint8).astype(np.float32)
            samples = (samples - 128) / 128.0
        else:
            raise ValueError(f"Unsupported sample width: {sample_width}")

        # Reshape to (channels, length)
        samples = samples.reshape(-1, channels).T
        return torch.from_numpy(samples), sample_rate
    except Exception as e:
        raise ValueError(f"Invalid WAV format: {e}")


def get_authenticity_score(audio_bytes: bytes) -> dict:
    """
    Analyse raw WAV audio bytes and return an authenticity trust score.

    Parameters
    ----------
    audio_bytes : bytes
        Raw bytes of a WAV file (mono, 16 kHz expected).

    Returns
    -------
    dict
        {
            "trust_score": int,            # 0–100
            "authenticity_status": str      # "Likely Human" | "Uncertain" | "Possibly Synthetic"
        }

    If the model is not loaded, returns a fallback with trust_score = -1.
    """
    if not _model_ready:
        logger.warning("Authenticity model not loaded — returning fallback.")
        return {
            "trust_score": -1,
            "authenticity_status": "Model unavailable",
        }

    try:
        # ── 1. Load audio from in-memory bytes ─────────────────────────
        waveform, sample_rate = _wav_bytes_to_float_tensor(audio_bytes)

        # ── 2. Downmix to mono if stereo ────────────────────────────────
        if waveform.shape[0] > 1:
            waveform = torch.mean(waveform, dim=0, keepdim=True)

        # ── 3. Resample if needed ───────────────────────────────────────
        if sample_rate != _TARGET_SAMPLE_RATE:
            import torchaudio
            resampler = torchaudio.transforms.Resample(
                orig_freq=sample_rate, new_freq=_TARGET_SAMPLE_RATE
            )
            waveform = resampler(waveform)

        # ── 4. Preprocess with Wav2Vec2Processor ────────────────────────
        input_values = _processor(
            waveform.squeeze().numpy(),
            sampling_rate=_TARGET_SAMPLE_RATE,
            return_tensors="pt",
        ).input_values

        # ── 5. Run inference (no gradient computation) ──────────────────
        with torch.no_grad():
            outputs = _model(input_values)

        # ── 6. Compute embedding mean → trust score ─────────────────────
        # last_hidden_state shape: (batch, seq_len, hidden_dim)
        hidden_states = outputs.last_hidden_state
        mean_embedding = hidden_states.mean().item()

        # Convert to 0–100 score
        trust_score = int(abs(mean_embedding * 100) % 100)


        # ── 6. Derive authenticity status ───────────────────────────────
        if trust_score > 70:
            status = "Likely Human"
        elif trust_score >= 40:
            status = "Uncertain"
        else:
            status = "Possibly Synthetic"

        logger.info(
            "Authenticity analysis: trust_score=%d, status=%s, mean_emb=%.6f",
            trust_score, status, mean_embedding,
        )

        return {
            "trust_score": trust_score,
            "authenticity_status": status,
        }

    except Exception as e:
        logger.error("Authenticity model inference failed: %s", e)
        return {
            "trust_score": -1,
            "authenticity_status": f"Inference error: {e}",
        }

