# 🌊 DeepDrishti — Unified Marine Intelligence & Surveillance Platform

DeepDrishti is a comprehensive dual-domain marine intelligence ecosystem combining **environmental DNA (eDNA) biodiversity analysis** with **real-time underwater computer vision tactical surveillance**.

---

## 🏛️ System Architecture Overview

```
                                  DEEPDRISHTI PLATFORM
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         ▼                                                                   ▼
   [SYSTEM 1: RESEARCHER DECK]                                     [SYSTEM 2: NAVAL SURVEILLANCE DECK]
  eDNA Marine Biodiversity Platform                              Underwater Tactical Defense System
  (Port 5173 - React / Vite)                                     (Port 5175 - React / Vite)
         │                                                                   │
         ▼                                                                   ▼
   FastAPI Backend                                                 Express + MongoDB Backend
  (Port 8000 - Python)                                           (Port 5003 - Node.js)
         │                                                                   │
         ▼                                                                   ▼
  Bioinformatics Models                                            Computer Vision AI Server
  (Centroids, Encoders, Anomaly)                                  (Port 5001 - Flask / PyTorch)
                                                                  [FUNIE-GAN + YOLOv8 + MiDaS]
```

### The 5 Microservices:
1. **Researcher Hub UI (Port 5173):** Interactive oceanographic charts, bathymetric maps, taxonomy breakdown, and eDNA sample analytics.
2. **eDNA AI Backend (Port 8000):** FastAPI microservice executing taxonomic sequence classification and anomaly detection.
3. **Naval Surveillance Console UI (Port 5175):** High-readiness tactical operator deck for live camera feeds and threat analysis.
4. **Surveillance API Backend (Port 5003):** Express & MongoDB REST API managing defense alerts, user clearance, and video telemetry.
5. **Computer Vision AI Server (Port 5001):** PyTorch AI engine combining **FUNIE-GAN** (enhancement), **YOLOv8** (object detection), and **MiDaS** (monocular depth & distance estimation).

---

## 📁 Project Directory Structure

```
DEEP_DRISHTI/
├── E-DNA/
│   └── project files/
│       ├── UI/                    <- Researcher React Frontend (Port 5173)
│       ├── MODELS/                <- eDNA FastAPI Backend & Models (Port 8000)
│       └── ASV FILES/             <- Reference amplicon sequence tables
├── SURVEILLANCE/
│   └── DeepDrishti/
│       ├── frontend/              <- Tactical Naval React Console (Port 5175)
│       ├── backend/               <- Express + MongoDB API Server (Port 5003)
│       └── model/                 <- Computer Vision AI Microservice (Port 5001)
├── command for setup.txt          <- Setup commands reference
├── how to launch.txt              <- Manual launch commands reference
├── RUN_ALL_MODULES.bat            <- Optional 1-click launcher
└── README.md
```

---

## 📦 Prerequisites

- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **npm**: v9.0.0 or higher

---

## 🛠️ Step 1: Initial Setup & Installation

If setting up on a new PC or after deleting `node_modules`, run these commands once:

### 1. Install Node.js Dependencies
From the `DEEP_DRISHTI` root directory:

```cmd
cd "E-DNA\project files\UI" && npm install
cd "..\..\..\SURVEILLANCE\DeepDrishti\backend" && npm install
cd "..\frontend" && npm install
```

### 2. Install Python Dependencies
```cmd
pip install fastapi uvicorn pydantic torch torchvision ultralytics opencv-python flask flask-cors
```

---

## 🚀 Step 2: How to Launch (Manual Separate Terminals)

To avoid PC freezing and view logs independently, open **5 separate Command Prompt (CMD) windows** and run one command in each:

### 🖥️ Window 1: eDNA AI Backend API (Port 8000)
*FastAPI backend for marine biodiversity classification & taxonomy.*
```cmd
cd /d "C:\Users\yuvra\OneDrive\Desktop\DEEP_DRISHTI\E-DNA\project files\MODELS" && python -m uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```
*(Or relative from root: `cd "E-DNA\project files\MODELS" && python -m uvicorn api:app --host 0.0.0.0 --port 8000 --reload`)*

---

### 🖥️ Window 2: Researcher Hub Frontend (Port 5173)
*React + Vite research workspace for oceanographic data & heatmaps.*
```cmd
cd /d "C:\Users\yuvra\OneDrive\Desktop\DEEP_DRISHTI\E-DNA\project files\UI" && npm run dev
```
*(Or relative from root: `cd "E-DNA\project files\UI" && npm run dev`)*

