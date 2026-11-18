import os
import streamlit as st
import numpy as np
import pandas as pd
from model_manager import manager, clean_sequence

# ============================================================
# PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="DeepDrishti — Multi-Model eDNA Biodiversity",
    page_icon="🧬",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================
# CUSTOM STYLING
# ============================================================

st.markdown(
    """
    <style>
    .main-header {
        font-size: 2.4rem;
        font-weight: 800;
        margin-bottom: 0.1rem;
        background: linear-gradient(90deg, #0ea5e9, #38bdf8, #818cf8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .sub-header {
        font-size: 1.1rem;
        color: #94a3b8;
        margin-bottom: 1.5rem;
    }
    .model-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        background: rgba(14, 165, 233, 0.15);
        color: #38bdf8;
        border: 1px solid rgba(14, 165, 233, 0.3);
    }
    .metric-card {
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid rgba(148, 163, 184, 0.15);
        border-radius: 12px;
        padding: 1rem;
        margin-bottom: 0.75rem;
    }
    .metric-title {
        font-size: 0.8rem;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .metric-value {
        font-size: 1.6rem;
        font-weight: 700;
        color: #f8fafc;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# ============================================================
# HEADER
# ============================================================

col_h1, col_h2 = st.columns([3, 1])
with col_h1:
    st.markdown('<div class="main-header">🧬 DeepDrishti Multi-Model Intelligence</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Triple-Architecture eDNA Taxonomic Classification & Novelty Discovery Platform</div>', unsafe_allow_html=True)
with col_h2:
    st.markdown('<div style="text-align: right; padding-top: 15px;"><span class="model-badge">3 Models Active</span></div>', unsafe_allow_html=True)

st.divider()

# ============================================================
# SIDEBAR — MODEL CONFIGURATION
# ============================================================

with st.sidebar:
    st.header("⚙️ Model Configuration")
    
    model_options = {
        "deepdrishti_cnn": "🧬 DeepDrishti 18S-V9 CNN (1D-CNN + Novelty Centroids)",
        "coi_xgboost": "⚡ EX2203 Deep-Sea COI XGBoost (3-Mer Gradient Boosting)",
        "tara_dnabert2": "🔬 Tara Oceans DNABERT-2 (117M Foundation Transformer)",
        "all": "🌐 Multi-Model Comparison (Evaluate All 3 Models)"
    }
    
    selected_model_key = st.selectbox(
        "Active Inference Architecture",
        options=list(model_options.keys()),
        format_func=lambda k: model_options[k]
    )

    st.markdown("---")
    st.subheader("📋 Model Registry Status")
    
    metadata_list = manager.get_models_metadata()
    for meta in metadata_list:
        status_color = "🟢" if meta["status"] == "ACTIVE" else "🔴"
        with st.expander(f"{status_color} {meta['name']}"):
            st.write(f"**Target Marker:** {meta['marker']}")
            st.write(f"**Taxonomic Rank:** {meta['taxonomic_rank']}")
            st.write(f"**Classes Trained:** {meta['num_classes']}")
            st.write(f"**Measured Accuracy:** {meta['accuracy']}")
            st.caption(meta["description"])

    st.markdown("---")
    st.caption("DeepDrishti Bioinformatics Engine v2.0 • Paired Multi-Model Framework")

# ============================================================
# SAMPLE SEQUENCES
# ============================================================

sample_sequences = {
    "Tara Oceans 18S V9 (Cercozoa)": "GCTACTACCGATTGAATGGCTTAGTGAGCTTTCTGGACTGTTGCTTTTGAGTCAGCTTCGTTACTTTGAAAAATTAGAGTGCTCAAAGCAGGCTTAAGTTGCACAGACATAGCT",
    "Deep-Sea Hydrothermal COI (Copepoda)": "GACTTTATACTTAATTTTTGGTGCATGAGCAGGAATAGTAGGAACTTCTTTAAGATTACTTATTCGAACTGAATTAGGAAACCCAGGATTTTTAATTGGAGATGATCAAATTTATAATGTAATTGTTACAGCTCATGCTTTTATTATAATTTTTTTTATAGTAATACCAATTATAATTGGAGGATTTGGTAATTGACTAGTTCCCCTAATATTAGGAGCCCCTGATATAGCTTTCCCTCGAATAAATAAT",
    "DeepDrishti 18S V9 (Dinoflagellata)": "GCAACCACCGATTGAATGACATAGTGAGTACTTTTGGACGGCTCTTATTTCAGTGCTTTTAACGATTGAACGAGTGTCTCCTTTTGACCGCTTCAGTTGCACGGACATAGCT",
    "Divergent Candidate (Novelty Test)": "GCGCGCGCGCATATATATCGCGCGCGCGCATATATATCGCGCGCGCTAATTAATTCGCGCGCGATATATAT"
}

st.subheader("1. Sequence Input")

col_input_left, col_input_right = st.columns([3, 1])

with col_input_right:
    st.write("**Load Preset Sequence:**")
    selected_preset = st.selectbox(
        "Select benchmark sequence",
        options=["Custom input..."] + list(sample_sequences.keys()),
        label_visibility="collapsed"
    )
    preset_seq = sample_sequences.get(selected_preset, "")

with col_input_left:
    sequence_input = st.text_area(
        "Enter raw DNA sequence (FASTA or plain text):",
        value=preset_seq if selected_preset != "Custom input..." else "",
        height=140,
        placeholder="Paste environmental DNA sequence here (e.g., GCTACTACCGATTGAATGGCTTAGTGAGCT...)"
    )

col_btn, col_stats = st.columns([1, 2])

with col_btn:
    analyze_btn = st.button("🚀 Run Taxonomic Inference", type="primary", use_container_width=True)

cleaned = clean_sequence(sequence_input)
with col_stats:
    if cleaned:
        st.write(f"Sequence length: **{len(cleaned)} bp** | Base counts: A={cleaned.count('A')} C={cleaned.count('C')} G={cleaned.count('G')} T={cleaned.count('T')}")

# ============================================================
# PREDICTION LOGIC
# ============================================================

if analyze_btn:
    if not cleaned:
        st.warning("⚠️ Please provide a valid DNA sequence.")
        st.stop()

    with st.spinner("Executing neural bioinformatics pipeline..."):
        try:
            if selected_model_key == "all":
                results_all = manager.predict_all(cleaned)
            else:
                result_single = manager.predict(cleaned, selected_model_key)
        except Exception as e:
            st.error(f"Inference error: {str(e)}")
            st.stop()

    st.divider()

    # ========================================================
    # VIEW: MULTI-MODEL COMPARISON
    # ========================================================
    if selected_model_key == "all":
        st.subheader("🌐 Multi-Model Comparative Synthesis")
        st.write("Cross-architecture consensus evaluated across 1D-CNN, 3-Mer XGBoost, and DNABERT-2.")

        cols = st.columns(3)
        
        # Model 1 Card
        with cols[0]:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.markdown('<div class="metric-title">🧬 DeepDrishti 18S-V9 CNN</div>', unsafe_allow_html=True)
            cnn_res = results_all.get("results", {}).get("deepdrishti_cnn")
            if cnn_res:
                st.markdown(f'<div class="metric-value">{cnn_res["predicted_taxon"]}</div>', unsafe_allow_html=True)
                st.write(f"**Confidence:** {cnn_res['confidence']*100:.2f}%")
                st.write(f"**Taxonomic Rank:** {cnn_res['taxonomic_rank']}")
                novel_badge = "⚠️ Unusual Candidate" if cnn_res["potentially_unusual"] else "✓ Normal Range"
                st.write(f"**Novelty Status:** {novel_badge}")
                st.progress(min(1.0, float(cnn_res["confidence"])))
            else:
                st.error("Model unavailable")
            st.markdown('</div>', unsafe_allow_html=True)

        # Model 2 Card
        with cols[1]:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.markdown('<div class="metric-title">⚡ EX2203 COI XGBoost</div>', unsafe_allow_html=True)
            xgb_res = results_all.get("results", {}).get("coi_xgboost")
            if xgb_res:
                st.markdown(f'<div class="metric-value">{xgb_res["predicted_taxon"]}</div>', unsafe_allow_html=True)
                st.write(f"**Confidence:** {xgb_res['confidence']*100:.2f}%")
                st.write(f"**Taxonomic Rank:** {xgb_res['taxonomic_rank']}")
                novel_badge = "⚠️ Low Confidence" if xgb_res["potentially_unusual"] else "✓ Robust Assignment"
                st.write(f"**Novelty Status:** {novel_badge}")
                st.progress(min(1.0, float(xgb_res["confidence"])))
            else:
                st.error("Model unavailable")
            st.markdown('</div>', unsafe_allow_html=True)

        # Model 3 Card
        with cols[2]:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.markdown('<div class="metric-title">🔬 Tara Oceans DNABERT-2</div>', unsafe_allow_html=True)
            dnabert_res = results_all.get("results", {}).get("tara_dnabert2")
            if dnabert_res:
                st.markdown(f'<div class="metric-value">{dnabert_res["predicted_taxon"]}</div>', unsafe_allow_html=True)
                st.write(f"**Confidence:** {dnabert_res['confidence']*100:.2f}%")
                st.write(f"**Taxonomic Rank:** {dnabert_res['taxonomic_rank']}")
                novel_badge = "⚠️ Divergent" if dnabert_res["potentially_unusual"] else "✓ High Agreement"
                st.write(f"**Novelty Status:** {novel_badge}")
                st.progress(min(1.0, float(dnabert_res["confidence"])))
            else:
                st.error("Model unavailable")
            st.markdown('</div>', unsafe_allow_html=True)

        # Detailed breakdown tabs
        tab1, tab2, tab3 = st.tabs(["🧬 CNN Probabilities", "⚡ XGBoost 3-Mers & Classes", "🔬 DNABERT-2 Top Ranks"])
        
        with tab1:
            if cnn_res and "top_predictions" in cnn_res:
                df_cnn = pd.DataFrame(cnn_res["top_predictions"])
                df_cnn["probability"] = (df_cnn["probability"] * 100).round(2)
                st.dataframe(df_cnn.rename(columns={"taxon": "Phylum", "probability": "Confidence (%)"}), use_container_width=True)
        
        with tab2:
            if xgb_res and "top_predictions" in xgb_res:
                col_x1, col_x2 = st.columns(2)
                with col_x1:
                    df_xgb = pd.DataFrame(xgb_res["top_predictions"])
                    df_xgb["probability"] = (df_xgb["probability"] * 100).round(2)
                    st.dataframe(df_xgb.rename(columns={"taxon": "Class", "probability": "Confidence (%)"}), use_container_width=True)
                with col_x2:
                    st.write("**Dominant Tri-Nucleotides (3-mers):**")
                    df_km = pd.DataFrame(xgb_res.get("top_kmers", []))
                    if not df_km.empty:
                        df_km["frequency"] = (df_km["frequency"] * 100).round(2)
                        st.dataframe(df_km.rename(columns={"kmer": "3-Mer", "frequency": "Frequency (%)"}), use_container_width=True)
        
        with tab3:
            if dnabert_res and "top_predictions" in dnabert_res:
                df_tara = pd.DataFrame(dnabert_res["top_predictions"])
                df_tara["probability"] = (df_tara["probability"] * 100).round(2)
                st.dataframe(df_tara.rename(columns={"taxon": "Phylum", "probability": "Confidence (%)"}), use_container_width=True)

    # ========================================================
    # VIEW: SINGLE MODEL DETAIL
    # ========================================================
    else:
        st.subheader(f"📊 Prediction: {result_single['model_name']}")
        
        col_m1, col_m2, col_m3, col_m4 = st.columns(4)
        with col_m1:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.markdown(f'<div class="metric-title">Predicted {result_single["taxonomic_rank"]}</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="metric-value">{result_single["predicted_taxon"]}</div>', unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)

        with col_m2:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.markdown('<div class="metric-title">Model Confidence</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="metric-value">{result_single["confidence"]*100:.2f}%</div>', unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)

        with col_m3:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.markdown('<div class="metric-title">Amplicon Marker</div>', unsafe_allow_html=True)
            st.markdown(f'<div style="font-size: 1.1rem; font-weight: 600; padding-top: 5px;">{result_single["marker"]}</div>', unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)

        with col_m4:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.markdown('<div class="metric-title">Novelty Assessment</div>', unsafe_allow_html=True)
            novel_text = "⚠️ Candidate Divergent" if result_single["potentially_unusual"] else "✓ Standard Sequence"
            novel_color = "#f59e0b" if result_single["potentially_unusual"] else "#10b981"
            st.markdown(f'<div style="font-size: 1.1rem; font-weight: 600; color: {novel_color}; padding-top: 5px;">{novel_text}</div>', unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)

        # Top-5 probabilities display
        st.write("### Top Taxonomic Candidates")
        if "top_predictions" in result_single:
            for item in result_single["top_predictions"]:
                c1, c2 = st.columns([3, 1])
                with c1:
                    st.write(f"**{item['taxon']}**")
                with c2:
                    st.write(f"**{item['probability']*100:.2f}%**")
                st.progress(min(1.0, float(item["probability"])))

        # Specific model breakdowns
        if "top_kmers" in result_single:
            st.write("### 🧬 3-Mer Frequency Profiling")
            df_km = pd.DataFrame(result_single["top_kmers"])
            df_km["frequency"] = (df_km["frequency"] * 100).round(2)
            st.bar_chart(df_km.set_index("kmer"))

        if "all_distances" in result_single:
            with st.expander("📍 Latent Centroid Distances (All Training Phyla)"):
                sorted_dists = sorted(result_single["all_distances"].items(), key=lambda x: x[1])
                df_dist = pd.DataFrame(sorted_dists, columns=["Phylum", "Euclidean Distance"])
                st.dataframe(df_dist, use_container_width=True)

st.markdown("---")
st.caption("DeepDrishti Biodiversity Assessment System • Machine learning predictions are probabilistic bioinformatic indicators.")