import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException, RequestEntityTooLarge
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

try:
    from nomadicml import AnalysisType, NomadicML
except ImportError:
    AnalysisType = None
    NomadicML = None

try:
    from supabase import create_client
except ImportError:
    create_client = None

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 250 * 1024 * 1024

CATEGORY_TITLES = {
    "waste-segregation": "Waste Segregation",
    "food-outreach": "Food Assistance",
    "elder-support": "Elder Support",
    "disaster-response": "Disaster Response",
    "robotics-research": "Robotics Research",
    "general-robotics": "General Robotics",
    "agriculture": "Agriculture",
    "ocean-cleanup": "Ocean Cleanup",
    "healthcare": "Healthcare",
    "education": "Education",
}

CLASSIFICATION_PROMPT = (
    "Analyze this robotics video. Describe: "
    "1) What type of robot or simulation is shown. "
    "2) What actions or behaviors the robot performs. "
    "3) How this could be applied for social good. "
    "4) Rate technical complexity and humanitarian impact."
)


def infer_category(summary, fallback):
    text = (summary or "").lower()
    if any(word in text for word in ["disaster", "rescue", "earthquake", "emergency"]):
        return "disaster-response"
    if any(word in text for word in ["elder", "mobility", "back pain", "assist", "walking support"]):
        return "elder-support"
    if any(word in text for word in ["food", "meal", "homeless", "hunger"]):
        return "food-outreach"
    if any(word in text for word in ["waste", "recycl", "biodegradable", "sorting"]):
        return "waste-segregation"
    if any(word in text for word in ["farm", "agriculture", "crop", "plant"]):
        return "agriculture"
    if any(word in text for word in ["ocean", "water", "marine", "pollution"]):
        return "ocean-cleanup"
    if any(word in text for word in ["healthcare", "medical", "patient", "hospital"]):
        return "healthcare"
    if any(word in text for word in ["school", "education", "learning", "classroom"]):
        return "education"
    if any(word in text for word in ["humanoid", "bipedal", "walking", "locomotion", "backflip", "dance"]):
        return "robotics-research"
    return fallback or "general-robotics"


def build_result(filename, source, summary, events, confidence, category, raw_analysis, upload_metadata):
    return {
        "filename": filename,
        "source": source,
        "path": filename,
        "status": "classified",
        "use_case": category,
        "use_case_title": CATEGORY_TITLES.get(category, category.replace("-", " ").title()),
        "summary": summary,
        "nomadic_summary": summary,
        "confidence": confidence,
        "event_count": len(events),
        "event_labels": [event.get("label", "") for event in events if event.get("label")][:5],
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "thumbnail": None,
        "raw_analysis": raw_analysis,
        "upload_metadata": upload_metadata,
    }


def save_to_supabase(entry):
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key or create_client is None:
        return
    client = create_client(url, key)
    try:
        client.table("video_labels").upsert(entry, on_conflict="filename").execute()
    except Exception as error:
        message = str(error)
        if "raw_analysis" in message or "upload_metadata" in message:
            raise RuntimeError("Supabase schema is missing raw_analysis/upload_metadata. Re-run supabase_setup.sql.") from error
        raise


@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(_error):
    return jsonify({
        "ok": False,
        "error": "Upload too large. Keep files under 250MB for the web uploader.",
    }), 413


@app.errorhandler(HTTPException)
def handle_http_error(error):
    return jsonify({
        "ok": False,
        "error": error.description or "Request failed.",
    }), error.code


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    return jsonify({
        "ok": False,
        "error": str(error) or "Unexpected server error.",
    }), 500


@app.post("/")
@app.post("/api/upload")
def upload():
    if NomadicML is None or AnalysisType is None:
        return jsonify({"ok": False, "error": "Upload service dependency is not installed on the server."}), 500

    api_key = os.environ.get("NOMADICML_API_KEY")
    if not api_key:
        return jsonify({"ok": False, "error": "NOMADICML_API_KEY is not configured on the server."}), 500

    uploaded_file = request.files.get("file")
    if not uploaded_file:
        return jsonify({"ok": False, "error": "No file uploaded."}), 400

    dataset_name = (request.form.get("name") or uploaded_file.filename or "upload").strip()
    selected_category = (request.form.get("category") or "general-robotics").strip()
    dataset_description = (request.form.get("description") or "").strip()

    suffix = Path(uploaded_file.filename or dataset_name).suffix or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        uploaded_file.save(temp_file.name)
        temp_path = temp_file.name

    try:
        client = NomadicML(api_key=api_key)
        upload_result = client.upload(temp_path, folder="Robotics for Social Good Uploads")
        video_id = upload_result.get("video_id")
        if not video_id:
            return jsonify({"ok": False, "error": "Upload succeeded but no video_id was returned."}), 502

        analysis = client.analyze(
            video_id,
            analysis_type=AnalysisType.ASK,
            custom_event=CLASSIFICATION_PROMPT,
            timeout=2400,
        )

        summary = (analysis.get("summary") or "").strip()
        if dataset_description:
            summary = f"{summary}\n\nUploader note: {dataset_description}".strip()

        events = analysis.get("events") or []
        confidences = [float(event["confidence"]) for event in events if event.get("confidence") is not None]
        confidence = round(sum(confidences) / len(confidences) * 100) if confidences else 0
        category = infer_category(summary, selected_category)

        entry = build_result(
            filename=dataset_name,
            source="community-upload",
            summary=summary,
            events=events,
            confidence=confidence,
            category=category,
            raw_analysis=analysis,
            upload_metadata={
                "video_id": video_id,
                "upload_result": upload_result,
                "selected_category": selected_category,
                "description": dataset_description,
                "original_filename": uploaded_file.filename,
                "size_bytes": os.path.getsize(temp_path),
            },
        )
        save_to_supabase(entry)
        return jsonify({"ok": True, "entry": entry})
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass
