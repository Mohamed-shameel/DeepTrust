"""
generate_test_wav.py — Create a synthetic silent WAV file for pipeline testing.

This generates a valid mono, 16kHz, 16-bit PCM WAV file.
It contains silence (Vosk should return an empty transcript),
which is useful for verifying the pipeline doesn't crash.

Run: python generate_test_wav.py
"""

import wave
import os
import struct

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "test_audio")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "test_silence.wav")

SAMPLE_RATE = 16000
CHANNELS = 1
SAMPLE_WIDTH = 2  # 16-bit
DURATION_SECONDS = 3

os.makedirs(OUTPUT_DIR, exist_ok=True)

num_frames = SAMPLE_RATE * DURATION_SECONDS
# Generate silence (all zeros)
frames = struct.pack(f"<{num_frames}h", *([0] * num_frames))

with wave.open(OUTPUT_PATH, "wb") as wf:
    wf.setnchannels(CHANNELS)
    wf.setsampwidth(SAMPLE_WIDTH)
    wf.setframerate(SAMPLE_RATE)
    wf.writeframes(frames)

print(f"Generated test WAV: {OUTPUT_PATH}")
print(f"  Format: {CHANNELS}ch, {SAMPLE_RATE}Hz, {SAMPLE_WIDTH * 8}-bit")
print(f"  Duration: {DURATION_SECONDS}s")
print(f"  Size: {os.path.getsize(OUTPUT_PATH)} bytes")
