# DeepDrishti Project Audit and Change Log

**Audit date:** 2026-11-18
**Repository:** `yuvraj648/Deephristi_Final_Project`
**Branch / starting commit:** `main` / `e3f06ca`
**Purpose:** Record the project baseline, what the code appears to implement, what was verified in this environment, known blockers, and the repository history visible at audit time.

> **Credentials are intentionally not reproduced here.** The repository contains tracked files and documentation that may include credentials or demo passwords. Treat them as sensitive, inspect them privately, and rotate any value that is real or has ever been used outside a local demo.

## 1. Executive summary

DeepDrishti is a combined marine research and surveillance project with two application areas:

1. **eDNA biodiversity research:** a React/TypeScript researcher interface, a Python/FastAPI service for DNA predictions and expedition persistence, optional Supabase storage, local demo data, and several trained classification artifacts.
2. **Underwater surveillance:** a React/Vite dashboard, a Node/Express/MongoDB API, and a Python/Flask computer-vision service intended to enhance images, detect objects, and estimate relative depth.

The repository also contains launch scripts, sample data, model weights, documentation, a SQLite database, and a research-paper/reference library.

**Overall status:** this is a substantial prototype/codebase, not a fully verified end-to-end system at this checkout. The frontends have broad feature implementations and the Python/JavaScript source parses, but neither UI build could run because `node_modules` is absent. The eDNA API cannot currently start in the inspected Python environment because `fastapi` is not installed. No live database, model inference, browser UI, or five-service end-to-end session was exercised during this audit.

## 2. Repository inventory and audit coverage

At the start of this audit, Git reported **283 tracked files** and no pre-existing worktree changes. The tracked inventory included:

- 16 Markdown documents
- 11 Python files
- 67 JavaScript files
- 41 TSX and 12 TypeScript files
- React/Vite configuration, lockfiles, scripts, SQL migration, CSV datasets, local database, PDFs, office documents, and image/video assets
- Seven Git LFS model-weight files, present as downloaded objects in this checkout

The numeric inventory above is the state **before** adding this report.

### What was read or checked

- Read all 16 tracked Markdown documents, all Python application/model/test scripts, the launch scripts, the key app entry points, principal data services, selected routes/controllers, model configuration, and the Supabase migration.
- Inventoried the other tracked files and sizes, including model weights and large research/data assets.
- Reviewed frontend/backend integration references and searched broadly for API usage, mock/fallback code, and TODO/placeholder indicators.
- Checked all 11 Python files with Python's AST parser and all 67 `.js` files with `node --check`.
- Tried both frontend build commands and the surveillance backend package's test command.

This is not a line-by-line functional certification of all React components, every JavaScript controller, binary model internals, PDFs, or scientific source documents. It is a repository/status audit based on the complete tracked-file inventory, all Markdown/Python files, and representative application paths.

## 3. What is in the project

### A. eDNA researcher system

**Frontend:** `E-DNA/project files/UI/`
React 19, TypeScript, Vite, Tailwind, Lucide, and Supabase client.

The main UI has a landing/login/home flow, expedition creation and upload/configuration workflow, then a scientific workspace. The workspace includes overview, ASV explorer, taxonomy, biodiversity, map, community, novelty, AI analysis, comparison, reporting, and settings views. The app also has a surveillance-station launch/status page.

The data model separates samples, ASVs, and per-sample occurrence counts. The metrics module implements filtering and derived analyses including Shannon, Gini-Simpson, Pielou evenness, Bray-Curtis, Jaccard, site/taxon profiles, and KPI summaries. Upload parsing/validation code and hand-built verification scripts exist.

**Persistence modes:**

- Local mode seeds demo expeditions and stores uploaded data in memory/local storage, with optional asynchronous persistence to the local Python API.
- Supabase mode stores expedition metadata, samples, ASVs, and occurrences in PostgreSQL. The SQL migration creates tables, indexes, triggers, and RLS policies.
- The Python API also stores expeditions in `database.sqlite` and can migrate older JSON records.

**Python services and models:**

