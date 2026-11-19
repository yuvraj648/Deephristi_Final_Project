import os
import sys
import json
import time
import uuid
import subprocess
try:
    import imageio_ffmpeg
except ImportError:
    imageio_ffmpeg = None

# Reconfigure stdout and stderr for UTF-8 to prevent charmap crashes on Windows
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

import torch
import cv2
import numpy as np

# Set OpenCV FFMPEG socket timeout to 5 seconds to prevent hanging on dropped streams
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "timeout;5000000"

from flask import Flask, request, jsonify, send_from_directory
try:
    from flask.json.provider import DefaultJSONProvider
except Exception:
    DefaultJSONProvider = None
try:
    from flask.json import JSONEncoder
except Exception:
    JSONEncoder = None
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
import torchvision.transforms as transforms
from ultralytics import YOLO
from skimage.metrics import peak_signal_noise_ratio, structural_similarity
import requests
from io import BytesIO
import yt_dlp

# Import the FUNIE-GAN model architecture
try:
    from models.funie_gan import GeneratorSmall
except ImportError:
    import torch.nn as nn
    class GeneratorSmall(nn.Module):
        def __init__(self):
            super().__init__()
            def down(in_c, out_c, norm=True):
                layers = [nn.Conv2d(in_c, out_c, 4, 2, 1)]
                if norm: layers.append(nn.BatchNorm2d(out_c))
                layers.append(nn.LeakyReLU(0.2))
                return nn.Sequential(*layers)
            def up(in_c, out_c):
                return nn.Sequential(
                    nn.ConvTranspose2d(in_c, out_c, 4, 2, 1),
                    nn.BatchNorm2d(out_c),
                    nn.ReLU()
                )
            self.d1 = down(3, 64, False)
            self.d2 = down(64, 128)
            self.d3 = down(128, 256)
            self.u1 = up(256, 128)
            self.u2 = up(256, 64)
            self.final = nn.ConvTranspose2d(128, 3, 4, 2, 1)
        def forward(self, x):
            d1 = self.d1(x)
            d2 = self.d2(d1)
            d3 = self.d3(d2)
            u1 = self.u1(d3)
            u2 = self.u2(torch.cat([u1, d2], 1))
            return torch.tanh(self.final(torch.cat([u2, d1], 1)))

# Custom JSON provider/encoder to handle numpy types across Flask versions
if DefaultJSONProvider is not None:
    class NpJSONProvider(DefaultJSONProvider):
        def default(self, obj):
            if isinstance(obj, np.integer):
                return int(obj)
            if isinstance(obj, np.floating):
                return float(obj)
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            return super().default(obj)

    app = Flask(__name__)
    app.json = NpJSONProvider(app)
else:
    class NpEncoder(JSONEncoder):
        def default(self, obj):
            if isinstance(obj, np.integer):
                return int(obj)
            if isinstance(obj, np.floating):
                return float(obj)
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            return super().default(obj)

    app = Flask(__name__)
    app.json_encoder = NpEncoder
CORS(app)

# -------------------- CONFIG --------------------
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'tiff', 'bmp'}
FUNIE_MODEL_PATH = 'models/funie_final_improved.pth'
YOLO_MODEL_PATH = 'models/best.pt'

# --- Device selection: GPU preferred, CPU fallback ---
if torch.cuda.is_available():
    DEVICE = torch.device('cuda')
    _gpu_name = torch.cuda.get_device_name(0)
    _gpu_mem  = round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 1)
    print(f"🟢 GPU detected: {_gpu_name} ({_gpu_mem} GB VRAM) — all models will run on CUDA", flush=True)
else:
    DEVICE = torch.device('cpu')
    print("🟡 No CUDA GPU detected — all models will run on CPU", flush=True)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# -------------------- MODEL LOAD --------------------
print(f"🔄 Loading surveillance models on device: {DEVICE} ...", flush=True)

# 1. Load FUNIE-GAN
try:
    funie_model = GeneratorSmall().to(DEVICE)
    _ckpt = torch.load(FUNIE_MODEL_PATH, map_location=DEVICE)
    if isinstance(_ckpt, dict) and 'state_dict' in _ckpt:
        _ckpt = _ckpt['state_dict']
    if isinstance(_ckpt, dict):
        _ckpt = {
            (k.replace('module.', '') if isinstance(k, str) else k): v for k, v in _ckpt.items()
        }
    funie_model.load_state_dict(_ckpt, strict=False)
    funie_model.eval()
    print(f"✅ FUNIE-GAN loaded on {DEVICE}", flush=True)
except Exception as e:
    print(f"❌ FUNIE-GAN loading failed: {e}", flush=True)
    funie_model = None

