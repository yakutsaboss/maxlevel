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

## Known Issues (Updated after Run 16)

### Resolved (Runs 13–16)
- ~~PATCH /progress authorization~~ — Fixed in Run 15 (authorizeUser + ownership check)
- ~~checkAchievements() double-wrap bug~~ — Fixed in Run 15 (passthrough)
- ~~Bare API endpoints~~ — All endpoints now return `{success, data}` (Runs 15+16)
- ~~achievement_manager.py broken columns~~ — Fixed in Run 16 (xp_bonus, badge_icon, JSONB criteria)
- ~~client.ts `any` return types~~ — Replaced with proper types in Run 16
- ~~Dead updateQuestProgress code~~ — Removed in Run 15
- ~~client.ts manual checkin wrapping~~ — Fixed in Run 15

### Still Open
1. **`checkAchievements()` uses `any[]`** — `newAchievements` is typed as `any[]`. Should be `Achievement[]` once verified against backend response shape.
2. **Leaderboard endpoints return `any[]`** — Define a `LeaderboardEntry` type once the shape stabilizes across all-time/weekly/monthly/mode views.
3. **`intensity_level` type mismatch** — Backend likely returns number, but pages use string. Audit and align.
4. **Wire `punishment_manager.py` into punishmentCheck job** — The Python tool exists but the pg-boss `punishmentCheck` job doesn't call it yet.
5. **Verify `user_stats` view in achievement_manager.py** — `check_and_unlock_achievements()` queries columns that may not exist as a view. Verify on production DB.
6. **pg-boss Node.js mismatch** — Requires 22.12+, server has 20.20. Only triggers warnings, no functional impact yet.
7. **Mode configs unused** — `mode_configs` table stores quiz responses + personalized plans, but data is never consumed.

---

### Run 17 Retrospectives

#### Agent C Retrospective

**All 7 tasks completed. Build passes with zero errors.**

| # | Task | Status |
|---|------|--------|
| 1 | Create `api/adminClient.ts` (shared API_BASE_URL + adminFetch) | Done |
| 2 | Refactor `Admin.tsx` — import from adminClient | Done |
| 3 | Refactor 4 admin components — replace local API_BASE_URL | Done |
| 4 | Create `ProtectedRoute.tsx` component | Done |
| 5 | Refactor `App.tsx` — use ProtectedRoute, remove PageWrapper | Done |
| 6 | Fix `useTelegram.ts` — replace `(tg as any)` with `in` type guards | Done |
| 7 | Build verification | Done (0 errors) |

**Problems faced:** None. The worktree was clean, all file boundaries were respected, and the build passed on the first try.

**Key decisions:**
- `adminClient.ts` exports both `API_BASE_URL` (for components using raw `fetch()`) and `adminFetch()` (for Admin.tsx). Kept it simple — no auto-unwrap logic since the components already handle `data.data || data` patterns themselves.
- `ProtectedRoute` accepts `needsOnboarding` as a prop (not context) since it's local state in AppContent. Also accepts `lazy` boolean for lazy-loaded pages.
- App.tsx shrank by 30 lines — from repeated ternary patterns to clean `<ProtectedRoute>` wrappers.

**Recommendations for next run:**
- The 4 admin components (AdminBroadcast, AdminJobs, AdminLogs, AdminUserList) still use raw `fetch()` with `API_BASE_URL` — they could be further refactored to use `adminFetch()` to reduce boilerplate (auth headers). Not done here because the task spec only asked to deduplicate `API_BASE_URL`.
- Consider adding an `AdminContext` or `useAdmin()` hook to avoid prop-drilling `credentials` through every admin component.

<!-- Next run goes here. Agent 0 will append RUN 18 below this line. -->
