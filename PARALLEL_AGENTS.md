# Parallel Agents Protocol

This file is the single source of truth for running parallel Claude Code agents on the Wibecode RPG bot project. Each "Run" launches 2-6 agents (A, B, C, D, E, F) in separate git worktrees, plus Agent 0 (orchestrator) in the main repo.

For completed run history (Runs 2–23), see `PARALLEL_AGENTS_HISTORY.md`.

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
18. **Archive completed runs (every 5 runs)** — after Runs 30, 35, 40, etc., move all completed runs except the latest to `PARALLEL_AGENTS_HISTORY.md`. Update both file headers (line 5 here + line 3 in history) with the new run range. Between archive points, completed runs stay in the main file.

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

## Deploy Verification Protocol

### The Problem
During a multi-hour debugging session (pre-Run 25), the developer repeatedly restarted `telegram-rpg-api` (PM2 ids 1,2) instead of `telegram-rpg-bot` (PM2 id 0). Nginx routes **all traffic** to port 3000, which is served exclusively by `telegram-rpg-bot`. The `telegram-rpg-api` cluster process exists in `ecosystem.config.js` but receives **zero traffic**. There was also no way to verify which code version was running on the server.

### Which PM2 Process to Restart
- **ALWAYS restart:** `telegram-rpg-bot` (PM2 id 0, fork mode, port 3000)
- **NEVER restart:** `telegram-rpg-api` (PM2 ids 1-2, cluster mode — NOT used by nginx)
- **NEVER restart:** `telegram-rpg-scheduler` (PM2 id 3 — disabled)

### How to Verify a Deploy
After restarting, curl the health endpoint and check the `version` field:
```bash
curl -s https://yakutsa.ru/health | python3 -m json.tool
```
The response includes:
- `version` — should match the latest git commit hash (set by deploy script)
- `build_timestamp` — when the build was deployed
- `uptime` — should be low (seconds) after a fresh restart

### Preferred Deploy Method
Use the deploy script from the project root:
```bash
./scripts/deploy.sh
```
This script: pushes to GitHub, SSHs to server, builds bot + mini-app, restarts ONLY `telegram-rpg-bot`, waits 3 seconds, then verifies the version matches.

### Manual Fallback
If the deploy script fails or is unavailable:
```bash
git push origin main
ssh root@85.239.58.205 "cd /opt/wibecode-bot && git pull && cd bot && npm install && npm run build && cd ../mini-app && npm run build && BUILD_VERSION=$(git rev-parse --short HEAD) BUILD_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ) pm2 restart telegram-rpg-bot --update-env"
# Then verify:
curl -s https://yakutsa.ru/health | python3 -m json.tool
```

### Agent 0 Deploy Checklist
When deploying after a merge:
1. Push to `origin/main`
2. SSH and pull
3. Build bot: `cd bot && npm install && npm run build`
4. Build mini-app: `cd mini-app && npm run build`
5. Set version env vars and restart: `BUILD_VERSION=<hash> BUILD_TIMESTAMP=<iso> pm2 restart telegram-rpg-bot --update-env`
6. Wait 3 seconds
7. Verify: `curl -s https://yakutsa.ru/health` — check `version` matches the commit hash
8. Send Telegram notification

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
12. **Archive completed runs** — every 5 runs (after Run 30, 35, 40, etc.), move all completed runs except the latest to PARALLEL_AGENTS_HISTORY.md. Update both file headers with the new range.

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

## Known Issues (Updated after Run 25)

### Still Open
1. **pg-boss Node.js mismatch** — Requires 22.12+, server has 20.20. Only triggers warnings, no functional impact yet.
2. **Mode configs unused** — `mode_configs` table stores quiz responses + personalized plans, but data is never consumed.
3. **Delete account e2e testing** — confirm soft delete flow works end-to-end in Telegram (Agent B Run 18 recommendation).
4. **POST /analytics/export still uses executePythonTool** — Justified (Google Sheets OAuth integration), only remaining Python subprocess in ALL routes + jobs.
5. **Local SQL helpers duplicated** — `getUserByTelegramId`, `listAllModes`, `getUserActiveModes` now exist locally in `handlers/onboarding.ts`. Could extract to shared `utils/queries.ts` (Agent A Run 24 recommendation).
6. **Test setup.ts still mocks old wrapper functions** — `__tests__/setup.ts` mocks removed pythonTools wrappers (Agent D Run 24 recommendation).

### Resolved (Run 25)
- ~~Authorization gap — cross-user access~~ — `requireOwnership(req)` added to all routes using `:telegramId`/`:userId` params; previously only quests.ts enforced ownership (Run 25 Agent A)
- ~~Non-idempotent XP award in onboarding~~ — Idempotency guard checks `onboarding_state.current_step = 'completed'` before processing (Run 25 Agent C)
- ~~Onboarding mode-add outside transaction~~ — Mode creation + quest assignment moved inside transaction block for atomicity (Run 25 Agent C)
- ~~Onboarding state UPSERT missing~~ — UPDATE replaced with INSERT...ON CONFLICT for robustness (Run 25 Agent C)
- ~~Missing reminders table in DELETE account~~ — Added `DELETE FROM reminders` to soft-delete transaction (Run 25 Agent C)
- ~~Dead structured logger~~ — Rewrote `logger.ts` with JSON output, request tracing via `requestId`, replaced raw console.* in middleware (Run 25 Agent B)
- ~~No request tracing~~ — Request context middleware generates `requestId` per request, logs start/finish with duration (Run 25 Agent B)
- ~~No deploy version verification~~ — `/health` now returns `version` + `build_timestamp`; `scripts/deploy.sh` auto-verifies (Run 25 Agent E)
- ~~PM2 process confusion (telegram-rpg-api vs telegram-rpg-bot)~~ — Added WARNING comment to ecosystem.config.js, documented Deploy Verification Protocol (Run 25 Agent E)
- ~~telegramId=0 silent failure in Onboarding.tsx~~ — Changed from `user?.id || 0` to `user?.id` with proper null handling (Run 25 Agent D)
- ~~Double-fire completeOnboarding stacking XP~~ — Added `useRef(false)` guard in LaunchScreen.tsx (Run 25 Agent D)
- ~~API error sends users to onboarding~~ — Changed catch default to `setNeedsOnboarding(false)` in App.tsx (Run 25 Agent D)

### Resolved (Run 24)
- ~~`updateStreak()` duplicated~~ — Extracted to shared `utils/streak.ts`, used by quests.ts + users.ts (Run 24 Agent D)
- ~~Python tools called by handlers~~ — ALL handler executePythonTool calls migrated to native SQL (Run 24 Agents A/B + Agent 0)
- ~~Python tools called by jobs~~ — dailyQuestReset + questReminders + streakCheck all native SQL (Run 24 Agent C)
- ~~settings.ts BROKEN Python command~~ — Fixed notification toggle + reminder hour with direct SQL UPDATE (Run 24 Agent B)
- ~~pythonTools.ts bloated wrappers~~ — 261→83 lines, all unused wrappers removed (Run 24 Agent D)

### Resolved (Runs 13–23)
- ~~Leaderboard getXpValue/getXpLabel duplication~~ — Exported from TopThreeCard, imported in LeaderboardRow (Run 23 Agent A)
- ~~Dashboard state management inline~~ — Extracted to `useDashboardData` hook (Run 23 Agent B)
- ~~Profile streak section inline~~ — Extracted to `ProfileStreak` component (Run 23 Agent B)
- ~~Settings/Quests loading skeletons inline~~ — Extracted to QuestsSkeleton + SettingsSkeleton (Run 23 Agent A)
- ~~quests.ts uses executePythonTool (6 calls)~~ — All migrated to native SQL (Run 23 Agent C)
- ~~modes.ts uses executePythonTool (1 call)~~ — Migrated to native SQL (Run 23 Agent D)
- ~~onboarding.ts uses executePythonTool (2 calls)~~ — Migrated to native SQL (Run 23 Agent E)
- ~~users.ts PATCH /streak broken~~ — Fixed with native SQL, was calling nonexistent Python command (Run 23 Agent E)
- ~~`errorResponse()` unused~~ — Removed in Run 22 Agent D
- ~~Loading skeletons inline (Dashboard/Profile/Leaderboard/Achievements)~~ — Extracted in Run 22 Agents A/B/C
- ~~Profile.tsx data loading not a hook~~ — Created `useProfileData` in Run 22 Agent C
- ~~Dashboard inline helpers~~ — Extracted StatCard/ModeCard/QuestCardMini/AchievementCard in Run 22 Agent C
- ~~Admin routes use executePythonTool~~ — admin-users.ts fully migrated (Run 22 Agent D), admin-stats.ts 3/4 migrated (Run 22 Agent E)
- ~~Express error middleware doesn't handle ApiError~~ — Fixed in Run 22 Agent D (proper status codes returned)

### Resolved (Runs 13–21, older)
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
- ~~Quests page crash~~ — Fixed in Run 18 Agent A (null safety + useMainButton guard)
- ~~Status bar collision on Dashboard~~ — Fixed in Run 18 Agent A + B (safe-area-inset-top)
- ~~"Awards"/"Achievements" naming~~ — Renamed to "Rewards" in Run 18 Agent A
- ~~Profile avatar_id not returned~~ — Fixed in Run 18 Agent C (resolveUser + PATCH RETURNING)
- ~~No delete account feature~~ — Added in Run 18 Agent B + C (soft delete + UI)
- ~~Pull-to-refresh duplicated across 4 pages~~ — Extracted to `usePullToRefresh` hook in Run 19 Agent A
- ~~QuestDifficultyBadge duplicated in 3 places~~ — Extracted to shared component in Run 19 Agent A
- ~~Leaderboard missing safe-area-top~~ — Fixed in Run 19 Agent A
- ~~Dashboard quest click does nothing~~ — Now navigates to `/quests`, Run 19 Agent A
- ~~`user_stats` SQL view doesn't exist~~ — Created in Run 19 Agent B + deployed to production DB
- ~~DELETE endpoint doesn't nullify timezone~~ — GDPR fix in Run 19 Agent B
- ~~Settings.tsx 517 lines monolith~~ — Extracted 3 sub-components in Run 20 Agent A (→246 lines)
- ~~Profile.tsx 408 lines monolith~~ — Extracted 4 sub-components in Run 20 Agent B (→~210 lines)
- ~~Error UI duplicated across 6 pages~~ — Created shared ErrorSection component in Run 20 Agent C
- ~~Quest modal mode null safety~~ — Added fallbacks in Run 20 Agent C
- ~~Manual try-catch in users/onboarding/checkins routes~~ — Replaced with asyncHandler in Run 20 Agent D
- ~~authorizeUser calls Python subprocess~~ — Migrated to native SQL in Run 20 Agent E
- ~~Hardcoded status strings in backend routes~~ — Created typed constants in Run 20 Agent E
- ~~Unused RefreshCw imports in 4 pages~~ — Resolved by ErrorSection consolidation in Run 20 Agent C
- ~~Settings error state uses inline JSX~~ — Replaced with ErrorSection in Run 21 Agent B
- ~~Profile error state uses inline JSX~~ — Replaced with ErrorSection in Run 21 Agent B
- ~~Settings state logic not a hook~~ — Extracted `useSettingsData` hook in Run 21 Agent B (246→100 lines)
- ~~`asyncHandler` typing is loose~~ — Fixed with proper Express types in Run 21 Agent D
- ~~39 backend routes use manual try-catch~~ — All migrated to asyncHandler in Run 21 Agents D+E (38 handlers)
- ~~Dashboard.tsx 407 lines~~ — Extracted DailyGoalRing/TodaysProgress/StreakSection in Run 21 Agent A (→275 lines)
- ~~Quests.tsx 363 lines~~ — Extracted QuestCard/QuestDetailModal/TabButton in Run 21 Agent C (→203 lines)
- ~~Hardcoded punishment validLevels~~ — Replaced with `PUNISHMENT_INTENSITY` constants in Run 21 Agent E

