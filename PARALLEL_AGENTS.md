# Parallel Agents Protocol

This file is the single source of truth for running parallel Claude Code agents on the Wibecode RPG bot project. Each "Run" launches 2-6 agents (A, B, C, D, E, F) in separate git worktrees, plus Agent 0 (orchestrator) in the main repo.

For completed run history (Runs 2–16), see `PARALLEL_AGENTS_HISTORY.md`.

---

## Agent 0 Self-Protocol

**You are Agent 0.** When someone tells you "read PARALLEL_AGENTS.md — you are Agent 0", follow this checklist automatically:

### Checklist (do in order)

**Phase A — Merge & Deploy the CURRENT run:**
1. **Check git status** — is main clean? Any uncommitted changes?
2. **Check for leftover worktrees** — `git worktree list`. If worktrees exist from a previous run, it means agents finished but weren't merged yet.
3. **Read the current Run section** below — check each agent's retrospective (they should have replaced their placeholders).
4. **Check for unmerged work** — `git log main..feature/BRANCH --oneline` for each agent branch. If commits exist, merge them.
5. **Merge order**: Backend/data first → Tests second → Frontend last.
6. **Post-merge integration**: Read any `REGISTER_THESE_RUN*.md` files in `bot/src/handlers/` to see if new commands need wiring into `index.ts`.
7. **Build verification**: `cd bot && npm run build` and `cd mini-app && npm run build`.
8. **Deploy**: Push to GitHub → SSH to server → git pull → rebuild → PM2 restart.
9. **⚠️ SEND COMPLETION NOTIFICATION — MANDATORY, DO NOT SKIP.** Use the Notification Command below to send a Telegram summary IMMEDIATELY after deploy. Include: run number, 1-line summary per agent, deploy status. If you forget this step, the user has NO visibility into what was deployed. This is as important as the deploy itself.
10. **Clean up**: Remove worktrees, delete feature branches, clear stashes.

**Phase B — Prepare the NEXT run:**
11. **Write retrospective** for the current run (merge results, what went right, issues carried forward).
12. **Design next run's tasks** — analyze the codebase, read "Known Issues" and agent recommendations, and write the next Run section with full agent prompts.
13. **Pre-allocate retrospective sections** — create a named placeholder for each agent (see Run Template below). This prevents merge conflicts.
14. **Write copy-paste prompts** — at the top of the next Run section, include a "Copy-Paste Prompts" block with the exact text the user should paste into each Claude Code session.
15. **Set up worktrees** for the next run: create branches, `git worktree add`, install deps.
16. **Commit & push** the updated PARALLEL_AGENTS.md.
17. **Tell the user**: "Ready to launch Run N. Here are your copy-paste prompts."
18. **Archive completed runs** — after the next run is set up, move the completed run section to `PARALLEL_AGENTS_HISTORY.md` to keep this file lean. Update the history file header range.

**The cycle**: Each Agent 0 merges Run N, then prepares Run N+1. The user just copies the prompts and launches.

### Deploy Command
```bash
git push origin main
ssh root@85.239.58.205 "cd /opt/wibecode-bot && git pull && cd bot && npm install && npm run build && cd ../mini-app && npm run build && pm2 restart telegram-rpg-bot --update-env"
```

### Notification Command
**IMPORTANT:** Send from local Python only. Do NOT attempt via SSH (the SSH client may timeout while the server-side command still executes, causing duplicate sends — this happened in Run 14).

```python
# Run from project root: python -c "..." (one-liner below)
# Or save as .tmp/notify.py and run: python .tmp/notify.py

import os, json, urllib.request
env = {}
for line in open('.env'):
    if '=' in line and not line.startswith('#'):
        k, v = line.strip().split('=', 1)
        env[k] = v
token = env['TELEGRAM_NOTIFICATION_BOT_TOKEN']
chat_id = env['TELEGRAM_NOTIFICATION_CHAT_ID']
msg = """<b>Run N merged and deployed</b>

Agent A: [summary]
Agent B: [summary]

Issues: None"""
data = json.dumps({'chat_id': chat_id, 'text': msg, 'parse_mode': 'HTML'}).encode()
req = urllib.request.Request(f'https://api.telegram.org/bot{token}/sendMessage', data=data, headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req)
result = json.loads(resp.read())
print('Sent!' if result.get('ok') else f'FAILED: {result}')
```