- `MODELS/api.py`: FastAPI endpoints for model metadata, single and multi-model prediction, expedition CRUD/embedding generation, and surveillance status/launch.
- `MODELS/app.py`: a separate Streamlit interface for model selection and comparison. It is not started by the supplied `START_PROJECT.bat`.
- `MODELS/model_manager.py`: loads and runs the CNN/novelty, COI XGBoost, and Tara DNABERT-2 paths.
- Model artifacts present include a Keras CNN and embedding model plus encoders/centroids, a COI XGBoost model and encoder, and a roughly 447 MB DNABERT-2 fine-tuned checkpoint/tokenizer.

**Scientific-data assets:** `ASV FILES/` contains ASV CSVs; `MODELS/database.sqlite` is approximately 52.8 MB; the main ASV CSV is approximately 63.9 MB.

### B. Underwater surveillance system

**Frontend:** `SURVEILLANCE/DeepDrishti/frontend/`
React 19, Vite, React Router, Axios, Tailwind, and PDF export utilities. Routes/pages cover login, dashboard, surveillance, enhancement lab, detection records, reports, system logs, settings, and a connection-test page. The dashboard can use API data; the codebase also contains local/demo fallback paths and local sample videos.

**Backend:** `SURVEILLANCE/DeepDrishti/backend/server/`
Express/Mongoose API with auth/JWT and role authorization, users/access requests, feeds, alerts, detections, dashboard analytics, reports/command dispatch, settings, system logs, and AI enhancement forwarding. `server.js` listens on the configured port (default 5003) and attempts MongoDB reconnection. Database-backed operation requires a real backend `.env`/MongoDB URI; only example files are part of the checkout.

**AI service:** `SURVEILLANCE/DeepDrishti/model/`
Flask service exposes `/health`, `/pipeline` and `/enhance`, plus saved outputs. It is coded to use:

- FUNIE-GAN for enhancement (`models/funie_final_improved.pth`)
- YOLO weights (`models/best.pt`) for object detection
- MiDaS loaded through PyTorch Hub for relative depth

The files also contain a separate custom U-Net implementation and weights (`model.py`, `model.pth`). The Flask pipeline shown in `app.py` actually instantiates FUNIE-GAN, YOLO, and MiDaS; it does not use that separate U-Net model. Additional `.pt`/`.pth` files appear to be alternate/checkpoint weights and are not all active in the runtime path.

The Node detection service has a fallback simulation path. Its current frame-capture method is explicitly a placeholder: it passes a feed URL/metadata rather than capturing a frame itself. Remote YouTube URLs are deliberately handled with simulated telemetry rather than actual AI inference in that service.

### C. Research and report materials

`review paper/` contains Python scripts for writing a LaTeX manuscript, existing PDFs, project documents/presentation, and a collection of eDNA research papers. The scripts are not integrated into either application. The paper-generation scripts point to a user-specific Windows Desktop path, so they are not portable as checked in; the generator also does not create that parent directory before opening its output.

## 4. What is verified now

| Area | Result |
|---|---|
| Python syntax | **Pass:** 11/11 tracked `.py` files parsed successfully. |
| JavaScript syntax | **Pass:** 67/67 tracked `.js` files passed `node --check`. This does not compile JSX or execute the server. |
| eDNA UI production build | **Not run successfully:** `npm run build` exited 1 because `tsc` is unavailable; the UI's dependencies are not installed. |
| Surveillance UI production build | **Not run successfully:** `npm run build` exited 1 because `vite` is unavailable; the UI's dependencies are not installed. |
| Surveillance backend tests | **No usable test run:** the top-level backend's `npm test` script intentionally prints “no test specified” and exits 1. |
| Python runtime dependencies | Most checked ML/Flask packages are discoverable, but **FastAPI is absent** in this Python environment. |
| Model files | **Present:** relevant model artifacts are in the checkout/LFS. File presence does not prove weights load or yield valid predictions. |
| Live services, browser UI, MongoDB/Supabase, inference | **Not exercised** during this audit. |

The eDNA frontend contains `verifyMetrics.ts`, `verifyUpload.ts`, and `verifyBackend.ts`, but the package manifest does not provide a test script/runner for them. Their presence is useful prior art, not evidence that they passed in this environment.

## 5. Main problems and limitations found

### Blockers / high priority

1. **eDNA FastAPI service is not launchable in the inspected Python environment as-is.** `api.py` imports FastAPI, but `importlib` found no `fastapi` package. The root setup instructions list it as a manual install, but there is no dedicated eDNA `requirements.txt` to reproduce the environment reliably.
2. **Neither frontend has dependencies installed.** Both UI build commands fail before compiling project code. As a result, there is no verified build or working browser interface at this audit point.
3. **Surveillance database-backed operation is unconfigured in the checkout.** `server.js` expects `MONGODB_URI`; it logs an error and keeps the HTTP process running if the variable is missing, while DB-backed features will fail. No actual backend `.env` is present in the tracked project inventory.
4. **The eDNA API's surveillance launcher path is wrong for this repository layout.** `SURVEILLANCE_DIR` resolves to `<repo>\DeepDrishti\DeepDrishti`; the real directory is `<repo>\SURVEILLANCE\DeepDrishti`. Consequently `/surveillance/launch` looks for `run_all.bat` in the wrong location.
5. **Depth-unavailable handling can break the surveillance AI request.** The Flask pipeline permits MiDaS loading to fail, but if YOLO is available it still calls `estimate_distance(depth_map, ...)`; that helper indexes the map and cannot handle `None`. The request then errors rather than returning detections without depth. The Node service catches Flask failures and falls back to empty simulated telemetry, which can conceal the AI failure from operators.
6. **Automated surveillance detection is not real live-video capture yet.** The backend's periodic service labels frame capture as a simulation/placeholder. YouTube feeds produce simulated no-threat results instead of frames sent through the model. The Flask AI endpoint itself accepts images/video/URLs, but the always-on backend path does not currently provide genuine captured frames for those feeds.

### Data durability / scientific interpretation

- In local eDNA mode, full expedition saves are sent to the local API asynchronously. If the API is offline, the UI warns and keeps data in memory/local storage, but local storage deliberately truncates large records (sample/ASV/occurrence caps). After a page reload, a large upload may not be recoverable in full without the local API or Supabase.
- Supabase persistence requires valid environment variables, a provisioned Supabase project, and the migration to have been applied. None of those external conditions were verified.
- The displayed model accuracy/F1 values are metadata in code/docs; this audit did not reproduce training or validate those metrics against held-out data. Treat model output as unvalidated research predictions, not operationally certified detections/classifications.
- The surveillance depth-to-meters calculation is a heuristic over normalized monocular depth. It is not calibrated physical ranging.

### Secret and configuration hygiene

- The tracked-file list includes `SURVEILLANCE/DeepDrishti/frontend/.env` and `E-DNA/project files/cred.txt`. Their values were not opened or copied into this report. Confirm privately whether they contain credentials; rotate any live values and remove them from Git history if necessary.
- The root README and other docs contain demo-login information. Do not treat demo credentials as secure accounts. The root `.gitignore` does not globally exclude `.env`/credential files, despite onboarding text saying environment files are excluded.
- The eDNA API uses wildcard CORS and binds to `0.0.0.0` when launched directly. This is a local-development setup, not a production security configuration.

## 6. Documentation audit: all tracked Markdown files

