import json
import os
from pathlib import Path

from flask import Flask, jsonify
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

try:
    from supabase import create_client
except ImportError:
    create_client = None

BASE_DIR = Path(__file__).resolve().parent.parent

app = Flask(__name__)


def load_static_payload():
    manifest_path = BASE_DIR / "data" / "latest.json"
    if manifest_path.exists():
        with open(manifest_path, encoding="utf-8") as handle:
            return json.load(handle)

    labels_path = BASE_DIR / "labels.json"
    if labels_path.exists():
        with open(labels_path, encoding="utf-8") as handle:
            return {
                "collection": {
                    "id": "labels",
                    "name": "Main Library",
                    "api_key_fingerprint": "local",
                    "path": "labels.json",
                },
                "videos": json.load(handle),
            }

    return {"collection": {"id": "labels", "name": "Main Library", "path": "labels.json"}, "videos": []}


def load_supabase_rows():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key or create_client is None:
        return []

    client = create_client(url, key)
    response = client.table("video_labels").select("*").order("analyzed_at", desc=True).execute()
    return response.data or []


@app.get("/")
@app.get("/api/datasets")
def datasets():
    payload = load_static_payload()
    existing = payload.get("videos", [])
    remote_rows = load_supabase_rows()

    merged = {}
    for item in existing:
        merged[item.get("filename")] = item
    for item in remote_rows:
        merged[item.get("filename")] = item

    payload["videos"] = sorted(
        merged.values(),
        key=lambda item: (
            -(item.get("confidence") or 0),
            -(item.get("event_count") or 0),
            item.get("filename") or "",
        ),
    )
    return jsonify(payload)