### Worktree Setup Command
```bash
git branch feature/BRANCH-A 2>/dev/null
git branch feature/BRANCH-B 2>/dev/null
git branch feature/BRANCH-C 2>/dev/null
git worktree add ../Wibecode-agent-a feature/BRANCH-A
git worktree add ../Wibecode-agent-b feature/BRANCH-B
git worktree add ../Wibecode-agent-c feature/BRANCH-C
# Install deps in each worktree (node_modules is gitignored)
cd ../Wibecode-agent-a/mini-app && npm install
cd ../../Wibecode-agent-b/bot && npm install
cd ../../Wibecode-agent-c/bot && npm install
```

### Worktree Cleanup Command
```bash
git worktree remove ../Wibecode-agent-a
git worktree remove ../Wibecode-agent-b
git worktree remove ../Wibecode-agent-c
git branch -d feature/BRANCH-A feature/BRANCH-B feature/BRANCH-C
```

---

## Safety Protocol (ALL AGENTS MUST FOLLOW)

### Git Rules
- You are in a **git worktree** — you are ALREADY on your branch. Do NOT run `git checkout`.
- **Commit after EVERY task** — use atomic: `git add FILES && git commit -m "MSG"` in one Bash call.
- Do NOT push to remote. Do NOT deploy to server.

### File Boundaries
- Each agent has an **OWNED** file list — you may freely edit these.
- Each agent has a **FORBIDDEN** file list — you must NEVER edit these.
- **GRAY AREA** files are listed with specific rules on what you may change.
- If you need a change in a FORBIDDEN file, add a TODO comment in your branch.

### Build Verification
- After your changes, run the relevant build command to verify no compilation errors.
- Do NOT run the full app or connect to production database.

### Retrospective
- After all tasks, find your **pre-allocated section** in PARALLEL_AGENTS.md under "Run N Retrospectives".
- **Replace** the placeholder text `*(To be filled by Agent X)*` with your retrospective.
- Do NOT add new headings or write outside your section.
- Include: problems faced, completed task table, recommendations for next run.

---

## Lessons Learned

### Run 1 (shared directory — DISASTER)
- All 4 agents shared one git working directory. Branch switching caused: wrong-branch commits, file loss, VSCode linter conflicts, 14 stash entries, context exhaustion.
- **Fix**: Separate working directories (git worktrees).

### Run 2 (git worktrees — SUCCESS)
- Each agent got its own worktree. Zero branch conflicts, file loss, or cross-contamination.
- Only PARALLEL_AGENTS.md had merge conflicts (all agents append retrospectives to same location).

### Runs 3–12 (retrospective conflicts — SOLVED)
- Every run had 2-3 merge conflicts in PARALLEL_AGENTS.md because all agents wrote to the same "bottom" location.
- **Fix**: Pre-allocate named retrospective sections per agent before branching. Each agent edits different lines → git auto-merges cleanly.
- Run 12 (6 agents) still had PARALLEL_AGENTS.md conflicts because Agent F committed to main instead of worktree — this shifted the merge base for all subsequent merges. The `git checkout --ours` + manual retrospective splice pattern resolved all 5 conflicts.

### Key Rules (proven across 16 runs)
1. **Worktrees are mandatory** — never share a working directory between agents.
2. **Commit after every single task** — uncommitted work gets lost.
3. **Atomic git ops** — `git add && git commit` in one Bash call.
4. **Pre-install deps** in each worktree before agents start.
5. **3-6 tasks per agent** is the sweet spot (7+ risks context exhaustion).
6. **Agent A (mini-app) is the most independent** — zero overlap with bot/tools.
7. **Pre-allocate retrospective sections** — prevents merge conflicts.
8. **GRAY AREA files** (client.ts, server.ts, registerJobs.ts) need explicit rules on what each agent may change.
9. **Merge backend first** — frontend agents depend on API changes.
10. **6 agents is manageable** — Run 12 proved it, but conflicts increase with GRAY AREA files.
11. **NEVER skip the notification** — Run 15+16 were merged without notifying the user. Always send via local Python.
12. **Archive completed runs** — move finished runs to PARALLEL_AGENTS_HISTORY.md to keep this file under 300 lines.

---

## Run Template

Use this structure when creating a new run. Copy and adapt:

```markdown
## RUN N: Parallel Agents (X Agents + Agent 0)

### Focus: [Brief description of what this run delivers]

### Copy-Paste Prompts
**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
[prompt]

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
[prompt]

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
[prompt]

### [Agent A/B/C task blocks with OWNED/FORBIDDEN/GRAY AREA files]

### Run N File Ownership Matrix
[table]

### Run N Merge Order
[numbered list]

### Run N Retrospectives

#### Agent A Retrospective
*(To be filled by Agent A)*

#### Agent B Retrospective
*(To be filled by Agent B)*

#### Agent C Retrospective
*(To be filled by Agent C)*
```