# 2. Load YOLO — explicitly set device so it runs on GPU when available
try:
    yolo_model = YOLO(YOLO_MODEL_PATH)
    # Move YOLO to the selected device (CUDA or CPU)
    yolo_model.to(DEVICE)
    print(f"✅ YOLO loaded on {DEVICE}", flush=True)
except Exception as e:
    print(f"❌ YOLO loading failed: {e}", flush=True)
    yolo_model = None

# 3. Load MiDaS
try:
    midas = torch.hub.load("intel-isl/MiDaS", "MiDaS_small", trust_repo=True)
    midas.to(DEVICE)
    midas.eval()
    midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms", trust_repo=True)
    midas_transform = midas_transforms.small_transform
    print(f"✅ MiDaS loaded on {DEVICE}", flush=True)
except Exception as e:
    print(f"❌ MiDaS loading failed: {e}", flush=True)
    midas = None

print(f"📊 Model load summary → FUNIE-GAN: {'✅' if funie_model else '❌'}  YOLO: {'✅' if yolo_model else '❌'}  MiDaS: {'✅' if midas else '❌'}  Device: {DEVICE}", flush=True)

# -------------------- HELPERS --------------------
danger_map = {
    "human": "DANGER",
    "mine": "DANGER",
    "submarine": "DANGER",
    "structure": "NEUTRAL",
    "fish": "SAFE",
    "trash": "NEUTRAL"
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def denorm(x):
    """Denormalize from [-1, 1] to [0, 1] with extra contrast stretching"""
    out = (x + 1.0) / 2.0
    return out.clamp(0, 1)

def apply_color_balance(img):
    """Simple Auto White Balance/Color stretching for underwater images"""
    # Separate channels
    b, g, r = cv2.split(img)
    # Apply CLAHE to each channel
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    b = clahe.apply(b)
    g = clahe.apply(g)
    r = clahe.apply(r)
    return cv2.merge((b, g, r))

def unsharp_mask(img_bgr, amount=1.2, radius=1.2, threshold=2):
    """Sharpen after upscaling to counter FUNIE 256px blur."""
    blurred = cv2.GaussianBlur(img_bgr, (0, 0), radius)
    sharpened = cv2.addWeighted(img_bgr, 1 + amount, blurred, -amount, 0)
    if threshold > 0:
        low_contrast_mask = np.abs(img_bgr.astype(np.int16) - blurred.astype(np.int16)) < threshold
        sharpened[low_contrast_mask] = img_bgr[low_contrast_mask]
    return sharpened

def _pad_to_multiple(img_bgr, mult=32, border_value=(0, 0, 0)):
    h, w = img_bgr.shape[:2]
    pad_h = (mult - (h % mult)) % mult
    pad_w = (mult - (w % mult)) % mult
    top = pad_h // 2
    bottom = pad_h - top
    left = pad_w // 2
    right = pad_w - left
    padded = cv2.copyMakeBorder(
        img_bgr,
        top,
        bottom,
        left,
        right,
        borderType=cv2.BORDER_REFLECT_101,
    )
    return padded, (top, bottom, left, right)

def _unpad(img_bgr, pads):
    top, bottom, left, right = pads
    h, w = img_bgr.shape[:2]
    return img_bgr[top : h - bottom, left : w - right]

def compute_uiqm(img):
    img = img.astype(np.float32) / 255.0
    gray = cv2.cvtColor((img*255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
    uism = np.mean(np.abs(cv2.Sobel(gray, cv2.CV_64F, 1, 1))) / 255.0
    uiconm = np.std(gray) / 255.0
    return 0.3 * uism + 3.5 * uiconm

def estimate_distance(depth_map, x1, y1, x2, y2):
    region = depth_map[y1:y2, x1:x2]
    if region.size == 0: return 0.5
    return np.mean(region)

def _is_probably_video_source(s):
    if not s:
        return False
    u = str(s).lower().strip()
    return any(
        u.endswith(ext)
        for ext in (
            '.mp4',
            '.mov',
            '.avi',
            '.mkv',
            '.webm',
            '.m3u8',
        )
    )

def _read_frame_from_video(source, frame_time_ms=1000):
    try:
        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            return None
        try:
            if frame_time_ms is not None:
                cap.set(cv2.CAP_PROP_POS_MSEC, float(frame_time_ms))
            ok, frame = cap.read()
            if not ok:
                cap.set(cv2.CAP_PROP_POS_MSEC, 0)
                ok, frame = cap.read()
            return frame if ok else None
        finally:
            cap.release()
    except Exception as e:
        print(f"⚠️ Video frame capture error from {source}: {e}", flush=True)
        return None

def _load_cv_image_from_url(url):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    resp = requests.get(url, headers=headers, timeout=10)
    resp.raise_for_status()
    nparr = np.frombuffer(resp.content, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def _get_youtube_url(url):
    try:
        ydl_opts = {
            'format': 'bestvideo[height<=720]/bestvideo/best',
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
            'ignoreerrors': True,
            'socket_timeout': 5,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info and isinstance(info, dict):
                return info.get('url')
            return None
    except BaseException as e:
        print(f"❌ Failed to extract YouTube URL: {e}", flush=True)
        return None

# -------------------- API ENDPOINTS --------------------

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "models": {
            "funie": funie_model is not None,
            "yolo": yolo_model is not None,
            "midas": midas is not None
        },
        "device": str(DEVICE),
        "cuda_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
    })

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "DeepDrishti AI Pipeline",
        "endpoints": ["/health", "/pipeline", "/outputs/<filename>"],
    })

@app.route('/pipeline', methods=['POST'])
@app.route('/enhance', methods=['POST'])
def pipeline():
    start_time = time.time()
    img_cv = None

    if 'image' in request.files or 'file' in request.files:
        file = request.files.get('image') or request.files.get('file')
        nparr = np.frombuffer(file.read(), np.uint8)
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    elif request.is_json:
        url = request.json.get('url') or request.json.get('frameUrl')
        video_path = request.json.get('videoPath')

        print(f"📥 Processing request for URL: {url}, VideoPath: {video_path}")

        if video_path:
            img_cv = _read_frame_from_video(video_path)
        elif url:
            # Check if it's a relative path first
            if isinstance(url, str) and (url.startswith('/') or url.startswith('videos/')) and _is_probably_video_source(url):
                # Try to map to the project's public folder
                possible_paths = [
                    os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', url.lstrip('/'))),
                    os.path.abspath(os.path.join(os.getcwd(), '..', 'frontend', 'public', url.lstrip('/'))),
                    os.path.abspath(os.path.join(os.getcwd(), 'frontend', 'public', url.lstrip('/'))),
                    url
                ]
                for p in possible_paths:
                    if os.path.exists(p):
                        print(f"📁 Found local video file at: {p}")
                        img_cv = _read_frame_from_video(p)
                        if img_cv is not None:
                            break
                if img_cv is None:
                    print(f"⚠️ Could not find local video file in any of: {possible_paths}")

            if img_cv is None and isinstance(url, str) and (url.startswith('http') or url.startswith('https')):
                # Handle YouTube URLs
                if any(x in url for x in ['youtube.com', 'youtu.be', 'youtube-nocookie.com']):
                    print(f"📺 Extracting YouTube stream for: {url}", flush=True)
                    video_id = None
                    if '/embed/' in url:
                        video_id = url.split('/embed/')[1].split('?')[0].split('&')[0]
                    elif '/live/' in url:
                        video_id = url.split('/live/')[1].split('?')[0].split('&')[0]
                    elif 'youtu.be/' in url:
                        video_id = url.split('youtu.be/')[1].split('?')[0].split('&')[0]
                    elif 'v=' in url:
                        video_id = url.split('v=')[1].split('&')[0].split('?')[0]

                    clean_url = f"https://www.youtube.com/watch?v={video_id}" if video_id else url
                    yt_stream_url = _get_youtube_url(clean_url)
                    if yt_stream_url:
                        img_cv = _read_frame_from_video(yt_stream_url)

                    if img_cv is None and video_id:
                        try:
                            thumb_url = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
                            print(f"🖼️ Fallback to YouTube snapshot: {thumb_url}", flush=True)
                            img_cv = _load_cv_image_from_url(thumb_url)
                        except Exception as e:
                            print(f"⚠️ Snapshot fetch failed: {e}", flush=True)
                
                if img_cv is None and _is_probably_video_source(url):
                    print(f"🌐 Opening direct video stream: {url}", flush=True)
                    img_cv = _read_frame_from_video(url)
                
                if img_cv is None and not any(k in url.lower() for k in ['youtube.com', 'youtu.be']):
                    # Fallback: treat as an image URL
                    try:
                        print(f"🖼️ Loading as image URL: {url}")
                        img_cv = _load_cv_image_from_url(url)
                    except Exception as e:
                        print(f"❌ Failed to load image from URL {url}: {e}")
                        img_cv = None
            elif img_cv is None and isinstance(url, str) and os.path.exists(url):
                 print(f"📁 Opening local path: {url}")
                 if allowed_file(url):
                     img_cv = cv2.imread(url)
                 if img_cv is None:
                     img_cv = _read_frame_from_video(url)

    if img_cv is None:
        return jsonify({"error": "No image provided"}), 400

    H, W = img_cv.shape[:2]
    img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)

    # 1. FUNIE-GAN Enhancement
    enhanced_cv = img_cv
    metrics = {}
    if funie_model:
        # FUNIE-GAN is fully-convolutional; running at higher res reduces blur from 256x256.
        # We upscale, pad to multiple-of-32 for stable down/up sampling, run GAN, then unpad.
        max_short_side = 512
        short_side = min(H, W)
        scale = 1.0
        if short_side < max_short_side:
            scale = max_short_side / float(short_side)
        # Cap scaling to avoid extremely large tensors
        scale = min(scale, 2.0)
        proc_w = int(round(W * scale))
        proc_h = int(round(H * scale))

        proc_bgr = cv2.resize(img_cv, (proc_w, proc_h), interpolation=cv2.INTER_LANCZOS4)
        proc_bgr, pads = _pad_to_multiple(proc_bgr, mult=32)
        proc_rgb = cv2.cvtColor(proc_bgr, cv2.COLOR_BGR2RGB)

        transform_pipe = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
        ])
        input_tensor = transform_pipe(Image.fromarray(proc_rgb)).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            fake = funie_model(input_tensor)

        enhanced_rgb = denorm(fake[0]).cpu().permute(1, 2, 0).numpy()
        enhanced_rgb = (enhanced_rgb * 255).astype(np.uint8)

        # Convert back, unpad and resize to original
        enhanced_proc = cv2.cvtColor(enhanced_rgb, cv2.COLOR_RGB2BGR)
        enhanced_proc = _unpad(enhanced_proc, pads)
        enhanced_proc = apply_color_balance(enhanced_proc)
        enhanced_cv = cv2.resize(enhanced_proc, (W, H), interpolation=cv2.INTER_LANCZOS4)

        # Preserve details: blend more of the original and sharpen
        enhanced_cv = cv2.addWeighted(img_cv, 0.55, enhanced_cv, 0.45, 0)
        enhanced_cv = unsharp_mask(enhanced_cv, amount=1.35, radius=1.0, threshold=1)
        
        # Re-sync for metrics calculation
        enhanced_rgb_resized = cv2.cvtColor(enhanced_cv, cv2.COLOR_BGR2RGB)
        
        metrics['psnr'] = round(float(peak_signal_noise_ratio(img_rgb, enhanced_rgb_resized)), 2)
        metrics['ssim'] = round(float(structural_similarity(img_rgb, enhanced_rgb_resized, channel_axis=2)), 3)
        metrics['uiqm'] = round(float(compute_uiqm(enhanced_rgb)), 3)

    # 2. MiDaS Monocular Depth Estimation
    depth_map = None
    depth_unavailable_reason = None
    if midas:
        try:
            input_batch = midas_transform(enhanced_cv).to(DEVICE)
            with torch.no_grad():
                depth = midas(input_batch)
                depth = torch.nn.functional.interpolate(
                    depth.unsqueeze(1), size=(H, W), mode="bicubic", align_corners=False
                ).squeeze().cpu().numpy()
            depth_min, depth_max = depth.min(), depth.max()
            depth_map = (depth - depth_min) / (depth_max - depth_min + 1e-6)
            
            # Compute full-frame MiDaS depth metrics
            metrics['depth'] = {
                "min_distance_m": round(float((1.0 - float(depth_map.max())) * 15.0), 1),
                "max_distance_m": round(float((1.0 - float(depth_map.min())) * 15.0), 1),
                "avg_distance_m": round(float((1.0 - float(depth_map.mean())) * 15.0), 1),
                "status": "OPERATIONAL"
            }
        except Exception as depth_err:
            depth_unavailable_reason = str(depth_err)
            print(f"⚠️ MiDaS depth computation warning: {depth_err}", flush=True)
            depth_map = None
            metrics['depth'] = {"status": "UNAVAILABLE", "reason": depth_unavailable_reason}
    else:
        depth_unavailable_reason = "MiDaS model not loaded"
        metrics['depth'] = {"status": "UNAVAILABLE", "reason": depth_unavailable_reason}

    # 3. YOLO Detection
    detections = []
    if yolo_model:
        # Determine confidence threshold from request
        req_conf = None
        if request.is_json:
            req_conf = request.json.get('conf') or request.json.get('threshold') or request.json.get('confidenceThreshold')
        elif 'conf' in request.form:
            req_conf = request.form.get('conf')
        elif 'threshold' in request.form:
            req_conf = request.form.get('threshold')
        
        try:
            base_conf = float(req_conf) if req_conf is not None else 0.45
        except (ValueError, TypeError):
            base_conf = 0.45
        base_conf = max(0.15, min(0.95, base_conf))

        # Class-specific default minimum threshold rules to eliminate seabed / coral / water noise
        CLASS_MIN_CONF = {
            'mine': 0.40,        # Sea mines
            'submarine': 0.40,   # Submarines
            'human': 0.35,       # Diver/human
            'structure': 0.35,   # Underwater pipes/structures
            'trash': 0.35,       # Marine debris
            'fish': 0.30,        # Marine life
        }

        # If user explicitly requested a confidence (e.g. from the UI slider), honor their slider value
        is_user_slider = req_conf is not None

        # Predict with IoU threshold 0.45 to suppress redundant duplicate boxes
        results = yolo_model.predict(
            enhanced_cv,
            conf=min(base_conf, 0.25),
            iou=0.45,
            verbose=False
        )[0]

        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            name = yolo_model.names.get(cls_id, 'unknown')
            lower_name = name.lower()

            # If user explicitly adjusted the slider, respect it; otherwise use class minimum default
            if is_user_slider:
                effective_thresh = base_conf
            else:
                effective_thresh = max(base_conf, CLASS_MIN_CONF.get(lower_name, 0.35))

            if conf < effective_thresh:
                continue

            # Geometry & aspect ratio guards against false positives on seabed/coral/water
            box_w = max(1, x2 - x1)
            box_h = max(1, y2 - y1)
            aspect_ratio = max(box_w / box_h, box_h / box_w)
            box_area = box_w * box_h
            image_area = max(1, W * H)
            area_ratio = box_area / image_area

            # Discard obvious full-frame background false positives (>98% of image area) with low confidence
            if area_ratio > 0.98 and conf < 0.50:
                continue

            # Discard microscopic noise / speck artifacts (< 0.05% of image area) with borderline confidence
            if area_ratio < 0.0005 and conf < 0.60:
                continue

            # Sea mines are round/spherical or tethered cylinders. Coral branches and reef shelves are elongated ribbons or wide fans with aspect ratios > 2.2.
            if "mine" in lower_name:
                if aspect_ratio > 2.2 and conf < 0.68:
                    continue

            # Submarines are elongated horizontally or distinct hulls
            if "sub" in lower_name:
                if (box_h / box_w) > 2.5 and conf < 0.70:
                    continue
            
            # Map YOLO classes to specific marine threat labels
            display_name = name.upper()
            if any(k in lower_name for k in ["mine", "ordnance", "torpedo", "weapon"]):
                display_name = "SEA MINE"
            elif any(k in lower_name for k in ["sub", "submarine", "uuv"]):
                display_name = "SUBMERSIBLE"
            elif any(k in lower_name for k in ["human", "diver", "swimmer"]):
                display_name = "DIVER / PERSONNEL"
            elif any(k in lower_name for k in ["structure", "pipe", "pipeline"]):
                display_name = "UNDERWATER STRUCTURE"
            elif any(k in lower_name for k in ["trash", "debris"]):
                display_name = "MARINE DEBRIS"
            elif any(k in lower_name for k in ["fish", "dolphin", "whale", "turtle", "marine_life"]):
                display_name = "MARINE LIFE"
            
            # Distance estimation using normalized depth map (higher value = closer)
            depth_val = estimate_distance(depth_map, x1, y1, x2, y2) if depth_map is not None else 0.5
            distance_m = round(float((1.0 - depth_val) * 15.0), 1) 
            
            # Threat status logic
            # Only assign 'DANGER' if the threat class has solid confidence (>= 0.50)
            status = "NEUTRAL"
            if any(k in lower_name for k in ["mine", "ordnance", "torpedo", "weapon"]):
                status = "DANGER" if conf >= 0.50 else "WARNING"
            elif any(k in lower_name for k in ["sub", "submarine", "uuv"]):
                status = "DANGER" if conf >= 0.50 else "WARNING"
            elif any(k in lower_name for k in ["human", "diver", "swimmer"]):
                status = "DANGER" if conf >= 0.50 else "WARNING"
            elif any(k in lower_name for k in ["fish", "dolphin", "whale", "turtle", "marine_life"]):
                status = "SAFE"
            elif any(k in lower_name for k in ["rock", "reef", "coral", "anchor"]):
                status = "SAFE"
            elif any(k in lower_name for k in ["structure", "pipe", "pipeline"]):
                status = "NEUTRAL"
            elif any(k in lower_name for k in ["trash", "debris"]):
                status = "NEUTRAL"
            
            norm_bbox = [
                round(x1 / max(1, W), 4),
                round(y1 / max(1, H), 4),
                round(x2 / max(1, W), 4),
                round(y2 / max(1, H), 4)
            ]
            
            detections.append({
                "class": display_name,
                "raw_class": name,
                "confidence": round(conf, 2),
                "bbox": [x1, y1, x2, y2],
                "normalized_bbox": norm_bbox,
                "status": status,
                "distance_m": distance_m,
                "models_used": ["FUNIE-GAN", "YOLOv8", "MiDaS"]
            })

    # Save Output
    # Only save to disk if file was uploaded or save_output is explicitly True.
    # Continuous background video stream queries do NOT write spam JPEGs to disk.
    save_output = True
    if request.is_json:
        save_output = bool(request.json.get('save_output', False))
    elif 'save_output' in request.form:
        save_output = request.form.get('save_output', 'true').lower() in ('true', '1')

    out_filename = None
    enhanced_image_path = None
    depth_image_path = None
    if save_output:
        unique_token = uuid.uuid4().hex[:12]
        timestamp = int(time.time())
        out_filename = f"lab_{timestamp}_{unique_token}.jpg"
        out_path = os.path.join(OUTPUT_FOLDER, out_filename)
        cv2.imwrite(out_path, enhanced_cv)
        enhanced_image_path = f"/outputs/{out_filename}"

        if depth_map is not None:
            depth_vis = (depth_map * 255).astype(np.uint8)
            depth_colored = cv2.applyColorMap(depth_vis, cv2.COLORMAP_INFERNO)
            depth_filename = f"depth_{timestamp}_{unique_token}.jpg"
            depth_path = os.path.join(OUTPUT_FOLDER, depth_filename)
            cv2.imwrite(depth_path, depth_colored)
            depth_image_path = f"/outputs/{depth_filename}"

    return jsonify({
        "success": True,
        "data": {
            "enhanced_image_path": enhanced_image_path,
            "depth_image_path": depth_image_path,
            "output_filename": out_filename,
            "image_width": int(enhanced_cv.shape[1]) if enhanced_cv is not None else None,
            "image_height": int(enhanced_cv.shape[0]) if enhanced_cv is not None else None,
            "metrics": metrics,
            "detections": detections,
            "depth_available": depth_map is not None,
            "processing_time_ms": round((time.time() - start_time) * 1000, 2),
            "model_device": str(DEVICE)
        }
    })

@app.route('/outputs/<path:filename>')
def serve_output(filename):
    response = send_from_directory(OUTPUT_FOLDER, filename)
    # Video files require range caching so Chrome and Safari media pipelines can buffer, seek, and stream
    if filename.lower().endswith(('.mp4', '.mov', '.webm', '.mkv')):
        response.headers['Cache-Control'] = 'public, max-age=86400, no-transform'
        response.headers['Accept-Ranges'] = 'bytes'
    else:
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

@app.route('/render-video', methods=['POST'])
def render_video():
    """
    Renders an entire input video file into a continuous enhanced MP4 file
    with color/contrast enhancement, YOLO threat bounding boxes, and tactical HUD.
    """
    start_time = time.time()
    input_video_path = None
    temp_input = False

    if 'file' in request.files or 'video' in request.files:
        f = request.files.get('file') or request.files.get('video')
        ext = os.path.splitext(secure_filename(f.filename))[1] or '.mp4'
        input_video_path = os.path.join(UPLOAD_FOLDER, f"input_render_{uuid.uuid4().hex[:8]}{ext}")
        f.save(input_video_path)
        temp_input = True
    elif request.is_json:
        url = request.json.get('url')
        video_path = request.json.get('videoPath')
        if video_path and os.path.exists(video_path):
            input_video_path = video_path
        elif url:
            if any(k in str(url) for k in ['youtube.com', 'youtu.be']):
                print(f"📺 Extracting YouTube stream for batch render: {url}", flush=True)
                video_id = None
                if '/embed/' in url:
                    video_id = url.split('/embed/')[1].split('?')[0].split('&')[0]
                elif '/live/' in url:
                    video_id = url.split('/live/')[1].split('?')[0].split('&')[0]
                elif 'youtu.be/' in url:
                    video_id = url.split('youtu.be/')[1].split('?')[0].split('&')[0]
                elif 'v=' in url:
                    video_id = url.split('v=')[1].split('&')[0].split('?')[0]
                clean_url = f"https://www.youtube.com/watch?v={video_id}" if video_id else url
                input_video_path = _get_youtube_url(clean_url)
            else:
                possible = [
                    os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', url.lstrip('/'))),
                    os.path.abspath(os.path.join(os.getcwd(), '..', 'frontend', 'public', url.lstrip('/'))),
                    url
                ]
                for p in possible:
                    if os.path.exists(p):
                        input_video_path = p
                        break

    if not input_video_path or (not str(input_video_path).startswith('http') and not os.path.exists(input_video_path)):
        return jsonify({"error": "No valid video file or stream provided"}), 400

    cap = cv2.VideoCapture(input_video_path)
    if not cap.isOpened():
        return jsonify({"error": "Failed to open video source"}), 400

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0 or total_frames > 100000:
        total_frames = 150  # Default cap for live streams
    orig_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    if orig_fps <= 0 or orig_fps > 120:
        orig_fps = 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480

    unique_token = uuid.uuid4().hex[:8]
    timestamp = int(time.time())
    out_filename = f"rendered_tactical_{timestamp}_{unique_token}.mp4"
    out_path = os.path.join(OUTPUT_FOLDER, out_filename)
    raw_path = os.path.join(OUTPUT_FOLDER, f"temp_raw_{out_filename}")

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out_writer = cv2.VideoWriter(raw_path, fourcc, orig_fps, (width, height))

    frame_idx = 0
    total_detections_count = 0
    max_frames = min(total_frames, 900)

    while frame_idx < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        enhanced = apply_color_balance(frame)
        enhanced = unsharp_mask(enhanced, amount=1.1, radius=1.0, threshold=1)

        if yolo_model:
            results = yolo_model.predict(enhanced, conf=0.30, iou=0.45, verbose=False)[0]
            for box in results.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                name = yolo_model.names.get(cls_id, 'unknown').upper()
                color = (0, 0, 255) if name in ['MINE', 'SUBMARINE', 'HUMAN'] else (0, 255, 0) if name in ['FISH'] else (0, 212, 255)
                cv2.rectangle(enhanced, (x1, y1), (x2, y2), color, 2)
                label_text = f"{name} {int(conf*100)}%"
                cv2.rectangle(enhanced, (x1, max(0, y1 - 18)), (x1 + len(label_text)*9, y1), color, -1)
                cv2.putText(enhanced, label_text, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)
                total_detections_count += 1

        cv2.putText(enhanced, f"DEEP-DRISHTI AI | FRAME {frame_idx}/{total_frames}", (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 212, 255), 1, cv2.LINE_AA)
        out_writer.write(enhanced)
        frame_idx += 1

    cap.release()
    out_writer.release()

    # Transcode to web-standard H.264 (yuv420p) with faststart MP4 header for seamless Chrome playback
    transcode_success = False
    try:
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        cmd = [
            ffmpeg_exe, "-y",
            "-i", raw_path,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-preset", "veryfast",
            out_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0 and os.path.exists(out_path):
            transcode_success = True
            if os.path.exists(raw_path):
                os.remove(raw_path)
    except Exception as e:
        print(f"⚠️ H.264 transcode error: {e}", flush=True)

    if not transcode_success:
        if os.path.exists(raw_path):
            os.replace(raw_path, out_path)

    if temp_input and os.path.exists(input_video_path):
        try: os.remove(input_video_path)
        except Exception: pass

    return jsonify({
        "success": True,
        "data": {
            "video_url": f"/outputs/{out_filename}",
            "filename": out_filename,
            "processed_frames": frame_idx,
            "total_detections": total_detections_count,
            "processing_time_s": round(time.time() - start_time, 2),
            "model_device": str(DEVICE)
        }
    })

# -------------------- HITL ACTIVE LEARNING ENDPOINTS --------------------
# These endpoints let the Node backend save operator feedback frames and
# trigger background fine-tuning after FINETUNE_THRESHOLD samples.

FINETUNE_THRESHOLD = 10  # Trigger re-training after this many total feedback items
_finetune_process = None  # Track the background fine-tune subprocess

def _get_feedback_module():
    """Lazy-import save_feedback so app starts even if scripts dir is missing."""
    import importlib.util, sys
    scripts_dir = os.path.join(os.path.dirname(__file__), 'scripts')
    spec = importlib.util.spec_from_file_location("save_feedback", os.path.join(scripts_dir, "save_feedback.py"))
    if spec is None:
        return None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def _maybe_trigger_finetune(counts):
    """Spawn background fine-tune if threshold met and no run is active."""
    global _finetune_process
    if counts.get('total', 0) < FINETUNE_THRESHOLD:
        return
    if _finetune_process is not None and _finetune_process.poll() is None:
        print("[HITL] Fine-tune already running in background — skipping trigger.", flush=True)
        return
    scripts_dir = os.path.join(os.path.dirname(__file__), 'scripts')
    finetune_script = os.path.join(scripts_dir, 'finetune.py')
    python_exe = sys.executable
    device_arg = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"[HITL] 🚀 Triggering background fine-tune on {device_arg.upper()} ...", flush=True)
    _finetune_process = subprocess.Popen(
        [python_exe, finetune_script, '--device', device_arg],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=os.path.dirname(__file__)
    )

@app.route('/feedback/negative', methods=['POST'])
def feedback_negative():
    """
    Mark a detection frame as a false positive (background sample).
    Body (JSON): { "image_source": "/outputs/lab_xxx.jpg" | "<base64 data URI>" | "abs path" }
    """
    data = request.get_json(force=True, silent=True) or {}
    image_source = data.get('image_source') or data.get('snapshotPath') or data.get('enhancedImage')
    if not image_source:
        return jsonify({"error": "image_source is required"}), 400
    fb = _get_feedback_module()
    if fb is None:
        return jsonify({"error": "save_feedback module not found"}), 500
    counts = fb.save_negative(image_source)
    _maybe_trigger_finetune(counts)
    return jsonify({
        "success": True,
        "counts": counts,
        "finetune_triggered": counts.get('total', 0) >= FINETUNE_THRESHOLD
    })

@app.route('/feedback/positive', methods=['POST'])
def feedback_positive():
    """
    Mark a detection as confirmed (positive training sample).
    Body (JSON): {
      "image_source": "/outputs/lab_xxx.jpg",
      "bbox": [x1, y1, x2, y2],      // pixel or 0-1 normalised
      "class_name": "sea mine",
      "image_w": 640,  // optional, used to normalise pixel bboxes
      "image_h": 480
    }
    """
    data = request.get_json(force=True, silent=True) or {}
    image_source = data.get('image_source') or data.get('snapshotPath') or data.get('enhancedImage')
    bbox = data.get('bbox') or data.get('boundingBox')
    class_name = data.get('class_name') or data.get('objectDetected') or 'unknown'
    image_w = data.get('image_w', 640)
    image_h = data.get('image_h', 480)

    if not image_source:
        return jsonify({"error": "image_source is required"}), 400
    if not bbox or len(bbox) < 4:
        bbox = [0.1, 0.1, 0.9, 0.9]  # Safe fallback centre fill

    fb = _get_feedback_module()
    if fb is None:
        return jsonify({"error": "save_feedback module not found"}), 500
    counts = fb.save_positive(image_source, bbox, class_name, image_w=image_w, image_h=image_h)
    _maybe_trigger_finetune(counts)
    return jsonify({
        "success": True,
        "counts": counts,
        "finetune_triggered": counts.get('total', 0) >= FINETUNE_THRESHOLD
    })

@app.route('/finetune/status', methods=['GET'])
def finetune_status():
    """Return feedback sample counts and last fine-tune info."""
    global _finetune_process
    datasets_dir = os.path.join(os.path.dirname(__file__), 'datasets')
    count_file = os.path.join(datasets_dir, 'feedback_count.json')
    counts = {}
    if os.path.exists(count_file):
        with open(count_file, 'r') as f:
            counts = json.load(f)
    
    training_active = (_finetune_process is not None and _finetune_process.poll() is None)
    best_feedback_exists = os.path.exists(os.path.join(os.path.dirname(__file__), 'models', 'best_feedback.pt'))
    
    return jsonify({
        "success": True,
        "counts": counts,
        "threshold": FINETUNE_THRESHOLD,
        "samples_until_finetune": max(0, FINETUNE_THRESHOLD - counts.get('total', 0)),
        "training_active": training_active,
        "best_feedback_available": best_feedback_exists
    })

@app.route('/finetune/trigger', methods=['POST'])
def finetune_trigger():
    """Manually trigger fine-tuning (bypasses count threshold)."""
    global _finetune_process
    if _finetune_process is not None and _finetune_process.poll() is None:
        return jsonify({"success": False, "message": "Fine-tuning already running"}), 409
    datasets_dir = os.path.join(os.path.dirname(__file__), 'datasets')
    count_file = os.path.join(datasets_dir, 'feedback_count.json')
    counts = {}
    if os.path.exists(count_file):
        with open(count_file, 'r') as f:
            counts = json.load(f)
    _maybe_trigger_finetune({**counts, 'total': FINETUNE_THRESHOLD})  # Force trigger
    return jsonify({"success": True, "message": "Fine-tuning triggered in background"})

@app.route('/finetune/promote', methods=['POST'])
def finetune_promote():
    """
    Promote best_feedback.pt → best.pt and hot-reload the YOLO model.
    After this, /pipeline will use the newly fine-tuned weights.
    """
    global yolo_model
    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    src = os.path.join(models_dir, 'best_feedback.pt')
    dst = os.path.join(models_dir, 'best.pt')
    if not os.path.exists(src):
        return jsonify({"success": False, "message": "best_feedback.pt not found — run fine-tuning first"}), 404
    import shutil
    shutil.copy2(src, dst)
    # Hot-reload YOLO
    try:
        from ultralytics import YOLO as _YOLO
        yolo_model = _YOLO(dst)
        yolo_model.to(DEVICE)
        yolo_model.eval()
        print(f"✅ YOLO hot-reloaded from promoted feedback weights on {DEVICE}", flush=True)
    except Exception as e:
        return jsonify({"success": False, "message": f"Weights promoted but YOLO reload failed: {e}"}), 500
    return jsonify({"success": True, "message": "best_feedback.pt promoted to best.pt and YOLO reloaded"})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, threaded=True)