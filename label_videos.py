#!/usr/bin/env python3
"""Label videos using the NomadicML API for Robotics for Social Good."""

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

try:
    from supabase import create_client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False

BASE_DIR = Path(__file__).resolve().parent
LABELS_FILE = BASE_DIR / "labels.json"
DATA_DIR = BASE_DIR / "data"
COLLECTIONS_DIR = DATA_DIR / "collections"
HOME = Path.home()
VIDEO_PATTERNS = ("*.mp4", "*.MP4", "*.mov", "*.MOV", "*.avi", "*.AVI", "*.mkv", "*.MKV", "*.webm", "*.WEBM")

CLASSIFICATION_PROMPT = (
    "Analyze this robotics video. Describe: "
    "1) What type of robot or simulation is shown. "
    "2) What actions/behaviors the robot performs. "
    "3) How this could be applied for social good (disaster response, accessibility, "
    "healthcare, agriculture, education, environmental cleanup, elder care, etc). "
    "4) Rate the technical complexity and potential humanitarian impact."
)

PROXY_KEYS = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"]


def parse_args():
    parser = argparse.ArgumentParser(description="Label videos and export public dataset collections.")
    parser.add_argument(
        "--export-only",
        action="store_true",
        help="Skip NomadicML labeling and only export the public collection files from labels.json.",
    )
    return parser.parse_args()


def slugify(value):
    text = re.sub(r"[^a-zA-Z0-9]+", "-", str(value).strip().lower()).strip("-")
    return text or "local-library"


def api_key_fingerprint(api_key):
    if not api_key:
        return "local"
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()[:10]


def collection_id_from_env(api_key):
    explicit_slug = os.environ.get("NOMADICML_COLLECTION_SLUG")
    if explicit_slug:
        return slugify(explicit_slug)
    return f"nomadic-{api_key_fingerprint(api_key)}"


def collection_name_from_env():
    return os.environ.get("NOMADICML_COLLECTION_NAME", "NomadicML Video Library")


def configured_video_files():
    video_dir = Path(os.environ.get("NOMADICML_VIDEO_DIR", str(HOME))).expanduser()
    videos = []
    for pattern in VIDEO_PATTERNS:
        videos.extend(video_dir.glob(pattern))
    return sorted({path.resolve() for path in videos})


def showcase_path():
    configured = os.environ.get("NOMADICML_SHOWCASE_PATH")
    if configured:
        return Path(configured).expanduser()
    return HOME / "nomadic-training-set" / "data" / "showcase_library.json"


def clear_proxies():
    saved = {}
    for key in PROXY_KEYS:
        if key in os.environ:
            saved[key] = os.environ.pop(key)
    return saved


def restore_proxies(saved):
    for key, value in saved.items():
        os.environ[key] = value


def load_labels():
    if LABELS_FILE.exists():
        with open(LABELS_FILE, encoding="utf-8") as handle:
            return json.load(handle)
    return []


def save_labels(labels):
    with open(LABELS_FILE, "w", encoding="utf-8") as handle:
        json.dump(labels, handle, indent=2)


def import_existing_showcase(owner_fingerprint):
    path = showcase_path()
    if not path.exists():
        return []

    with open(path, encoding="utf-8") as handle:
        showcase = json.load(handle)

    entries = []
    for item in showcase:
        filename = item["filename"]
        entries.append({
            "filename": filename,
            "source": "nomadic-training-set",
            "path": str(path.parent.parent / filename),
            "status": item.get("status", "classified"),
            "use_case": item.get("use_case_slug", "needs-review"),
            "use_case_title": item.get("use_case_title", ""),
            "summary": item.get("summary", ""),
            "nomadic_summary": item.get("nomadic_summary", ""),
            "confidence": item.get("confidence"),
            "event_count": item.get("event_count", 0),
            "event_labels": item.get("event_labels", []),
            "analyzed_at": item.get("analyzed_at"),
            "thumbnail": None,
            "owner_key_fingerprint": owner_fingerprint,
        })
    return entries


def find_thumbnail(video_path):
    stem = Path(video_path).stem
    assets_dir = BASE_DIR / "assets"

    patterns = [
        f"{stem}_thumb.png",
        f"{stem}_frame_0.png",
        f"{stem}_frame_000.png",
        f"{stem}_0.png",
        f"{stem}.png",
    ]

    for pattern in patterns:
        candidate = assets_dir / pattern
        if candidate.exists():
            return candidate.name

    prefix = stem.split("_")[0] + "_" + stem.split("_")[1] if "_" in stem else stem
    for file_path in sorted(assets_dir.glob(f"{prefix}*frame*.png")):
        return file_path.name
    for file_path in sorted(assets_dir.glob(f"{prefix}*_0.png")):
        return file_path.name
    for file_path in sorted(assets_dir.glob(f"{stem}*.png")):
        return file_path.name

    return None


