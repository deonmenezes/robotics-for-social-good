# Robotics for Social Good

A browse-first library of robotics videos labeled for social good use cases, deployed as a static site with Python serverless API functions on Vercel.

## Tech Stack

- **Frontend:** Plain HTML, CSS, vanilla JavaScript (no build step)
- **Backend:** Python (Flask), serverless via `@vercel/python`
- **Database:** Supabase (`supabase-py`)
- **ML:** NomadicML SDK (`nomadicml`)
- **Deployment:** Vercel (static + Python functions)

## Setup

```bash
pip install -r requirements.txt
```

Create a `.env` file with:
```
SUPABASE_URL=...
SUPABASE_KEY=...
NOMADICML_API_KEY=...
```

## Build / Run / Test

This is a static site with serverless API routes — no local server command is defined in the repo. To run locally:

```bash
# Install Vercel CLI and run locally
npx vercel dev
```

Or open `index.html` directly in a browser for the frontend (API calls will not work without a server).

## Project Structure

```
robotics-for-social-good/
├── index.html          # Main landing/browse page
├── explore.html        # Dataset exploration page
├── upload.html         # Video upload page
├── impact.html         # Impact/about page
├── pricing.html        # Pricing page
├── api/
│   └── upload.py       # Serverless Python handler for video uploads
├── js/
│   ├── main.js         # Core site JS
│   ├── datasets.js     # Dataset listing logic
│   ├── explore.js      # Explore page logic
│   ├── home.js         # Home page logic
│   ├── upload.js       # Upload form handling
│   └── shared.js       # Shared utilities
├── css/                # Stylesheets
├── assets/             # Images and media
├── data/               # Static data files
├── labels.json         # Video label taxonomy
├── label_videos.py     # Script for labeling videos via NomadicML
├── supabase_setup.sql  # Database schema
├── requirements.txt    # Python dependencies
└── vercel.json         # Vercel deployment config
```

## Architecture & Key Files

- Static HTML pages are served directly; no client-side routing framework.
- `api/upload.py` handles video file uploads as a Vercel Python serverless function.
- `label_videos.py` is a one-off script to batch-label video content using the NomadicML API.
- `supabase_setup.sql` sets up the Supabase tables; run it in your Supabase project before deploying.
- `labels.json` defines the social good categories used throughout the app.

## Conventions & Notes for Agents

- No Node.js or build toolchain — the frontend is pure HTML/CSS/JS; edits take effect immediately.
- Python dependencies are for the serverless API only (`api/*.py`).
- `SUPABASE_URL`, `SUPABASE_KEY`, and `NOMADICML_API_KEY` must be set as environment variables (`.env` locally, Vercel env vars in production).
- `improve.sh` and `improve.log` are development iteration scripts; they are not part of the production app.
- The `vercel.json` routes `/api/upload` to `api/upload.py`; add new API routes there if extending the backend.