- [`README.md`](./README.md) — top-level architecture, ports, installation, launch steps, and demo access. It describes five services, but some security/configuration statements conflict with the actual tracked files.
- [`TEAM_INSTRUCTIONS.md`](./TEAM_INSTRUCTIONS.md) — onboarding, LFS, environment setup, and collaboration. Its 330-file count does not match the 283 tracked files found in this checkout; its claims that `.env` files are excluded and that the repository contents are clean of credentials are also contradicted by the tracked inventory.
- [`GIT_WORKFLOW_NO_CONFLICTS.md`](./GIT_WORKFLOW_NO_CONFLICTS.md) — branch-per-person, pull-request workflow; latest version is the current documentation baseline.
- [`command for setup.txt`](./command%20for%20setup.txt) — manual npm/Python install command reference.
- [`how to launch.txt`](./how%20to%20launch.txt) — five-terminal launch commands and demo access details.
- [`E-DNA/project files/UI/README.md`](<./E-DNA/project files/UI/README.md>) — mostly uncustomized Vite/React template notes, not a product-specific user guide.
- [`E-DNA/project files/UI/supabase/README.md`](<./E-DNA/project files/UI/supabase/README.md>) — Supabase project, schema migration, environment, and local fallback setup.
- [`SURVEILLANCE/DeepDrishti/README.md`](./SURVEILLANCE/DeepDrishti/README.md) — surveillance architecture walkthrough. Several folder names in its layout (`BACKEND`, `FRONTEND`, `ENHANCE_MOD`) do not match the current checkout.
- [`SURVEILLANCE/DeepDrishti/walkthrough.md`](./SURVEILLANCE/DeepDrishti/walkthrough.md) — detailed intended AI, API, model, UI, and end-to-end workflow; contains claims not verified here and some older absolute file paths.
- [`SURVEILLANCE/DeepDrishti/backend/README.md`](<./SURVEILLANCE/DeepDrishti/backend/README.md>) — backend feature/API overview and local setup; should be cross-checked against the current implementation.
- [`SURVEILLANCE/DeepDrishti/backend/AUTHENTICATION_SYSTEM.md`](<./SURVEILLANCE/DeepDrishti/backend/AUTHENTICATION_SYSTEM.md>) — authentication, roles, endpoints, and demo account documentation.
- [`SURVEILLANCE/DeepDrishti/backend/RATE_LIMITING_FIX_REPORT.md`](<./SURVEILLANCE/DeepDrishti/backend/RATE_LIMITING_FIX_REPORT.md>) — reports tested credentials/rate-limit changes. Current `authRoutes.js` uses 30 login and 50 general requests per 15 minutes, not the report's stated 10/30 values; the report's “ready for production” conclusion was not independently verified.
- [`SURVEILLANCE/DeepDrishti/backend/server/MARINE_SURVEILLANCE_README.md`](<./SURVEILLANCE/DeepDrishti/backend/server/MARINE_SURVEILLANCE_README.md>) — marine backend routes and test-server instructions; describes `/detect`, while the present Flask app exposes `/pipeline` and `/enhance`.
- [`SURVEILLANCE/DeepDrishti/backend/server/README_AUTH.md`](<./SURVEILLANCE/DeepDrishti/backend/server/README_AUTH.md>) — a second authentication guide with role/default-account documentation.
- [`SURVEILLANCE/DeepDrishti/frontend/README.md`](<./SURVEILLANCE/DeepDrishti/frontend/README.md>) — generic Vite template guide.
- [`SURVEILLANCE/DeepDrishti/frontend/INTEGRATION_GUIDE.md`](<./SURVEILLANCE/DeepDrishti/frontend/INTEGRATION_GUIDE.md>) — claims complete integration but references older ports 5174/5006; current launcher/Vite configuration uses 5175/5003.
- [`SURVEILLANCE/DeepDrishti/frontend/CONNECTION_FIX_REPORT.md`](<./SURVEILLANCE/DeepDrishti/frontend/CONNECTION_FIX_REPORT.md>) — describes prior auth/API work and test claims. Those historical claims do not replace a current build or integration test.
- [`SURVEILLANCE/DeepDrishti/model/README.md`](<./SURVEILLANCE/DeepDrishti/model/README.md>) — describes a U-Net `/enhance` service, whereas the current Flask app runs the FUNIE-GAN/YOLO/MiDaS pipeline; update this guide to reflect current implementation.

## 7. Python file-by-file summary

All 11 Python files passed syntax parsing.

