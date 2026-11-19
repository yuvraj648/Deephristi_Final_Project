"""
DeepDrishti HITL Fine-Tuning Script
Runs YOLOv8 fine-tuning on operator feedback samples.
Triggered automatically after FINETUNE_THRESHOLD samples via /finetune/trigger endpoint.

Usage (standalone):
    python scripts/finetune.py

Runs asynchronously as a subprocess from Flask — does NOT block the API server.
"""

import os
import sys
import shutil
import datetime
import json

# Ensure the model root is on the path so we can import save_feedback
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR   = os.path.abspath(os.path.join(SCRIPTS_DIR, '..'))
DATASETS_DIR = os.path.join(MODEL_DIR, 'datasets')
COUNT_FILE   = os.path.join(DATASETS_DIR, 'feedback_count.json')

# Minimum samples required before fine-tuning is worthwhile
FINETUNE_THRESHOLD = 10

def _read_count():
    if os.path.exists(COUNT_FILE):
        with open(COUNT_FILE, 'r') as f:
            return json.load(f)
    return {"total": 0, "positive": 0, "negative": 0, "last_finetune": None, "last_finetune_weights": None}


def _write_count(data):
    with open(COUNT_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def run_finetune(device='cuda'):
    """
    Fine-tune YOLOv8 on the accumulated feedback dataset.
    Saves new weights to models/best_feedback.pt
    Does NOT automatically replace models/best.pt — a human must promote it.
    """
    try:
        from ultralytics import YOLO
        import torch
    except ImportError as e:
        print(f"[finetune] ❌ Missing dependency: {e}")
        sys.exit(1)

    counts = _read_count()
    positive_count = len([
        f for f in os.listdir(os.path.join(DATASETS_DIR, 'positive'))
        if f.endswith('.jpg')
    ])
    negative_count = len([
        f for f in os.listdir(os.path.join(DATASETS_DIR, 'negative'))
        if f.endswith('.jpg')
    ])

    print(f"[finetune] 📊 Feedback dataset: {positive_count} positive, {negative_count} negative samples")

    if positive_count < 1:
        print("[finetune] ⚠️  No positive samples found — skipping fine-tune (need at least 1 annotated sample)")
        return False

    # Determine device
    if device == 'cuda' and not torch.cuda.is_available():
        print("[finetune] ⚠️  CUDA not available, falling back to CPU")
        device = 'cpu'

    base_model_path = os.path.join(MODEL_DIR, 'models', 'best.pt')
    if not os.path.exists(base_model_path):
        print(f"[finetune] ❌ Base model not found at {base_model_path}")
        return False

    feedback_yaml = os.path.join(DATASETS_DIR, 'feedback.yaml')
    if not os.path.exists(feedback_yaml):
        print(f"[finetune] ❌ feedback.yaml not found at {feedback_yaml}")
        return False

    run_name = f"feedback_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"[finetune] 🚀 Starting fine-tuning run: {run_name} on {device.upper()}")
    print(f"[finetune] 📁 Base model: {base_model_path}")
    print(f"[finetune] 📋 Dataset: {feedback_yaml}")

    try:
        model = YOLO(base_model_path)
        # We only run 10 epochs to avoid overfitting a small feedback dataset
        # batch=8 fits in 4GB VRAM (RTX 3050), or auto on CPU
        results = model.train(
            data=feedback_yaml,
            epochs=10,
            imgsz=640,
            device=device,
            batch=8,
            lr0=0.0005,          # Low LR to preserve base knowledge
            lrf=0.01,
            patience=5,          # Early stopping
            project=os.path.join(MODEL_DIR, 'runs', 'finetune'),
            name=run_name,
            exist_ok=True,
            plots=False,         # Save disk space
            save_period=-1,      # Only save best
            verbose=False
        )

        # Copy best weights to a versioned file
        best_src = os.path.join(str(results.save_dir), 'weights', 'best.pt')
        dest = os.path.join(MODEL_DIR, 'models', 'best_feedback.pt')
        if os.path.exists(best_src):
            shutil.copy2(best_src, dest)
            print(f"[finetune] ✅ Fine-tuning complete. New weights saved to: {dest}")
            print(f"[finetune] ℹ️  To promote: copy best_feedback.pt → best.pt and restart Flask")
        else:
            print(f"[finetune] ⚠️  best.pt not found at {best_src}")
            return False

        # Update feedback_count.json
        counts['last_finetune'] = datetime.datetime.now().isoformat()
        counts['last_finetune_weights'] = dest
        _write_count(counts)
        return True

    except Exception as e:
        print(f"[finetune] ❌ Training failed: {e}")
        import traceback; traceback.print_exc()
        return False


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--device', default='cuda', help='cuda or cpu')
    args = parser.parse_args()
    success = run_finetune(device=args.device)
    sys.exit(0 if success else 1)