---

## RUN 24: Complete Python→SQL Migration — Handlers + Jobs (5 Agents + Agent 0)

### Focus: Migrate ALL remaining `executePythonTool` calls in handlers (onboarding, start, stats, settings) and jobs (dailyQuestReset, questReminders, streakCheck) to native SQL. Extract shared streak utility. Clean up pythonTools.ts. After Run 24, the ONLY remaining Python subprocess is `admin-stats.ts POST /analytics/export` (justified — Google Sheets OAuth).

### Copy-Paste Prompts

**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent 0 for Run 24. Wait for agents to finish, then merge and deploy.
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read PARALLEL_AGENTS.md — you are Agent A for Run 24. Your job: Migrate ALL 19 executePythonTool calls in handlers/onboarding.ts to native SQL. Read the Python source files (tools/mode_manager.py, tools/user_manager.py, tools/quest_manager.py) to understand the exact SQL queries. Create local helper functions for recurring patterns (listAllModes, getUserActiveModes, getUserByTelegramId). Replace every executePythonTool call with direct SQL using query()/queryOne()/execute() from ../../utils/db.js. Remove executePythonTool import. Follow the Safety Protocol. Commit after each task. Write your retrospective when done.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read PARALLEL_AGENTS.md — you are Agent B for Run 24. Your job: Migrate executePythonTool calls in 3 handler files to native SQL. (1) start.ts: 1 call — quest_manager --get-active → native SQL, (2) stats.ts: 2 calls — user_manager --get-user + streak_manager --get-streak → native SQL, (3) settings.ts: 4 calls — IMPORTANT: the --update-user calls are BROKEN (command doesn't exist in user_manager.py) — replace with direct SQL UPDATE. Read Python source files for exact queries. Remove executePythonTool imports from all 3 files. Follow the Safety Protocol. Commit after each task. Write your retrospective when done.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read PARALLEL_AGENTS.md — you are Agent C for Run 24. Your job: Migrate ALL executePythonTool calls in 3 job files to native SQL. (1) dailyQuestReset.ts: 4 calls — user_manager --list-users (pagination) + quest_manager --assign-daily/--assign-weekly, (2) questReminders.ts: 1 call — db_operations --query (raw SQL), (3) streakCheck.ts: 1 call — streak_manager --check-all-streaks. Read Python source files for exact SQL queries and business logic. Remove executePythonTool imports. Follow the Safety Protocol. Commit after each task. Write your retrospective when done.
```

**Agent D** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-d`):
```
Read PARALLEL_AGENTS.md — you are Agent D for Run 24. Your job: (1) Create shared bot/src/utils/streak.ts with updateStreak() function (extracted from routes/quests.ts lines 19-34), (2) Update routes/quests.ts to import updateStreak from ../../utils/streak.js instead of defining it locally, (3) Update routes/users.ts PATCH /:userId/streak to import and use updateStreak from ../../utils/streak.js for each streak in the loop, (4) Clean up utils/pythonTools.ts — remove ALL unused wrapper functions, keep ONLY the core executePythonTool function + PythonToolResult interface (still needed by admin-stats.ts). Follow the Safety Protocol. Commit after each task. Write your retrospective when done.
```

