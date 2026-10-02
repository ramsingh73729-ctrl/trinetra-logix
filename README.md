# TRINETRA LOGIX

TRINETRA LOGIX is a front-end prototype for an AI-assisted forward logistics command center.

Included modules:

- AI demand and inventory forecasting for Class I, III and V supplies
- HAT-WVI tactical routing with Zoji La / Khardung La disruption simulation
- Blue dotted air-corridor fallback visualization
- Low-bandwidth SATCOM mode and CRDT edge-mesh sync state
- What-if sliders for troop surge, cold severity and weather duration
- Priority dispatch recommendation and 72-hour pre-positioning alert
- Hindi/English field query UI with optional browser speech recognition
- QR/hash supply integrity audit chain from depot to KM-Zero

## Run locally

Open `index.html` directly in a browser, or serve this folder with:

```bash
python3 -m http.server 4173
```

The data is demo data. Replace the local model functions in `app.js` with authorized telemetry, inventory, weather and identity services before operational use.