def label_video(client, analysis_type, video_path):
    print(f"  Uploading {video_path}...")
    upload_result = client.upload(str(video_path), folder="Robotics for Social Good")
    video_id = upload_result.get("video_id")
    if not video_id:
        raise RuntimeError(f"No video_id returned for {video_path}")

    print(f"  Analyzing (video_id={video_id})...")
    analysis = client.analyze(
        video_id,
        analysis_type=analysis_type,
        custom_event=CLASSIFICATION_PROMPT,
        timeout=2400,
    )

    summary = analysis.get("summary", "")
    events = analysis.get("events", [])
    event_labels = [event.get("label", "") for event in events if event.get("label")]
    confidences = [float(event["confidence"]) for event in events if event.get("confidence") is not None]
    avg_confidence = round(sum(confidences) / len(confidences) * 100) if confidences else None

    text = summary.lower()
    if any(word in text for word in ["disaster", "rescue", "earthquake", "emergency"]):
        use_case = "disaster-response"
        use_case_title = "Disaster Response"
    elif any(word in text for word in ["elder", "mobility", "back pain", "assist", "walking support"]):
        use_case = "elder-support"
        use_case_title = "Elder Mobility Support"
    elif any(word in text for word in ["food", "meal", "homeless", "hunger"]):
        use_case = "food-outreach"
        use_case_title = "Food Assistance"
    elif any(word in text for word in ["waste", "recycl", "biodegradable", "sorting"]):
        use_case = "waste-segregation"
        use_case_title = "Waste Segregation"
    elif any(word in text for word in ["farm", "agriculture", "crop", "plant"]):
        use_case = "agriculture"
        use_case_title = "Sustainable Agriculture"
    elif any(word in text for word in ["ocean", "water", "marine", "pollution"]):
        use_case = "ocean-cleanup"
        use_case_title = "Ocean And Environment"
    elif any(word in text for word in ["healthcare", "medical", "patient", "hospital"]):
        use_case = "healthcare"
        use_case_title = "Healthcare"
    elif any(word in text for word in ["humanoid", "bipedal", "walking", "locomotion", "backflip", "dance"]):
        use_case = "robotics-research"
        use_case_title = "Robotics Research"
    else:
        use_case = "general-robotics"
        use_case_title = "General Robotics for Good"

    return {
        "status": "classified",
        "use_case": use_case,
        "use_case_title": use_case_title,
        "summary": summary,
        "nomadic_summary": summary,
        "confidence": avg_confidence,
        "event_count": len(events),
        "event_labels": event_labels[:5],
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }


def export_public_collections(labels, api_key):
    fingerprint = api_key_fingerprint(api_key)
    collection_id = collection_id_from_env(api_key)
    collection_name = collection_name_from_env()
    generated_at = datetime.now(timezone.utc).isoformat()

    normalized_labels = []
    for entry in labels:
        cloned = dict(entry)
        cloned.setdefault("owner_key_fingerprint", fingerprint)
        normalized_labels.append(cloned)

    normalized_labels.sort(
        key=lambda item: (
            -(item.get("confidence") or 0),
            -(item.get("event_count") or 0),
            item.get("filename", ""),
        )
    )

    COLLECTIONS_DIR.mkdir(parents=True, exist_ok=True)
    collection_path = COLLECTIONS_DIR / f"{collection_id}.json"
    relative_collection_path = collection_path.relative_to(BASE_DIR).as_posix()

    collection_payload = {
        "collection": {
            "id": collection_id,
            "name": collection_name,
            "api_key_fingerprint": fingerprint,
            "generated_at": generated_at,
            "video_count": len(normalized_labels),
            "path": relative_collection_path,
        },
        "videos": normalized_labels,
    }

    with open(collection_path, "w", encoding="utf-8") as handle:
        json.dump(collection_payload, handle, indent=2)

    manifest_payload = {
        "generated_at": generated_at,
        "default_collection": collection_id,
        "collections": [collection_payload["collection"]],
    }

    with open(DATA_DIR / "manifest.json", "w", encoding="utf-8") as handle:
        json.dump(manifest_payload, handle, indent=2)

    with open(DATA_DIR / "latest.json", "w", encoding="utf-8") as handle:
        json.dump(collection_payload, handle, indent=2)

    print(f"Exported collection manifest to {DATA_DIR / 'manifest.json'}")
    print(f"Exported collection dataset to {collection_path}")


