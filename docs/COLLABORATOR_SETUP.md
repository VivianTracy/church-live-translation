# Church Caption — Collaborator Setup Guide

For people new to GitHub and Cursor. This gets you from zero to running the app locally and contributing. **No microphone, OBS, or audio test setup** — just code and the web app.

---

## What you’re setting up

| Tool | Purpose |
|---|---|
| **GitHub account** | Access the shared code |
| **GitHub Desktop** | Download and sync code (no terminal git required) |
| **Node.js** | Runs the app on your computer |
| **Cursor** | Edit code and use AI assistance |
| **API keys** (from project lead) | Translation and shared captions |

**Repo:** https://github.com/VivianTracy/church-caption

---

## Part 1 — One-time setup

### Step 1: Create a GitHub account

1. Go to https://github.com/signup
2. Create an account and verify your email
3. Tell the project lead your GitHub username so they can **invite you** to the `church-caption` repository

You need that invite before cloning will work.

---

### Step 2: Install GitHub Desktop

1. Go to https://desktop.github.com
2. Download and install for Mac or Windows
3. Sign in with your GitHub account
4. When asked, allow access to the `VivianTracy/church-caption` repository

---

### Step 3: Download the project (clone)

1. Open **GitHub Desktop**
2. **File → Clone repository**
3. Open the **GitHub.com** tab
4. Select **`VivianTracy/church-caption`**
5. Choose a folder (e.g. `Documents/church-caption`)
6. Click **Clone**

Wait until the download finishes. You now have a local copy of the project.

---

### Step 4: Install Node.js

1. Go to https://nodejs.org
2. Download the **LTS** version (recommended)
3. Install with default options
4. To verify, open **Terminal** (Mac) or **Command Prompt** (Windows) and run:

```bash
node --version
npm --version
```

You should see version numbers (e.g. `v22.x` and `10.x`).

---

### Step 5: Install Cursor

1. Go to https://cursor.com
2. Download and install Cursor
3. Sign in when prompted (free account is fine)

---

### Step 6: Open the project in Cursor

1. Open **Cursor**
2. **File → Open Folder…**
3. Select the folder you cloned (e.g. `Documents/church-caption`)
4. Click **Open**

You should see folders like `app`, `components`, `lib`, and files like `README.md`.

---

### Step 7: Install project dependencies

1. In Cursor: **Terminal → New Terminal** (menu bar at top)
2. A panel opens at the bottom. Run:

```bash
npm install
```

Wait until it finishes (may take 1–2 minutes). You only need this once, or again after big project updates.

---

### Step 8: Add secret keys (`.env.local`)

The app needs API keys. **Ask the project lead** for:

- `GEMINI_API_KEY`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `OPENAI_API_KEY` (for `/operator-openai`)

Then:

1. In Cursor’s file list, open **`.env.example`**
2. **File → Save As…** → save as **`.env.local`** in the same folder (project root)
3. Replace the placeholder values with the real keys from the project lead
4. Save the file

**Important:** Never commit `.env.local` or share keys in chat/email publicly. It should stay on your machine only.

---

### Step 9: Start the app

In Cursor’s terminal:

```bash
npm run dev
```

When you see something like `Ready on http://localhost:3000`:

| Page | URL |
|---|---|
| Operator console | http://localhost:3000/operator |
| OBS overlay | http://localhost:3000/overlay |

Open those in **Chrome**. Keep the terminal running while you work. To stop the app: click the terminal and press **Ctrl+C** (Mac: **Control+C**).

---

## Part 2 — How to collaborate

### Daily start: get the latest code

Before you work each time:

1. Open **GitHub Desktop**
2. Make sure **church-caption** is selected
3. Click **Fetch origin**, then **Pull origin** if updates are available

Or in Cursor’s terminal:

```bash
git pull
```

---

### Make a change on your own branch

**Don’t edit `main` directly.** Use a branch for each task.

**In GitHub Desktop:**

1. **Current branch → New branch**
2. Name it something clear, e.g. `fix-qr-label` or `update-readme`
3. Click **Create branch**

**In Cursor:**

1. Edit files (or ask Cursor AI for help in the chat panel)
2. Save your files (**Cmd+S** / **Ctrl+S**)
3. Test with `npm run dev` if you changed app behavior

**Commit and upload:**

1. In **GitHub Desktop**, changed files appear on the left
2. Write a short summary, e.g. `Clarify audience link text on operator page`
3. Click **Commit to …** (your branch name)
4. Click **Push origin**

---

### Open a pull request (ask to merge your work)

1. After pushing, GitHub Desktop may show **Create Pull Request** — click it
2. Or go to https://github.com/VivianTracy/church-caption/pulls → **New pull request**
3. Set **base:** `main`, **compare:** your branch
4. Add a short description of what you changed
5. Click **Create pull request**

The project lead reviews and merges. After merge, pull `main` again before your next task.

---

## Part 3 — Using Cursor (basics)

| Action | How |
|---|---|
| Ask about the code | Open chat (**Cmd+L** / **Ctrl+L**), describe what you want |
| Edit a specific file | Click the file, describe the change in chat |
| Run the app | Terminal: `npm run dev` |
| See errors | Check the terminal panel; red text often explains the problem |

**Good prompts for collaborators:**

- “Explain what `app/operator/page.tsx` does in simple terms.”
- “Update the text on the audience card to say …”
- “Why isn’t the dev server starting?” (paste the error from the terminal)

---

## Part 4 — Quick troubleshooting

| Problem | What to try |
|---|---|
| Can’t clone repo | Confirm the project lead invited your GitHub account |
| `npm install` fails | Reinstall Node.js LTS; close and reopen Cursor |
| `GEMINI_API_KEY is not configured` | Check `.env.local` exists in project root and has real keys |
| Port already in use | Stop other `npm run dev` windows, or restart Cursor |
| Changes don’t show in browser | Hard refresh: **Cmd+Shift+R** / **Ctrl+Shift+R** |
| Git push rejected | Pull latest first: **Pull origin** in GitHub Desktop |

---

## Part 5 — What collaborators typically touch

Safe starting areas:

- Text and labels in `components/`
- Operator / overlay page copy in `app/operator/` and `app/overlay/`
- Documentation in `README.md`

Ask the project lead before changing:

- Translation prompts (`lib/translationPrompt.ts`)
- API routes (`app/api/`)
- Speech recognition or caption pipeline (`lib/useGeminiLiveOperator.ts`, etc.)

---

## Checklist for the project lead

Before a new collaborator starts, send them:

- [ ] GitHub repo invite
- [ ] `.env.local` values (secure channel)
- [ ] Link to this guide: [`docs/COLLABORATOR_SETUP.md`](./COLLABORATOR_SETUP.md)
- [ ] One small first task (e.g. copy tweak or doc fix)
- [ ] Your preferred way to review (GitHub PR comments, etc.)