| File | Purpose / current finding |
|---|---|
| [`E-DNA/project files/MODELS/api.py`](<./E-DNA/project files/MODELS/api.py>) | FastAPI predictions, SQLite expedition CRUD/embedding endpoint, and surveillance status/launch integration. FastAPI is missing in the current Python environment; surveillance launch path is incorrect. |
| [`E-DNA/project files/MODELS/app.py`](<./E-DNA/project files/MODELS/app.py>) | Separate Streamlit multi-model UI. It displays “3 Models Active” as fixed text even though the sidebar reports per-model load status. |
| [`E-DNA/project files/MODELS/model_manager.py`](<./E-DNA/project files/MODELS/model_manager.py>) | Model loading, sequence cleaning/features, three inference paths, and model metadata. Heavy model initialization/inference was not executed. |
| [`SURVEILLANCE/DeepDrishti/model/app.py`](<./SURVEILLANCE/DeepDrishti/model/app.py>) | Flask computer-vision API. Includes enhancement, detection, depth, URL/video input, and output saving; depth-unavailable handling noted above. |
| [`SURVEILLANCE/DeepDrishti/model/model.py`](<./SURVEILLANCE/DeepDrishti/model/model.py>) | Standalone custom U-Net definition; not the primary architecture instantiated by the Flask pipeline. |
| [`SURVEILLANCE/DeepDrishti/model/models/funie_gan.py`](<./SURVEILLANCE/DeepDrishti/model/models/funie_gan.py>) | FUNIE-GAN generator architecture used by the Flask service. |
| [`SURVEILLANCE/DeepDrishti/model/test_client.py`](<./SURVEILLANCE/DeepDrishti/model/test_client.py>) | Manual client for `/health` and `/enhance`; requires a running server and a local test image. |
| [`review paper/build_full_paper.py`](<./review paper/build_full_paper.py>) | Writes a large LaTeX manuscript to a hard-coded user Desktop path; not portable and not executed. |
| [`review paper/build_master.py`](<./review paper/build_master.py>) | Initializes/truncates a `.tex` file at a hard-coded user Desktop path. |
| [`review paper/build_sections.py`](<./review paper/build_sections.py>) | Minimal append helper targeting the same hard-coded path; prints initialization text. |
| [`review paper/test_write.py`](<./review paper/test_write.py>) | One-line Python print smoke test. |

## 8. Repository history visible at audit time

The local Git history contains four commits on `main`:

1. `fa95573` — initial unified project/source/data/model commit.
2. `79f839f` — added team onboarding instructions and backend environment example.
3. `e86327c` — added the conflict-free Git workflow guide.
4. `e3f06ca` — clarified branch-per-person and pull-request workflow (starting HEAD for this audit).

This is the history available in the checkout; it does not establish whether earlier project work exists outside this repository history.

## 9. Change log for this audit session

### 2026-11-18 — Initial project baseline and audit report

- Added this `logs.md` with the initial project inventory, architecture summary, documentation/Python catalog, verification results, known blockers, and visible Git history.
- No application source, model, dataset, environment, launcher, or dependency file was changed.
- No services were started, no credentials were copied into the report, and no model was retrained.
- Initial worktree was clean before this file was added. This report is the only intended workspace change from this audit.

## 10. Recommended next steps

1. **Handle credentials first:** privately review tracked `.env`/credential files and demo credentials; rotate live secrets; update `.gitignore` and Git history as appropriate.
2. **Make setup reproducible:** add a pinned eDNA Python dependency manifest; install Node dependencies from each lockfile; then run both frontend builds and linters.
3. **Repair service wiring:** correct the surveillance launcher path in the eDNA API and verify the master batch/PowerShell launchers on Windows.
4. **Stabilize AI behavior:** allow detection without MiDaS, surface genuine model errors instead of silently turning them into empty detection telemetry, and implement actual frame capture for automated surveillance.
5. **Run integration tests with safe local configuration:** verify MongoDB/Supabase setup, authentication and role restrictions, upload/persistence round trips, and all service health endpoints.
6. **Reconcile docs with code:** update port numbers, folder layouts, endpoints, model descriptions, and rate-limit values; distinguish simulated/demo behavior from live inference.
7. **Validate scientific/model claims:** run reproducible held-out tests and document calibration/limitations before presenting reported model metrics or depth estimates as reliable.

## 11. 2026-11-18 — Dependencies installed and five services started

This is a follow-up to the initial project audit above. The initial statement that no services had been started describes the audit at that time; the startup work below happened afterward.

### Dependency work

- Installed Node dependencies for the E-DNA UI (`E-DNA/project files/UI`) and the Surveillance frontend and API (`SURVEILLANCE/DeepDrishti/frontend` and `SURVEILLANCE/DeepDrishti/backend`). The projects' lockfiles were used where available.
- Installed E-DNA Python dependencies into the repository-root `.venv`. A first install under `E-DNA/project files/MODELS/.venv` hit Windows' long-path limit while extracting TensorFlow; the working environment is at the shorter root path. The incomplete nested environment may remain on disk.
- Installed Surveillance AI Python dependencies and `yt-dlp` into `SURVEILLANCE/DeepDrishti/model/.venv`.
- `npm` was invoked through `npm.cmd` because PowerShell blocked the npm shim. The E-DNA UI install reported that `core-js` and `esbuild` install scripts were not allowed; its dev server nevertheless returned HTTP 200.

