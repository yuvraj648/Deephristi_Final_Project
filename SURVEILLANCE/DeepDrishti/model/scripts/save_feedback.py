"""
DeepDrishti HITL (Human-in-the-Loop) Feedback Helper
Saves operator-confirmed/rejected frames to the feedback dataset
for YOLO fine-tuning.
"""

import os
import json
import shutil
import base64
import uuid
import datetime

DATASETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'datasets'))
POSITIVE_DIR = os.path.join(DATASETS_DIR, 'positive')
NEGATIVE_DIR = os.path.join(DATASETS_DIR, 'negative')
COUNT_FILE   = os.path.join(DATASETS_DIR, 'feedback_count.json')

# Class name → class index mapping (must match feedback.yaml nc)
CLASS_MAP = {
    'mine': 0, 'sea mine': 0, 'ordnance': 0, 'torpedo': 0,
    'submarine': 1, 'submersible': 1, 'uuv': 1,
    'human': 2, 'diver': 2, 'diver / personnel': 2, 'personnel': 2, 'swimmer': 2,
    'structure': 3, 'underwater structure': 3, 'pipeline': 3, 'pipe': 3,
    'trash': 4, 'marine debris': 4, 'debris': 4,
    'fish': 5, 'marine life': 5, 'dolphin': 5, 'whale': 5, 'turtle': 5,
}

os.makedirs(POSITIVE_DIR, exist_ok=True)
os.makedirs(NEGATIVE_DIR, exist_ok=True)


def _read_count():
    if os.path.exists(COUNT_FILE):
        with open(COUNT_FILE, 'r') as f:
            return json.load(f)
    return {"total": 0, "positive": 0, "negative": 0, "last_finetune": None, "last_finetune_weights": None}


def _write_count(data):
    with open(COUNT_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def get_feedback_count():
    return _read_count()


def _save_image_from_source(image_source, dest_dir, uid):
    """
    Accepts:
      - Absolute file path (string starting with / or a drive letter)
      - Flask /outputs/ URL path like '/outputs/lab_1234_abcd.jpg'
      - base64-encoded JPEG data URI
    Returns the saved path or None on failure.
    """
    dest_path = os.path.join(dest_dir, f"{uid}.jpg")

    # 1) Base64 data URI
    if isinstance(image_source, str) and image_source.startswith('data:image'):
        try:
            header, b64data = image_source.split(',', 1)
            img_bytes = base64.b64decode(b64data)
            with open(dest_path, 'wb') as f:
                f.write(img_bytes)
            return dest_path
        except Exception as e:
            print(f"[save_feedback] base64 decode error: {e}")
            return None

    # 2) Flask outputs path like '/outputs/lab_*.jpg'  → resolve to disk
    if isinstance(image_source, str) and image_source.startswith('/outputs/'):
        filename = image_source.split('/outputs/', 1)[1]
        flask_outputs = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'outputs'))
        full_path = os.path.join(flask_outputs, filename)
        if os.path.exists(full_path):
            shutil.copy2(full_path, dest_path)
            return dest_path

    # 3) Absolute file path
    if isinstance(image_source, str) and os.path.exists(image_source):
        shutil.copy2(image_source, dest_path)
        return dest_path

    print(f"[save_feedback] Could not resolve image source: {str(image_source)[:80]}")
    return None


def save_negative(image_source):
    """
    Save a false-positive frame as a background (negative) sample.
    No label file — YOLO treats images without labels as background.
    Returns updated count dict.
    """
    uid = uuid.uuid4().hex[:12]
    saved = _save_image_from_source(image_source, NEGATIVE_DIR, uid)
    counts = _read_count()
    if saved:
        counts['negative'] += 1
        counts['total'] += 1
        _write_count(counts)
        print(f"[HITL] ✅ Saved negative sample: {saved}  (total={counts['total']})")
    else:
        print(f"[HITL] ⚠️  Could not save negative sample.")
    return counts


def save_positive(image_source, bbox_norm, class_name, image_w=640, image_h=640):
    """
    Save a confirmed-threat frame + YOLO label file as a positive sample.

    bbox_norm: normalized [x1, y1, x2, y2] in 0–1 range, or pixel [x1, y1, x2, y2]
    class_name: raw class name string (looked up in CLASS_MAP)
    Returns updated count dict.
    """
    uid = uuid.uuid4().hex[:12]
    saved = _save_image_from_source(image_source, POSITIVE_DIR, uid)
    counts = _read_count()

    if saved:
        cls_idx = CLASS_MAP.get(str(class_name).lower().strip(), 5)

        # Convert to YOLO format: class cx cy w h (all 0–1)
        try:
            x1, y1, x2, y2 = [float(v) for v in bbox_norm[:4]]
            # If values look like pixel coords, normalise
            if x1 > 1.5 or y1 > 1.5 or x2 > 1.5 or y2 > 1.5:
                x1 /= image_w; y1 /= image_h; x2 /= image_w; y2 /= image_h
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2
            bw = abs(x2 - x1)
            bh = abs(y2 - y1)
            label_line = f"{cls_idx} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}"
        except Exception as e:
            print(f"[HITL] BBox parse error: {e}. Saving with centre-fill label.")
            label_line = f"{cls_idx} 0.500000 0.500000 0.500000 0.500000"

        label_path = os.path.join(POSITIVE_DIR, f"{uid}.txt")
        with open(label_path, 'w') as lf:
            lf.write(label_line + '\n')

        counts['positive'] += 1
        counts['total'] += 1
        _write_count(counts)
        print(f"[HITL] ✅ Saved positive sample: {saved}  label={label_line}  (total={counts['total']})")
    else:
        print(f"[HITL] ⚠️  Could not save positive sample.")

    return counts