---

## Known Issues (Updated after Run 17)

### Resolved (Runs 13–17)
- ~~PATCH /progress authorization~~ — Fixed in Run 15
- ~~checkAchievements() double-wrap bug~~ — Fixed in Run 15
- ~~Bare API endpoints~~ — All endpoints now return `{success, data}` (Runs 15+16)
- ~~achievement_manager.py broken columns~~ — Fixed in Run 16
- ~~client.ts `any` return types~~ — Replaced with proper types in Run 16
- ~~Dead updateQuestProgress code~~ — Removed in Run 15
- ~~`checkAchievements()` uses `any[]`~~ — Fixed in Run 17 Agent A (now `Achievement[]`)
- ~~Leaderboard endpoints return `any[]`~~ — Fixed in Run 17 Agent A (now `LeaderboardEntry[]`)
- ~~Admin API responses lack `{success, data}` wrapper~~ — Fixed in Run 17 Agent B
- ~~`API_BASE_URL` duplicated in 6 files~~ — Fixed in Run 17 Agent C (shared adminClient.ts)
- ~~App.tsx repeats onboarding check~~ — Fixed in Run 17 Agent C (ProtectedRoute component)
- ~~6 stale `REGISTER_THESE_*.md` files~~ — Deleted in Run 17 Agent B

### Still Open
1. **Quests page crash** — ErrorBoundary triggers when opening Quests tab. Likely `useMainButton` empty text or null quest fields. **→ Fix in Run 18 Agent A**
2. **Status bar collision on Dashboard** — Safe area inset top missing on all page headers. **→ Fix in Run 18 Agent A + B**
3. **"Awards" / "Achievements" naming inconsistency** — Nav says "Awards", page says "Achievements". **→ Rename to "Rewards" in Run 18 Agent A**
4. **Profile avatar_id not returned by stats API** — `resolveUser()` omits `avatar_id` from SELECT. **→ Fix in Run 18 Agent C**
5. **No delete account feature** — Settings has no way to deactivate account. **→ Add in Run 18 Agent B + C**
6. **Verify `user_stats` view in achievement_manager.py** — `check_and_unlock_achievements()` queries columns that may not exist as a view.
7. **pg-boss Node.js mismatch** — Requires 22.12+, server has 20.20. Only triggers warnings, no functional impact yet.
8. **Mode configs unused** — `mode_configs` table stores quiz responses + personalized plans, but data is never consumed.

---

## RUN 18: Mini-App Bug Fixes (3 Agents + Agent 0)

### Focus: Fix 5 user-reported bugs — quest crash, status bar overlap, "Rewards" naming, avatar display, delete account

### Copy-Paste Prompts

