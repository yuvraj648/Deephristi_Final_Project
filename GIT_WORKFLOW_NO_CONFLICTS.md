# 🛡️ Git Conflict Prevention & Safe Team Workflow Guide

When multiple teammates work on the **DeepDrishti** codebase at the same time, Git conflicts and push errors can happen if everyone works directly on the `main` branch. 

This guide provides the **exact workflow** and **golden rules** to guarantee that team members can work simultaneously on the same or different files **without clashing, losing code, or facing errors**.

---

## 🌟 The 4 Golden Rules (Prevents 95% of Conflicts)

1. 🚫 **NEVER write code directly on `main`** — Always create your own feature branch.
2. 🔄 **Always pull the latest code before starting work** — `git pull origin main`.
3. 💬 **Quick communication** — If you are going to edit a file (e.g. `App.tsx` or `server.js`), send a 5-second message in your team WhatsApp/group: *"I'm editing server.js for the next hour"*.
4. 📦 **Commit frequently in small pieces** — Don't wait 3 days to push 50 files. Push 1-2 completed files at a time.

---

## 🚀 The Safe Daily Workflow (Follow This Every Time)

```
       [origin/main] ────────────────────────────────────────► (Clean Production)
             │                                                      ▲
             ▼                                                      │ (Pull Request Merge)
       git checkout -b feature/my-task                              │
             │                                                      │
             ▼                                                      │
        Make edits ──► git add . ──► git commit ──► git push ───────┘
```

---

### Step 1: Start from the Latest Code

Before you start writing any new code:
```cmd
git checkout main
git pull origin main
```
*(This ensures your local PC has all the latest changes your teammates pushed).*

---

### Step 2: Create Your Own Branch

Name the branch with your name or the feature you are working on:
```cmd
git checkout -b feature/yuvraj-metrics-ui
```
*(Or `feature/asmit-backend-api`, `bugfix/login-contrast`, etc.)*

👉 You are now in your **own safe playground**. Anything you code here **cannot break anyone else's code**, and nobody can break yours!

---

### Step 3: Write Code & Test Locally

Make your edits in VS Code or your editor, test that it runs:
```cmd
git status
```
*(Shows exactly which files you modified).*

---

### Step 4: Commit Your Changes

```cmd
git add .
git commit -m "feat: improve contrast for enhancement lab metrics"
```

---

### Step 5: Sync with Main Before Pushing (Crucial!)

While you were coding, your teammate might have pushed something to `main`. To bring their changes into your branch safely without conflicts:

```cmd
git pull origin main --rebase
```

- If there are **no overlapping lines**: Git automatically combines everything smoothly!
- If there are overlapping edits: Git will pause and ask you to pick the lines (see Section below).

---

### Step 6: Push Your Branch to GitHub

```cmd
git push -u origin feature/yuvraj-metrics-ui
```

---

### Step 7: Merge on GitHub (Pull Request)

1. Open your repository: **https://github.com/yuvraj648/Deephristi_Final_Project**
2. You will see a yellow banner: **"feature/yuvraj-metrics-ui had recent pushes"** with a green button: **"Compare & pull request"**.
3. Click **"Compare & pull request"**.
4. GitHub automatically checks: ✅ **"Able to merge. These branches can be automatically merged."**
5. Click **"Create pull request"** → Click **"Merge pull request"** → Click **"Confirm merge"**.

🎉 Done! Your code is now cleanly merged into `main` with zero clashes!

---

## ⚠️ What To Do In Common Scenarios

---

### Scenario A: "Git rejected my push! (non-fast-forward)"

**Why this happened:** Someone else pushed changes to `main` while you were on `main`.

**How to fix in 10 seconds:**
```cmd
git pull --rebase origin main
git push origin main
```

---

### Scenario B: You have unfinished edits and need to pull teammate's updates

**Why this happened:** Git says *"error: Your local changes to the following files would be overwritten by merge"*.

**How to fix:**
```cmd
git stash
git pull origin main
git stash pop
```
*(This safely hides your work, downloads teammate updates, and brings your work back).*

---

### Scenario C: Two people edited the EXACT same lines in the same file (Merge Conflict)

Git will notify you:
```
CONFLICT (content): Merge conflict in SURVEILLANCE/DeepDrishti/frontend/src/App.tsx
Automatic merge failed; fix conflicts and then commit the result.
```

**Don't panic! Here is how to resolve it in 60 seconds:**

1. Open the conflicted file in **VS Code**.
2. You will see markers created by Git:
   ```typescript
   <<<<<<< HEAD (Current Change - Your Code)
   const theme = "dark-cyan";
   =======
   const theme = "ocean-blue";
   >>>>>>> origin/main (Incoming Change - Teammate's Code)
   ```
3. Above that block, VS Code shows 4 clickable buttons:
   - **Accept Current Change** (Keep your version)
   - **Accept Incoming Change** (Keep teammate's version)
   - **Accept Both Changes** (Keep both)
4. Click the one you and your teammate agree on (or manually edit the lines to combine them).
5. Delete any remaining `<<<<<<<`, `=======`, `>>>>>>>` markers and save the file.
6. Tell Git the conflict is resolved:
   ```cmd
   git add .
   git commit -m "fix: resolve merge conflict in App.tsx"
   git push
   ```

---

## 📋 Emergency Cheatsheet

| Goal | Command |
| :--- | :--- |
| **Check where you are & what changed** | `git status` |
| **Switch to main & get newest code** | `git checkout main` then `git pull origin main` |
| **Create and jump into a new branch** | `git checkout -b <branch-name>` |
| **Save your work temporarily** | `git stash` |
| **Restore saved work** | `git stash pop` |
| **Discard all local changes in a file** | `git checkout -- <file-path>` |
| **View branch list** | `git branch` |
| **Update your feature branch with main** | `git pull origin main --rebase` |

---

## 🤝 Golden Team Agreement

To ensure smooth sailing:
- **Teammate A (eDNA / AI models)**: Focuses on `E-DNA/project files/`
- **Teammate B (Surveillance UI & Backend)**: Focuses on `SURVEILLANCE/DeepDrishti/`
- When both need to touch root files or shared configs, notify in chat first!
