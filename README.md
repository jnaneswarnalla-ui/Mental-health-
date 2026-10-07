# Mental Health Text Analysis – Deployment

## Structure
```
app.py              Flask backend (serves frontend + /predict API)
requirements.txt
Dockerfile / Procfile
model/              config.json, model.weights.h5, tokenizer.pkl, label_encoder.pkl
static/             index.html, script.js, style.css
```

## Run locally
```
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
Open http://localhost:5000

## Run with Docker
```
docker build -t mh-app .
docker run -p 8000:8000 mh-app
```
Open http://localhost:8000

## Deploy
Any host that runs Python or Docker works (Render, Railway, Fly.io, Hugging Face Spaces, Google Cloud Run, AWS App Runner).
Start command: `gunicorn app:app --workers 1 --threads 4 --timeout 120`

Note: the browser microphone (speech recognition) only works on HTTPS or localhost.

## API
POST /predict  {"text": "..."}
-> {"prediction": "Normal", "confidence": 0.81, "probabilities": {...}}