**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md you are Agent 0 for Run 18
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read PARALLEL_AGENTS.md — you are Agent A for Run 18. Your job: fix the Quests page crash (null safety + useMainButton guard + defensive API response handling in client.ts), add safe-area-inset-top padding to Dashboard/Quests/Achievements headers, and rename "Awards"/"Achievements" to "Rewards" in Navigation.tsx and Achievements.tsx. Follow the Safety Protocol. Commit after each task. Write your retrospective when done.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read PARALLEL_AGENTS.md — you are Agent B for Run 18. Your job: add safe-area-inset-top to Profile and Settings headers, add a "Delete Account" danger zone to Settings with Telegram showConfirm() confirmation, add deleteAccount() method to client.ts (append only), and wire up the delete flow. Follow the Safety Protocol. Commit after each task. Write your retrospective when done.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read PARALLEL_AGENTS.md — you are Agent C for Run 18. Your job: fix resolveUser() in users.ts to include avatar_id in SELECT and return object, fix PATCH /profile RETURNING clause to include avatar_id, and add DELETE /users/:telegramId/account endpoint (soft delete: is_active=false, anonymize PII). Follow the Safety Protocol. Commit after each task. Write your retrospective when done.
```

---

### Agent A — Mini-App: Quest Crash Fix + Safe Area + Naming

**Branch:** `feature/r18-miniapp-fixes`
**Worktree:** `../Wibecode-agent-a`

**Tasks:**
1. **Fix quest API safety in `client.ts`** — in `getActiveQuests()` and `getCompletedQuests()`, add guard: if `res.data` is not an array but has `.quests`, unwrap it. Ensures both response formats work.
2. **Fix Quests.tsx null safety** — add null checks for quest fields used in rendering: `quest.difficulty?.charAt(0)`, default values for `quest.title`, `quest.description`, etc. In the quest detail modal (line 270), guard against null difficulty.
3. **Fix useMainButton empty text** — in `useTelegram.ts`'s `useMainButton` hook (line 110), only call `MainButton.setText(text)` when text is non-empty. When text is empty, call `MainButton.hide()` and return early from the effect.
4. **Add safe-area-inset-top to page headers** — Add CSS class `.safe-area-top { padding-top: env(safe-area-inset-top, 0px); }` to `index.css`. Apply to gradient headers in: `Dashboard.tsx` (line 221), `Quests.tsx` (line 198), `Achievements.tsx` (line 155).
5. **Rename "Awards" to "Rewards"** — In `Navigation.tsx` line 15: change `label: 'Awards'` to `label: 'Rewards'`. In `Achievements.tsx` line 158: change title text to `Rewards`.
6. **Build verification**: `cd mini-app && npm run build`

**OWNED files:**
- `mini-app/src/api/client.ts` (quest methods only — do NOT add new methods)
- `mini-app/src/pages/Quests.tsx`
- `mini-app/src/pages/Dashboard.tsx`
- `mini-app/src/pages/Achievements.tsx`
- `mini-app/src/components/Navigation.tsx`
- `mini-app/src/hooks/useTelegram.ts` (only `useMainButton` function)
- `mini-app/src/index.css`

**FORBIDDEN:**
- `bot/**`, `tools/**`, `database/**`
- `mini-app/src/App.tsx`
- `mini-app/src/pages/Profile.tsx`
- `mini-app/src/pages/Settings.tsx`
- `mini-app/src/components/ProfileEditModal.tsx`

---

### Agent B — Mini-App: Profile + Delete Account UI

**Branch:** `feature/r18-profile-settings`
**Worktree:** `../Wibecode-agent-b`

**Tasks:**
1. **Add safe-area-inset-top to Profile and Settings headers** — Use inline style `style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}` on: `Profile.tsx` header div (line 126), `Settings.tsx` header div (line 212).
2. **Add "Delete Account" section to Settings.tsx** — Below the Save button, add a danger-zone section: red Trash2 icon, "Delete Account" title, "Permanently remove your account and all data" subtitle, red outlined button.
3. **Add confirmation flow** — Use `showConfirm()` from `useTelegram` hook. Message: "Are you sure? This will permanently delete your account, progress, and all data. This cannot be undone."
4. **Add `deleteAccount()` method to `client.ts`** — GRAY AREA: append ONE new method at the end of the ApiClient class: `async deleteAccount(telegramId: number): Promise<ApiResponse<{ message: string }>>` using `this.client.delete(\`/users/\${telegramId}/account\`)`.
5. **Wire up delete flow in Settings.tsx** — On confirm: call API → success toast → `tg.close()`. On error: error toast.
6. **Build verification**: `cd mini-app && npm run build`

**OWNED files:**
- `mini-app/src/pages/Profile.tsx`
- `mini-app/src/pages/Settings.tsx`
- `mini-app/src/components/ProfileEditModal.tsx`

**FORBIDDEN:**
- `bot/**`, `tools/**`, `database/**`
- `mini-app/src/App.tsx`
- `mini-app/src/pages/Dashboard.tsx`, `Quests.tsx`, `Achievements.tsx`
- `mini-app/src/components/Navigation.tsx`
- `mini-app/src/hooks/useTelegram.ts`

**GRAY AREA:**
- `mini-app/src/api/client.ts` — may ONLY append a new `deleteAccount()` method. Do NOT modify existing methods.

---

### Agent C — Backend: Avatar Fix + Delete Account API

**Branch:** `feature/r18-backend`
**Worktree:** `../Wibecode-agent-c`

**Tasks:**
1. **Fix `resolveUser()` to include `avatar_id`** — In `users.ts` `resolveUser()` SQL (line 18), add `u.avatar_id` to SELECT. In return object (line 38), add `avatar_id: u.avatar_id ?? null`.
2. **Fix PATCH `/profile` RETURNING clause** — In line 607, add `avatar_id` to RETURNING. In response object (lines 621-628), add `avatar_id: user.avatar_id`.
3. **Add `DELETE /users/:telegramId/account` endpoint** — Soft delete: `UPDATE users SET is_active = false, first_name = 'Deleted User', username = NULL WHERE telegram_id = $1`. Require `authenticateTelegram`. Return `{ success: true, data: { message: 'Account deleted successfully' } }`.
4. **Build verification**: `cd bot && npm run build`

**OWNED files:**
- `bot/src/api/routes/users.ts`

**FORBIDDEN:**
- `mini-app/**`, `tools/**`, `database/**`
- `bot/src/index.ts`, `bot/src/api/server.ts`
- `bot/src/api/routes/quests.ts`, `achievements.ts`, `admin-*.ts`
- `bot/src/jobs/**`

---

### Run 18 File Ownership Matrix

| File | Agent A | Agent B | Agent C |
|------|---------|---------|---------|
| mini-app/src/api/client.ts | **OWN** (quest methods) | GRAY (append only) | — |
| mini-app/src/pages/Quests.tsx | **OWN** | FORBID | — |
| mini-app/src/pages/Dashboard.tsx | **OWN** | FORBID | — |
| mini-app/src/pages/Achievements.tsx | **OWN** | FORBID | — |
| mini-app/src/components/Navigation.tsx | **OWN** | FORBID | — |
| mini-app/src/hooks/useTelegram.ts | **OWN** (useMainButton) | FORBID | — |
| mini-app/src/index.css | **OWN** | — | — |
| mini-app/src/pages/Profile.tsx | FORBID | **OWN** | — |
| mini-app/src/pages/Settings.tsx | FORBID | **OWN** | — |
| mini-app/src/components/ProfileEditModal.tsx | FORBID | **OWN** | — |
| bot/src/api/routes/users.ts | — | — | **OWN** |
| PARALLEL_AGENTS.md | retro only | retro only | retro only |

### Run 18 Merge Order
1. **Agent C** (backend) — avatar fix + delete API must exist before frontend
2. **Agent A** (mini-app fixes) — quest crash fix, safe area CSS, naming
3. **Agent B** (profile + settings) — depends on Agent A's CSS + Agent C's API

### Run 18 Retrospectives

#### Agent A Retrospective
| # | Task | Status |
|---|------|--------|
| 1 | Fix quest API safety in client.ts (unwrap `.quests`, fallback to `[]`) | Done |
| 2 | Fix Quests.tsx null safety (difficulty, title, description, frequency guards) | Done |
| 3 | Fix useMainButton empty text guard (hide + early return when text is empty) | Done |
| 4 | Add safe-area-inset-top CSS class + apply to Dashboard/Quests/Achievements headers | Done |
| 5 | Rename "Awards" to "Rewards" in Navigation.tsx, "Achievements" to "Rewards" in Achievements.tsx | Done |
| 6 | Build verification (`tsc && vite build`) | Passed |

**Problems faced:** None — all tasks were straightforward.

**Commits:** 5 atomic commits (one per task), all on `feature/r18-miniapp-fixes`.

**Recommendations for next run:**
- The quest detail modal has `selectedQuest.mode` rendering that could benefit from null checks on `mode.icon` / `mode.display_name`.
- Consider extracting a shared `QuestDifficultyBadge` component — the difficulty-to-color mapping is duplicated in QuestCard, quest detail modal, and Dashboard's QuestCardMini.

#### Agent B Retrospective
*(To be filled by Agent B)*

#### Agent C Retrospective
**Completed Tasks:**
| # | Task | Status |
|---|------|--------|
| 1 | Add `avatar_id` to `resolveUser()` SELECT + return object | Done |
| 2 | Add `avatar_id` to PATCH `/profile` RETURNING clause + response | Done |
| 3 | Add `DELETE /users/:telegramId/account` endpoint (soft delete, anonymize PII) | Done |
| 4 | Build verification (`npm run build`) | Pass — zero errors |

**Problems:** None. All three tasks were straightforward single-file edits.

**Implementation Notes:**
- `resolveUser()` now includes `u.avatar_id` in SELECT; return object has `avatar_id: u.avatar_id ?? null`.
- PATCH `/profile` RETURNING now includes `avatar_id`; response object includes `avatar_id: user.avatar_id`.
- DELETE endpoint does soft delete: `is_active = false`, `first_name = 'Deleted User'`, `username = NULL`. Only updates rows where `is_active = true` (idempotent). Invalidates user cache. Returns `{ success: true, data: { message } }`.

**Recommendations for Next Run:**
- Consider also nullifying `timezone` in delete if stricter GDPR compliance is needed.
- The POST `/users` creation endpoint returns `RETURNING *` so `avatar_id` is already present, but the response isn't explicitly shaped like `resolveUser()` — low priority to align.

#### Agent 0 Retrospective
*(To be filled by Agent 0 after merge & deploy)*

<!-- Next run goes here. Agent 0 will append RUN 19 below this line. -->
