const micButton = document.getElementById("micButton");
const userText = document.getElementById("userText");
const predictButton = document.getElementById("predictButton");
const result = document.getElementById("result");

let recognition;
let listening = false;

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

const MIC_ERRORS = {
    "not-allowed": "Microphone access is blocked. Click the lock/tune icon in the address bar, allow the microphone for this site, then reload the page.",
    "service-not-allowed": "Microphone access is blocked by the browser or system settings.",
    "audio-capture": "No microphone was found. Check that one is connected and selected in your system settings.",
    "no-speech": "No speech was detected. Please try again and speak after clicking the microphone.",
    "network": "Speech recognition needs an internet connection (Chrome sends the audio to Google's servers). Please check your connection.",
    "language-not-supported": "This language is not supported for voice input."
};

function setMicIdle() {
    listening = false;
    micButton.innerHTML = "🎤";
    micButton.title = "Voice input";
}

if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    micButton.addEventListener("click", () => {

        // Click again while listening to stop
        if (listening) {
            recognition.stop();
            return;
        }

        try {
            recognition.start();
            listening = true;
            micButton.innerHTML = "🔴";
            micButton.title = "Listening... (click to stop)";
            showMessage("Listening... speak now.");
        } catch (err) {
            console.error(err);
            setMicIdle();
        }
    });

    recognition.onresult = (event) => {

        const speechText =
            event.results[0][0].transcript;

        userText.value += speechText + " ";
        showMessage("Your result will appear here.");
    };

    recognition.onend = setMicIdle;

    recognition.onerror = (event) => {

        console.log("Speech recognition error:", event.error);

        if (event.error !== "aborted") {
            showMessage(MIC_ERRORS[event.error] ||
                "Voice input failed (" + event.error + ").");
        }
        setMicIdle();
    };

} else {

    micButton.disabled = true;
    micButton.title = "Speech recognition is not supported";
    micButton.style.opacity = "0.5";
    micButton.style.cursor = "not-allowed";
}


// Predict button - calls the Flask backend
const API_URL = "/predict";

const SUPPORT_MESSAGE =
    "If you are having thoughts of harming yourself, you are not alone. " +
    "Please reach out to someone you trust or a local crisis line right now. " +
    "If you are in immediate danger, contact your local emergency number. " +
    "You can find helplines worldwide at findahelpline.com.";

function showMessage(text) {
    result.replaceChildren();
    result.textContent = text;
}

function showPrediction(data) {
    result.replaceChildren();

    const label = document.createElement("div");
    label.className = "prediction-label";
    label.textContent = data.prediction;
    result.appendChild(label);

    const conf = document.createElement("div");
    conf.className = "prediction-confidence";
    conf.textContent = "Confidence: " + (data.confidence * 100).toFixed(1) + "%";
    result.appendChild(conf);

    Object.entries(data.probabilities)
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, p]) => {
            const row = document.createElement("div");
            row.className = "prob-row";

            const n = document.createElement("span");
            n.className = "prob-name";
            n.textContent = name;

            const track = document.createElement("div");
            track.className = "prob-track";
            const fill = document.createElement("div");
            fill.className = "prob-fill";
            fill.style.width = (p * 100).toFixed(1) + "%";
            track.appendChild(fill);

            const v = document.createElement("span");
            v.className = "prob-value";
            v.textContent = (p * 100).toFixed(1) + "%";

            row.append(n, track, v);
            result.appendChild(row);
        });

    if (data.prediction === "Suicidal") {
        const support = document.createElement("p");
        support.className = "support-box";
        support.textContent = SUPPORT_MESSAGE;
        result.appendChild(support);
    }

    const note = document.createElement("p");
    note.className = "disclaimer";
    note.textContent =
        "This is an automated model and not a medical diagnosis. " +
        "If you are worried about your mental health, please talk to a qualified professional.";
    result.appendChild(note);
}

predictButton.addEventListener("click", async () => {

    const text = userText.value.trim();

    if (text === "") {
        showMessage("Please enter or speak some text.");
        return;
    }

    predictButton.disabled = true;
    showMessage("Analyzing...");

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.error || "Something went wrong.");
        } else {
            showPrediction(data);
        }

    } catch (err) {
        console.error(err);
        showMessage("Could not reach the server. Please try again.");
    } finally {
        predictButton.disabled = false;
    }
});