### Services and current runtime status

All five local endpoints returned HTTP 200 during the verification on 2026-11-18:

| Part | Service | URL | Observed status |
| --- | --- | --- | --- |
| E-DNA | UI | http://127.0.0.1:5173/ | HTTP 200 |
| E-DNA | FastAPI | http://127.0.0.1:8000/models | HTTP 200; CNN and COI XGBoost ACTIVE, Tara DNABERT-2 ERROR |
| Surveillance | AI inference (Flask) | http://127.0.0.1:5001/health | HTTP 200; FUNIE, MiDaS and YOLO loaded; CPU device |
| Surveillance | API | http://127.0.0.1:5003/api/v1/health | HTTP 200; API process reports running |
| Surveillance | UI | http://127.0.0.1:5175/ | HTTP 200 |

### Known runtime limitations

- Tara DNABERT-2 is registered but does not load. Hugging Face remote-code loading fails because the cached model module cannot find `flash_attn_triton.py`. Its API metadata still includes reported accuracy metrics; those figures are not evidence that this model is currently running.
- The Surveillance API has no backend `.env`/MongoDB URI configured. Its health endpoint is reachable, but database-backed authentication and persistence are not verified and are expected to require configuration.
- The Surveillance inference service is running on CPU.
- No test suite, frontend production build, or model evaluation was run as part of this startup task. Verification was limited to service HTTP responses and reported model health.
- Dependency installation may have changed generated lockfiles; inspect `git status` before committing. No source model code or weights were intentionally changed.

## 12. 2026-11-18 - Community promoted to researcher-level navigation

### Changes

- Added a Community action to the Researcher Home header and a top-level Community screen that can return to Research Home.
- Removed Community from the expedition workspace sidebar and stopped rendering it inside the expedition workspace.
- Detached the Community page from selected-expedition data, including its station selector; station tagging is now free text.
- Marked seeded posts and interactions as sample content, removed fabricated online indicators and profile-verification claims, and clarified that posts are not persisted.
- Fixed Community page issues found during validation: unused imports, invalid icon props, and children on a void input element.

### Validation

- `npm.cmd run lint` in `E-DNA/project files/UI`: passed with existing warnings in other pages and shared code.
- `npx.cmd vite build` in `E-DNA/project files/UI`: passed. Vite reported existing chunk-size and ineffective dynamic-import warnings.
- `npm.cmd run build` in `E-DNA/project files/UI`: still fails at the repository-wide TypeScript check because of pre-existing unused imports in `AsvExplorerPage.tsx`, `ComparePage.tsx`, `NoveltyPage.tsx`, and `ReportPage.tsx`. The changed Community page has no remaining TypeScript errors.

## 13. 2026-11-18 - Community page visual and interaction polish

### Changes

- Rebuilt the page hierarchy with a clearer responsive header, preview notice, feed controls, and a two-column feed/resources layout.
- Removed the duplicate highlight cards and invented researcher/trending panels; channel tags and counts now come from the posts shown in the local preview.
- Removed misleading read totals and the nonfunctional share action, and clarified that preview posts, reactions, and replies are not saved or shared.
- Reworked the dispatch composer and controls for more consistent spacing, responsive behavior, and accessible labels/states.
- Corrected the Community JSX wrapper nesting that had collapsed the feed layout.

### Validation

- `npm.cmd run lint` in `E-DNA/project files/UI`: passed; reported existing warnings in unrelated files.
- `npx.cmd vite build` in `E-DNA/project files/UI`: passed with existing chunk-size and dynamic-import warnings.
- Browser checked the desktop and mobile layouts, home/community navigation, channel filtering, and adding a post to the temporary preview.
- `npm.cmd run build` remains blocked by pre-existing unused imports in other analysis pages; no TypeScript errors were reported for `CommunityPage.tsx`.

