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

## Project Structure

```text
index.html          Landing page and app markup
styles.css          Visual design and responsive layout
app.js              Frontend game logic and camera flow
backend/server.py   Local backend API and static file server
assets/             Generated product visuals
```

## Run

Run the backend server:

```bash
python3 backend/server.py
```

Then visit `http://localhost:8000`.

## Gemini Vision Setup

TRACE can use Gemini Vision for real room object detection. Add your Gemini API key as an environment variable before starting the backend:

```bash
export GEMINI_API_KEY="your_api_key_here"
python3 backend/server.py
```

Optional: choose a different vision-capable model:

```bash
export GEMINI_VISION_MODEL="gemini-2.5-flash"
```

Do not commit your API key. The app falls back to the procedural demo scanner when `GEMINI_API_KEY` is not set.

## Current Prototype

This version uses a lightweight Python backend with no external dependencies. The backend serves the app, can return Gemini Vision object inventory when configured, and generates room-based mystery cases. It includes generated visual assets, a four-screen landing page, and the playable investigation experience. The next production step is to replace more procedural backend engines with structured AI calls, persistent case state, and real case-file storage.
