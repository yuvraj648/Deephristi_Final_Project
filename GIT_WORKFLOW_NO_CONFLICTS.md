# 🛡️ Conflict-Free Git Collaboration Guide — DeepDrishti

When multiple team members work on the project at the same time, **never push directly to `main`**. 

Instead, **every person creates their own branch**, works independently without disturbing anyone else, pushes their branch to GitHub, and later merges into `main` using a **Pull Request (PR)**.

---

## 💡 The Core Rule: Different Branches, Merged Later

```
                    ┌─── [Person 1 Branch: yuvraj-ui] ──── (Works independently) ────┐
                    │                                                                 ▼
[main branch] ──────┴──────────────────────────────────────────────────────────► [Merged main]
                    │                                                                 ▲
                    └─── [Person 2 Branch: asmit-api] ──── (Works independently) ────┘
```

- **Person 1** works on their own branch: `yuvraj-ui`
- **Person 2** works on their own branch: `asmit-api`
- Both can edit, test, and push to GitHub **at the exact same time without errors or clashing**!
- Once tested, each person merges their branch into `main` on GitHub with 1 click.

---

## 🚀 Step-by-Step Daily Workflow for Each Person

---

### 🌅 Step 1: Start of the Day (Always Get Latest Code)
Before writing any new code, ensure your computer has whatever was merged yesterday:

```cmd
git checkout main
git pull origin main
```

---

### 🌿 Step 2: Create YOUR Own Branch
Create a new branch with your name and what you are building:

**For Person 1:**
```cmd
git checkout -b yuvraj-ui-changes
```

**For Person 2:**
```cmd
git checkout -b asmit-backend-api
```

*(The `-b` flag creates the branch and immediately switches you into it).*

> [!TIP]
> You are now in your own private sandbox! Anything you modify, break, or test here **cannot affect your teammate's code**, and their work cannot affect yours.

---

### 💻 Step 3: Write Code & Test Locally
Open VS Code, modify your files, and test your code (`npm run dev`, `python app.py`, etc.).
To check what files you changed at any time:
```cmd
git status
```

---

### 💾 Step 4: Save (Commit) Your Work Locally
When your feature or fix is working:
```cmd
git add .
git commit -m "feat: updated enhancement lab metrics display"
```

---

### ☁️ Step 5: Push YOUR Branch to GitHub
Do **NOT** push to `main`. Push your own branch name:

**Person 1 runs:**
```cmd
git push -u origin yuvraj-ui-changes
```

**Person 2 runs:**
```cmd
git push -u origin asmit-backend-api
```

*(Both pushes will succeed 100% without blocking or rejecting each other!)*

---

### 🤝 Step 6: Merge on GitHub (Pull Request)

Once your branch is pushed:
1. Go to your repository in your browser:  
   👉 **[https://github.com/yuvraj648/Deephristi_Final_Project](https://github.com/yuvraj648/Deephristi_Final_Project)**
2. You will see a yellow banner at the top with a green button: **"Compare & pull request"**.
3. Click **"Compare & pull request"**.
4. GitHub checks: ✅ **"Able to merge automatically."**
5. Click **"Create pull request"**.
6. Review the changes with your teammate, then click **"Merge pull request"** → **"Confirm merge"**.

🎉 **Your changes are now safely merged into `main`!**

---

### 🔄 Step 7: Ready for the Next Task
Once your branch is merged on GitHub, return your local CMD to `main` and pull:
```cmd
git checkout main
git pull origin main
```
Your local `main` is now completely up to date with all merged work! For your next task, start again from **Step 2**.

---

## ⚠️ Common Questions & Emergency Fixes

### Q1: My teammate merged their branch into `main` while I am still working on mine. How do I get their updates into my branch?
Inside your branch, run:
```cmd
git pull origin main --rebase
```
Git will smoothly bring in their new code underneath yours!

---

### Q2: I have half-finished code and need to switch branches or pull.
If Git says *"your local changes would be overwritten"*, do this:
```cmd
git stash
git pull origin main
git stash pop
```
*(This safely tucks away your half-finished work, updates the repo, and puts your work right back).*

---

### Q3: Two people edited the exact same line in the same file.
When you open the file in VS Code, Git marks the spot:
```
<<<<<<< HEAD (Your branch code)
const port = 5003;
=======
const port = 5005;
>>>>>>> origin/main (Teammate's code)
```
VS Code gives you 3 clickable buttons above it:
- **Accept Current Change** (keep yours)
- **Accept Incoming Change** (keep teammate's)
- **Accept Both Changes** (keep both)

Click the option you agree on, save the file, and commit:
```cmd
git add .
git commit -m "fix: resolve conflict"
git push
```

---

## 📋 Quick Command Summary

| Action | Command |
| :--- | :--- |
| **Get latest updates from main** | `git checkout main` && `git pull origin main` |
| **Create your own branch** | `git checkout -b <your-name-feature>` |
| **Check which files you edited** | `git status` |
| **Save your changes locally** | `git add .` && `git commit -m "your message"` |
| **Push your branch to GitHub** | `git push -u origin <your-branch-name>` |
| **Switch back to main** | `git checkout main` |
| **See all branches** | `git branch` |
