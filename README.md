# TRACE

Every room leaves a trace.

TRACE is an AI-native mystery game prototype where a player's room becomes the case board. This first build is a self-contained browser MVP for a hackathon submission.

## Landing Experience

The product landing page is organized as four screens:

1. Hero: the core promise and start CTA
2. Core Loop: scan, generate, investigate
3. Product Experience: scanner, mystery engine, witness engine, reveal engine
4. Platform Vision: mystery modes, submission metrics, final CTA

## Playable Demo

The investigation app covers the full MVP loop:

- Enter an investigator name
- Grant camera permission and scan the room
- Build an object inventory
- Generate a mystery from the room
- Interrogate an unreliable witness
- Inspect evidence and discover contradictions
- Submit an accusation
- Reveal the truth and generate a case file

## Run

Open `index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Current Prototype

This version uses frontend-only procedural logic so the concept can be tested immediately without API keys, backend setup, or database configuration. It includes generated visual assets, a four-screen landing page, and the playable investigation experience. The next production step is to replace the procedural engines with structured AI calls, camera vision, persistent case state, and real case-file storage.
