# DeepTrust — Privacy-First AI Scam Detection Engine

DeepTrust is a sophisticated AI backend designed to analyze recorded call audio and detect potential scam intent using a multi-modal analysis pipeline. It combines speech recognition, neural acoustic analysis, and semantic intent classification to provide comprehensive risk assessment while maintaining strict privacy standards.

## 🚀 Overview

DeepTrust was built for a hackathon with a focus on **privacy-first processing**. All audio analysis happens entirely in-memory — no temporary files are written to disk, and no audio data is stored after processing.

## 🧠 Detection Pipeline

The engine analyzes audio through four distinct layers:

1.  **Speech-to-Text (Offline)**: Uses the **Vosk** offline model to transcribe audio into text without requiring an internet connection.
2.  **Acoustic Authenticity (Neural)**: Uses **facebook/wav2vec2-base** to analyze vocal characteristics, helping detect synthetic or deepfake voices.
3.  **Semantic Intent (Transformer)**: Uses **typeform/distilbert-base-uncased-mnli** via zero-shot classification to categorize the conversation as "normal", "suspicious", or a "scam attempt".
4.  **Keyword Scoring (Multilingual)**: Instant detection of high-risk scam keywords in **English, Hindi, and Tamil**.

## 🛠️ Tech Stack

- **Backend**: Python 3.9+
- **Framework**: FastAPI (Asynchronous API)
- **Speech recognition**: Vosk (Offline)
- **Deep Learning**: PyTorch, Transformers (HuggingFace)
- **Audio Processing**: NumPy, TorchAudio

## 🏗️ Project Structure

```text
backend/
├── main.py                # FastAPI entry point & analysis pipeline
├── authenticity_model.py  # Wav2Vec2 audio authenticity logic
├── intent_model.py        # DistilBERT semantic intent logic
├── risk_engine.py         # Multi-modal risk aggregation scoring
├── keywords.json          # Multilingual scam keyword database
├── utils/
│   └── audio_utils.py     # Robust in-memory audio resampling & validation
├── model/                 # Vosk offline model directory
├── requirements.txt       # Project dependencies
└── test_audio/            # Sample WAV files for testing
```

## ⚙️ Setup Instructions

### 1. Prerequisites
- Python 3.9 or higher
- Vosk model downloaded and placed in `backend/model/`

### 2. Installation
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Running the Server
```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
*Note: On first run, the NLP models will be downloaded automatically from HuggingFace.*

## 🔌 API Endpoints

### `GET /health`
Checks the status of the server and verifies that all AI models (Vosk, Wav2Vec2, DistilBERT) are loaded correctly.

### `POST /analyze`
Accepts a multipart audio file upload (WAV format).

**Response Format:**
```json
{
  "transcript": "...",
  "intent": "scam or fraud attempt",
  "intent_confidence": 0.49,
  "keyword_score": 15,
  "trust_score": 0,
  "authenticity_status": "Possibly Synthetic",
  "risk_score": 57,
  "risk_level": "suspicious"
}
```

## 🛡️ Risk Aggregation Formula

The engine calculates a final risk level based on the following weighted formula:
- **Semantic Intent**: 50% contribution
- **Keyword Matches**: 20% contribution
- **Acoustic Authenticity**: 30% contribution

**Risk Tiers:**
- **0–30**: Safe
- **31–60**: Suspicious
- **61–100**: High Risk

## 📈 Future Extensibility
- **Streaming Analysis**: Support for real-time WebSocket-based audio processing.
- **Specialized Deepfake Detection**: Swapping the general acoustic model for dedicated ASVspoof-trained models.
- **Multilingual NLP**: Extending the semantic intent model to support non-translated Hindi/Tamil transcripts.

## 🔐 Privacy Principle
DeepTrust processes all audio in bytes. No local storage, no cloud uploads of raw audio, and no transcription logs are kept beyond the request lifecycle.
