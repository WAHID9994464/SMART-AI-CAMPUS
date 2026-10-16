"""
Computer Vision and Camera router.
Supports image upload, demo analysis, and incident creation.
"""
import os
import json
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Camera, DetectionRecord, WasteIncident, Building
from app.config import UPLOAD_DIR
from app.services.cv_service import analyze_image

router = APIRouter(prefix="/cv", tags=["computer-vision"])


class CameraOut(BaseModel):
    id: int
    code: str
    name: str
    location: Optional[str]
    building_id: Optional[int]
    status: str
    last_seen: Optional[datetime]

    class Config:
        from_attributes = True


class DetectionOut(BaseModel):
    id: int
    camera_id: Optional[int]
    image_path: Optional[str]
    detections_json: Optional[str]
    processing_mode: str
    building_id: Optional[int]
    incident_created: bool
    recorded_at: datetime

    class Config:
        from_attributes = True


class CreateIncidentFromDetection(BaseModel):
    detection_id: int
    building_id: int
    severity: str = "medium"
    location_desc: Optional[str] = None


@router.get("/cameras", response_model=list[CameraOut])
def list_cameras(db: Session = Depends(get_db)):
    return db.query(Camera).all()


@router.get("/cameras/{camera_id}", response_model=CameraOut)
def get_camera(camera_id: int, db: Session = Depends(get_db)):
    c = db.query(Camera).filter(Camera.id == camera_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Camera not found")
    return c


@router.post("/detect")
async def detect_objects(
    file: UploadFile = File(...),
    camera_id: Optional[int] = Form(None),
    building_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    """Upload an image for waste/object detection."""
    # Validate file type
    ext = os.path.splitext(file.filename or "image.jpg")[1].lower() or ".jpg"
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp"}
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/jpg", "application/octet-stream"}
    if file.content_type not in allowed_types and ext not in allowed_exts:
        raise HTTPException(status_code=422, detail=f"Unsupported file type: {file.content_type}. Use JPEG or PNG.")

    # Validate file size (max 10 MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="File too large. Maximum size is 10 MB.")

    # Save uploaded file
    ext = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(UPLOAD_DIR, filename)
    with open(save_path, "wb") as f:
        f.write(content)

    # Run analysis
    result = analyze_image(save_path, content)

    # Save detection record
    record = DetectionRecord(
        camera_id=camera_id,
        image_path=save_path,
        detections_json=json.dumps(result["detections"]),
        processing_mode=result["processing_mode"],
        building_id=building_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "detection_id": record.id,
        "processing_mode": result["processing_mode"],
        "detections": result["detections"],
        "image_width": result.get("image_width"),
        "image_height": result.get("image_height"),
        "timestamp": record.recorded_at.isoformat(),
        "image_url": f"/api/cv/image/{filename}",
    }


@router.post("/incidents", response_model=dict)
def create_incident_from_detection(body: CreateIncidentFromDetection, db: Session = Depends(get_db)):
    record = db.query(DetectionRecord).filter(DetectionRecord.id == body.detection_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Detection record not found")
    if record.incident_created:
        raise HTTPException(status_code=409, detail="Incident already created for this detection")

    building = db.query(Building).filter(Building.id == body.building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    detections = json.loads(record.detections_json or "[]")
    categories = list({d.get("label", "general") for d in detections}) or ["general"]

    incident = WasteIncident(
        building_id=body.building_id,
        location_desc=body.location_desc or f"Camera detection — {building.name}",
        category=categories[0],
        severity=body.severity,
        fill_level=75.0,
        status="open",
        detection_record_id=record.id,
        notes=f"[CV DETECTION] {len(detections)} object(s) detected. Mode: {record.processing_mode}.",
    )
    db.add(incident)

    record.incident_created = True
    record.building_id = body.building_id

    if body.severity in ("high", "critical"):
        building.status = "critical" if body.severity == "critical" else "warning"
        building.updated_at = datetime.utcnow()

    db.commit()
    return {"incident_id": incident.id, "building_id": body.building_id}


@router.get("/detections", response_model=list[DetectionOut])
def list_detections(limit: int = 20, db: Session = Depends(get_db)):
    return (
        db.query(DetectionRecord)
        .order_by(DetectionRecord.recorded_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/image/{filename}")
async def serve_image(filename: str):
    """Serve uploaded images."""
    from fastapi.responses import FileResponse
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path) or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Image not found")
    # Basic path traversal guard
    abs_upload = os.path.abspath(UPLOAD_DIR)
    abs_path = os.path.abspath(path)
    if not abs_path.startswith(abs_upload):
        raise HTTPException(status_code=403, detail="Access denied")
    return FileResponse(abs_path)