---

### 🖥️ Window 3: Computer Vision AI Server (Port 5001)
*PyTorch engine with FUNIE-GAN (enhancement), YOLOv8 (detection), and MiDaS (depth estimation).*
```cmd
cd /d "C:\Users\yuvra\OneDrive\Desktop\DEEP_DRISHTI\SURVEILLANCE\DeepDrishti\model" && python app.py
```
*(Or relative from root: `cd "SURVEILLANCE\DeepDrishti\model" && python app.py`)*

---

### 🖥️ Window 4: Surveillance Node.js Backend API (Port 5003)
*Express server connected to MongoDB Atlas for naval camera feeds, telemetry, and auth.*
```cmd
cd /d "C:\Users\yuvra\OneDrive\Desktop\DEEP_DRISHTI\SURVEILLANCE\DeepDrishti\backend" && node server/server.js
```
*(Or relative from root: `cd "SURVEILLANCE\DeepDrishti\backend" && node server/server.js`)*

---

### 🖥️ Window 5: Tactical Surveillance Deck Frontend (Port 5175)
*Naval command console UI for threat detection and live video enhancement.*
```cmd
cd /d "C:\Users\yuvra\OneDrive\Desktop\DEEP_DRISHTI\SURVEILLANCE\DeepDrishti\frontend" && npm run dev
```
*(Or relative from root: `cd "SURVEILLANCE\DeepDrishti\frontend" && npm run dev`)*

---

## 🌐 Ports & Access Endpoints

| Platform / Microservice | URL | Description |
| :--- | :--- | :--- |
| **Researcher Platform Hub** | [http://localhost:5173](http://localhost:5173) | Primary eDNA biodiversity & analytics suite |
| **Tactical Surveillance Deck** | [http://localhost:5175](http://localhost:5175) | Naval tactical defense & camera deck |
| **eDNA AI API Documentation** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger documentation |
| **Surveillance REST API** | [http://localhost:5003](http://localhost:5003) | Express backend endpoints |
| **Computer Vision AI Server** | [http://localhost:5001](http://localhost:5001) | FUNIE-GAN, YOLOv8 & MiDaS endpoints |

---

## 🔑 Login Credentials

### 1. Tactical Surveillance Console (`http://localhost:5175`)

You can log in using either verified account:

* **Captain Account (Full Command Clearance):**
  - **Naval Email:** `captain@aquascope.com`
  - **Password:** `Captain@123` *(Case-sensitive)*

* **Administrator / Personal Account:**
  - **Naval Email:** `asmit01052005@gmail.com`
  - **Password:** `asmit123`

---

### 2. Researcher Hub (`http://localhost:5173`)

* **Instant Access:** Click the **"Continue in Offline Local Mode (Bypass Cloud)"** button on the login screen to enter immediately using local seeded datasets.
* **Or Sign in with Credentials:**
  - **Email:** `asmit01052005@gmail.com`
  - **Password:** `asmit123`

---

## 🤖 Integrated AI Models

1. **FUNIE-GAN (Fast Underwater Image Enhancement GAN):**
   Restores degraded underwater footage by correcting low contrast, greenish-blue color cast, and haze in real time.
2. **YOLOv8 (Marine & Threat Object Detection):**
   Real-time detection and classification of subsea divers, ROVs, vessels, aquatic life, and unauthorized underwater objects.
3. **MiDaS (Monocular Depth & Distance Estimation):**
   Infers 3D relative depth maps from single camera video frames, computing minimum, average, and maximum object distance in meters.
4. **eDNA Taxonomic Sequence Classifier:**
   Machine learning taxonomy predictor classifying marine species presence from environmental DNA sequence amplicon data.

---

## 💡 Troubleshooting & Notes

- **MongoDB Atlas SRV Connection on Windows:**
  Backend is pre-configured with Google DNS (`8.8.8.8`) to prevent `querySrv ECONNREFUSED` issues on restrictive networks.
- **Port In Use (`EADDRINUSE`):**
  If port `5003` or `5175` is blocked, terminate the hanging node process using PowerShell:
  `Get-Process -Id (Get-NetTCPConnection -LocalPort 5003).OwningProcess | Stop-Process -Force`
