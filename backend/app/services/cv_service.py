"""
Computer Vision service.
Performs image analysis using OpenCV.
Falls back to a clearly-labelled demo mode when models are unavailable.
"""
import cv2
import numpy as np
from typing import Any


# Waste class labels for demo mode
WASTE_LABELS = [
    "plastic_bottle", "aluminium_can", "paper_cardboard", "general_waste", "food_waste"
]


def analyze_image(image_path: str, content: bytes | None = None) -> dict[str, Any]:
    """
    Analyze an image for waste objects.

    Returns:
        dict with keys:
            - processing_mode: "opencv" | "demo"
            - detections: list of detection dicts
            - image_width: int
            - image_height: int
    """
    try:
        # Decode image
        nparr = np.frombuffer(content, np.uint8) if content else None
        if nparr is not None:
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        else:
            img = cv2.imread(image_path)

        if img is None:
            raise ValueError("Could not decode image")

        h, w = img.shape[:2]

        # Real OpenCV analysis: color-based waste detection
        detections = _opencv_color_detection(img)
        mode = "opencv"

    except Exception as exc:
        # Fallback to demo
        detections = _demo_detections()
        mode = "demo"
        w, h = 640, 480

    return {
        "processing_mode": mode,
        "detections": detections,
        "image_width": w,
        "image_height": h,
    }


def _opencv_color_detection(img: np.ndarray) -> list[dict]:
    """
    Detect potential waste objects using HSV color segmentation.
    This is a heuristic demonstration, not a trained ML model.
    Detections are labelled with their processing method.
    """
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    detections = []

    # Define color ranges for common waste types
    color_ranges = [
        {
            "label": "plastic_bottle",
            "lower": np.array([100, 50, 50]),
            "upper": np.array([130, 255, 255]),
            "color_name": "blue",
        },
        {
            "label": "aluminium_can",
            "lower": np.array([0, 0, 150]),
            "upper": np.array([180, 30, 255]),
            "color_name": "silver/grey",
        },
        {
            "label": "general_waste",
            "lower": np.array([10, 100, 20]),
            "upper": np.array([30, 255, 200]),
            "color_name": "orange/brown",
        },
    ]

    detection_id = 1
    for cr in color_ranges:
        mask = cv2.inRange(hsv, cr["lower"], cr["upper"])
        # Morphological cleanup
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < 1000:  # skip tiny blobs
                continue
            x, y, bw, bh = cv2.boundingRect(cnt)
            confidence = min(0.95, area / (w * h) * 10)
            detections.append({
                "id": detection_id,
                "label": cr["label"],
                "confidence": round(confidence, 3),
                "bbox": {"x": int(x), "y": int(y), "width": int(bw), "height": int(bh)},
                "method": "opencv_color_segmentation",
            })
            detection_id += 1
            if detection_id > 10:
                break

    return detections


def _demo_detections() -> list[dict]:
    """
    Return clearly-labelled demo detections when real analysis is unavailable.
    Confidence scores are simulated and must not be treated as actual inference results.
    """
    import random
    random.seed(42)
    n = random.randint(1, 3)
    results = []
    for i in range(n):
        label = random.choice(WASTE_LABELS)
        x = random.randint(50, 400)
        y = random.randint(50, 300)
        results.append({
            "id": i + 1,
            "label": label,
            "confidence": None,  # No real confidence in demo mode
            "bbox": {"x": x, "y": y, "width": random.randint(60, 120), "height": random.randint(60, 120)},
            "method": "demo_simulation",
            "note": "This is a simulated detection result, not actual model inference.",
        })
    return results
