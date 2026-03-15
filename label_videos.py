#!/usr/bin/env python3
"""Label videos using the NomadicML API for Robotics for Social Good."""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from nomadicml import AnalysisType, NomadicML

BASE_DIR = Path(__file__).resolve().parent
LABELS_FILE = BASE_DIR / "labels.json"
HOME = Path.home()

# Videos to label: home dir MP4s (robotics simulations)
ROBOT_VIDEOS = sorted(HOME.glob("*.mp4"))

# Classification prompt for social good robotics
CLASSIFICATION_PROMPT = (
    "Analyze this robotics video. Describe: "
    "1) What type of robot or simulation is shown. "
    "2) What actions/behaviors the robot performs. "
    "3) How this could be applied for social good (disaster response, accessibility, "
    "healthcare, agriculture, education, environmental cleanup, elder care, etc). "
    "4) Rate the technical complexity and potential humanitarian impact."
)

PROXY_KEYS = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"]


def clear_proxies():
    saved = {}
    for k in PROXY_KEYS:
        if k in os.environ:
            saved[k] = os.environ.pop(k)
    return saved


def restore_proxies(saved):
    for k, v in saved.items():
        os.environ[k] = v


def load_labels():
    if LABELS_FILE.exists():
        with open(LABELS_FILE) as f:
            return json.load(f)
    return []


def save_labels(labels):
    with open(LABELS_FILE, "w") as f:
        json.dump(labels, f, indent=2)


def import_existing_showcase():
    """Import already-labeled data from nomadic-training-set."""
    showcase_path = HOME / "nomadic-training-set" / "data" / "showcase_library.json"
    if not showcase_path.exists():
        return []

    with open(showcase_path) as f:
        showcase = json.load(f)

    entries = []
    for item in showcase:
        entries.append({
            "filename": item["filename"],
            "source": "nomadic-training-set",
            "path": str(HOME / "nomadic-training-set" / item["filename"]),
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
        })
    return entries


def find_thumbnail(video_path):
    """Find a frame PNG for a given video."""
    stem = Path(video_path).stem
    home = Path.home()

    # Try common patterns
    patterns = [
        f"{stem}_frame_0.png",
        f"{stem}_frame_000.png",
        f"{stem}_0.png",
        f"{stem}.png",
    ]

    # Also try partial matches
    for p in patterns:
        candidate = home / p
        if candidate.exists():
            return candidate.name

    # Search for any frame file containing the video name prefix
    prefix = stem.split("_")[0] + "_" + stem.split("_")[1] if "_" in stem else stem
    for f in sorted(home.glob(f"{prefix}*frame*.png")):
        return f.name
    for f in sorted(home.glob(f"{prefix}*_0.png")):
        return f.name
    for f in sorted(home.glob(f"{stem}*.png")):
        return f.name

    return None


def label_video(client, video_path):
    """Upload and analyze a single video with NomadicML."""
    print(f"  Uploading {video_path}...")
    upload_result = client.upload(str(video_path), folder="Robotics for Social Good")
    video_id = upload_result.get("video_id")
    if not video_id:
        raise RuntimeError(f"No video_id returned for {video_path}")

    print(f"  Analyzing (video_id={video_id})...")
    analysis = client.analyze(
        video_id,
        analysis_type=AnalysisType.ASK,
        custom_event=CLASSIFICATION_PROMPT,
        timeout=2400,
    )

    summary = analysis.get("summary", "")
    events = analysis.get("events", [])
    event_labels = [e.get("label", "") for e in events if e.get("label")]
    confidences = [float(e["confidence"]) for e in events if e.get("confidence") is not None]
    avg_confidence = round(sum(confidences) / len(confidences) * 100) if confidences else None

    # Infer social good category from analysis text
    text = summary.lower()
    if any(w in text for w in ["disaster", "rescue", "earthquake", "emergency"]):
        use_case = "disaster-response"
        use_case_title = "Disaster Response"
    elif any(w in text for w in ["elder", "mobility", "back pain", "assist", "walking support"]):
        use_case = "elder-support"
        use_case_title = "Elder Mobility Support"
    elif any(w in text for w in ["food", "meal", "homeless", "hunger"]):
        use_case = "food-outreach"
        use_case_title = "Food Assistance"
    elif any(w in text for w in ["waste", "recycl", "biodegradable", "sorting"]):
        use_case = "waste-segregation"
        use_case_title = "Waste Segregation"
    elif any(w in text for w in ["farm", "agriculture", "crop", "plant"]):
        use_case = "agriculture"
        use_case_title = "Sustainable Agriculture"
    elif any(w in text for w in ["ocean", "water", "marine", "pollution"]):
        use_case = "ocean-cleanup"
        use_case_title = "Ocean & Environment"
    elif any(w in text for w in ["healthcare", "medical", "patient", "hospital"]):
        use_case = "healthcare"
        use_case_title = "Healthcare"
    elif any(w in text for w in ["humanoid", "bipedal", "walking", "locomotion", "backflip", "dance"]):
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


def main():
    api_key = os.environ.get("NOMADICML_API_KEY")
    if not api_key:
        print("ERROR: Set NOMADICML_API_KEY environment variable")
        sys.exit(1)

    labels = load_labels()
    labeled_files = {entry["filename"] for entry in labels}

    # Import existing showcase labels if not already present
    showcase_entries = import_existing_showcase()
    for entry in showcase_entries:
        if entry["filename"] not in labeled_files:
            entry["thumbnail"] = find_thumbnail(entry["path"])
            labels.append(entry)
            labeled_files.add(entry["filename"])
            print(f"Imported: {entry['filename']} -> {entry['use_case']}")

    # Find unlabeled robot videos
    unlabeled = [v for v in ROBOT_VIDEOS if v.name not in labeled_files]

    if not unlabeled:
        print(f"All {len(labels)} videos already labeled. Nothing to do.")
        save_labels(labels)
        return

    print(f"Found {len(unlabeled)} unlabeled videos to process...")

    saved_proxies = clear_proxies()
    try:
        client = NomadicML(api_key=api_key)

        for video_path in unlabeled:
            print(f"\nProcessing: {video_path.name}")
            try:
                result = label_video(client, video_path)
                thumbnail = find_thumbnail(video_path)
                entry = {
                    "filename": video_path.name,
                    "source": "home-robotics",
                    "path": str(video_path),
                    "thumbnail": thumbnail,
                    **result,
                }
                labels.append(entry)
                labeled_files.add(video_path.name)
                print(f"  -> {result['use_case_title']} (confidence: {result['confidence']})")
                # Save after each to preserve progress
                save_labels(labels)
            except Exception as e:
                print(f"  ERROR: {e}")
                labels.append({
                    "filename": video_path.name,
                    "source": "home-robotics",
                    "path": str(video_path),
                    "status": "error",
                    "use_case": "needs-review",
                    "use_case_title": "Needs Review",
                    "summary": f"Labeling failed: {e}",
                    "nomadic_summary": None,
                    "confidence": None,
                    "event_count": 0,
                    "event_labels": [],
                    "analyzed_at": datetime.now(timezone.utc).isoformat(),
                    "thumbnail": find_thumbnail(video_path),
                })
                save_labels(labels)
    finally:
        restore_proxies(saved_proxies)

    save_labels(labels)
    print(f"\nDone! {len(labels)} total videos labeled. Results in {LABELS_FILE}")


if __name__ == "__main__":
    main()
