import json
import os
import pickle

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import keras
from flask import Flask, jsonify, request, send_from_directory
from keras.preprocessing.sequence import pad_sequences

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")

MAX_LEN = 250          # must match the model's input length (see config.json)
PADDING = "pre"        # Keras default; change to "post" only if you trained with padding="post"
MAX_CHARS = 5000

# ---------- Load artifacts once at startup ----------
with open(os.path.join(MODEL_DIR, "config.json")) as f:
    model = keras.saving.deserialize_keras_object(json.load(f))
model.build((None, MAX_LEN))
model.load_weights(os.path.join(MODEL_DIR, "model.weights.h5"))

with open(os.path.join(MODEL_DIR, "tokenizer.pkl"), "rb") as f:
    tokenizer = pickle.load(f)
with open(os.path.join(MODEL_DIR, "label_encoder.pkl"), "rb") as f:
    label_encoder = pickle.load(f)

CLASSES = [str(c) for c in label_encoder.classes_]

# ---------- App ----------
app = Flask(__name__, static_folder="static", static_url_path="")


@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/health")
def health():
    return jsonify(status="ok", classes=CLASSES)


@app.post("/predict")
def predict():
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()

    if not text:
        return jsonify(error="Please provide some text."), 400
    if len(text) > MAX_CHARS:
        return jsonify(error=f"Text is too long (max {MAX_CHARS} characters)."), 400

    seq = tokenizer.texts_to_sequences([text])
    x = pad_sequences(seq, maxlen=MAX_LEN, padding=PADDING, truncating=PADDING)
    probs = model.predict(x, verbose=0)[0]

    best = int(probs.argmax())
    return jsonify(
        prediction=CLASSES[best],
        confidence=float(probs[best]),
        probabilities={c: float(p) for c, p in zip(CLASSES, probs)},
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