def sync_to_supabase():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")

    if not url or not key:
        print("Supabase credentials not set, skipping sync.")
        return

    if not HAS_SUPABASE:
        print("supabase not installed, skipping sync. Run: pip install supabase")
        return

    try:
        client = create_client(url, key)
        labels = load_labels()

        for entry in labels:
            row = {
                "filename": entry["filename"],
                "source": entry.get("source"),
                "path": entry.get("path"),
                "status": entry.get("status"),
                "use_case": entry.get("use_case"),
                "use_case_title": entry.get("use_case_title"),
                "summary": entry.get("summary"),
                "nomadic_summary": entry.get("nomadic_summary"),
                "confidence": entry.get("confidence"),
                "event_count": entry.get("event_count", 0),
                "event_labels": entry.get("event_labels", []),
                "analyzed_at": entry.get("analyzed_at"),
                "thumbnail": entry.get("thumbnail"),
                "owner_key_fingerprint": entry.get("owner_key_fingerprint"),
            }
            client.table("video_labels").upsert(row, on_conflict="filename").execute()

        print(f"Upserted {len(labels)} labels to Supabase.")

        assets_dir = BASE_DIR / "assets"
        if assets_dir.exists():
            uploaded = 0
            for image_path in assets_dir.glob("*.png"):
                with open(image_path, "rb") as handle:
                    client.storage.from_("thumbnails").upload(
                        image_path.name,
                        handle.read(),
                        file_options={"content-type": "image/png", "upsert": "true"},
                    )
                uploaded += 1
            print(f"Uploaded {uploaded} thumbnails to Supabase Storage.")

        print("Supabase sync complete.")
    except Exception as error:
        print(f"Supabase sync error: {error}")


def ensure_owner_fingerprint(labels, fingerprint):
    for entry in labels:
        entry.setdefault("owner_key_fingerprint", fingerprint)


def main():
    args = parse_args()
    api_key = os.environ.get("NOMADICML_API_KEY")
    fingerprint = api_key_fingerprint(api_key)
    labels = load_labels()
    ensure_owner_fingerprint(labels, fingerprint)

    if args.export_only:
        export_public_collections(labels, api_key)
        return

    if not api_key:
        print("ERROR: Set NOMADICML_API_KEY environment variable")
        sys.exit(1)

    try:
        from nomadicml import AnalysisType, NomadicML
    except ImportError:
        print("ERROR: nomadicml package is not installed. Run: pip install -r requirements.txt")
        sys.exit(1)

    labeled_files = {entry["filename"] for entry in labels}

    showcase_entries = import_existing_showcase(fingerprint)
    for entry in showcase_entries:
        if entry["filename"] not in labeled_files:
            entry["thumbnail"] = find_thumbnail(entry["path"])
            labels.append(entry)
            labeled_files.add(entry["filename"])
            print(f"Imported: {entry['filename']} -> {entry['use_case']}")

    unlabeled = [video for video in configured_video_files() if video.name not in labeled_files]

    if not unlabeled:
        print(f"All {len(labels)} videos already labeled. Nothing to do.")
        save_labels(labels)
        export_public_collections(labels, api_key)
        return

    print(f"Found {len(unlabeled)} unlabeled videos to process...")

    saved_proxies = clear_proxies()
    try:
        client = NomadicML(api_key=api_key)
        for video_path in unlabeled:
            print(f"\nProcessing: {video_path.name}")
            try:
                result = label_video(client, AnalysisType.ASK, video_path)
                entry = {
                    "filename": video_path.name,
                    "source": os.environ.get("NOMADICML_SOURCE_NAME", "configured-video-dir"),
                    "path": str(video_path),
                    "thumbnail": find_thumbnail(video_path),
                    "owner_key_fingerprint": fingerprint,
                    **result,
                }
                labels.append(entry)
                labeled_files.add(video_path.name)
                print(f"  -> {result['use_case_title']} (confidence: {result['confidence']})")
                save_labels(labels)
            except Exception as error:
                print(f"  ERROR: {error}")
                labels.append({
                    "filename": video_path.name,
                    "source": os.environ.get("NOMADICML_SOURCE_NAME", "configured-video-dir"),
                    "path": str(video_path),
                    "status": "error",
                    "use_case": "needs-review",
                    "use_case_title": "Needs Review",
                    "summary": f"Labeling failed: {error}",
                    "nomadic_summary": None,
                    "confidence": None,
                    "event_count": 0,
                    "event_labels": [],
                    "analyzed_at": datetime.now(timezone.utc).isoformat(),
                    "thumbnail": find_thumbnail(video_path),
                    "owner_key_fingerprint": fingerprint,
                })
                save_labels(labels)
    finally:
        restore_proxies(saved_proxies)

    save_labels(labels)
    print(f"\nDone! {len(labels)} total videos labeled. Results in {LABELS_FILE}")

    export_public_collections(labels, api_key)
    sync_to_supabase()


if __name__ == "__main__":
    main()
