"""
audio_utils.py — WAV validation, resampling, and frame extraction for DeepTrust.

All processing happens in-memory (no temp files written to disk).
Uses stdlib wave for decoding to avoid torchaudio codec dependencies.
"""

import io
import wave
import logging
import torch
import numpy as np

logger = logging.getLogger(__name__)

# Expected format for Vosk and wav2vec2
EXPECTED_CHANNELS = 1
EXPECTED_SAMPLE_RATE = 16000
EXPECTED_SAMPLE_WIDTH = 2    # 16-bit PCM


class AudioValidationError(Exception):
    """Raised when the uploaded audio is invalid or cannot be processed."""
    pass


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
        raise AudioValidationError(f"Invalid WAV format: {e}")


def validate_and_read_wav(file_bytes: bytes) -> tuple[bytes, int]:
    """
    Validate and return 16kHz mono PCM frames.
    If input is not 16kHz mono, it will be automatically converted.

    Parameters
    ----------
    file_bytes : bytes
        The raw bytes of the uploaded file.

    Returns
    -------
    tuple[bytes, int]
        (pcm_frames, sample_rate)
    """
    try:
        # Load audio using robust method
        waveform, sr = _wav_bytes_to_float_tensor(file_bytes)
        
        # 1. Downmix to mono if stereo
        if waveform.shape[0] > 1:
            logger.info(f"Downmixing {waveform.shape[0]} channels to mono.")
            waveform = torch.mean(waveform, dim=0, keepdim=True)

        # 2. Resample if needed
        if sr != EXPECTED_SAMPLE_RATE:
            logger.info(f"Resampling from {sr}Hz to {EXPECTED_SAMPLE_RATE}Hz.")
            import torchaudio
            resampler = torchaudio.transforms.Resample(orig_freq=sr, new_freq=EXPECTED_SAMPLE_RATE)
            waveform = resampler(waveform)

        # 3. Convert back to 16-bit PCM
        pixels = waveform.squeeze().numpy()
        pixels = np.clip(pixels, -1.0, 1.0)
        pcm_data = (pixels * 32767).astype(np.int16)
        
        frames = pcm_data.tobytes()
        
        logger.info(f"Audio processed: {len(frames)} bytes of 16kHz mono PCM.")
        return frames, EXPECTED_SAMPLE_RATE

    except Exception as e:
        if isinstance(e, AudioValidationError):
            raise
        logger.error(f"Audio processing error: {e}")
        raise AudioValidationError(f"Failed to process audio file: {e}")