## 14. Community shared header and typography cleanup

### Changes

- Reused the shared application header on the standalone Community page, with a cross-expedition context instead of selected-expedition metrics.
- Added Research Home and Surveillance actions to that header, and removed the duplicate oversized hero header from Community.
- Kept the Community composer, filters, bookmarks, endorsements, and discussions as clearly labeled local-preview interactions.
- Removed unused Source Serif and IBM Plex Mono downloads; `font-sans`, `font-serif`, and `font-mono` utilities now resolve to IBM Plex Sans for consistent typography throughout the application.

### Validation

- `npm.cmd run lint` passed with existing warnings in unrelated files and shared code.
- `npx.cmd vite build` passed with existing chunk-size and ineffective dynamic-import warnings.
- Browser checked Researcher Home → Community, the shared header, adding a dispatch in the local preview, and returning to Research Home.
- `npm.cmd run build` remains blocked by pre-existing unused imports in `AsvExplorerPage.tsx`, `ComparePage.tsx`, `NoveltyPage.tsx`, and `ReportPage.tsx`; it reported no errors in the changed files.

## 15. 2026-11-18 - Supabase Community persistence

### Changes

- Added `E-DNA/project files/UI/supabase/migrations/002_community_schema.sql` for shared posts, comments, post/comment endorsements, and private bookmarks, with author-scoped Row Level Security.
- Added authenticated aggregate functions for endorsement counts and the current researcher's own endorsement/bookmark state; individual endorsement identities are not exposed to other researchers.
- Added `communityService.ts` and connected Community feed loading, publishing, commenting, endorsements, and bookmarks to Supabase.
- Kept Offline Local Mode separate from Supabase sign-in so its clearly labeled sample feed remains an in-memory preview; cloud mode reads only database posts.
- Updated the UI login/App flow to tell Community whether the researcher is using Supabase or Offline Local Mode.
- Added Supabase migration/setup notes to both UI and Supabase README files.

### Validation and setup status

- The offline Community route was exercised in the browser, including rendering sample posts and opening the composer.
- Lint and Vite production build passed; the full TypeScript build remains blocked by existing unused-import diagnostics in unrelated analysis pages.
- The new SQL migration has not been applied to a live Supabase project and could not be executed locally because PostgreSQL/Supabase CLI tools are unavailable. Apply migration 001 first, then 002; cloud operations and multi-researcher RLS behavior remain unverified until tested against Supabase.

## 16. 2026-11-18 - Cinematic landing hero

### Changes

- Added `HeroPage` as the first screen at `/`; its final action opens the existing platform-selection page, preserving the researcher and surveillance flows.
- Copied the supplied 10-second, 1280×720 exploration video into the UI public assets and generated a compressed poster frame from the video for loading/static fallbacks.
- Added a sticky, scroll-scrubbed scene driven by GSAP ScrollTrigger, with six narrative beats, a progress indicator, subtle scientific annotations, and the requested platform-entry actions. Video seeks are throttled through animation frames; the video does not autoplay or loop.
- Added GSAP as a UI dependency for the scroll-driven timeline.
- Lazy-loaded the hero and GSAP bundle separately from the main application chunk.
- Labeled depth, coordinates, expedition ID, and sequence status as illustrative rather than live telemetry.
- Added a short poster-led mode for small/coarse-pointer or low-power devices and for `prefers-reduced-motion`.
- Updated the browser document title for the new entry experience.

### Validation

- `npm.cmd run lint` passed with existing warnings in unrelated files.
- `npx.cmd vite build` passed with existing chunk-size and dynamic-import warnings.
- `npm.cmd run build` remains blocked by the same existing unused imports in `AsvExplorerPage.tsx`, `ComparePage.tsx`, `NoveltyPage.tsx`, and `ReportPage.tsx`; it reported no errors in the new hero code.
- Browser verified the initial hero, the first scroll transition and video scrubbing, the platform CTA, mobile poster mode, and reduced-motion mode.
- Vite development server is running at `http://127.0.0.1:5173/`.
- Installing GSAP reported 13 dependency audit advisories (1 moderate, 12 high); no automatic dependency fixes were applied.