**Agent E** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-e`):
```
Read PARALLEL_AGENTS.md — you are Agent E for Run 24. Your job: Update handler and job test files to work with native SQL instead of executePythonTool mocks. (1) Update __tests__/handlers/onboarding.test.ts — replace executePythonTool mocks with query/queryOne/execute mocks from ../../utils/db.js, (2) Update __tests__/handlers/start.test.ts, (3) Update __tests__/handlers/stats.test.ts, (4) Update __tests__/handlers/settings.test.ts, (5) Update __tests__/jobs/dailyQuestReset.test.ts, (6) Update __tests__/jobs/questReminders.test.ts, (7) Update __tests__/jobs/streakCheck.test.ts. Read the CURRENT test files first to understand the mocking pattern, then replace executePythonTool mocks with db utility mocks. Follow the Safety Protocol. Commit after each task. Write your retrospective when done.
```

---

### Agent A — Migrate handlers/onboarding.ts to Native SQL (19 calls)

**Branch:** `feature/r24-onboarding-handler-sql`
**Worktree:** `../Wibecode-agent-a`

**Context:** `handlers/onboarding.ts` (600 lines) has 19 `executePythonTool` calls spanning 10 functions. It uses `mode_manager` (list-modes, get-active-modes, add-modes, remove-mode, get-mode-summary), `user_manager` (get-user, get-stats), and `quest_manager` (assign-daily, get-active). All must be replaced with native SQL using `query()`/`queryOne()`/`execute()` from `../../utils/db.js`.

**Tasks:**

1. **Create local SQL helpers at top of file** — Add these reusable async functions after imports:
   ```ts
   import { query, queryOne, execute } from '../../utils/db.js';

   async function listAllModes() {
     return query('SELECT * FROM modes ORDER BY id');
   }

   async function getUserByTelegramId(telegramId: number) {
     return queryOne('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
   }

   async function getUserActiveModes(userId: number) {
     return query(`
       SELECT m.id AS mode_id, m.name, m.display_name, m.description, m.icon_emoji,
              um.id AS user_mode_id, um.enabled_at, um.is_active
       FROM user_modes um
       JOIN modes m ON um.mode_id = m.id
       WHERE um.user_id = $1 AND um.is_active = true
       ORDER BY um.enabled_at`, [userId]);
   }
   ```

2. **Migrate `showModeSelection()`** — Replace `executePythonTool('mode_manager', ['--list-modes'])` (line 45) with `await listAllModes()`. The result is a direct array of mode objects — access fields directly (e.g., `mode.name`, `mode.icon_emoji`). No `.data` wrapper.

3. **Migrate `handleModeSelection()`** — Replace 4 calls (lines 115-157):
   - `user_manager --get-user` → `await getUserByTelegramId(userId)`
   - `mode_manager --get-active-modes` → `await getUserActiveModes(internalUserId)`
   - `mode_manager --remove-mode` → `await execute('UPDATE user_modes SET is_active = false WHERE user_id = $1 AND mode_id = $2 AND is_active = true', [userId, modeId])`
   - `mode_manager --add-modes` → native SQL: lookup mode, check existing, reactivate/insert, init streak (same pattern as `routes/modes.ts` POST endpoint)

4. **Migrate `updateModeSelectionMessage()` + `showModeInfo()`** — Replace 3 calls (lines 171-235):
   - `mode_manager --list-modes` → `await listAllModes()`
   - `mode_manager --get-active-modes` → `await getUserActiveModes(userId)`

5. **Migrate `completeModeSelection()` + `assignInitialQuests()`** — Replace 3 calls (lines 262-324):
   - `user_manager --get-user` → `await getUserByTelegramId(userId)`
   - `mode_manager --get-active-modes` → `await getUserActiveModes(internalUserId)`
   - `quest_manager --assign-daily` → native SQL: get active mode IDs, find available daily templates not assigned today, INSERT quest_instances with target based on difficulty (`{easy:1, medium:3, hard:5}`)

6. **Migrate `showQuickQuests()` + `showQuickProfile()`** — Replace 5 calls (lines 397-473):
   - `user_manager --get-user` → `await getUserByTelegramId(userId)` (×2)
   - `quest_manager --get-active` → native SQL:
     ```sql
     SELECT qi.id, qi.quest_id, q.title AS name, q.description, q.xp_reward,
            q.quest_type, q.difficulty, q.mode_id, m.name AS mode_name,
            m.icon_emoji AS mode_icon, qi.status, qi.instance_date, qi.check_in_count, qi.target
     FROM quest_instances qi JOIN quests q ON qi.quest_id = q.id
     LEFT JOIN modes m ON q.mode_id = m.id
     WHERE qi.user_id = $1 AND qi.status IN ('pending', 'ready', 'in_progress')
     ORDER BY qi.instance_date ASC
     ```
   - `user_manager --get-stats` → native SQL: query user + streaks + quest count (see `user_manager.py` `get_user_stats()`)

7. **Migrate `handleModesCommand()` + `handleModeSummary()`** — Replace 4 calls (lines 501-576):
   - `user_manager --get-user` → `await getUserByTelegramId(userId)` (×2)
   - `mode_manager --get-active-modes` → `await getUserActiveModes(internalUserId)`
   - `mode_manager --get-mode-summary` → native SQL: query all modes + user_modes, compute active/inactive/available counts

8. **Clean up imports + Build verification** — Remove `executePythonTool` import. Add `query`, `queryOne`, `execute` from `../../utils/db.js`. Run `cd bot && npm run build`.

**IMPORTANT:** When accessing Python tool results, the old code uses `(result.data as any)?.field`. With native SQL, `query()` returns an array directly, `queryOne()` returns a single row object or null. Remove all `.data` wrappers and `as any` casts — access fields directly.

**OWNED files:**
- `bot/src/handlers/onboarding.ts`

**FORBIDDEN:**
- `mini-app/**`, `tools/**`, `database/**`
- `bot/src/index.ts`, `bot/src/api/server.ts`, `bot/src/api/routes/**`
- `bot/src/handlers/start.ts`, `stats.ts`, `settings.ts`, `help.ts`, `profile.ts`
- `bot/src/jobs/**`
- `bot/src/utils/pythonTools.ts`
- `bot/src/__tests__/**`

---

### Agent B — Migrate handlers/start.ts + stats.ts + settings.ts (7 calls, FIX broken settings)

**Branch:** `feature/r24-small-handlers-sql`
**Worktree:** `../Wibecode-agent-b`

**Context:** Three handler files with 7 total `executePythonTool` calls. CRITICAL: `settings.ts` calls `--update-user` which **DOES NOT EXIST** in `user_manager.py` — these calls are currently BROKEN. Must be fixed with direct SQL.

**Tasks:**

1. **Migrate `start.ts`** — Replace 1 call (line 37-41):
   - `quest_manager --get-active` → native SQL:
     ```sql
     SELECT qi.id, qi.quest_id, q.title AS name, q.description, q.xp_reward,
            q.quest_type, q.difficulty, qi.status, qi.instance_date
     FROM quest_instances qi
     JOIN quests q ON qi.quest_id = q.id
     WHERE qi.user_id = $1 AND qi.status IN ('pending', 'ready', 'in_progress')
     ORDER BY qi.instance_date ASC
     ```
   - Import `query` from `../../utils/db.js`. Remove `executePythonTool` import.
   - The result is used to show quest count in welcome message. Access as `quests.length` (direct array, no `.data` wrapper).

2. **Migrate `stats.ts` — `getInternalUserId()`** — Replace call (line 17-19):
   - `user_manager --get-user --telegram-id` → `await queryOne('SELECT * FROM users WHERE telegram_id = $1', [telegramId])`
   - Import `queryOne`, `query` from `../../utils/db.js`.

3. **Migrate `stats.ts` — `getStreaks()`** — Replace call (line 53-55):
   - `streak_manager --get-streak` → native SQL:
     ```sql
     SELECT s.*, m.name AS mode_name, m.display_name, m.icon_emoji
     FROM streaks s
     JOIN modes m ON m.id = s.mode_id
     WHERE s.user_id = $1
     ORDER BY s.current_streak DESC
     ```
   - Remove `executePythonTool` import from stats.ts.

4. **Migrate `settings.ts` — `getUserData()`** — Replace call (line 41-43):
   - `user_manager --get-user --telegram-id` → `await queryOne('SELECT * FROM users WHERE telegram_id = $1', [telegramId])`
   - Import `queryOne`, `execute` from `../../utils/db.js`.

5. **FIX & migrate `settings.ts` — notification toggle** — Replace BROKEN call (lines 106-109):
   - `user_manager --update-user --field notification_enabled` → native SQL:
     ```ts
     await execute('UPDATE users SET notification_enabled = $1 WHERE id = $2', [enabled, user.id]);
     ```

6. **FIX & migrate `settings.ts` — reminder hour** — Replace BROKEN call (lines 135-138):
   - `user_manager --update-user --field reminder_hour` → native SQL:
     ```ts
     await execute('UPDATE users SET reminder_hour = $1 WHERE id = $2', [parseInt(hour), user.id]);
     ```

7. **Migrate `settings.ts` — timezone** — Replace call (lines 165-167):
   - `user_manager --update-timezone` → native SQL:
     ```ts
     await execute('UPDATE users SET timezone = $1 WHERE id = $2', [tz, user.id]);
     ```
   - Remove `executePythonTool` import from settings.ts.

8. **Build verification**: `cd bot && npm run build`

**OWNED files:**
- `bot/src/handlers/start.ts`
- `bot/src/handlers/stats.ts`
- `bot/src/handlers/settings.ts`

**FORBIDDEN:**
- `mini-app/**`, `tools/**`, `database/**`
- `bot/src/index.ts`, `bot/src/api/server.ts`, `bot/src/api/routes/**`
- `bot/src/handlers/onboarding.ts`, `help.ts`, `profile.ts`, `miniapp.ts`, `leaderboard.ts`, `dailySummary.ts`
- `bot/src/jobs/**`
- `bot/src/utils/pythonTools.ts`
- `bot/src/__tests__/**`

---

### Agent C — Migrate Job Files to Native SQL (6 calls across 3 files)

**Branch:** `feature/r24-jobs-native-sql`
**Worktree:** `../Wibecode-agent-c`

**Context:** Three job files still use `executePythonTool`. The `dailyQuestReset` job is the most complex (user pagination + quest assignment). The `questReminders` job uses a raw SQL query via Python. The `streakCheck` job calls the batch streak checker.

**Tasks:**

1. **Migrate `dailyQuestReset.ts` — user pagination** — Replace 2 `user_manager --list-users` calls (lines 55 and 95) with native SQL:
   ```ts
   const users = await query(
     'SELECT * FROM users WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
     [BATCH_SIZE, offset]
   );
   ```
   The result is a direct array of user rows. Adjust the loop to iterate `users` directly (no `.data` wrapper). Keep the pagination logic (BATCH_SIZE=100, offset increment).

2. **Migrate `dailyQuestReset.ts` — assign daily quests** — Replace `quest_manager --assign-daily` call (line 29) in `assignQuestsWithRetry()` with native SQL:
   ```ts
   // 1. Get user's active modes
   const modes = await query('SELECT mode_id FROM user_modes WHERE user_id = $1 AND is_active = true', [userId]);
   if (modes.length === 0) return; // no modes
   const modeIds = modes.map((m: any) => m.mode_id);
   const today = new Date().toISOString().split('T')[0];

   // 2. Find available daily templates not assigned today
   const templates = await query(
     `SELECT q.* FROM quests q
      WHERE q.mode_id = ANY($1) AND q.quest_type = 'daily'
      AND q.id NOT IN (SELECT quest_id FROM quest_instances WHERE user_id = $2 AND instance_date = $3)
      ORDER BY RANDOM() LIMIT $4`,
     [modeIds, userId, today, 3]
   );

   // 3. Assign each
   for (const t of templates) {
     const target = { easy: 1, medium: 3, hard: 5 }[t.difficulty as string] || 1;
     await execute(
       `INSERT INTO quest_instances (user_id, quest_id, instance_date, status, target)
        VALUES ($1, $2, $3, 'pending', $4)`,
       [userId, t.id, today, target]
     );
   }
   ```

3. **Migrate `dailyQuestReset.ts` — assign weekly quests** — Replace `quest_manager --assign-weekly` call (line 104) with similar native SQL. Key differences:
   - `quest_type = 'weekly'`
   - Check duplicates within last 7 days: `AND instance_date >= $3` where `$3 = new Date(Date.now() - 7*86400000).toISOString().split('T')[0]`
   - Also filter by non-completed statuses: `AND status IN ('pending', 'ready', 'in_progress')`
   - Assign 2 quests (`LIMIT $5` = 2)

4. **Migrate `questReminders.ts`** — Replace `db_operations --query` call (line 37) with native SQL:
   ```ts
   const usersWithQuests = await query(`
     SELECT DISTINCT u.telegram_id, u.first_name, COUNT(qi.id)::int AS pending_count
     FROM quest_instances qi
     JOIN users u ON qi.user_id = u.id
     WHERE qi.instance_date = CURRENT_DATE
       AND qi.status IN ('pending', 'ready', 'in_progress')
       AND u.is_active = true
     GROUP BY u.telegram_id, u.first_name
   `);
   ```
   Import `query` from `../../utils/db.js`. Adjust result access (direct array, no `.data` wrapper).

5. **Migrate `streakCheck.ts`** — Replace `streak_manager --check-all-streaks` call (line 19) with native SQL:
   ```ts
   const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

   // Get all active streaks that might be broken
   const activeStreaks = await query(`
     SELECT s.id, s.user_id, s.mode_id, s.current_streak, s.longest_streak,
            s.last_activity_date, u.telegram_id, u.first_name
     FROM streaks s
     JOIN users u ON u.id = s.user_id
     WHERE u.is_active = true AND s.current_streak > 0
   `);

   let broken = 0, maintained = 0;
   const brokenDetails: any[] = [];

   for (const streak of activeStreaks) {
     const lastDate = streak.last_activity_date
       ? new Date(streak.last_activity_date).toISOString().split('T')[0]
       : null;
     if (lastDate === null || lastDate < yesterday) {
       await execute('UPDATE streaks SET current_streak = 0 WHERE id = $1', [streak.id]);
       broken++;
       brokenDetails.push({
         user_id: streak.user_id, telegram_id: streak.telegram_id,
         mode_id: streak.mode_id, was_streak: streak.current_streak,
       });
     } else {
       maintained++;
     }
   }
   ```
   Log the results. Import `query`, `execute` from `../../utils/db.js`.

6. **Clean up imports + Build verification** — Remove `executePythonTool` imports from all 3 files. Add `query`, `execute` from `../../utils/db.js`. Run `cd bot && npm run build`.

**OWNED files:**
- `bot/src/jobs/definitions/dailyQuestReset.ts`
- `bot/src/jobs/definitions/questReminders.ts`
- `bot/src/jobs/definitions/streakCheck.ts`

**FORBIDDEN:**
- `mini-app/**`, `tools/**`, `database/**`
- `bot/src/index.ts`, `bot/src/api/server.ts`, `bot/src/api/routes/**`
- `bot/src/handlers/**`
- `bot/src/jobs/definitions/analyticsExport.ts`, `achievementNotifier.ts`, `achievementBatchCheck.ts`, `dailySummary.ts`, `leaderboardRefresh.ts`, `dbCleanup.ts`, `punishmentCheck.ts`
- `bot/src/utils/pythonTools.ts`
- `bot/src/__tests__/**`

---

### Agent D — Extract Shared Streak Utility + Clean Up pythonTools.ts

**Branch:** `feature/r24-shared-utils-cleanup`
**Worktree:** `../Wibecode-agent-d`

**Context:** `updateStreak()` is duplicated in `routes/quests.ts` (lines 19-34) and inline in `routes/users.ts` PATCH streak endpoint (lines 410-430). Extract to shared utility. Also, after Run 24 all handlers and jobs will have been migrated — clean up the now-unused wrapper functions in `pythonTools.ts`.

**Tasks:**

1. **Create `bot/src/utils/streak.ts`** — Extract the `updateStreak()` function from `routes/quests.ts` lines 19-34 into a new shared utility:
   ```ts
   import { queryOne, execute } from './db.js';

   /**
    * Update streak for a user+mode after activity.
    * - If last activity was today → no change
    * - If last activity was yesterday → increment streak
    * - Otherwise → reset streak to 1
    */
   export async function updateStreak(userId: number, modeId: number): Promise<void> {
     const today = new Date().toISOString().split('T')[0];
     const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
     const streak = await queryOne(
       'SELECT id, current_streak, longest_streak, last_activity_date FROM streaks WHERE user_id = $1 AND mode_id = $2',
       [userId, modeId]
     );
     if (!streak) return;
     const lastDate = streak.last_activity_date
       ? new Date(streak.last_activity_date).toISOString().split('T')[0]
       : null;
     if (lastDate === today) return;
     const newStreak = lastDate === yesterday ? streak.current_streak + 1 : 1;
     const newLongest = Math.max(streak.longest_streak, newStreak);
     await execute(
       'UPDATE streaks SET current_streak = $1, longest_streak = $2, last_activity_date = $3 WHERE user_id = $4 AND mode_id = $5',
       [newStreak, newLongest, today, userId, modeId]
     );
   }
   ```

2. **Update `routes/quests.ts`** — Remove the local `updateStreak()` function (lines 19-34). Add import:
   ```ts
   import { updateStreak } from '../../utils/streak.js';
   ```
   The existing fire-and-forget calls `updateStreak(uid, modeId).catch(console.error)` stay the same.

3. **Update `routes/users.ts` PATCH streak endpoint** — The current inline streak logic (lines 410-430) duplicates `updateStreak`. Refactor to use the shared utility:
   ```ts
   import { updateStreak } from '../../utils/streak.js';

   // In PATCH /:userId/streak handler:
   const streaks = await query('SELECT user_id, mode_id, current_streak FROM streaks WHERE user_id = $1', [uid]);
   for (const streak of streaks) {
     await updateStreak(streak.user_id, streak.mode_id);
   }
   // Re-fetch to get updated values
   const updated = await query('SELECT current_streak FROM streaks WHERE user_id = $1', [uid]);
   const maxStreak = Math.max(0, ...updated.map((s: any) => s.current_streak));
   ```

4. **Clean up `utils/pythonTools.ts`** — Read the file and identify all exported wrapper functions. Remove ALL wrapper/helper functions (e.g., `getUserById`, `getUserStats`, `getStreaks`, `assignDailyQuests`, etc.). Keep ONLY:
   - The `PythonToolResult` interface (exported, used by other files)
   - The core `executePythonTool()` function (still used by `admin-stats.ts`)
   - The configuration constants (`PYTHON_EXECUTABLE`, `TOOLS_PATH`, `TOOL_NAME_PATTERN`)
   After cleanup, the file should be ~80 lines (down from ~261).

5. **Verify no broken imports** — Search the codebase for imports from `pythonTools.js` or `pythonTools` and ensure only `executePythonTool` and `PythonToolResult` are imported. If any file imports a removed wrapper, update that import.

6. **Build verification**: `cd bot && npm run build`

**OWNED files:**
- `bot/src/utils/streak.ts` (new)
- `bot/src/utils/pythonTools.ts`
- `bot/src/api/routes/quests.ts` (streak import only — do NOT modify any endpoint logic)
- `bot/src/api/routes/users.ts` (streak endpoint only — do NOT modify other endpoints)

**FORBIDDEN:**
- `mini-app/**`, `tools/**`, `database/**`
- `bot/src/index.ts`, `bot/src/api/server.ts`
- `bot/src/api/routes/modes.ts`, `onboarding.ts`, `admin-*.ts`, `achievements.ts`, `leaderboard.ts`, `punishment.ts`, `checkins.ts`
- `bot/src/handlers/**`
- `bot/src/jobs/**`
- `bot/src/__tests__/**`

---

### Agent E — Update Handler + Job Test Files for Native SQL Mocks

**Branch:** `feature/r24-test-updates`
**Worktree:** `../Wibecode-agent-e`

**Context:** After Agents A/B/C migrate handlers and jobs from `executePythonTool` to native SQL, the existing test files still mock `executePythonTool`. These mocks must be updated to mock the DB utilities (`query`, `queryOne`, `execute` from `../../utils/db.js`) instead. The test files are separate from the handler/job files, so this can be done in parallel.

**IMPORTANT:** Read each test file first. Understand the current mocking pattern. The typical pattern is:
```ts
// OLD (what to remove):
vi.mock('../../utils/pythonTools.js', () => ({ executePythonTool: vi.fn() }));
const mockExecutePythonTool = vi.mocked(executePythonTool);
mockExecutePythonTool.mockResolvedValue({ success: true, data: {...} });

// NEW (what to replace with):
vi.mock('../../utils/db.js', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
}));
import { query, queryOne, execute } from '../../utils/db.js';
const mockQuery = vi.mocked(query);
const mockQueryOne = vi.mocked(queryOne);
const mockExecute = vi.mocked(execute);
// Then mock return values to match native SQL returns (direct rows, not {success, data} wrappers)
```

**Tasks:**

1. **Update `__tests__/handlers/onboarding.test.ts`** — Replace all executePythonTool mocks with DB mocks. Key changes:
   - `mode_manager --list-modes` mocks → `mockQuery` returning mode rows directly
   - `user_manager --get-user` mocks → `mockQueryOne` returning user row directly
   - `mode_manager --get-active-modes` mocks → `mockQuery` returning user_mode rows
   - `mode_manager --add-modes/--remove-mode` mocks → `mockExecute`
   - `quest_manager --assign-daily/--get-active` mocks → `mockQuery`

2. **Update `__tests__/handlers/start.test.ts`** — Replace executePythonTool mock for quest_manager --get-active with mockQuery returning quest instance rows.

3. **Update `__tests__/handlers/stats.test.ts`** — Replace mocks:
   - `user_manager --get-user` → `mockQueryOne`
   - `streak_manager --get-streak` → `mockQuery`

4. **Update `__tests__/handlers/settings.test.ts`** — Replace mocks:
   - `user_manager --get-user` → `mockQueryOne`
   - `user_manager --update-user` (broken calls) → `mockExecute`
   - `user_manager --update-timezone` → `mockExecute`

5. **Update `__tests__/jobs/dailyQuestReset.test.ts`** — Replace mocks:
   - `user_manager --list-users` → `mockQuery` returning user arrays
   - `quest_manager --assign-daily/--assign-weekly` → `mockQuery` + `mockExecute`

6. **Update `__tests__/jobs/questReminders.test.ts`** — Replace `db_operations --query` mock with `mockQuery` returning user+quest rows directly.

7. **Update `__tests__/jobs/streakCheck.test.ts`** — Replace `streak_manager --check-all-streaks` mock with `mockQuery` (fetch streaks) + `mockExecute` (reset broken).

8. **Build verification**: `cd bot && npm run build`

**OWNED files:**
- `bot/src/__tests__/handlers/onboarding.test.ts`
- `bot/src/__tests__/handlers/start.test.ts`
- `bot/src/__tests__/handlers/stats.test.ts`
- `bot/src/__tests__/handlers/settings.test.ts`
- `bot/src/__tests__/jobs/dailyQuestReset.test.ts`
- `bot/src/__tests__/jobs/questReminders.test.ts`
- `bot/src/__tests__/jobs/streakCheck.test.ts`

**FORBIDDEN:**
- `mini-app/**`, `tools/**`, `database/**`
- `bot/src/index.ts`, `bot/src/api/server.ts`, `bot/src/api/routes/**`
- `bot/src/handlers/**` (production code — other agents own these)
- `bot/src/jobs/**` (production code — other agents own these)
- `bot/src/utils/**`
- `bot/src/__tests__/routes/**`, `bot/src/__tests__/middleware/**`

---

### Run 24 File Ownership Matrix

| File | Agent A | Agent B | Agent C | Agent D | Agent E |
|------|---------|---------|---------|---------|---------|
| bot/src/handlers/onboarding.ts | **OWN** | FORBID | — | — | — |
| bot/src/handlers/start.ts | FORBID | **OWN** | — | — | — |
| bot/src/handlers/stats.ts | FORBID | **OWN** | — | — | — |
| bot/src/handlers/settings.ts | FORBID | **OWN** | — | — | — |
| bot/src/jobs/definitions/dailyQuestReset.ts | — | — | **OWN** | — | — |
| bot/src/jobs/definitions/questReminders.ts | — | — | **OWN** | — | — |
| bot/src/jobs/definitions/streakCheck.ts | — | — | **OWN** | — | — |
| bot/src/utils/streak.ts (new) | — | — | — | **OWN** | — |
| bot/src/utils/pythonTools.ts | FORBID | FORBID | FORBID | **OWN** | — |
| bot/src/api/routes/quests.ts | — | — | — | **OWN** (streak only) | — |
| bot/src/api/routes/users.ts | — | — | — | **OWN** (streak only) | — |
| bot/src/__tests__/handlers/onboarding.test.ts | — | — | — | — | **OWN** |
| bot/src/__tests__/handlers/start.test.ts | — | — | — | — | **OWN** |
| bot/src/__tests__/handlers/stats.test.ts | — | — | — | — | **OWN** |
| bot/src/__tests__/handlers/settings.test.ts | — | — | — | — | **OWN** |
| bot/src/__tests__/jobs/dailyQuestReset.test.ts | — | — | — | — | **OWN** |
| bot/src/__tests__/jobs/questReminders.test.ts | — | — | — | — | **OWN** |
| bot/src/__tests__/jobs/streakCheck.test.ts | — | — | — | — | **OWN** |
| PARALLEL_AGENTS.md | retro only | retro only | retro only | retro only | retro only |

### Run 24 Merge Order
1. **Agent D** (shared utils + cleanup) — creates infrastructure other agents' builds may reference
2. **Agent C** (jobs) — independent backend, no handler overlap
3. **Agent B** (small handlers) — independent from Agent A
4. **Agent A** (onboarding handler) — largest migration, independent
5. **Agent E** (test updates) — merge last since tests reference migrated code patterns

### Run 24 Retrospectives

#### Agent A Retrospective
**Status:** All 8 tasks completed. Build passes cleanly (`tsc --noEmit` — zero errors).

| # | Task | Status |
|---|------|--------|
| 1 | Create local SQL helpers (listAllModes, getUserByTelegramId, getUserActiveModes) | Done |
| 2 | Migrate showModeSelection() — 1 call (mode_manager --list-modes) | Done |
| 3 | Migrate handleModeSelection() — 4 calls (get-user, get-active-modes, remove-mode, add-modes) | Done |
| 4 | Migrate updateModeSelectionMessage() + showModeInfo() — 3 calls | Done |
| 5 | Migrate completeModeSelection() + assignInitialQuests() — 3 calls (incl. quest assignment) | Done |
| 6 | Migrate showQuickQuests() + showQuickProfile() — 5 calls (incl. get-stats) | Done |
| 7 | Migrate handleModesCommand() + handleModeSummary() — 4 calls (incl. mode summary) | Done |
| 8 | Clean up imports + Build verification | Done |

**Total calls migrated:** 19 (matches spec exactly — 8x mode_manager, 6x user_manager, 5x quest_manager equivalents).

**Commits:** 1 atomic commit on `feature/r24-onboarding-handler-sql`.

**Implementation highlights:**
- Created 3 local SQL helpers to DRY the 6x getUserByTelegramId, 5x getUserActiveModes, and 4x listAllModes patterns.
- `handleModeSelection()` add-mode logic faithfully replicates `mode_manager.py` `add_mode_by_id()`: check existing -> reactivate if inactive -> insert if new -> init streak with ON CONFLICT DO NOTHING.
- `assignInitialQuests()` replicates `quest_manager.py` `assign_daily_quests()`: get active mode IDs -> find unassigned daily templates via `ANY($1)` + subquery exclusion -> INSERT with difficulty-based target (`{easy:1, medium:3, hard:5}`).
- `showQuickProfile()` uses `Promise.all()` for parallel streaks + quest-count queries, matching the `user_manager.py` `get_user_stats()` overall_streak = min(all current_streaks) logic.
- `handleModeSummary()` uses `Promise.all()` for parallel allModes + userModes queries, then computes active/inactive/available counts in JS (matching `mode_manager.py` `get_mode_summary()`).
- Changed `modeId` from string to `parseInt()` for proper numeric comparison with DB mode_id values.

**Problems faced:** None — all Python->SQL translations were straightforward since the Python source files had clear SQL queries.

**Recommendations for next run:**
- The 3 local helpers (listAllModes, getUserByTelegramId, getUserActiveModes) are now duplicated across multiple handlers (profile.ts, onboarding.ts). Consider extracting to a shared `utils/queries.ts` if more handlers need them.

#### Agent B Retrospective
| # | Task | Status |
|---|------|--------|
| 1 | Migrate start.ts: quest_manager --get-active → native SQL query | Done |
| 2 | Migrate stats.ts: user_manager --get-user → queryOne | Done |
| 3 | Migrate stats.ts: streak_manager --get-streak → query with modes JOIN | Done |
| 4 | Migrate settings.ts: getUserData() → queryOne | Done |
| 5 | FIX settings.ts: notification toggle (BROKEN --update-user) → SQL UPDATE | Done |
| 6 | FIX settings.ts: reminder hour (BROKEN --update-user) → SQL UPDATE | Done |
| 7 | Migrate settings.ts: timezone → SQL UPDATE | Done |
| 8 | Build verification (tsc) | Pass — zero errors |

**Problems faced:** None. All tasks were straightforward single-file edits.

**Key fix:** settings.ts notification toggle and reminder hour were completely non-functional — they called `--update-user` which doesn't exist in `user_manager.py`. The Python subprocess would have returned an error silently. Now they use direct SQL UPDATEs that actually persist the changes.

**Commits:** 3 atomic commits (one per file: start.ts, stats.ts, settings.ts).

**Recommendations for next run:**
- start.ts still imports `createUser` and `getUserByTelegramId` from `pythonTools.js` — these wrapper functions are used for new user creation flow. Once Agent D cleans up pythonTools.ts, verify these wrappers still exist or migrate them too.
- Consider adding error handling to settings.ts UPDATE calls (currently fire-and-forget without error feedback to user).

#### Agent C Retrospective

**Status:** All 6 tasks completed. Build passes.

| # | Task | Status |
|---|------|--------|
| 1 | Migrate `dailyQuestReset.ts` — user pagination (2 calls) | Done |
| 2 | Migrate `dailyQuestReset.ts` — assign daily quests | Done |
| 3 | Migrate `dailyQuestReset.ts` — assign weekly quests | Done |
| 4 | Migrate `questReminders.ts` — db_operations query | Done |
| 5 | Migrate `streakCheck.ts` — streak_manager | Done |
| 6 | Clean up imports + build verification | Done |

**Changes made:**
- `dailyQuestReset.ts`: Replaced 4 `executePythonTool` calls. User pagination now uses direct `query()`. Daily quest assignment inlined as 3-step SQL (get active modes → find unassigned templates → INSERT). Weekly quest assignment uses similar logic with 7-day lookback and status filter. Kept retry logic and pagination structure intact.
- `questReminders.ts`: Replaced 1 `executePythonTool('db_operations', ['--query', ...])` call with direct `query()`. Added `::int` cast on COUNT. Changed result iteration from `result.data[i]` to `usersWithQuests[i]`.
- `streakCheck.ts`: Replaced 1 `executePythonTool('streak_manager', ['--check-all-streaks'])` call. Now fetches active streaks via JOIN query, loops to compare `last_activity_date` against yesterday, resets broken streaks with UPDATE. Typed `brokenDetails` array replaces the `data?.broken_details` wrapper.

**Problems:** None. The plan was precise and the SQL was straightforward.

**Commits:** 3 atomic commits (one per file).

**Recommendations for next run:**
- After all Run 24 agents merge, the only remaining `executePythonTool` call in the entire codebase should be in `analyticsExport.ts` (Google Sheets OAuth — justified).
- The `dailyQuestReset` job now makes N+1 queries per user (get modes + get templates + N inserts). If user count grows, consider batching the INSERT into a single multi-row INSERT per user.

#### Agent D Retrospective

| # | Task | Status |
|---|------|--------|
| 1 | Create `bot/src/utils/streak.ts` with shared `updateStreak()` | Done |
| 2 | Update `routes/quests.ts` — import from shared streak.ts | Done |
| 3 | Update `routes/users.ts` PATCH streak — use shared `updateStreak()` | Done |
| 4 | Clean up `pythonTools.ts` — remove 178 lines of unused wrappers | Done |
| 5 | Verify imports + build | Done (see note) |

**Build note:** After cleanup, `handlers/start.ts` fails to compile because it imports `createUser` and `getUserByTelegramId` (removed wrappers). This is expected — `start.ts` is Agent B's FORBIDDEN file. Once Agent B merges their native SQL migration of `start.ts`, the error resolves. No other files are broken.

**Stats:** `pythonTools.ts` reduced from 261 → 83 lines. `quests.ts` lost 19 lines (local function). `users.ts` lost 15 lines (inline logic replaced by shared call + re-fetch).

**Recommendations for next run:**
- After all Run 24 agents merge, `pythonTools.ts` should only be imported by `admin-stats.ts` and `analyticsExport.ts`. Could consider moving the Google Sheets export to a different pattern (e.g., direct API call) to eventually remove Python subprocess entirely.
- The test `__tests__/setup.ts` still mocks all the old wrapper functions — Agent E or a future run should clean that up.

#### Agent E Retrospective
**All 7 tasks completed. Build passes.**

| # | Task | Status |
|---|------|--------|
| 1 | Update `__tests__/handlers/onboarding.test.ts` | Done |
| 2 | Update `__tests__/handlers/start.test.ts` | Done |
| 3 | Update `__tests__/handlers/stats.test.ts` | Done |
| 4 | Update `__tests__/handlers/settings.test.ts` | Done |
| 5 | Update `__tests__/jobs/dailyQuestReset.test.ts` | Done |
| 6 | Update `__tests__/jobs/questReminders.test.ts` | Done |
| 7 | Update `__tests__/jobs/streakCheck.test.ts` | Done |

**Key changes across all files:**
- Replaced `vi.mock('../../utils/pythonTools.js')` with `vi.mock('../../utils/db.js')` containing `query`, `queryOne`, `execute`, `getPool`
- Old mock pattern: `mockExecutePythonTool.mockResolvedValue({ success: true, data: ... })` → New: `mockQuery.mockResolvedValue([...])` / `mockQueryOne.mockResolvedValue({...})` / `mockExecute.mockResolvedValue(1)`
- Error handling: old pattern used `{ success: false, error: '...' }`, new pattern uses `mockQuery.mockRejectedValue(new Error('...'))`
- start.test.ts: Removed `createUser` and `getUserByTelegramId` wrapper mocks, replaced with `queryOne` mocks
- settings.test.ts: Assertions now verify SQL column names (`notification_enabled`, `reminder_hour`, `timezone`) and parameter values directly
- streakCheck.test.ts: Added new test for "maintained streaks with recent activity" since native SQL logic is more granular
- questReminders.test.ts: Added empty result test case; removed "non-array data" test (native SQL always returns arrays)

**Problems:** None. All files were straightforward mock replacements.

**Note for Agent 0:** These test mocks are written to match the *expected* migrated code from Agents A/B/C. If those agents changed the exact SQL patterns or error handling from what was specified in the task description, some mock sequences may need adjustment after merge. Key assumption: errors in native SQL are thrown as exceptions (caught by try/catch), not returned as `{success: false}` objects.

#### Agent 0 Retrospective
**Merge:** D → C → B → A → E. All 5 merges completed with **zero code conflicts**. PARALLEL_AGENTS.md retros auto-merged cleanly thanks to pre-allocated sections. Agent D was fast-forward. Agents C/B/A/E all auto-merged.

**Post-merge fix:** `start.ts` failed build — it still imported `createUser` and `getUserByTelegramId` wrappers from pythonTools.ts (removed by Agent D). Agent B migrated only the quest query but left the user lookup/creation on old wrappers. Agent 0 migrated these 2 remaining calls to native SQL (queryOne INSERT/SELECT). Build passed after fix.

**Build:** Both `bot` and `mini-app` pass with zero errors locally and on server.

**Deploy:** `6a13379` deployed to production. 19 files changed (+838/-797 lines). PM2 restarted. Telegram notification sent.

**Net result — Run 24 milestone:**
- **handlers/onboarding.ts:** 19 Python→SQL calls migrated. 3 local SQL helpers created.
- **handlers/start.ts:** createUser + getUserByTelegramId + quest query all native SQL now.
- **handlers/stats.ts:** user lookup + streak query now native SQL.
- **handlers/settings.ts:** **FIXED broken functionality** — notification toggle and reminder hour were calling nonexistent `--update-user` Python command. Now direct SQL UPDATEs.
- **3 job files:** All Python subprocess calls replaced with native SQL.
- **utils/streak.ts:** New shared utility (extracted from quests.ts, used by users.ts).
- **utils/pythonTools.ts:** 261 → 83 lines (178 lines of unused wrappers removed).
- **7 test files:** Updated to mock native SQL instead of executePythonTool.

**executePythonTool status after Run 24:** 2 remaining calls (both Google Sheets analytics export — justified). Down from ~33 at start of Run 24.

## RUN 25: Security, Observability & Deployment Hardening (5 Agents + Agent 0)

### Focus: Fix all HIGH/MEDIUM severity issues discovered during the post-Run-24 debugging session: authorization gaps allowing cross-user access, non-idempotent XP awards, mode creation outside transactions, dead structured logger, no request tracing, missing table cleanup in delete, frontend edge cases, and deployment coupling confusion. After Run 25, every API request is traceable end-to-end via structured logs, all routes enforce resource ownership, onboarding completion is idempotent and atomic, and deployment is verifiable via a version endpoint + mandatory deploy script.

### Copy-Paste Prompts

**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent 0 for Run 25. Wait for agents to finish, then merge and deploy.
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read PARALLEL_AGENTS.md — you are Agent A for Run 25. Your job: Fix the authorization gap across ALL route files. Currently only quests.ts uses authorizeUser. All other routes (users.ts, onboarding.ts, modes.ts, checkins.ts, achievements.ts, punishment.ts) allow any authenticated user to access/modify ANY other user's data by changing the URL parameter.

Your approach:
1. Add a lightweight `requireOwnership(req)` function to `bot/src/api/middleware/auth.ts` that compares `parseInt(req.params.telegramId)` to `req.telegramUser?.id` and throws ForbiddenError on mismatch. Add it at the BOTTOM of the file after `authorizeUser`. Import ForbiddenError from `../utils/errors.js`.
2. In routes using `:telegramId` params (users.ts: DELETE account, GET stats, GET quests/active, GET quests/completed, GET achievements, GET preferences, PATCH preferences, PATCH profile; onboarding.ts: all 3 routes; punishment.ts: all 3 routes): add `requireOwnership(req)` as the FIRST line inside the handler after the `const tid = parseInt(...)` line.
3. In routes using `:userId` params (modes.ts: 5 endpoints; achievements.ts: userId-based endpoints): add `authorizeUser` to the middleware chain between `authenticateTelegram` and `asyncHandler`.
4. For checkins.ts: verify that the user performing the check-in owns the resource.

IMPORTANT: Do NOT modify business logic in any handler. ONLY add authorization checks. Agent C is modifying transaction logic in onboarding.ts and users.ts DELETE — your changes are on different lines (top of handler vs body). Do NOT touch the health endpoint, logger, or server.ts.

Follow the Safety Protocol. Commit after each file. Write your retrospective when done.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read PARALLEL_AGENTS.md — you are Agent B for Run 25. Your job: Replace the dead logger with a structured logging system that enables request tracing.

Current state: `bot/src/api/utils/logger.ts` has a Logger class that is NEVER imported anywhere. All 144 logging calls across 30 files use raw console.* with inconsistent tag prefixes. During debugging, the developer cannot correlate log entries for a single request.

Your approach:
1. Rewrite `logger.ts` with structured JSON output: each log entry includes timestamp, level, message, requestId, telegramUserId, plus any additional metadata. Add a `child(ctx)` method for creating context-bound loggers. Add a `generateRequestId()` export using `crypto.randomUUID()`.
2. Add request context middleware to `server.ts` (after body parsing at line 57, before routes): generate requestId, attach to `req.requestId`, log request start/finish with duration and status code. Add `requestId?: string` to Express Request interface in `bot/src/types/express.d.ts`.
3. Replace console.* calls in `auth.ts` with `logger.child({requestId: req.requestId})` calls. Remove the local `logAuthAttempt` function. ONLY replace console calls — do NOT add/modify authorization logic (Agent A owns that).
4. Replace console.* calls in `rateLimiter.ts` (4 calls) and `db.ts` (4 calls) with logger calls.
5. Update the global error handler in `server.ts` (lines 132-143) to use `logger.error()`.

IMPORTANT constraints:
- Do NOT touch the health endpoint in server.ts (lines 63-69) — Agent E owns that.
- In auth.ts, ONLY replace console.* calls. Do NOT add/modify authorization logic — Agent A adds `requireOwnership` at the bottom.
- Do NOT touch route files other than quests.ts (Agent A is modifying all other route files for auth).
- Do NOT touch bot handlers (bot/src/handlers/*) or job files — those are Telegram-side, not API.

Follow the Safety Protocol. Commit after each task. Write your retrospective when done.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read PARALLEL_AGENTS.md — you are Agent C for Run 25. Your job: Fix 3 atomicity/idempotency bugs in `bot/src/api/routes/onboarding.ts` and 1 missing table in `bot/src/api/routes/users.ts` DELETE.

Issues to fix:
1. **Non-idempotent XP award** (onboarding.ts line 158): `total_xp = total_xp + 50` stacks on every call. Add an idempotency guard BEFORE any processing: check if `onboarding_state.current_step = 'completed'`. If yes, return `{ xp_awarded: 0, already_completed: true }` immediately.
2. **Mode creation outside transaction** (onboarding.ts lines 81-109): Move the entire "Add selected modes" block INSIDE the `transaction()` callback, converting `queryOne()`/`execute()` calls to `client.query()` with `.rows[0]` access.
3. **Onboarding state row might not exist** (onboarding.ts line 173-176): Replace the UPDATE with a UPSERT: `INSERT INTO onboarding_state (user_id, current_step, last_updated) VALUES ($1, 'completed', NOW()) ON CONFLICT (user_id) DO UPDATE SET current_step = 'completed', last_updated = NOW()`.
4. **Quest assignment outside transaction** (onboarding.ts lines 181-207): Move inside the transaction, using `client.query()`.
5. **Missing reminders table in DELETE** (users.ts lines 605-649): Add `DELETE FROM reminders WHERE user_id = $1` after the streaks delete and before the user update.

IMPORTANT: Agent A is adding `requireOwnership(req)` as the first line of each handler in these same files. Your changes are in the BODY of the handlers (transaction restructure). These are different lines and will auto-merge. Do NOT modify the first 2 lines of any handler.

Follow the Safety Protocol. Commit after each task. Write your retrospective when done.
```

**Agent D** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-d`):
```
Read PARALLEL_AGENTS.md — you are Agent D for Run 25. Your job: Harden the mini-app frontend against edge cases discovered during the debugging session.

Issues to fix:
1. **telegramId=0 silent failure** (Onboarding.tsx line 38): `user?.id || 0` causes API calls with telegramId=0 when user is null. Change to `user?.id` (undefined, not 0). Add early returns when telegramId is falsy. Add a "Please open from Telegram" error screen if user is null after mount.
2. **Double-fire completeOnboarding** (LaunchScreen.tsx): useEffect fires completeOnboarding on mount, but if component re-mounts it fires again (stacking XP). Add a `useRef(false)` guard that gets set to true after the first call.
3. **1.2s stale page after delete** (useSettingsData.ts lines 165-167): Reduce setTimeout from 1200ms to 500ms. Use `window.location.replace()` instead of `.href` to prevent back-button returning to deleted state.
4. **API error sends users to onboarding** (App.tsx lines 67-69): The catch block sets `setNeedsOnboarding(true)`, briefly redirecting existing users to onboarding on network error. Change to `setNeedsOnboarding(false)` — safer default. Let individual pages handle auth failures.
5. **"Unknown step: completed"** (Onboarding.tsx renderStep): Add a `case 'completed':` that navigates to `/dashboard` with `replace: true` and returns null. This handles the edge case where the onboarding page is rendered with `currentStep = 'completed'`.

Follow the Safety Protocol. Commit after each task. Write your retrospective when done.
```

**Agent E** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-e`):
```
Read PARALLEL_AGENTS.md — you are Agent E for Run 25. Your job: Add version tracking to the health endpoint, create a deploy script, and document the Deploy Verification Protocol.

Context: During a debugging session, the developer kept restarting `telegram-rpg-api` (PM2 ids 1,2) instead of `telegram-rpg-bot` (PM2 id 0). Nginx routes to port 3000 which is served by `telegram-rpg-bot`. The `telegram-rpg-api` cluster process exists in ecosystem.config.js but does NOT receive traffic. There was also no way to verify which code version was running.

Your approach:
1. Modify the `/health` endpoint in `server.ts` (lines 63-69 ONLY) to return `version` (from `BUILD_VERSION` env var, default 'dev') and `build_timestamp` (from `BUILD_TIMESTAMP` env var). Add const declarations near the top of the file.
2. Create `scripts/deploy.sh` — a bash script that pushes to GitHub, SSHs to server, runs `git pull`, builds both bot and mini-app, restarts ONLY `telegram-rpg-bot` (NEVER telegram-rpg-api), waits 3 seconds, then verifies by curling /health and comparing the version to the local git commit hash. Make it executable.
3. Update `ecosystem.config.js` — add `BUILD_VERSION` and `BUILD_TIMESTAMP` to `env_production`. Add a WARNING comment to the `telegram-rpg-api` section explaining it is NOT used by nginx.
4. Add "Deploy Verification Protocol" section to PARALLEL_AGENTS.md after "Safety Protocol". Include: which process to restart, how to verify, deploy command, manual fallback.
5. Update "Known Issues" in PARALLEL_AGENTS.md — mark issues that Run 25 resolves.

IMPORTANT: In server.ts, ONLY modify the health endpoint (lines 63-69) and add const declarations. Do NOT modify routes, middleware, error handler, or anything else — Agent B owns those parts.

Follow the Safety Protocol. Commit after each task. Write your retrospective when done.
```

---

### Agent A — Authorization + Security Hardening

**Branch:** `feature/r25-auth-hardening`
**Worktree:** `../Wibecode-agent-a`

**Context:** The `authorizeUser` middleware at `bot/src/api/middleware/auth.ts` line 178 validates that URL params match the authenticated user. But only `quests.ts` uses it. All other route files use `authenticateTelegram` alone — meaning any authenticated Telegram user can access/modify ANY other user's data by changing the URL parameter. The DELETE account endpoint is the most dangerous: any authenticated user can delete any other user's account.

**Tasks:**

1. **Create `requireOwnership(req)` helper in `auth.ts`** — Add at the BOTTOM of the file (after `authorizeUser`). A lightweight function that extracts `:telegramId` from `req.params` and compares to `req.telegramUser?.id`. Throws `ForbiddenError` on mismatch. Import `ForbiddenError` from `../utils/errors.js`.

2. **Add authorization to `users.ts`** — Add `requireOwnership(req)` as the FIRST line inside each handler (after `const tid = parseInt(...)`) for all 8 `:telegramId` endpoints: GET stats, GET quests/active, GET quests/completed, GET achievements, GET preferences, PATCH preferences, PATCH profile, DELETE account.

3. **Add authorization to `onboarding.ts`** — Add `requireOwnership(req)` as first line in all 3 handlers.

4. **Add authorization to `modes.ts`** — Add `authorizeUser` to the middleware chain for 5 `:userId` endpoints.

5. **Add authorization to `checkins.ts`, `achievements.ts`, `punishment.ts`** — For checkins: verify user owns the resource. For achievements: add `authorizeUser` to `:userId` endpoints. For punishment: add `requireOwnership(req)` to all 3 `:telegramId` endpoints.

6. **Build verification**: `cd bot && npm run build`

**OWNED files:**
- `bot/src/api/middleware/auth.ts` (add requireOwnership function at bottom ONLY)
- `bot/src/api/routes/users.ts` (auth lines ONLY — do not change business logic)
- `bot/src/api/routes/onboarding.ts` (auth lines ONLY)
- `bot/src/api/routes/modes.ts` (auth middleware ONLY)
- `bot/src/api/routes/checkins.ts` (auth additions ONLY)
- `bot/src/api/routes/achievements.ts` (auth additions ONLY)
- `bot/src/api/routes/punishment.ts` (auth additions ONLY)

**FORBIDDEN:**
- `mini-app/**`, `tools/**`, `database/**`
- `bot/src/api/server.ts`, `bot/src/api/utils/**`
- `bot/src/api/routes/quests.ts` (already has authorization)
- `bot/src/api/routes/admin*.ts`, `leaderboard.ts`
- `bot/src/handlers/**`, `bot/src/jobs/**`, `bot/src/utils/**`
- `scripts/**`
- `PARALLEL_AGENTS.md` (except retrospective)

---

### Agent B — Structured Logger + Request Tracing

**Branch:** `feature/r25-structured-logging`
**Worktree:** `../Wibecode-agent-b`

**Context:** `bot/src/api/utils/logger.ts` has a 54-line Logger class that is NEVER imported anywhere. All 144 logging calls use raw `console.*`. During the multi-hour debugging session, the developer could not correlate log entries for a single request — every error looked isolated.

**Tasks:**

1. **Rewrite `bot/src/api/utils/logger.ts`** — Structured JSON logger with `child(ctx)` method for context-bound loggers, `generateRequestId()` using `crypto.randomUUID()`. In production outputs JSON lines, in development outputs readable format.

2. **Add request tracing middleware to `server.ts`** — After body parsing (line 57), before routes. Generates `requestId`, attaches to `req.requestId`. Logs request start and uses `res.on('finish', ...)` to log completion with duration/status. Update `bot/src/types/express.d.ts` to declare `requestId?: string` on Request.

3. **Replace `console.*` in `auth.ts`** — Replace all 12+ `console.*` calls with `logger.child({requestId: req.requestId}).info/warn/error(...)`. Remove the local `logAuthAttempt` function. **ONLY replace console calls — do NOT modify authorization logic.**

4. **Replace `console.*` in `rateLimiter.ts` and `db.ts`** — Use `logger.child({ component: 'rateLimiter' })` and `logger.child({ component: 'db' })`.

5. **Update global error handler in `server.ts`** — Replace `console.error('Error:', err)` with `logger.error('Unhandled error', err, { requestId: req.requestId })`.

6. **Build verification**: `cd bot && npm run build`

**OWNED files:**
- `bot/src/api/utils/logger.ts` (full rewrite)
- `bot/src/api/server.ts` (GRAY AREA: add middleware + update error handler ONLY — do NOT touch health endpoint lines 63-69)
- `bot/src/types/express.d.ts` (add requestId field)
- `bot/src/api/middleware/rateLimiter.ts` (console replacement only)
- `bot/src/utils/db.ts` (console replacement only)

**GRAY AREA:**
- `bot/src/api/middleware/auth.ts` — ONLY replace `console.*` with logger calls. Do NOT change authorization logic (Agent A owns that).

**FORBIDDEN:**
- `mini-app/**`, `tools/**`, `database/**`
- `bot/src/api/routes/*.ts` (except GRAY on quests.ts for console swap if needed)
- `bot/src/handlers/**`, `bot/src/jobs/**`
- `bot/src/index.ts`
- `scripts/**`, `ecosystem.config.js`
- `PARALLEL_AGENTS.md` (except retrospective)

---

### Agent C — Transaction Atomicity + Idempotency Fixes

**Branch:** `feature/r25-transaction-fixes`
**Worktree:** `../Wibecode-agent-c`

**Context:** The `completeOnboarding` endpoint has 3 atomicity/idempotency bugs:
1. Mode creation (lines 81-109) runs OUTSIDE the transaction — orphaned rows on rollback.
2. `total_xp + 50` is not idempotent — double calls award 100 XP.
3. UPDATE on `onboarding_state` step 5 matches zero rows if no row exists — user never marked completed.

Additionally, the DELETE account transaction misses the `reminders` table.

**Tasks:**

1. **Add idempotency guard to `onboarding.ts` POST complete** — After userId lookup, before any processing: check `onboarding_state.current_step`. If already `'completed'`, return early with `{ xp_awarded: 0, already_completed: true }`.

2. **Move mode creation inside the transaction** — Move lines 81-109 inside the `transaction()` callback. Convert `queryOne()`/`execute()` to `client.query()` with `.rows[0]` access pattern. This ensures atomicity.

3. **Replace UPDATE with UPSERT for onboarding completion** — Change step 5 (lines 173-176) from UPDATE to INSERT ... ON CONFLICT (user_id) DO UPDATE SET current_step = 'completed'. This handles the case where no onboarding_state row exists.

4. **Move quest assignment inside the transaction** — Move lines 181-207 inside the transaction callback, using `client.query()`. This ensures a user never ends up with "completed onboarding" but zero quests.

5. **Add reminders cleanup to users.ts DELETE** — Add `DELETE FROM reminders WHERE user_id = $1` to the transaction in `users.ts` (after streaks delete, before user update).

6. **Build verification**: `cd bot && npm run build`

**OWNED files:**
- `bot/src/api/routes/onboarding.ts` (transaction body restructure + idempotency guard)
- `bot/src/api/routes/users.ts` (add reminders DELETE to transaction ONLY)

**FORBIDDEN:**
- `mini-app/**`, `tools/**`, `database/**`
- `bot/src/api/server.ts`, `bot/src/api/middleware/**`, `bot/src/api/utils/**`
- `bot/src/api/routes/quests.ts`, `modes.ts`, `checkins.ts`, `achievements.ts`, `punishment.ts`, `leaderboard.ts`, `admin*.ts`
- `bot/src/handlers/**`, `bot/src/jobs/**`, `bot/src/utils/**`
- `scripts/**`, `ecosystem.config.js`
- `PARALLEL_AGENTS.md` (except retrospective)

---

### Agent D — Frontend Hardening

**Branch:** `feature/r25-frontend-hardening`
**Worktree:** `../Wibecode-agent-d`

**Context:** Multiple frontend edge cases were discovered during the debugging session: telegramId=0 causing silent API failures, double-fire of completeOnboarding stacking XP, 1.2s stale page after delete, API errors sending all users to onboarding, "Unknown step: completed" with no render case.

**Tasks:**

1. **Guard telegramId in `Onboarding.tsx`** — Change `user?.id || 0` to `user?.id` (undefined, not 0). Add early returns when telegramId is falsy. Add error screen "Please open this app from Telegram" when user is null after component mounts.

2. **Add idempotency guard to `LaunchScreen.tsx`** — Add `const calledRef = useRef(false)` and check it before calling `completeOnboarding()` in useEffect. Set it to `true` after the first call.

3. **Improve delete redirect in `useSettingsData.ts`** — Reduce setTimeout from 1200ms to 500ms. Use `window.location.replace()` instead of `.href` to prevent back-button returning to deleted state.

4. **Fix API error catch in `App.tsx`** — In `checkOnboardingState()` catch block (lines 67-69), change `setNeedsOnboarding(true)` to `setNeedsOnboarding(false)`. Safer default: let individual pages handle auth failures rather than temporarily routing all users to onboarding.

5. **Add `completed` case to `Onboarding.tsx` renderStep** — Add `case 'completed':` that calls `navigate('/dashboard', { replace: true })` and returns null. Handles the edge case where the onboarding page renders with `currentStep = 'completed'`.

6. **Build verification**: `cd mini-app && npm run build`

**OWNED files:**
- `mini-app/src/pages/Onboarding.tsx`
- `mini-app/src/components/onboarding/LaunchScreen.tsx`
- `mini-app/src/hooks/useSettingsData.ts`
- `mini-app/src/App.tsx`

**FORBIDDEN:**
- `bot/**`, `tools/**`, `database/**`
- `mini-app/src/api/client.ts`
- `mini-app/src/hooks/useOnboarding.ts`
- `mini-app/src/components/ProtectedRoute.tsx`
- `mini-app/src/components/settings/DangerZone.tsx`
- `scripts/**`, `ecosystem.config.js`
- `PARALLEL_AGENTS.md` (except retrospective)

---

### Agent E — Deploy Protocol + Version Tracking

**Branch:** `feature/r25-deploy-protocol`
**Worktree:** `../Wibecode-agent-e`

**Context:** During a multi-hour debugging session, the developer repeatedly restarted `telegram-rpg-api` (PM2 ids 1,2) instead of `telegram-rpg-bot` (PM2 id 0). Nginx routes to port 3000 which is served exclusively by `telegram-rpg-bot`. The separate `telegram-rpg-api` cluster exists but receives zero traffic. There was no way to verify which code version was running on the server.

**Tasks:**

1. **Add version info to `/health` endpoint in `server.ts`** — ONLY modify lines 63-69. Add `version: BUILD_VERSION` and `build_timestamp: BUILD_TIMESTAMP` to the response. Add const declarations near the top: `const BUILD_VERSION = process.env.BUILD_VERSION || 'dev'` and `const BUILD_TIMESTAMP = process.env.BUILD_TIMESTAMP || new Date().toISOString()`.

2. **Create `scripts/deploy.sh`** — Push to GitHub, SSH to server, git pull, build both bot and mini-app, restart ONLY `telegram-rpg-bot`, wait 3 seconds, verify via /health endpoint comparing version to local commit hash. Make executable. Include clear success/failure output.

3. **Update `ecosystem.config.js`** — Add `BUILD_VERSION: 'set-by-deploy-script'` and `BUILD_TIMESTAMP: 'set-by-deploy-script'` to `env_production` block. Add WARNING comment to `telegram-rpg-api` section: "This process is NOT used. Nginx routes to telegram-rpg-bot. DO NOT restart this process."

4. **Add "Deploy Verification Protocol" to `PARALLEL_AGENTS.md`** — New section after "Safety Protocol" explaining: which PM2 process to always restart, how to verify, preferred deploy command, manual fallback, and the cautionary tale from the debugging session.

5. **Update "Known Issues" in `PARALLEL_AGENTS.md`** — Add resolutions for issues fixed in Run 25 (authorization gap, XP idempotency, transaction atomicity, dead logger, deploy coupling).

6. **Build verification**: `cd bot && npm run build`

**OWNED files:**
- `bot/src/api/server.ts` (GRAY AREA: health endpoint lines 63-69 ONLY + const declarations at top)
- `scripts/deploy.sh` (new)
- `ecosystem.config.js`
- `PARALLEL_AGENTS.md` (Deploy Protocol section + Known Issues + retrospective)

**FORBIDDEN:**
- `mini-app/**`, `tools/**`, `database/**`
- `bot/src/api/routes/**`, `bot/src/api/middleware/**`, `bot/src/api/utils/**`
- `bot/src/handlers/**`, `bot/src/jobs/**`, `bot/src/utils/**`
- `bot/src/index.ts`

---

### Run 25 File Ownership Matrix

| File | Agent A | Agent B | Agent C | Agent D | Agent E |
|------|---------|---------|---------|---------|---------|
| `bot/src/api/middleware/auth.ts` | **OWN** (add requireOwnership) | GRAY (console swap) | FORBID | FORBID | FORBID |
| `bot/src/api/routes/users.ts` | **OWN** (auth lines) | FORBID | **OWN** (delete txn) | FORBID | FORBID |
| `bot/src/api/routes/onboarding.ts` | **OWN** (auth lines) | FORBID | **OWN** (txn+idempotency) | FORBID | FORBID |
| `bot/src/api/routes/modes.ts` | **OWN** (auth) | FORBID | FORBID | FORBID | FORBID |
| `bot/src/api/routes/checkins.ts` | **OWN** (auth) | FORBID | FORBID | FORBID | FORBID |
| `bot/src/api/routes/achievements.ts` | **OWN** (auth) | FORBID | FORBID | FORBID | FORBID |
| `bot/src/api/routes/punishment.ts` | **OWN** (auth) | FORBID | FORBID | FORBID | FORBID |
| `bot/src/api/utils/logger.ts` | FORBID | **OWN** | FORBID | FORBID | FORBID |
| `bot/src/api/server.ts` | FORBID | **OWN** (middleware+error) | FORBID | FORBID | GRAY (health only) |
| `bot/src/api/middleware/rateLimiter.ts` | FORBID | **OWN** (console swap) | FORBID | FORBID | FORBID |
| `bot/src/utils/db.ts` | FORBID | **OWN** (console swap) | FORBID | FORBID | FORBID |
| `bot/src/types/express.d.ts` | FORBID | **OWN** (requestId) | FORBID | FORBID | FORBID |
| `mini-app/src/pages/Onboarding.tsx` | FORBID | FORBID | FORBID | **OWN** | FORBID |
| `mini-app/src/components/onboarding/LaunchScreen.tsx` | FORBID | FORBID | FORBID | **OWN** | FORBID |
| `mini-app/src/hooks/useSettingsData.ts` | FORBID | FORBID | FORBID | **OWN** | FORBID |
| `mini-app/src/App.tsx` | FORBID | FORBID | FORBID | **OWN** | FORBID |
| `scripts/deploy.sh` (new) | FORBID | FORBID | FORBID | FORBID | **OWN** |
| `ecosystem.config.js` | FORBID | FORBID | FORBID | FORBID | **OWN** |
| `PARALLEL_AGENTS.md` | retro only | retro only | retro only | retro only | **OWN** (protocol + retro) |

### Run 25 Merge Order
1. **Agent E** (deploy protocol + version endpoint — infrastructure, no deps)
2. **Agent B** (structured logging — foundation for all backend logging)
3. **Agent A** (authorization — adds guards to routes)
4. **Agent C** (transaction fixes — modifies handler bodies, layers on A's auth)
5. **Agent D** (frontend — completely independent of backend changes)

### Run 25 Retrospectives

#### Agent A Retrospective
**Status:** All 6 tasks completed. Build passes (`tsc --noEmit` — zero errors).

| # | Task | Status |
|---|------|--------|
| 1 | Create `requireOwnership()` helper in auth.ts | Done |
| 2 | Add authorization to users.ts (8 `:telegramId` endpoints) | Done |
| 3 | Add authorization to onboarding.ts (3 endpoints) | Done |
| 4 | Add `authorizeUser` middleware to modes.ts (5 `:userId` endpoints) | Done |
| 5 | Add auth to checkins.ts (3) + achievements.ts (5) + punishment.ts (3) | Done |
| 6 | Build verification | Pass — zero errors |

**Commits:** 7 atomic commits (one per file: auth.ts, users.ts, onboarding.ts, modes.ts, checkins.ts, achievements.ts, punishment.ts).

**Total endpoints hardened:** 27 endpoints across 7 route files now enforce resource ownership:
- **requireOwnership(req)** added to 16 `:telegramId` handlers (users: 8, onboarding: 3, punishment: 3, checkins: 2)
- **authorizeUser** middleware added to 10 `:userId` routes (modes: 5, achievements: 5)
- **Body telegram_id check** added to checkins POST (compares `req.body.telegram_id` to `req.telegramUser?.id`)

**Implementation approach:**
- `requireOwnership(req)` is a lightweight synchronous function (no DB query) — compares `parseInt(req.params.telegramId)` to `req.telegramUser?.id`. Throws `ForbiddenError` on mismatch.
- For `:userId` routes, reused the existing `authorizeUser` middleware (DB lookup + comparison) — same pattern as quests.ts.
- For checkins POST, `telegram_id` is in body (not URL params), so added explicit comparison before the SQL query.

**Problems faced:** None.

**Merge notes for Agent 0:**
- Agent C modifies body of onboarding.ts and users.ts DELETE. My changes are at the TOP of handlers (`requireOwnership(req)` line). Different lines — should auto-merge.
- Agent B modifies auth.ts to replace `console.*`. My change adds `requireOwnership` at BOTTOM + new import at top. Should auto-merge.

#### Agent B Retrospective
**Status:** All 6 tasks completed. Build passes (`tsc --noEmit` — zero errors).

| # | Task | Status |
|---|------|--------|
| 1 | Rewrite `logger.ts` with structured JSON output, `child()`, `generateRequestId()` | Done |
| 2 | Add request tracing middleware to `server.ts` + `requestId` to `express.d.ts` | Done |
| 3 | Replace 12+ `console.*` calls in `auth.ts` with structured logger, remove `logAuthAttempt` | Done |
| 4 | Replace 4 `console.*` calls in `rateLimiter.ts` + 4 in `db.ts` with structured logger | Done |
| 5 | Update global error handler + startup logs in `server.ts` with `logger.error/info` | Done |
| 6 | Build verification | Pass |

**Commits:** 6 atomic commits on `feature/r25-structured-logging`.

**Implementation highlights:**
- Logger outputs JSON lines in production (for PM2 log parsing) and human-readable format in development.
- `child(ctx)` creates context-bound loggers — every auth/db/rateLimiter log entry automatically includes its component name.
- Request tracing middleware generates UUID per request, attaches to `req.requestId`, logs start/finish with duration and status code.
- All `auth.ts` logs now include `requestId`, `telegramUserId`, and `ip` — enabling correlation of auth attempts with the request that triggered them.
- Removed the 22-line `logAuthAttempt` helper (replaced by 1-line structured logger calls).
- Server startup consolidated from 13 console.log lines to 1 structured logger.info call.

**Problems faced:** Minor TS2790 error — `delete rest.level` not allowed on non-optional property. Fixed by destructuring `level` out of the spread instead.

**Recommendations for next run:**
- The remaining ~130 `console.*` calls in route files and handlers still use raw console. A future run could migrate them to the structured logger for full traceability.
- Consider adding a `morgan` custom token for `requestId` so HTTP access logs also include the request trace ID.

#### Agent C Retrospective
**Status:** All 5 tasks completed. Build passes (`tsc --noEmit` — zero errors).

| # | Task | Status |
|---|------|--------|
| 1 | Add idempotency guard to POST complete (check onboarding_state before processing) | Done |
| 2 | Move mode creation inside transaction (queryOne/execute → client.query with .rows[0]) | Done |
| 3 | Replace UPDATE with UPSERT for onboarding completion state (INSERT ON CONFLICT) | Done |
| 4 | Move quest assignment inside transaction (query/execute → client.query with .rows) | Done |
| 5 | Add reminders DELETE to users.ts account deletion transaction | Done |

**Commits:** 5 atomic commits on `feature/r25-transaction-fixes` (1 per task).

**Changes made:**
- **onboarding.ts**: The POST `/complete` handler now has an idempotency guard that checks `onboarding_state.current_step = 'completed'` before any processing, returning `{ xp_awarded: 0, already_completed: true }` on re-calls. All 6 steps (modes, configs, punishments, XP award, state UPSERT, quest assignment) run inside a single `transaction()` block. Mode creation converted from `queryOne()`/`execute()` to `client.query()` with `.rows[0]`. Onboarding state marking changed from UPDATE (which silently no-ops if no row exists) to INSERT ON CONFLICT UPSERT. Quest assignment converted from `query()`/`execute()` to `client.query()` with `.rows`.
- **users.ts**: Added `DELETE FROM reminders WHERE user_id = $1` to the account deletion transaction, between streaks delete and user deactivation.

**Problems faced:** None. All changes were straightforward restructuring — no logic changes, just moving code into the transaction scope and converting DB access patterns.

**Merge compatibility with Agent A:** Agent A adds `requireOwnership(req)` as the first line inside handlers (after `const tid = ...`). My changes are in the body of the POST complete handler (transaction restructure) and the DELETE handler (adding one line). These are on completely different lines and should auto-merge cleanly.

#### Agent D Retrospective
**Status:** All 5 tasks completed. Build passes (`tsc --noEmit` + `vite build` — zero errors).

| # | Task | Status |
|---|------|--------|
| 1 | Guard telegramId in Onboarding.tsx — remove `\|\|0`, add error screen | Done |
| 2 | Add idempotency guard to LaunchScreen.tsx — `useRef(false)` | Done |
| 3 | Improve delete redirect in useSettingsData.ts — 500ms + `replace()` | Done |
| 4 | Fix API error catch in App.tsx — `setNeedsOnboarding(false)` | Done |
| 5 | Add `completed` case to Onboarding.tsx renderStep | Done |

**Commits:** 5 atomic commits on `feature/r25-frontend-hardening` (one per task).

**Implementation details:**
- **Onboarding.tsx telegramId:** Changed `user?.id || 0` to `user?.id` (now `number | undefined`). Added `mounted` state via `useState(false)` + `useEffect` to track mount. When `mounted && !telegramId`, renders "Please open this app from Telegram" screen. Used `telegramId!` non-null assertion when passing to LaunchScreen since early return guarantees it's defined.
- **LaunchScreen.tsx:** Added `calledRef = useRef(false)` — checked and set to `true` before `completeOnboarding()` call. Prevents XP stacking on re-mount.
- **useSettingsData.ts:** `setTimeout` reduced 1200ms→500ms. `window.location.href` → `window.location.replace()` to remove deleted-account page from browser history (back button won't return to stale state).
- **App.tsx:** Catch block now sets `setNeedsOnboarding(false)` — existing users on network error stay on their page instead of briefly seeing onboarding.
- **Onboarding.tsx renderStep:** Added `case 'completed':` that calls `navigate('/dashboard', { replace: true })` and returns `null`. Eliminates the "Unknown step: completed" fallback text.

**Problems faced:** None — all 5 fixes were surgical, isolated changes.

**Recommendations for next run:** None — all assigned edge cases resolved.

#### Agent E Retrospective
**Status:** All 6 tasks completed. Build passes (`tsc` — zero errors).

| # | Task | Status |
|---|------|--------|
| 1 | Add BUILD_VERSION + BUILD_TIMESTAMP to /health endpoint in server.ts | Done |
| 2 | Create scripts/deploy.sh with version verification | Done |
| 3 | Update ecosystem.config.js — add env vars + WARNING comment to telegram-rpg-api | Done |
| 4 | Add Deploy Verification Protocol section to PARALLEL_AGENTS.md | Done |
| 5 | Update Known Issues — mark 12 issues resolved by Run 25 | Done |
| 6 | Build verification | Pass |

**Commits:** 5 atomic commits on `feature/r25-deploy-protocol`.

**Implementation details:**
- **server.ts**: Added 2 const declarations (`BUILD_VERSION`, `BUILD_TIMESTAMP`) after PORT declaration. Modified ONLY the health endpoint response object (lines 63-69) — added `version` and `build_timestamp` fields. No other changes to server.ts.
- **deploy.sh**: Full deploy pipeline — push, SSH build (bot + mini-app), restart ONLY `telegram-rpg-bot`, 3-second wait, curl /health, compare version to local git hash. Color-coded output. Clear failure diagnostics with manual fix command.
- **ecosystem.config.js**: Added `BUILD_VERSION` and `BUILD_TIMESTAMP` to `env_production` (defaults to `'set-by-deploy-script'`). Added 4-line WARNING comment above `telegram-rpg-api` explaining it receives zero traffic.
- **Deploy Verification Protocol**: New section between Safety Protocol and Lessons Learned. Covers: which process to restart, how to verify, preferred deploy method, manual fallback, Agent 0 deploy checklist.
- **Known Issues**: Updated header to "after Run 25". Moved issue #5 to resolved. Added 12 resolved entries covering all 5 agents' work. Renumbered remaining open issues.

**Problems faced:** None. All tasks were straightforward documentation + config changes with one small server.ts modification.

**Recommendations for next run:**
- The `scripts/deploy.sh` sets BUILD_VERSION via environment variable on PM2 restart. Agent 0 should verify this works on first real deploy (env var propagation through PM2 can be tricky).
- Consider updating the Agent 0 "Deploy Command" at the top of PARALLEL_AGENTS.md to reference `scripts/deploy.sh` instead of the inline SSH command.

#### Agent 0 Retrospective
*(To be filled by Agent 0)*

<!-- Next run goes here. Agent 0 will append RUN 26 below this line. -->
