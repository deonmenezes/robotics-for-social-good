import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException, RequestEntityTooLarge

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

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


def get_nomadic_client():
    try:
        from nomadicml import AnalysisType, NomadicML
    except Exception as error:
        return None, None, str(error)

    api_key = os.environ.get("NOMADICML_API_KEY")
    if not api_key:
        return None, None, "NOMADICML_API_KEY is not configured on the server."

    return NomadicML(api_key=api_key), AnalysisType, None


def get_supabase_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        return None, "SUPABASE_URL or SUPABASE_KEY is not configured."

    try:
        from supabase import create_client
    except Exception as error:
        return None, str(error)

    return create_client(url, key), None


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
    client, error = get_supabase_client()
    if client is None:
        return error

    try:
        client.table("video_labels").upsert(entry, on_conflict="filename").execute()
        return None
    except Exception as exc:
        message = str(exc)
        if "raw_analysis" in message or "upload_metadata" in message:
            return "Supabase schema is missing raw_analysis/upload_metadata. Re-run supabase_setup.sql."
        return message


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


@app.get("/")
@app.get("/api/upload")
def health():
    _, _, nomadic_error = get_nomadic_client()
    supabase_client, supabase_error = get_supabase_client()
    return jsonify({
        "ok": True,
        "service": "upload",
        "nomadicml_available": nomadic_error is None,
        "supabase_available": supabase_client is not None,
        "has_nomadic_api_key": bool(os.environ.get("NOMADICML_API_KEY")),
        "has_supabase_url": bool(os.environ.get("SUPABASE_URL")),
        "has_supabase_key": bool(os.environ.get("SUPABASE_KEY")),
        "nomadicml_import_error": nomadic_error,
        "supabase_import_error": supabase_error,
    })


@app.post("/")
@app.post("/api/upload")
def upload():
    client, analysis_type, nomadic_error = get_nomadic_client()
    if client is None or analysis_type is None:
        return jsonify({
            "ok": False,
            "error": "Upload service dependency is not available on the server.",
            "details": nomadic_error,
        }), 500

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
        upload_result = client.upload(temp_path, folder="Robotics for Social Good Uploads")
        video_id = upload_result.get("video_id")
        if not video_id:
            return jsonify({"ok": False, "error": "Upload succeeded but no video_id was returned."}), 502

        analysis = client.analyze(
            video_id,
            analysis_type=analysis_type.ASK,
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

        supabase_error = save_to_supabase(entry)
        response = {"ok": True, "entry": entry}
        if supabase_error:
            response["supabase_warning"] = supabase_error
        return jsonify(response)
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass
