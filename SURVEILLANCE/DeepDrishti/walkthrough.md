# 🌊 DeepDrishti — Complete System Architecture & Walkthrough

**DeepDrishti** (formerly *AquaScope*) is a state-of-the-art **Underwater Marine Surveillance & Threat Detection System**. It combines deep learning image enhancement, real-time object detection, depth estimation, full-stack REST APIs, and a command dashboard.

---

## 🏛️ System Architecture Overview

The repository is structured into three primary tiers:

```
DeepDrishti/
├── model/           # Python AI Pipeline (Flask, PyTorch, YOLOv8, MiDaS, FUNIE-GAN)
├── backend/         # Node.js / Express / MongoDB REST API & Background Surveillance Service
└── frontend/        # React 18 / Vite / Tailwind CSS Naval Operations Dashboard
```

```mermaid
graph TD
    subgraph Frontend Tier ["React 18 (Vite) UI Tier"]
        UI[Naval Operations UI]
        Dash[Dashboard & Surveillance]
        Lab[Enhancement Lab Bench]
        Rep[Reports & Command Dispatch]
    end

    subgraph Backend Tier ["Node.js / Express / MongoDB Tier"]
        API[Express REST API]
        Auth[JWT & RBAC Middleware]
        DetSvc[Background Detection Service]
        DB[(MongoDB Database)]
    end

    subgraph AI Model Tier ["Python Flask AI Microservice (Port 5001)"]
        Flask[Flask API /pipeline]
        FUNIE[FUNIE-GAN Enhancement]
        YOLO[YOLOv8 Threat Detector]
        MiDaS[MiDaS Monocular Depth]
        UNet[PyTorch U-Net Model]
    end

    UI -->|HTTP Requests / Bearer JWT| API
    Dash -->|Feeds & Surveillance Actions| API
    Lab -->|Multipart File Upload / Frame Analysis| API
    Rep -->|Send to Command Dispatch| API

    API -->|Read/Write Operations| DB
    API -->|Internal Forward / Form-Data| Flask
    DetSvc -->|Periodic Stream Analysis (10s)| Flask

    Flask --> FUNIE
    Flask --> YOLO
    Flask --> MiDaS
    FUNIE -->|Enhanced Frame| YOLO
    YOLO -->|Bounding Boxes| MiDaS
    MiDaS -->|Distance Estimation| Flask
```

---

## 🧠 AI & Machine Learning Pipeline Details

The AI pipeline lives under `model/` and runs as a Flask web service (`app.py` on port `5001`). It executes an integrated multi-model inference chain:

### 1. FUNIE-GAN (Fast Underwater Image Enhancement GAN)
* **Architecture**: Generator Small (`GeneratorSmall`) based on an Encoder-Decoder U-Net variant.
  * **Encoder**: 3 Down-sampling blocks (`Conv2d` $\rightarrow$ `BatchNorm2d` $\rightarrow$ `LeakyReLU`).
  * **Decoder**: 2 Up-sampling transpose blocks (`ConvTranspose2d` $\rightarrow$ `BatchNorm2d` $\rightarrow$ `ReLU`) with skip-connection concatenations.
  * **Output Layer**: 1 Transpose block with `tanh` activation mapping pixel intensities to $[-1, 1]$.
* **Weights File**: [funie_final_improved.pth](file:///d:/DeepDrishti/model/models/funie_final_improved.pth) (5.8 MB) and [final_model_epoch60.pth](file:///d:/DeepDrishti/model/models/final_model_epoch60.pth) (24.7 MB).
* **Preprocessing & Image Recovery**:
  * Reflection padding (`_pad_to_multiple`) to multiples of 32 for stable down/up sampling across high resolutions.
  * Dynamic scaling to cap short-side resolution up to 512px.
  * Channel-wise Contrast Limited Adaptive Histogram Equalization (CLAHE) via `apply_color_balance`.
  * Weighted residual blending ($55\%$ original image + $45\%$ enhanced image) to preserve natural structural details.
  * Post-processing unsharp masking (`unsharp_mask`) to remove GAN upscaling blur.
* **Quantitative Quality Metrics Calculated**:
  * **UIQM** (Underwater Image Quality Measure): Combination of Underwater Image Sharpness Measure (UISM) and Contrast Measure (UICONM).
  * **PSNR** (Peak Signal-to-Noise Ratio): Fidelity metric comparing enhanced output with input frame.
  * **SSIM** (Structural Similarity Index): Structural similarity evaluation across color channels.

### 2. YOLOv8 Marine Object & Threat Detector
* **Model**: Custom-trained YOLOv8 architecture (`ultralytics.YOLO`).
* **Weights File**: [best.pt](file:///d:/DeepDrishti/model/models/best.pt) (52.0 MB).
* **Target Classes & Classification**:
  * **DANGER**: Sea Mine (`mine`, `unexploded_ordnance`, `torpedo`), Submersible (`sub`, `submarine`, `uuv`), Human/Diver (`diver`, `swimmer`).
  * **NEUTRAL**: Underwater Structure (`structure`), Marine Trash (`trash`).
  * **SAFE**: Marine Life (`fish`, `dolphin`, `whale`, `turtle`), Coral Reef (`reef`, `coral`, `rock`), Anchor.

### 3. MiDaS Monocular Depth & Distance Estimator
* **Model**: `MiDaS_small` loaded via PyTorch Hub (`intel-isl/MiDaS`).
* **Depth & Distance Physics Formulation**:
  * Relative inverse depth map $D(x, y)$ interpolated to frame size $(H, W)$ and normalized in $[0, 1]$.
  * Region-of-interest average depth $\bar{D}_{bbox}$ computed over detection bounding boxes.
  * Estimated real-world distance calculation:
    $$\text{Distance (meters)} = (1.0 - \bar{D}_{bbox}) \times 15.0\text{ m}$$

### 4. Custom PyTorch U-Net
* **Architecture File**: [model.py](file:///d:/DeepDrishti/model/model.py)
* **Model Weights**: [model.pth](file:///d:/DeepDrishti/model/model.pth) (86.5 MB).
* **Details**: 4-stage convolutional encoder ($64 \rightarrow 128 \rightarrow 256 \rightarrow 512$ filters), MaxPool2d downsampling, 1024-channel bottleneck, 4 transpose decoder stages with residual skip connections, and a $1\times1$ convolution output.

---

## 📊 Dataset & Training Context

* **Target Conditions**: Underwater optical deterioration caused by light absorption (red wavelength attenuation within 5m depth), forward/backward light scattering, suspended organic particles ("marine snow"), and low contrast.
* **Datasets Utilized**:
  * **EUVP (Enhancing Underwater Visual Perception)**: Paired dataset containing degraded underwater images alongside ground-truth restored images.
  * **UIEBD (Underwater Image Enhancement Benchmark Dataset)**: Real-world underwater scenes spanning diverse color casts (greenish, bluish, murky brown).
  * **Custom Marine Threat Dataset**: Annotations for sea mines, submersibles, divers, and marine fauna used for training YOLOv8 (`best.pt`).

---

## ⚙️ Backend REST API & Services (`backend/`)

Built with **Node.js, Express, Mongoose ODM, JWT Authentication**, and **MongoDB**.

### Core Collections & Mongoose Schemas
1. [User.js](file:///d:/DeepDrishti/backend/server/models/User.js): Stores user credentials, hashed passwords (`bcryptjs`), full names, active status, and RBAC roles.
2. [Feed.js](file:///d:/DeepDrishti/backend/server/models/Feed.js): Camera feed registry containing title, URL (YouTube/HLS/direct stream), location, sector, status (`active`/`inactive`), and auto-detection parameters.
3. [Alert.js](file:///d:/DeepDrishti/backend/server/models/Alert.js): Live security alert records detailing alert type (`Intrusion`, `Anomaly`, `Object`, `Threat`), severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), confidence score, location, coordinates, resolution status, and assigned responder.
4. [Detection.js](file:///d:/DeepDrishti/backend/server/models/Detection.js): Historical log of every AI inference result including bounding boxes, detected class, status, distance, metrics (UIQM, PSNR, SSIM), and processed image file paths.
5. [SystemLog.js](file:///d:/DeepDrishti/backend/server/models/SystemLog.js): System-wide operational logs and audit entries with severity levels (`INFO`, `WARNING`, `ERROR`, `CRITICAL`) and module tags.
6. [CommandDispatch.js](file:///d:/DeepDrishti/backend/server/models/CommandDispatch.js): Audit record created when operators trigger **"Send to Command"** dispatches from reports.
7. [StationSettings.js](file:///d:/DeepDrishti/backend/server/models/StationSettings.js): Command station operational settings (detection confidence thresholds, update intervals, alert notifications).

### Background Detection Service
* **File**: [detectionService.js](file:///d:/DeepDrishti/backend/server/services/detectionService.js)
* **Behavior**: Periodically iterates active camera feeds (every 8–15 seconds). It sends frame requests to Python Flask API (`http://localhost:5001/pipeline`). If threats exceed the station confidence threshold, it automatically creates an `Alert` and appends a `SystemLog` entry. If the Flask microservice is offline, it utilizes an internal fallback simulation engine so naval surveillance remains uninterrupted.

---

## 💻 Frontend Application (`frontend/`)

Built with **React 18, Vite, Tailwind CSS, Lucide Icons, and Recharts**.

### Web Application Pages
* **`/login` ([Login.jsx](file:///d:/DeepDrishti/frontend/src/pages/Login.jsx))**: Secure portal with role switching profiles (Captain, Vice Captain, Surveillance Head, Engineer, Analyst) and token-based authentication.
* **`/dashboard` ([Dashboard.jsx](file:///d:/DeepDrishti/frontend/src/pages/Dashboard.jsx))**: Tactical command center presenting live feed status grid, real-time alert counters, threat distribution charts (Recharts), and system status indicators.
* **`/surveillance` ([Surveillance.jsx](file:///d:/DeepDrishti/frontend/src/pages/Surveillance.jsx))**: Multi-camera live surveillance matrix with single-frame capture, ROI box marking (`mark-area`), live frame enhancement, and stream controls.
* **`/enhancement-lab` ([EnhancementLab.jsx](file:///d:/DeepDrishti/frontend/src/pages/EnhancementLab.jsx))**: Testing bench allowing operators to upload underwater photos/videos or test sample feeds, move interactive before/after image split sliders, view UIQM/PSNR/SSIM stats, and inspect bounding boxes with distance overlays.
* **`/detection-records` ([DetectionRecords.jsx](file:///d:/DeepDrishti/frontend/src/pages/DetectionRecords.jsx))**: Searchable historical database of all detected underwater items with modal previews, confidence filtering, and CSV export capabilities.
* **`/reports` & `/reports/detail` ([Reports.jsx](file:///d:/DeepDrishti/frontend/src/pages/Reports.jsx))**: Command intelligence reports with analytics summaries and **"Send to Command"** dispatch action.
* **`/system-logs` ([SystemLogs.jsx](file:///d:/DeepDrishti/frontend/src/pages/SystemLogs.jsx))**: Centralized audit log table with severity filters and module origin tags.
* **`/settings` ([Settings.jsx](file:///d:/DeepDrishti/frontend/src/pages/Settings.jsx))**: Configuration dashboard for tuning AI sensitivity thresholds, system maintenance, and feed auto-detection parameters.

---

## 🔐 Role-Based Access Control (RBAC) Matrix

| User Role | Credentials | Access Permissions |
|---|---|---|
| **Captain** | `captain@aquascope.com` | Full administrative system access across all views & actions. |
| **Vice Captain** | `vice@aquascope.com` | Command access, report approval, settings management. |
| **Surveillance Head** | `surveillance@aquascope.com` | Live feeds, surveillance controls, alert resolutions, command dispatches. |
| **Engineer** | `engineer@aquascope.com` | Enhancement lab bench, technical calibration, system logs inspection. |
| **Analyst** | `analyst@aquascope.com` | Read-only reporting, detection records review, analytics inspection. |

---

## 🔄 End-to-End Execution Flow

1. **Feed Ingestion**: Live video stream (YouTube / HLS / local video) loaded in `Surveillance` or background service.
2. **AI Frame Capture & Transfer**: Frame extracted and POSTed to Python Flask microservice `/pipeline`.
3. **Enhancement Phase**: FUNIE-GAN applies reflection padding, CLAHE color recovery, GAN inference, residual blending, and unsharp masking. Metrics (UIQM, PSNR, SSIM) calculated.
4. **Detection Phase**: Processed frame passed to YOLOv8 (`best.pt`). Bounding boxes, threat classes, and confidence scores extracted.
5. **Depth & Distance Phase**: MiDaS calculates depth map; bounding box average depth converted to physical distance in meters.
6. **Persistence & Alert Generation**: Express backend saves detection in `detections` collection. If threat level is `DANGER` and confidence exceeds `StationSettings` threshold:
   - `Alert` created in MongoDB.
   - `SystemLog` entry logged with severity `WARNING`/`CRITICAL`.
7. **Operator Dispatch**: Command personnel review alert on `Dashboard` or `Reports` page and trigger **"Send to Command"**, generating a `CommandDispatch` record for naval audit trail.
