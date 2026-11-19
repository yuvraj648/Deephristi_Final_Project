import os
import io
import gzip
import json
import pickle
import sqlite3
import tempfile
import numpy as np
import socket
import subprocess
from contextlib import contextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List, Tuple

app = FastAPI()

# Allow CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
DB_FILE = os.path.join(BASE_DIR, "database.sqlite")

# ============================================================
# DATABASE SETUP  (SQLite — atomic, crash-safe, fast)
# ============================================================

def get_db_connection():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS expeditions (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL
        )
    """)
    conn.commit()
    # Migrate from old database.json if it exists and DB is empty
    old_json = os.path.join(BASE_DIR, "database.json")
    if os.path.exists(old_json):
        try:
            count = conn.execute("SELECT COUNT(*) FROM expeditions").fetchone()[0]
            if count == 0:
                with open(old_json, "r", encoding="utf-8") as f:
                    old_data = json.load(f)
                for exp in old_data:
                    conn.execute(
                        "INSERT OR REPLACE INTO expeditions (id, data) VALUES (?, ?)",
                        (exp["id"], json.dumps(exp))
                    )
                conn.commit()
                print(f"Migrated {len(old_data)} expeditions from database.json to SQLite.")
        except Exception as e:
            print(f"Migration from database.json skipped: {e}")
    conn.close()

init_db()

# ============================================================
# LOAD MODELS VIA UNIFIED MODEL MANAGER
# ============================================================

from model_manager import manager, clean_sequence

MODELS_LOADED = any(
    status.get("loaded", False) 
    for status in manager.models_status.values()
)

# ============================================================
# API ENDPOINTS — Models & Prediction
# ============================================================

@app.get("/models")
def list_models():
    """List all registered ML models with status, accuracy, and metadata."""
    return manager.get_models_metadata()

class PredictRequest(BaseModel):
    sequence: str
    model_id: Optional[str] = "deepdrishti_cnn"

PredictRequest.model_rebuild()

@app.post("/predict")
def predict_sequence(request: PredictRequest):
    if not MODELS_LOADED:
        raise HTTPException(status_code=503, detail="No ML models are loaded.")
    
    sequence = clean_sequence(request.sequence)
    if len(sequence) == 0:
        raise HTTPException(status_code=400, detail="No valid DNA bases (A, C, G, T) were detected.")

    try:
        result = manager.predict(sequence, request.model_id)
        # Attach authoritative 7-level Linnaean hierarchy
        resolved = manager.resolve_taxonomy(sequence, request.model_id)
        result["taxonomy"] = resolved.get("taxonomy")
        if resolved.get("source") == "reference_catalog":
            result["confidence"] = max(result.get("confidence", 0.0), resolved["confidence"])
            result["potentially_unusual"] = False
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@app.post("/predict/all")
def predict_all_models(request: PredictRequest):
    """Run inference across all 3 models simultaneously for side-by-side comparison."""
    if not MODELS_LOADED:
        raise HTTPException(status_code=503, detail="No ML models are loaded.")
    
    sequence = clean_sequence(request.sequence)
    if len(sequence) == 0:
        raise HTTPException(status_code=400, detail="No valid DNA bases (A, C, G, T) were detected.")

    try:
        return manager.predict_all(sequence)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparative inference error: {str(e)}")

class BatchPredictRequest(BaseModel):
    sequences: List[str]
    model_id: Optional[str] = "deepdrishti_cnn"

BatchPredictRequest.model_rebuild()

@app.post("/predict/batch")
def predict_batch_sequences(request: BatchPredictRequest):
    """Batch classify raw DNA sequences into 7-level taxonomy hierarchy."""
    if not MODELS_LOADED:
        raise HTTPException(status_code=503, detail="No ML models are loaded.")
    if not request.sequences:
        return []
    try:
        return manager.predict_batch(request.sequences, request.model_id)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch inference error: {str(e)}")

# ============================================================
# API ENDPOINTS — Expedition CRUD (SQLite-backed)
# ============================================================

@app.get("/expeditions")
def get_expeditions():
    conn = get_db_connection()
    rows = conn.execute("SELECT data FROM expeditions").fetchall()
    conn.close()
    summaries = []
    for row in rows:
        try:
            exp = json.loads(row["data"])
            samples_val = exp.get("samples", [])
            asvs_val = exp.get("asvs", [])
            sample_cnt = len(samples_val) if isinstance(samples_val, list) else int(samples_val or 0)
            asv_cnt = len(asvs_val) if isinstance(asvs_val, list) else int(asvs_val or 0)
            summaries.append({
                "id": exp.get("id"),
                "name": exp.get("name"),
                "region": exp.get("region"),
                "updated": exp.get("updated"),
                "provenance": exp.get("provenance", "uploaded"),
                "sampleCount": sample_cnt,
                "asvCount": asv_cnt,
                "clusters": exp.get("clusters", []),
            })
        except Exception:
            continue
    return summaries

@app.get("/expeditions/{exp_id}")
def get_expedition_by_id(exp_id: str):
    conn = get_db_connection()
    row = conn.execute("SELECT data FROM expeditions WHERE id = ?", (exp_id,)).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Expedition not found.")
    return json.loads(row["data"])

@app.post("/expeditions")
def save_expedition(expedition: Dict[str, Any]):
    exp_id = expedition.get("id")
    if not exp_id:
        raise HTTPException(status_code=400, detail="Expedition must have an 'id' field.")
    serialized = json.dumps(expedition, ensure_ascii=False)
    conn = get_db_connection()
    conn.execute(
        "INSERT OR REPLACE INTO expeditions (id, data) VALUES (?, ?)",
        (exp_id, serialized)
    )
    conn.commit()
    conn.close()
    return {"status": "saved", "id": exp_id}

@app.post("/expeditions/{exp_id}/compute-embeddings")
def compute_expedition_embeddings(exp_id: str):
    conn = get_db_connection()
    row = conn.execute("SELECT data FROM expeditions WHERE id = ?", (exp_id,)).fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Expedition not found.")

    exp = json.loads(row["data"])
    asvs = exp.get("asvs", [])
    if not asvs:
        conn.close()
        raise HTTPException(status_code=400, detail="Expedition has no ASVs to embed.")

    from sklearn.decomposition import PCA

    # 3-mer frequency sequence representation
    k = 3
    bases = ['A', 'C', 'G', 'T']
    all_kmers = [b1 + b2 + b3 for b1 in bases for b2 in bases for b3 in bases]
    kmer_idx = {km: i for i, km in enumerate(all_kmers)}

    X = np.zeros((len(asvs), len(all_kmers)), dtype=np.float32)
    for i, a in enumerate(asvs):
        seq = a.get("sequence", "").upper()
        if not seq:
            continue
        for j in range(len(seq) - k + 1):
            sub = seq[j:j+k]
            if sub in kmer_idx:
                X[i, kmer_idx[sub]] += 1.0
        row_sum = np.sum(X[i])
        if row_sum > 0:
            X[i] /= row_sum

    if len(asvs) < 2:
        for a in asvs:
            a["embedding"] = [0.0, 0.0]
        exp["asvs"] = asvs
        serialized = json.dumps(exp, ensure_ascii=False)
        conn.execute("UPDATE expeditions SET data = ? WHERE id = ?", (serialized, exp_id))
        conn.commit()
        conn.close()
        return {"status": "success", "count": len(asvs), "expedition": exp}

    pca = PCA(n_components=2, random_state=42)
    coords = pca.fit_transform(X)

    std_x = float(np.std(coords[:, 0])) or 1.0
    std_y = float(np.std(coords[:, 1])) or 1.0
    mean_x = float(np.mean(coords[:, 0]))
    mean_y = float(np.mean(coords[:, 1]))

    for i, a in enumerate(asvs):
        x = round(float((coords[i, 0] - mean_x) / std_x * 4.5), 2)
        y = round(float((coords[i, 1] - mean_y) / std_y * 4.5), 2)
        a["embedding"] = [x, y]

    exp["asvs"] = asvs
    serialized = json.dumps(exp, ensure_ascii=False)
    conn.execute("UPDATE expeditions SET data = ? WHERE id = ?", (serialized, exp_id))
    conn.commit()
    conn.close()

    return {"status": "success", "count": len(asvs), "expedition": exp}

@app.delete("/expeditions/{exp_id}")
def delete_expedition(exp_id: str):
    conn = get_db_connection()
    conn.execute("DELETE FROM expeditions WHERE id = ?", (exp_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

# ============================================================
# FASTQ PROCESSING — Parse, Quality-Filter, Cluster → ASV Table
# ============================================================

def parse_fastq_bytes(raw_bytes: bytes) -> List[Tuple[str, str]]:
    """
    Parse a FASTQ or FASTQ.gz byte stream into (sequence, quality) tuples.
    Handles both plain .fastq and .fastq.gz compressed formats.
    """
    try:
        # Try to decompress as gzip first
        with gzip.open(io.BytesIO(raw_bytes), 'rt', encoding='utf-8', errors='replace') as f:
            text = f.read()
    except Exception:
        # Fall back to plain text
        text = raw_bytes.decode('utf-8', errors='replace')

    reads: List[Tuple[str, str]] = []
    lines = text.splitlines()
    i = 0
    while i + 3 < len(lines):
        header = lines[i].strip()
        seq    = lines[i + 1].strip()
        sep    = lines[i + 2].strip()
        qual   = lines[i + 3].strip()
        if header.startswith('@') and sep.startswith('+') and seq and qual:
            reads.append((seq.upper(), qual))
        i += 4

    return reads


def filter_reads(reads: List[Tuple[str, str]]) -> List[str]:
    """
    Quality-filter reads:
      - Minimum average Phred Q-score ≥ 20
      - Length 100 – 600 bp
      - Ambiguous base fraction ≤ 1%
    Returns clean sequences only (no quality string needed downstream).
    """
    MIN_LEN = 100
    MAX_LEN = 600
    MIN_Q   = 20.0
    MAX_N_FRAC = 0.01

    good: List[str] = []
    for seq, qual in reads:
        if not (MIN_LEN <= len(seq) <= MAX_LEN):
            continue
        # Phred Q-score from ASCII (Phred+33 encoding)
        if qual:
            avg_q = sum(ord(c) - 33 for c in qual) / len(qual)
            if avg_q < MIN_Q:
                continue
        n_frac = seq.count('N') / max(len(seq), 1)
        if n_frac > MAX_N_FRAC:
            continue
        good.append(seq)
    return good


def cluster_to_asvs(seqs: List[str]) -> Dict[str, int]:
    """
    Exact-sequence clustering: identical sequences → one ASV.
    Returns {sequence: total_abundance}.
    Keeps only sequences with ≥ 2 supporting reads (singleton removal).
    """
    counts: Dict[str, int] = {}
    for s in seqs:
        counts[s] = counts.get(s, 0) + 1
    # Remove singletons (likely sequencing errors)
    return {s: c for s, c in counts.items() if c >= 2}


@app.post("/process/fastq")
async def process_fastq(file: UploadFile = File(...)):
    """
    Accept a demultiplexed FASTQ or FASTQ.gz file, run quality-filtering and
    exact-sequence clustering, and return an ASV table ready for taxonomy
    classification via /predict/batch.

    Response JSON:
    {
      "asvs":        [{"asv_id": "ASV_00001", "sequence": "...", "abundance": 1234}],
      "samples":     [{"sample_id": "...", "site": "..."}],
      "occurrences": [{"asv_id": "...", "sample_id": "...", "abundance": 1234}],
      "stats": {"total_reads": N, "filtered_reads": M, "unique_asvs": K}
    }
    """
    filename = file.filename or "uploaded.fastq"
    raw = await file.read()

    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 1. Parse FASTQ records
    all_reads = parse_fastq_bytes(raw)
    total_reads = len(all_reads)

    if total_reads == 0:
        raise HTTPException(
            status_code=400,
            detail="No FASTQ records could be parsed. Ensure the file is a valid FASTQ or FASTQ.gz archive."
        )

    # 2. Quality filter
    clean_seqs = filter_reads(all_reads)
    filtered_reads = len(clean_seqs)

    # 3. Cluster to ASVs (exact deduplication + singleton removal)
    asv_map = cluster_to_asvs(clean_seqs)

    if len(asv_map) == 0:
        raise HTTPException(
            status_code=400,
            detail=(
                f"No ASVs remained after quality filtering and singleton removal. "
                f"Input had {total_reads} reads; {filtered_reads} passed QC but all were singletons. "
                "Try uploading a larger FASTQ file with higher sequencing depth."
            )
        )

    # 4. Build ASV table
    # Derive sample ID from filename (strip .fastq.gz / .fq.gz / .fastq / .fq)
    base = filename
    for ext in ['.fastq.gz', '.fq.gz', '.fastq', '.fq', '.gz']:
        if base.endswith(ext):
            base = base[:-len(ext)]
            break
    sample_id = base.replace(' ', '_').replace('-', '_')
    site_name = f"Station {sample_id}"

    # Sort by abundance descending; retain top 2,000 biological variants
    sorted_asvs = sorted(asv_map.items(), key=lambda x: -x[1])
    MAX_VARIANTS = 2000
    if len(sorted_asvs) > MAX_VARIANTS:
        sorted_asvs = sorted_asvs[:MAX_VARIANTS]

    asvs_out = []
    occurrences_out = []
    for rank, (seq, abund) in enumerate(sorted_asvs, start=1):
        asv_id = f"ASV_{rank:05d}"
        asvs_out.append({
            "asv_id": asv_id,
            "sequence": seq,
            "abundance": abund,
        })
        occurrences_out.append({
            "asv_id": asv_id,
            "sample_id": sample_id,
            "abundance": abund,
        })

    samples_out = [{
        "sample_id": sample_id,
        "site": site_name,
    }]

    return {
        "asvs": asvs_out,
        "samples": samples_out,
        "occurrences": occurrences_out,
        "stats": {
            "total_reads": total_reads,
            "filtered_reads": filtered_reads,
            "unique_asvs": len(asvs_out),
            "singleton_removed": filtered_reads - sum(asv_map.values()),
        }
    }


# ============================================================
# UNDERWATER SURVEILLANCE MODULE INTEGRATION
# ============================================================
SURVEILLANCE_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "..", "DeepDrishti", "DeepDrishti"))

def _check_port(port: int, host: str = "127.0.0.1") -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.3)
            return s.connect_ex((host, port)) == 0
    except Exception:
        return False

@app.get("/surveillance/status")
def surveillance_status():
    model_online = _check_port(5001)
    backend_online = _check_port(5003)
    frontend_online = _check_port(5175)
    return {
        "status": "ready",
        "frontend_port": 5175,
        "frontend_online": frontend_online,
        "backend_port": 5003,
        "backend_online": backend_online,
        "model_port": 5001,
        "model_online": model_online,
        "all_running": frontend_online and backend_online and model_online,
        "surveillance_url": "http://localhost:5175"
    }

@app.post("/surveillance/launch")
def surveillance_launch():
    bat_path = os.path.join(SURVEILLANCE_DIR, "run_all.bat")
    if not os.path.exists(bat_path):
        raise HTTPException(status_code=404, detail=f"Launcher script not found at {bat_path}")
    
    try:
        subprocess.Popen(
            ["cmd.exe", "/c", bat_path],
            cwd=SURVEILLANCE_DIR,
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
        return {"status": "launching", "message": "Surveillance system stack launching in background", "url": "http://localhost:5175"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to launch surveillance stack: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
