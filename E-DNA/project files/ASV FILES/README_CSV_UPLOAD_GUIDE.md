# DeepDrishti eDNA Platform — CSV Upload & File Format Specification

This document clarifies the required CSV file formats for uploading amplicon sequence variants (ASVs), running AI/ML prediction models, and generating complete oceanographic biodiversity analyses.

---

## 1. Analysis of Your Two Files: `dna_extension.csv` and `occurrence.csv`

The two files you generated follow the **Darwin Core / OBIS-ENV-eDNA standard**:

| File Name | Purpose in Darwin Core Archive | Key Columns Present | What It Supplies to DeepDrishti |
| :--- | :--- | :--- | :--- |
| **`dna_extension.csv`** | DNA-Derived Extension | `occurrenceID`, `eventID`, `DNA_sequence`, `target_gene`, `pcr_primer_forward` | **The raw biological DNA sequences** (A, C, G, T) for AI model prediction. |
| **`occurrence.csv`** | Occurrence Core Table | `occurrenceID`, `eventID`, `organismQuantity`, `decimalLatitude`, `decimalLongitude`, `kingdom`..`species` | **Sampling metadata, GPS coordinates, depth, read counts, and prior taxonomy.** |

### How They Link:
Both files share the unique identifier **`occurrenceID`** (e.g. `05114c01_12_edna_1_S_occ1`).
- `asv_table.csv` in your folder is the **combined/merged master file** where the `DNA_sequence` from `dna_extension.csv` has been merged with the `Reads`, `FilterID`, and taxonomy from `occurrence.csv`.

---

## 2. General CSV Formats Supported by DeepDrishti

DeepDrishti supports two upload workflows:

### Workflow A: AI Analysis Page (Predicting Taxonomy with Neural Models)
*Go to: Left Sidebar → **AI Analysis** → "Select ASV Matrix or Sequences Table"*

**Purpose:** Feed raw nucleotide sequences to **DeepDrishti 18S-V9 CNN**, **COI XGBoost**, and **DNABERT-2** to predict full 7-level Linnaean taxonomy, confidence scores, and detect candidate novel lineages.

**Required Minimal Columns:**
```csv
ASV_ID,Sequence,Reads
ASV_00001,GCTACTACCGATTGAACATTTTAGTGAGGTCCTCGGACTGTGAGCCAGGCGGGTCGCCCTGCCTGGTCTACGGGAAGACGACCAAACTGTAGTGTTTAGAGGAAGTAAAAGTCGTAACAAGGTTTCC,14825
ASV_00002,TACTACCGATTGAATGTTTTAGTGAGGCCTTCGGACTGCGACCGGGCGGGTCGCCCGGCTTGGTCTACGGGAAGACGACCAAACTGTAGTGTTTAGAGGAAGTAAAAGTCGTAACAAGGTTTCC,9540
```
- **`Sequence`** (or `DNA_sequence`): Nucleotide string (A, C, G, T) with length $\ge 20$ bp. *(Mandatory)*
- **`ASV_ID`** (or `occurrenceID`, `id`, `name`): Identifier for the variant. *(Optional — auto-generated if omitted)*
- **`Reads`** (or `organismQuantity`, `abundance`, `count`): Sequence read abundance. *(Optional — defaults to 100)*

> **Direct Upload Note:** You can now upload `dna_extension.csv` directly into the AI Analysis page — it automatically extracts the `DNA_sequence` column and `occurrenceID`!

---

### Workflow B: Full Expedition Ingestion (Overview, Map, Biodiversity, Taxonomy)
*Go to: Expediton Setup / Workflow → Data Source Select*

**Purpose:** Ingests complete survey datasets to generate the full interactive suite: **Hydrographic GIS Map**, **$\alpha$, $\beta$, $\gamma$ Biodiversity Indices**, **Linnaean Taxonomy Trees**, and **Publication Reports**.

**Standard Long Format (`reference_asv_template.csv`):**
```csv
ASV_ID,Sequence,Sample_ID,Reads,Latitude,Longitude,Depth_m
ASV_00001,GCTACTACCGATTGAACATTTTAGTGAGGTCCTCGGACT...,Station_01_12m,14825,15.1240,68.8520,12
ASV_00002,TACTACCGATTGAATGTTTTAGTGAGGCCTTCGGACTG...,Station_01_12m,9540,15.1240,68.8520,12
ASV_00003,GCTACTACCGATTGAATATTTTAGTGAGGTCCTCGGAC...,Station_01_50m,22459,15.1240,68.8520,50
```

**Columns Explained:**
1. **`ASV_ID`**: Unique ID for the amplicon variant.
2. **`Sequence`**: The pure nucleotide sequence.
3. **`Sample_ID`**: Identifier of the water sample or station (e.g. `05114c01_12_edna_1`).
4. **`Reads`**: Integer abundance of reads recovered in that sample.
5. **`Latitude` & `Longitude`**: Decimal degrees (e.g. `15.1240`, `68.8520`). Enables immediate plotting on the Tactical GIS Map.
6. **`Depth_m`**: Sampling depth in meters (e.g. `12`, `500`). Powers depth stratification analysis.

---

## 3. Ready-to-Use Reference Files in This Folder

Two reference template files have been created in `E-DNA/project files/ASV FILES/`:

1. **`reference_asv_template.csv`**
   - Clean, lightweight template without prior taxonomy.
   - Upload this to **AI Analysis** to let the machine learning models predict all 7 taxonomic ranks automatically.
2. **`reference_asv_with_taxonomy_template.csv`**
   - Includes columns for `Kingdom`, `Phylum`, `Class`, `Order`, `Family`, `Genus`, `Species`.
   - Ideal for loading benchmark datasets that already have SILVA / NCBI blast assignments.

---

## 4. Nucleotide Validation Rules
- Sequences must contain valid IUPAC standard characters: `A`, `C`, `G`, `T` (or ambiguity code `N`).
- Sequences shorter than 15 bp are automatically filtered out to ensure statistical classification validity.
- Remove whitespace and line breaks within sequence strings.
