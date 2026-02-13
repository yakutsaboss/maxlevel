# Parallel Agents Protocol

This file is the single source of truth for running parallel Claude Code agents on the Wibecode RPG bot project. Each "Run" launches 2-6 agents (A, B, C, D, E, F) in separate git worktrees, plus Agent 0 (orchestrator) in the main repo.

For completed run history (Runs 2–49), see `PARALLEL_AGENTS_HISTORY.md`.

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

**⚠️ CRITICAL SAFETY RULE (added after Run 28 near-disaster):**
- **NEVER remove worktrees or delete branches without first running `git log main..feature/BRANCH --oneline` for EVERY branch.** In Run 28, Agent 0 received a user request to "redesign" the next run and immediately deleted all worktrees + branches — including one with 4 unmerged commits. The branch was recovered from reflog, but this could have been permanent data loss.
- **Even if you think branches are empty** (e.g., "I just created them"), ALWAYS verify. Agents may have worked faster than expected, or a previous Agent 0 session may have already set things up.
- **Sequence: verify → merge → THEN clean up.** Never skip steps 2-4 to jump straight to cleanup.

**Phase B — Prepare the NEXT run:**
11. **Archive completed runs (every 5 runs)** — after Runs 30, 35, 40, etc., move all completed runs except the latest to `PARALLEL_AGENTS_HISTORY.md`. Update both file headers (line 5 here + line 3 in history) with the new run range. Between archive points, completed runs stay in the main file. **Do this FIRST in Phase B so it's never forgotten.**
12. **Write retrospective** for the current run (merge results, what went right, issues carried forward).
13. **Design next run's tasks** — analyze the codebase, read "Known Issues" and agent recommendations, and write the next Run section with full agent prompts.
14. **Pre-allocate retrospective sections** — create a named placeholder for each agent (see Run Template below). This prevents merge conflicts.
15. **Write copy-paste prompts** — at the top of the next Run section, include a "Copy-Paste Prompts" block with the exact text the user should paste into each Claude Code session.
16. **Set up worktrees** for the next run: create branches, `git worktree add`, install deps.
17. **Commit & push** the updated PARALLEL_AGENTS.md.
18. **Tell the user**: "Ready to launch Run N. Here are your copy-paste prompts."

**MANDATORY OUTPUT RULES (added after Run 26 failure):**
- **ALWAYS print copy-paste prompts in your chat message** — NOT just in the file. The user should NEVER have to open PARALLEL_AGENTS.md to find prompts. Print them at the end of your message with clear formatting.
- **ALWAYS pre-allocate a retrospective section for EVERY agent** — including Agent D, E, F. Every agent listed in the run MUST have a `#### Agent X Retrospective` + `*(To be filled by Agent X)*` placeholder. Missing placeholders cause agents to write retros in random locations → merge conflicts + lost work.
- **ALWAYS run `npx vitest --run` after merge** — if any tests fail due to cross-agent side effects (e.g., logger migration breaking test spies), fix them as Agent 0 BEFORE deploying.
- **Count your agents, count your placeholders** — if the run has N agents, the retrospective section MUST have exactly N+1 headings (N agents + Agent 0). Verify this before committing.

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
13. **Agent 0 MUST print copy-paste prompts in chat** — Run 26 Agent 0 only wrote prompts in the file, forcing the user to find them manually. ALWAYS print them at the end of the chat message.
14. **Agent 0 MUST pre-allocate ALL retrospective placeholders** — Run 26 Agent 0 forgot Agent D's placeholder. Agent D wrote their retro after the `<!-- Next run -->` marker. Always count: N agents = N+1 placeholders (agents + Agent 0).
15. **Agent 0 MUST run tests post-merge** — Run 26 had 9 residual failures because Agent D's logger migration broke job test spies on console.log. Always run `npx vitest --run` after all merges and fix failures before deploying.
16. **NEVER delete worktrees/branches before verifying they're merged** — Run 28 Agent 0 deleted all 3 worktrees + force-deleted an unmerged branch (`feature/r28-logger-relocation` with 4 commits) because it assumed they were empty. Always run `git log main..feature/BRANCH --oneline` BEFORE any cleanup. Even if you "just created" the branches, agents may have already finished.

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
**Status:** COMPLETE — all 7 `any` eliminated from user-stats.ts, 594/594 tests pass.

**What was done:**
- Created 5 interfaces at top of file: `UserModeRow`, `ActiveQuestRow`, `RecentAchievementRow`, `StreakRow`, `AggregatesRow` — each mapped to the exact SQL SELECT column aliases used in nearby queries.
- Replaced all 7 `(row: any)` / `(s: any)` callbacks with the correct interface type.
- Added `query<T>` / `queryOne<T>` generics to all 8 query calls in the file, giving end-to-end type safety from DB result to response formatter.
- Build: `tsc` reports 0 errors in user-stats.ts. (Pre-existing errors in achievements.ts, quest-progress.ts, settings.ts are other agents' scope.)
- Tests: 52 files, 594 tests, all passing.

**Notes for Agent 0:**
- The `tsc` build has 6 pre-existing errors in other files (achievements.ts:48, quest-progress.ts:29, settings.ts:105/132/159/165). These are NOT regressions from this PR — they existed before and are assigned to other agents or carried forward.

#### Agent C Retrospective
**All 5 tasks completed. Build + tests pass (tsc, vite build, 66/66 vitest).**

**Note:** This Agent C retro is from an earlier run's template — left as-is for historical reference.

| # | Task | Status |
|---|------|--------|
| 1 | Create `types/telegram.ts` with haptic + quiz types | Done |
| 2 | Update 8 component haptic props | Done (6 × HapticImpactOnly, 2 × HapticWithSelection) |
| 3 | Update 3 hooks (useDashboardData, usePullToRefresh, useSettingsData) | Done |
| 4 | Fix `Record<string, any>` in useQuizState + onboardingQuestions | Done (QuizAnswerValue, OnboardingData) |
| 5 | Verify zero `any` in owned files, build + test | Done — 0 `any` in owned files |

**What went well:** Straightforward type-only changes. Created granular haptic interfaces (HapticImpactOnly, HapticWithSelection, HapticWithNotification, HapticFull) to match each component's actual usage rather than one bloated interface. The `QuizAnswerValue` union type (`string | string[] | number | { value: number; unit: string }`) precisely describes all quiz answer shapes.

**Remaining `any` NOT in Agent C scope:**
- `QuizScreen.tsx:21` — `onAnswer` prop still typed `value: any` (not in owned files)
- `Onboarding.tsx:131` — same callback, page file (FORBIDDEN)
- All `__tests__/**` files — `as any` casts in mocks (FORBIDDEN)

**Recommendation for next run:** Fix QuizScreen.tsx and Onboarding.tsx to use `QuizAnswerValue` for full any-elimination in source files.
```

---

## Known Issues (Updated after Run 28)

### Still Open
1. **pg-boss Node.js mismatch** — Requires 22.12+, server has 20.20. Only triggers warnings, no functional impact yet.
2. **Mode configs unused** — `mode_configs` table stores quiz responses + personalized plans, but data is never consumed.
3. **Delete account e2e testing** — confirm soft delete flow works end-to-end in Telegram (Agent B Run 18 recommendation).
4. **POST /analytics/export still uses executePythonTool** — Justified (Google Sheets OAuth integration), only remaining Python subprocess in ALL routes + jobs.

### Resolved (Run 28)
- ~~logger.ts in wrong location~~ — Moved from `api/utils/logger.ts` to `utils/logger.ts`, updated 29 imports, exported `LEVEL_ORDER`/`minLevel`/`setLogLevel()` (Run 28 Agent B).
- ~~QuizScreen.tsx 357 lines~~ — Split into orchestrator (95 lines) + `quiz/useQuizState.ts` (148 lines) + `quiz/AnswerInput.tsx` (130 lines) (Run 28 Agent A).
- ~~PunishmentConfig.tsx 342 lines~~ — Split into orchestrator (121 lines) + 4 sub-components in `punishment/` (Run 28 Agent A).
- ~~Punishment route untested~~ — 24 new HTTP integration tests covering all 3 endpoints (Run 28 Agent C).

### Resolved (Run 27)
- ~~Local SQL helpers duplicated~~ — Extracted `getUserByTelegramId`, `listAllModes`, `getUserActiveModes` to shared `utils/queries.ts`. Also updated `start.ts`, `settings.ts`, `admin-stats.ts` (Run 27 Agent B).
- ~~testApp.ts has no error handler~~ — Consolidated into `addTestErrorHandler()` in `testApp.ts`, removed from all 8 HTTP test files (Run 27 Agent A).
- ~~Logger has no LOG_LEVEL env var support~~ — Added `LOG_LEVEL` env var with `LEVEL_ORDER` map and `minLevel` filtering in `write()`. Defaults: `debug` in dev, `info` in production (Run 27 Agent C).

### Resolved (Run 26)
- ~~114 test failures~~ — ALL 412 tests now pass. Fixed by Agents A (37 tests), B (52 tests), C (25 tests), Agent 0 (9 post-merge fixes).
- ~~109 console.* calls in production code~~ — Agent D migrated 105 calls across 25 files to structured logger. 0 remaining `console.*` in prod (only `logger.ts` retains intentional `console.*` for dev output).
- ~~Test setup.ts stale mocks~~ — Agent C removed 17 stale pythonTools wrapper mocks. Only `executePythonTool` remains (still used by admin-stats.ts).
- ~~HTTP tests missing error handler~~ — All 8 test files now have `ApiError`-aware error handlers in `buildApp()` (still duplicated — consolidation planned for Run 27).
- ~~HTTP tests response shape mismatch~~ — All assertions updated from `res.body.X` to `res.body.data.X` (matching `successResponse()` wrapper).
- ~~HTTP tests missing requireOwnership mock~~ — All test files mock `requireOwnership` alongside `authenticateTelegram` and `authorizeUser`.

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

### Run 50 Retrospectives

#### Agent A Retrospective
**Task**: Fix onboarding blink/reload bug — page visually blinks between step transitions.

**Root cause confirmed**: `AnimatePresence mode="wait"` forces sequential exit→enter animations. The old step fades out (opacity 0, x -20) over 0.2s, creating a visible gap before the new step fades in (opacity 0→1, x 20→0). The x-axis movement made the flash even more noticeable.

**Fix applied**: Changed `mode="wait"` to `mode="sync"` and replaced x+opacity transition with opacity-only crossfade at 0.15s. Now old/new steps cross-fade simultaneously — no gap, no blink.

**Files modified**: `mini-app/src/pages/Onboarding.tsx` (lines 198-208 only)

**Child component check**: Reviewed all `useEffect` hooks in onboarding sub-components (LaunchScreen, QuizScreen/useQuizState, DrumRoller). None flash loading states on step change — the blink was purely from AnimatePresence.

**Build**: Passed cleanly.

#### Agent B Retrospective
**Fixed**: Dashboard quote-overlaps-stats bug by replacing two negative margins with positive ones.

**Changes** (1 file, 2 lines):
- `mini-app/src/pages/Dashboard.tsx` line 87: `-mt-4` → `mt-3` (quote section)
- `mini-app/src/pages/Dashboard.tsx` line 99: `-mt-8` → `mt-4` (stat grid)

**Root cause**: The quote used `-mt-4` to overlap the header gradient bottom (decorative), and the stat grid used `-mt-8` to pull up into the quote area (bug). Together they stacked, causing stats to visually overlap the quote text.

**Design note**: The `-mt-4` on the quote was intentional (card-over-gradient pattern) but contributed to the overlap chain. Changing to `mt-3` gives clean separation: header → 0.75rem gap → quote → 1rem gap → stats. The gradient `rounded-b-3xl` still provides a clean visual edge without needing overlap.

**Build**: tsc clean, Vite build passes.

#### Agent C Retrospective
**Task**: Fix header spacing across all pages — titles too close to top edge.
**Files changed**: Quests.tsx, Achievements.tsx, Leaderboard.tsx, Finance.tsx, Social.tsx (5 files).

**What was done**:
- Changed `p-6` to `pt-8 pb-6 px-6` on gradient header divs in Quests, Achievements, Leaderboard, and Finance pages.
- Social.tsx had NO gradient header — added a proper gradient header (`from-indigo-600 to-blue-600`) with `safe-area-top`, matching other pages.
- The `.safe-area-top` CSS class in index.css was already correct — issue was insufficient Tailwind padding.

**Build**: `tsc` + `vite build` clean.

#### Agent D Retrospective
**Task**: Fix achievement badge clipping (NEW badge, checkmark, lock icon)
**File modified**: `mini-app/src/components/achievements/AchievementCard.tsx`
**Result**: SUCCESS — build passes clean

**Root cause**: Line 74 had `overflow-hidden` on the card container (`motion.button`). Three badges were positioned outside the card boundaries with negative offsets and were clipped by the overflow.

**Fix applied**: Option 1 (recommended) — removed `overflow-hidden` from the card className. The card content is text and icons only — no images or content that needs clipping. `rounded-2xl` border-radius works independently of overflow. `line-clamp-2` on text elements handles text truncation via CSS line-clamp, not overflow. One-word change, minimal diff.

#### Agent E Retrospective
**Task**: Fix avatar off-center in Profile page header.

**Root cause**: `motion.div` used `inline-block relative` — `inline-block` with `text-center` parent doesn't reliably center when absolute-positioned children (level badge at `-bottom-2 -right-2`) extend the element's visual bounds.

**Fix**: Wrapped the `motion.div` in a `flex justify-center` container and removed `inline-block` from the motion wrapper (kept only `relative` for badge positioning). Structure: `div.flex.justify-center` > `motion.div.relative` > avatar + badge.

**Build**: Clean — `tsc && vite build` passed, zero errors.

#### Agent F Retrospective
**Task:** Save avatar selection and nickname from onboarding to the users table.
**Status**: DONE

**Changes made (1 file, 2 fixes):**
1. `bot/src/api/routes/onboarding.ts` — Added avatar persistence: maps `quiz_data.gender` string to integer `avatar_id` (1-5) via lookup map, then `UPDATE users SET avatar_id` within the existing transaction.
2. Same file — Added nickname persistence: if `quiz_data.nickname` is present, saves it to `users.first_name` (trimmed, max 100 chars).

**Build:** `tsc` passes clean, zero errors.

#### Agent G Retrospective
- **Task**: Add punishment transparency info to onboarding (PunishmentConfig + ConsentToggle)
- **Changes**: Added blue info box in PunishmentConfig.tsx explaining XP depreciation happens regardless of accountability toggle. Added subtitle in ConsentToggle.tsx clarifying that skipped quests already reduce XP.
- **Files modified**: `mini-app/src/components/onboarding/PunishmentConfig.tsx`, `mini-app/src/components/onboarding/punishment/ConsentToggle.tsx`
- **Build**: Passed (tsc + vite build clean)

#### Agent H Retrospective
**Task**: Write regression tests verifying Run 50 bug fixes (test-only agent).
**File created**: `mini-app/src/__tests__/regression/run50-bugs.test.tsx` (NEW, ~370 lines)
**Result**: SUCCESS — 12 tests across 6 describe blocks.

**Test structure**: Onboarding no-blink (3), Dashboard no-overlap (2), Social header spacing (1), Achievement badge visibility (3), Avatar centering (1), Punishment transparency (2).

**Approach**: Hybrid — source-level `readFileSync` assertions for pages, `render()` + `screen` queries for isolated components.

**Pre-merge status**: 11/12 tests fail (expected — source files pre-fix). All 12 will pass after merge.

#### Agent 0 Retrospective
**Run 50 merge — 8 agents, 7 unmerged branches + 1 pre-merged (Agent D).**

**Merge results**: All 7 branches merged cleanly for source files. PARALLEL_AGENTS.md had expected conflicts on every merge (retrospective sections). Used `--theirs` strategy then restored all retrospectives manually.

**Agent 0 fix**: Agent H's regression test for avatar centering failed (11/12 passing). The test checked `parentElement` of `[role="img"]` for `flex justify-center`, but Agent E's fix added the flex wrapper as grandparent (structure: `div.flex.justify-center` > `motion.div.relative` > `div[role="img"]`). Fixed by navigating one more level up.

**Build**: Bot (tsc) + Mini-app (tsc + vite) — both clean. 547/547 tests pass (113 files).

**Deploy**: `8f3c251` — health check verified, notification sent.

**Cleanup**: 8 worktrees removed, 8 feature branches deleted.

**What went well**: Clean run — all 8 agents completed their single-file tasks. No cross-agent conflicts in source files. Agent H's test-only approach works well for regression validation.

**Issues carried forward**:
- pg-boss Node.js 22.12+ requirement (server has 20.20)
- BUILD_TIMESTAMP env var formatting on Windows deploy (minor — uses literal `%Y` instead of date format)

---

## Run 51: Code Quality + i18n + Test Coverage (5 Agents + Agent 0)

**Date**: 2026-02-13
**Agents**: 5 (A-E) + Agent 0
**Goal**: Fix Navigation missing Finance, split oversized Social.tsx, migrate hardcoded strings to i18n, eliminate `any` casts, add missing test coverage.

**Key findings from codebase audit:**
1. Finance page not accessible from navigation menu (critical UX bug)
2. Social.tsx at 389 lines — needs splitting
3. ~50+ hardcoded strings in Social/Finance/Dashboard components despite i18n keys existing
4. 5 `as any` casts in source code (social.ts, Settings.tsx, ThemeSettings.tsx, Leaderboard.tsx)
5. Missing page tests for Social.tsx and Finance.tsx
6. 8 untested bot utilities (achievementEngine, queries, cache, streak, etc.)
7. ErrorBoundary uses direct console.error instead of logger

---

### Run 51 Copy-Paste Prompts

**Agent A — Navigation Fix + Social.tsx Split**
```
Read c:\Users\Asus\Desktop\Wibecode-agent-a\PARALLEL_AGENTS.md — find "Run 51" and locate the "Agent A" section. You are Agent A.

YOUR TASK: Fix the Navigation component to include Finance page, and split Social.tsx (389 lines) into smaller components.

OWNED FILES (only you modify these):
- mini-app/src/components/Navigation.tsx
- mini-app/src/pages/Social.tsx
- mini-app/src/components/social/ (NEW directory — create components here)

TASK 1 — Add Finance to Navigation:
1. Open mini-app/src/components/Navigation.tsx
2. Add `import { DollarSign } from 'lucide-react'` to the imports
3. In the navItems array (line 12-19), add a Finance entry BEFORE Profile (last item):
   `{ path: '/finance', icon: <DollarSign className="w-5 h-5" />, label: 'Finance' }`
4. This makes Finance accessible from the bottom navigation bar (currently unreachable by users)

TASK 2 — Split Social.tsx:
Social.tsx is 389 lines with inline friend request form, challenge creation form, and list rendering. Split into:

1. Extract `FriendRequestForm` component → `mini-app/src/components/social/FriendRequestForm.tsx`
   - Props: `telegramId`, `onSubmit`, `loading`, `error`, `success` (or manage state internally)
   - Contains the friend request input + submit button + success/error messages

2. Extract `ChallengeForm` component → `mini-app/src/components/social/ChallengeForm.tsx`
   - Props: the challenge creation form fields + submit handler
   - Contains all challenge creation inputs

3. Extract `FriendsList` component → `mini-app/src/components/social/FriendsList.tsx`
   - Props: `friends` array, `onChallenge` callback
   - Contains the friends grid rendering

4. Extract `ChallengesList` component → `mini-app/src/components/social/ChallengesList.tsx`
   - Props: `challenges` array
   - Contains the challenges list rendering with ChallengeCard

5. Keep Social.tsx as orchestrator importing these 4 components. Target: Social.tsx under 150 lines.

6. Also fix ErrorBoundary.tsx — replace `console.error` on line 23 with the logger utility:
   - Import logger: `import { logger } from '@/utils/logger'`
   - Change: `console.error('ErrorBoundary caught:', error, info.componentStack)` → `logger.error('ErrorBoundary caught:', error, info.componentStack)`

FORBIDDEN: Do NOT modify any bot/ files, other pages, or i18n files.

BUILD VERIFY: cd mini-app && npm run build must pass.

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 51 Retrospectives" → "Agent A Retrospective", replacing the placeholder text. Then commit all changes.
```

**Agent B — i18n Migration (Social + Finance + Dashboard)**
```
Read c:\Users\Asus\Desktop\Wibecode-agent-b\PARALLEL_AGENTS.md — find "Run 51" and locate the "Agent B" section. You are Agent B.

YOUR TASK: Migrate all hardcoded UI strings in Social, Finance, and Dashboard components to use the existing i18n translation system. The translation keys ALREADY EXIST in en.ts/ru.ts/zh.ts — the components just aren't using them.

OWNED FILES (only you modify these):
- mini-app/src/pages/Social.tsx
- mini-app/src/pages/Finance.tsx
- mini-app/src/pages/Dashboard.tsx
- mini-app/src/components/social/ChallengeCard.tsx
- mini-app/src/components/social/FriendsList.tsx
- mini-app/src/components/finance/BudgetForm.tsx
- mini-app/src/components/finance/BudgetSummary.tsx
- mini-app/src/components/finance/GoalForm.tsx
- mini-app/src/components/finance/SavingsGoal.tsx

IMPORTANT: Agent A is splitting Social.tsx into sub-components. If you find that Social.tsx has already been split (components in mini-app/src/components/social/), work with the NEW file structure. If it hasn't been split yet, work with the current Social.tsx — Agent 0 will handle any conflicts.

HOW TO DO IT:
1. First, read the i18n keys in mini-app/src/i18n/en.ts — sections `social:`, `finance:`, and `dashboard:`
2. In each component, add `import { useTranslation } from 'react-i18next'` and call `const { t } = useTranslation()`
3. Replace every hardcoded string with the corresponding `t('key')` call

SPECIFIC REPLACEMENTS:

Social components:
- 'No deadline' → t('social.noDeadline')
- 'Ended' → t('social.ended')
- 'd left' → t('social.daysLeft')
- 'h left' → t('social.hoursLeft')
- 'Completed' → t('social.completed')
- 'participant'/'participants' → t('social.participants')/t('social.participantsPlural')
- 'No friends yet...' → t('social.noFriends')
- 'Lv.' → t('social.level')
- 'Send Friend Request' → t('social.sendRequest')

Finance components:
- 'Monthly Budget Summary' → t('finance.budgetSummary')
- 'Income' → t('finance.income')
- 'Expenses' → t('finance.expenses')
- 'Balance' → t('finance.balance')
- 'Spent' → t('finance.spent')
- 'Category Breakdown' → t('finance.categoryBreakdown')
- 'Add Entry' → t('finance.addEntry')
- 'Expense'/'Income' → t('finance.expense')/t('finance.income')
- 'Saving...' → t('finance.saving')
- 'Savings Goals' → t('finance.savingsGoals')
- 'No savings goals yet' → t('finance.noSavingsGoals')
- 'Create your first goal...' → t('finance.createFirstGoal')

Dashboard:
- getGreeting() function (lines 20-25) returns hardcoded English. Replace with i18n keys:
  - Check if dashboard greeting keys exist in en.ts. If not, add them to ALL THREE language files (en.ts, ru.ts, zh.ts)
  - Keys needed: 'dashboard.greetingMorning', 'dashboard.greetingAfternoon', 'dashboard.greetingEvening', 'dashboard.greetingNight'

If any translation key is MISSING from en.ts, add it to ALL 3 files (en.ts, ru.ts, zh.ts) with appropriate translations.

FORBIDDEN: Do NOT modify any bot/ files, Navigation.tsx (Agent A), or test files.

BUILD VERIFY: cd mini-app && npm run build must pass.

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 51 Retrospectives" → "Agent B Retrospective", replacing the placeholder text. Then commit all changes.
```

**Agent C — Bot Code Quality (any casts + NaN validation)**
```
Read c:\Users\Asus\Desktop\Wibecode-agent-c\PARALLEL_AGENTS.md — find "Run 51" and locate the "Agent C" section. You are Agent C.

YOUR TASK: Fix TypeScript `as any` casts in bot routes and add robust parseInt validation.

OWNED FILES (only you modify these):
- bot/src/api/routes/social.ts
- bot/src/api/routes/leaderboard.ts
- bot/package.json

TASK 1 — Fix `as any` in social.ts (lines 72-73):
```typescript
// Current (bad):
invalidate(`social:challenges:${(request as any).from_user_id}`);
invalidate(`social:challenges:${(request as any).to_user_id}`);
```
Fix: Look at the type of `request` in the surrounding code. It's likely the result of a SQL query. Create a proper interface for the challenge request row and type `request` correctly.

TASK 2 — Fix parseInt NaN risk in leaderboard.ts:
Lines like:
```typescript
const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
```
The `||` operator doesn't catch NaN correctly because `NaN || 50` evaluates to `50` in JS (NaN is falsy). But `parseInt('abc')` returns NaN, and `NaN || 50` does give 50, so it actually works. HOWEVER, `parseInt('0') || 50` gives 50 when the user intended 0.

Fix: Create a helper function `safeParseInt(value: string | undefined, defaultVal: number): number` that:
1. Returns defaultVal if value is undefined/null/empty
2. Returns the parsed number if valid
3. Returns defaultVal if NaN
4. Put this in the same file or in a shared location if it's useful in multiple routes

Apply to all parseInt calls in leaderboard.ts.

TASK 3 — Add test script to bot/package.json:
Currently missing `"test"` script. Add:
```json
"test": "vitest --run",
"test:watch": "vitest"
```

FORBIDDEN: Do NOT modify any mini-app files or other bot files outside your owned list.

BUILD VERIFY: cd bot && npm run build must pass.

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 51 Retrospectives" → "Agent C Retrospective", replacing the placeholder text. Then commit all changes.
```

**Agent D — Mini-App Page Tests (Social + Finance)**
```
Read c:\Users\Asus\Desktop\Wibecode-agent-d\PARALLEL_AGENTS.md — find "Run 51" and locate the "Agent D" section. You are Agent D.

YOUR TASK: Write tests for the Social.tsx and Finance.tsx pages — the only two pages without test coverage.

OWNED FILES (only you create/modify these):
- mini-app/src/__tests__/pages/Social.test.tsx (NEW)
- mini-app/src/__tests__/pages/Finance.test.tsx (NEW)

PATTERN: Read existing page tests for the testing pattern:
- mini-app/src/__tests__/pages/Dashboard.test.tsx
- mini-app/src/__tests__/pages/Achievements.test.tsx

These use @testing-library/react with vi.mock for API calls and hooks.

SOCIAL PAGE TESTS (Social.test.tsx):
1. Renders loading skeleton initially
2. Renders friends list when data loads
3. Renders "no friends" message when friends array is empty
4. Renders challenge list when challenges exist
5. Shows friend request form
6. Shows error section on API failure
7. Pull-to-refresh triggers refetch

FINANCE PAGE TESTS (Finance.test.tsx):
1. Renders with Budget tab active by default
2. Switches between Budget and Savings tabs
3. Renders BudgetTracker component in budget tab
4. Renders SavingsGoal component in savings tab
5. Shows loading skeleton initially
6. Shows error section on API failure

Target: ~20-25 tests across both files.

IMPORTANT: Agent A may be splitting Social.tsx into sub-components. Write tests against the PUBLIC API of Social.tsx (what it renders, not its internal structure). Use render() + screen queries for element content, not component implementation details.

FORBIDDEN: Do NOT modify any source files (test-only agent).

BUILD VERIFY: cd mini-app && npx vitest --run src/__tests__/pages/Social.test.tsx src/__tests__/pages/Finance.test.tsx

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 51 Retrospectives" → "Agent D Retrospective", replacing the placeholder text. Then commit all changes.
```

**Agent E — Bot Utility Tests**
```
Read c:\Users\Asus\Desktop\Wibecode-agent-e\PARALLEL_AGENTS.md — find "Run 51" and locate the "Agent E" section. You are Agent E.

YOUR TASK: Write tests for untested bot utility modules. These are core utilities used throughout the codebase with zero test coverage.

OWNED FILES (only you create these):
- bot/src/__tests__/utils/cache.test.ts (NEW)
- bot/src/__tests__/utils/streak.test.ts (NEW)
- bot/src/__tests__/utils/queries.test.ts (NEW)

PATTERN: Read existing utility tests for the testing pattern:
- bot/src/__tests__/utils/xpAward.test.ts
- bot/src/__tests__/utils/sqlBuilder.test.ts

These mock the database (`utils/db.ts`) and test function behavior.

CACHE TESTS (cache.test.ts):
1. First read bot/src/utils/cache.ts to understand the API
2. Test: set + get returns cached value
3. Test: get with expired TTL returns null/undefined
4. Test: invalidate removes cached entry
5. Test: invalidatePattern removes matching entries
6. Test: cache miss returns null/undefined

STREAK TESTS (streak.test.ts):
1. First read bot/src/utils/streak.ts to understand the API
2. Test: updateStreak increments streak for consecutive day
3. Test: updateStreak resets streak after gap
4. Test: updateStreak handles first-ever completion

QUERIES TESTS (queries.test.ts):
1. First read bot/src/utils/queries.ts to understand the API
2. Test: getUserByTelegramId returns user for valid ID
3. Test: getUserByTelegramId returns null for unknown ID
4. Test: listAllModes returns array of modes
5. Test: getUserActiveModes returns only active modes for user

Target: ~15-20 tests across 3 files. Mock the database layer — do NOT connect to a real DB.

FORBIDDEN: Do NOT modify any source files or mini-app files (test-only agent).

BUILD VERIFY: cd bot && npx vitest --run src/__tests__/utils/cache.test.ts src/__tests__/utils/streak.test.ts src/__tests__/utils/queries.test.ts

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 51 Retrospectives" → "Agent E Retrospective", replacing the placeholder text. Then commit all changes.
```

---

### Agent A — Navigation Fix + Social Split + ErrorBoundary

**Branch:** `feature/r51-nav-social-split`
**Worktree:** `../Wibecode-agent-a`

**OWNED files:**
- `mini-app/src/components/Navigation.tsx`
- `mini-app/src/pages/Social.tsx`
- `mini-app/src/components/social/FriendRequestForm.tsx` (NEW)
- `mini-app/src/components/social/ChallengeForm.tsx` (NEW)
- `mini-app/src/components/social/FriendsList.tsx` (NEW)
- `mini-app/src/components/social/ChallengesList.tsx` (NEW)
- `mini-app/src/components/ErrorBoundary.tsx`

**FORBIDDEN:**
- All bot/ files, all other pages, Dashboard.tsx (Agent B), Finance.tsx (Agent B), i18n files (Agent B)

---

### Agent B — i18n Migration

**Branch:** `feature/r51-i18n-migration`
**Worktree:** `../Wibecode-agent-b`

**OWNED files:**
- `mini-app/src/pages/Social.tsx` (GRAY AREA — i18n changes only, no structural changes)
- `mini-app/src/pages/Finance.tsx`
- `mini-app/src/pages/Dashboard.tsx`
- `mini-app/src/components/social/ChallengeCard.tsx`
- `mini-app/src/components/social/FriendsList.tsx` (GRAY AREA — may conflict with Agent A)
- `mini-app/src/components/finance/BudgetForm.tsx`
- `mini-app/src/components/finance/BudgetSummary.tsx`
- `mini-app/src/components/finance/GoalForm.tsx`
- `mini-app/src/components/finance/SavingsGoal.tsx`
- `mini-app/src/i18n/en.ts` (add missing keys only)
- `mini-app/src/i18n/ru.ts` (add missing keys only)
- `mini-app/src/i18n/zh.ts` (add missing keys only)

**FORBIDDEN:**
- All bot/ files, Navigation.tsx (Agent A), test files

---

### Agent C — Bot Code Quality

**Branch:** `feature/r51-bot-quality`
**Worktree:** `../Wibecode-agent-c`

**OWNED files:**
- `bot/src/api/routes/social.ts`
- `bot/src/api/routes/leaderboard.ts`
- `bot/package.json`

**FORBIDDEN:**
- All mini-app files, all other bot routes, all test files

---

### Agent D — Mini-App Page Tests

**Branch:** `feature/r51-page-tests`
**Worktree:** `../Wibecode-agent-d`

**OWNED files:**
- `mini-app/src/__tests__/pages/Social.test.tsx` (NEW)
- `mini-app/src/__tests__/pages/Finance.test.tsx` (NEW)

**FORBIDDEN:**
- ALL source files (test-only agent)

---

### Agent E — Bot Utility Tests

**Branch:** `feature/r51-bot-util-tests`
**Worktree:** `../Wibecode-agent-e`

**OWNED files:**
- `bot/src/__tests__/utils/cache.test.ts` (NEW)
- `bot/src/__tests__/utils/streak.test.ts` (NEW)
- `bot/src/__tests__/utils/queries.test.ts` (NEW)

**FORBIDDEN:**
- ALL source files, all mini-app files (test-only agent)

---

### Run 51 File Ownership Matrix

| File / Directory | A | B | C | D | E |
|---|---|---|---|---|---|
| `Navigation.tsx` | **OWNED** | - | - | - | - |
| `Social.tsx` (page) | **OWNED** | GRAY | - | - | - |
| `social/` components (NEW) | **OWNED** | GRAY | - | - | - |
| `ErrorBoundary.tsx` | **OWNED** | - | - | - | - |
| `Finance.tsx` | - | **OWNED** | - | - | - |
| `Dashboard.tsx` | - | **OWNED** | - | - | - |
| `ChallengeCard.tsx` | - | **OWNED** | - | - | - |
| `finance/*.tsx` | - | **OWNED** | - | - | - |
| `i18n/*.ts` | - | **OWNED** | - | - | - |
| `bot/routes/social.ts` | - | - | **OWNED** | - | - |
| `bot/routes/leaderboard.ts` | - | - | **OWNED** | - | - |
| `bot/package.json` | - | - | **OWNED** | - | - |
| `__tests__/pages/Social.test.tsx` | - | - | - | **NEW** | - |
| `__tests__/pages/Finance.test.tsx` | - | - | - | **NEW** | - |
| `__tests__/utils/cache.test.ts` | - | - | - | - | **NEW** |
| `__tests__/utils/streak.test.ts` | - | - | - | - | **NEW** |
| `__tests__/utils/queries.test.ts` | - | - | - | - | **NEW** |
| `PARALLEL_AGENTS.md` | retro | retro | retro | retro | retro |

### Run 51 Merge Order

1. Agent C (bot code quality) — backend first
2. Agent A (navigation + social split) — frontend structural changes
3. Agent B (i18n migration) — frontend content changes (depends on A's structure)
4. Agent E (bot utility tests) — test only
5. Agent D (mini-app page tests) — test only, merge LAST (depends on A+B source changes)

### Run 51 Retrospectives

#### Agent A Retrospective
**Task**: Navigation + Social.tsx split + ErrorBoundary logger fix

**Changes made**:
1. **Navigation.tsx**: Added `DollarSign` import from lucide-react and Finance nav item (`/finance`) before Profile — Finance page is now accessible from the bottom nav bar.
2. **Social.tsx split** (389 → 196 lines):
   - Created `FriendRequestForm.tsx` — self-contained form with internal state for friend request input, validation, API call, success/error display.
   - Created `ChallengeForm.tsx` — self-contained form with internal state for challenge creation (title, description, mode fields + submit).
   - Created `ChallengesList.tsx` — memoized component rendering challenge cards or empty state.
   - `FriendsList.tsx` and `ChallengeCard.tsx` already existed from prior runs — reused as-is.
   - Social.tsx now acts as orchestrator: data fetching, pull-to-refresh, section headers + toggle buttons, delegates rendering to extracted components.
3. **ErrorBoundary.tsx**: Replaced `console.error` with `logger.error` from `@/utils/logger`, passing error and componentStack as structured context.

**Issues encountered**:
- TypeScript strict mode rejected `haptic: { notification: (type: string) => void }` because the actual haptic type uses union `'error' | 'success' | 'warning'`. Fixed by using the exact union type in both form component props.

**Build**: `npm run build` passes cleanly. No warnings.

#### Agent B Retrospective
**Status:** COMPLETE — all hardcoded UI strings in Social, Finance, and Dashboard migrated to i18n. Build passes.

**What was done:**
1. **Added 4 dashboard greeting keys** (`greetingMorning`, `greetingAfternoon`, `greetingEvening`, `greetingNight`) to en.ts, ru.ts, zh.ts
2. **Added 18 new dashboard keys** for all remaining hardcoded strings (couldNotLoad, questsDone, activeModes, etc.) in all 3 language files
3. **Added 7 new social keys** (title, subtitle, friends, addFriend, challenges, newChallenge, couldNotLoad) in all 3 language files
4. **Added 5 new finance keys** (title, subtitle, budget, savings, couldNotIdentify) in all 3 language files
5. **Migrated 9 component files** to use `useTranslation()`:
   - `ChallengeCard.tsx` — refactored `getTimeRemaining()` to accept `t` parameter for i18n strings (noDeadline, ended, daysLeft, hoursLeft, participants, completed, progress)
   - `FriendsList.tsx` — noFriends, level
   - `Social.tsx` — title, subtitle, friends, addFriend, challenges, newChallenge, couldNotLoad, cancel
   - `BudgetForm.tsx` — addEntry, expense, income, saving, amount, addIncome, addExpense, cancel
   - `BudgetSummary.tsx` — budgetSummary, income, expenses, balance, spent, categoryBreakdown
   - `GoalForm.tsx` — newSavingsGoal, goalName, targetAmount, creating, createGoal, cancel
   - `SavingsGoal.tsx` — savingsGoals, goal/goals, noSavingsGoals, createFirstGoal
   - `Dashboard.tsx` — refactored `getGreeting()` → `getGreetingKey()` returning i18n keys with 4-way time split (night < 5, morning < 12, afternoon < 18, evening), plus all stat labels, section titles, empty states
   - `Finance.tsx` — title, subtitle, budget tab, savings tab, couldNotIdentify

**Adaptation to Agent A's work:** Social.tsx had already been split into sub-components by Agent A (FriendRequestForm, ChallengeForm, ChallengesList). Worked with the refactored structure without conflicts.

**Files modified:** 12 (9 components + 3 i18n files)
**Build:** `npm run build` passes cleanly.

#### Agent C Retrospective
**Tasks completed:**
1. **Fixed `as any` casts in social.ts** — Created `FriendRequestRow` interface with proper fields (`id`, `from_user_id`, `to_user_id`, `status`, `created_at`) and index signature to satisfy `Record<string, unknown>` constraint from `queryOne<T>`. Replaced `(request as any).from_user_id` / `to_user_id` with typed access.
2. **Created `safeParseInt` helper in leaderboard.ts** — Handles `undefined`, empty string, and NaN correctly while preserving `0` as a valid value (unlike `parseInt(x) || default` which treats 0 as falsy). Applied to all 8 `parseInt` calls: 3 query-param limit parsers and 5 row-formatting parsers.
3. **Added test scripts to bot/package.json** — `"test": "vitest --run"` and `"test:watch": "vitest"`.

**Build:** `npm run build` passes cleanly.
**Issues:** Initial build failed because `FriendRequestRow` as a plain interface doesn't satisfy `Record<string, unknown>` — needed `[key: string]: unknown` index signature. Fixed immediately.
**Files modified:** `bot/src/api/routes/social.ts`, `bot/src/api/routes/leaderboard.ts`, `bot/package.json` (all within owned file list).

#### Agent D Retrospective
**Task:** Write tests for Social.tsx and Finance.tsx pages — the only two pages without test coverage.

**What was done:**
- Created `mini-app/src/__tests__/pages/Social.test.tsx` (13 tests): loading skeleton, friends list rendering, no-friends message, challenge cards, no-challenges message, error/retry flow, header rendering, friend request form toggle/submit/validation, challenge form toggle, ARIA regions.
- Created `mini-app/src/__tests__/pages/Finance.test.tsx` (11 tests): header, default Budget tab, userId prop passing, tab switching (Budget↔Savings), tab buttons, loading spinner (no user), ErrorSection (no user.id), content isolation between tabs.

**Result:** SUCCESS — 24/24 tests pass, all green.

**Issues encountered:**
1. `vi.mock` hoisting: Finance test initially declared `mockWebApp` as a `const` and referenced it inside `vi.mock()` factory. Because `vi.mock` is hoisted to the top of the file, the variable wasn't initialized yet → `ReferenceError`. Fixed by using `vi.hoisted()` to declare the mock object before the hoist boundary.
2. `window.Telegram` redefinition: Social test tried to set `window.Telegram` via `Object.defineProperty` in `beforeEach`, but the `@twa-dev/sdk` mock had already defined it as non-configurable. Removed the redundant property — the SDK mock's `initData` is sufficient.

**Files created:** `mini-app/src/__tests__/pages/Social.test.tsx`, `mini-app/src/__tests__/pages/Finance.test.tsx`

#### Agent E Retrospective
**Task:** Write tests for untested bot utility modules (cache, streak, queries).

**What was done:**
- Created `cache.test.ts` (13 tests): set+get, cache hit, TTL expiry edge cases, cache miss with null, invalidate, invalidatePrefix, invalidatePattern, invalidateUserCache, clearAll, size, TTL constants.
- Created `streak.test.ts` (7 tests): SQL structure validation (consecutive day increment, gap reset to 1, GREATEST for longest_streak, IS DISTINCT FROM for same-day skip), parameter passing, null return handling.
- Created `queries.test.ts` (7 tests): getUserByTelegramId (found + not found), listAllModes (populated + empty), getUserActiveModes (active modes + empty + param passing).
- Total: 27 tests, all passing.

**Approach:** Cache tests used `vi.useFakeTimers()` for precise TTL control — no DB mock needed since it's pure in-memory. Streak and queries tests mocked `../../utils/db.js` with `vi.mock()` to isolate from the database layer, following the existing xpAward.test.ts pattern.

**Issues:** None. All tests passed on first run.

#### Agent 0 Retrospective

**Merge summary:** All 5 agents committed directly to main (same pattern as Runs 47/49 — agents ignore worktree isolation). No merge conflicts since no feature branches were used.

**Post-merge test results:**
- Bot: 798/798 pass (66 files) — includes 27 new tests from Agent E
- Mini-app: Initially 37 failures across 8 files, then 571/571 pass after fixes

**Agent 0 fixes (2):**
1. **i18n test setup** — Agent B migrated hardcoded strings to `t('key')` but didn't initialize i18n in the test environment. `useTranslation()` returned raw keys instead of English text, breaking 36 tests. Fixed by adding `import '@/i18n'` to `mini-app/src/test/setup.ts`.
2. **ErrorBoundary logger assertion** — Agent A replaced `console.error` with `logger.error` which prepends `[ERROR]` prefix. Test used exact string match `=== 'ErrorBoundary caught:'`. Fixed by using `.includes()` instead.

**Deploy status:** `31a1205` deployed and verified. Health check confirmed version match, uptime 3s. Notification sent.

**Recurring issue — agents committing to main:** This is the 3rd consecutive run where agents commit to main instead of feature branches. The worktree setup provides isolation but agents bypass it. Need to add explicit instructions in agent prompts to commit to the feature branch, not main.

**Cleanup:** 5 worktrees removed, 5 feature branches deleted.

**Final counts:** Bot 798 tests (66 files), Mini-app 571 tests (115 files) — total 1369 tests passing.

---

## Run 52: i18n Completion + Type Safety + Security Hardening + Tests (5 Agents + Agent 0)

**Date**: 2026-02-13
**Agents**: 5 (A-E) + Agent 0
**Goal**: Complete i18n migration for all remaining pages, eliminate all `as any` casts in mini-app source, harden bot security (parseInt/pagination), add tests for untested components and utilities.

**Key findings from codebase audit:**
1. 50+ hardcoded English strings in Quests, Achievements, Leaderboard, Profile, Settings (i18n not applied)
2. 8 `as any` casts in mini-app source — all due to missing Telegram WebApp type declarations
3. Bot parseInt NaN issues in admin-users.ts (no pagination bounds) and other admin routes
4. 18 untested mini-app components (finance: 5, social: 3, admin: 5, etc.)
5. 6 untested bot utilities + 1 untested job (dailySummary)

---

### Run 52 Copy-Paste Prompts

**Agent A — i18n Migration for Remaining Pages**
```
Read c:\Users\Asus\Desktop\Wibecode-agent-a\PARALLEL_AGENTS.md — find "Run 52" and locate the "Agent A" section. You are Agent A.

YOUR TASK: Migrate all hardcoded UI strings in the remaining 5 pages + 2 components to use the i18n translation system. Run 51 migrated Social, Finance, Dashboard — you're finishing the rest.

OWNED FILES (only you modify these):
- mini-app/src/pages/Quests.tsx
- mini-app/src/pages/Achievements.tsx
- mini-app/src/pages/Leaderboard.tsx
- mini-app/src/pages/Profile.tsx
- mini-app/src/pages/Settings.tsx
- mini-app/src/components/CheckInButton.tsx
- mini-app/src/components/onboarding/LaunchScreen.tsx
- mini-app/src/i18n/en.ts (add missing keys)
- mini-app/src/i18n/ru.ts (add missing keys)
- mini-app/src/i18n/zh.ts (add missing keys)

HOW TO DO IT:
1. First read mini-app/src/i18n/en.ts to see which keys already exist
2. In each component, add `import { useTranslation } from 'react-i18next'` and call `const { t } = useTranslation()`
3. Replace every hardcoded English string with the corresponding `t('key')` call
4. For ANY missing key, add it to ALL 3 language files (en.ts, ru.ts, zh.ts)

SPECIFIC STRINGS TO MIGRATE:

Quests.tsx (~12 strings):
- 'Quests' (title), 'Complete quests to level up' (subtitle)
- 'Active' / 'Completed' (tab labels)
- 'quests', 'ready to claim', 'completed' (progress text)
- 'check-in', 's', 'today' (checkin display)
- 'No Active Quests', 'No quests found...', 'Start your journey...'
- 'Explore Modes' (button), 'No Victories Yet', 'Your victories will appear here...'

Achievements.tsx (~8 strings):
- 'Rewards' (title)
- 'Progress' (label)
- 'Checking...', 'new unlocked!', 'Check for new achievements'
- 'No achievements available yet', category-specific empty states

Leaderboard.tsx (~6 strings):
- 'Leaderboard' (title), 'Top adventurers ranked by XP' (subtitle)
- 'No rankings yet. Be the first!' (empty state)
- '#{4} and below' (divider text)

Profile.tsx (~6 strings):
- 'Account Info' (section title)
- 'Telegram ID', 'Joined', 'Total XP', 'Level' (labels)

Settings.tsx (~2 strings):
- 'Settings' (title), 'Configure your preferences' (subtitle)

CheckInButton.tsx (~4 strings):
- 'Check In (last one!)' / 'Check In (N left)' / 'Check In' / 'Checked in!'

LaunchScreen.tsx (~3 strings):
- 'Failed to save. Please try again.' / 'Retry' / 'Setting up your plan...'

IMPORTANT: Check which i18n keys ALREADY EXIST before adding new ones. Many quests/achievements/leaderboard keys may already be defined. Only add what's missing.

For Russian (ru.ts) and Chinese (zh.ts), provide reasonable translations. For complex phrases, use English as placeholder and add a comment `// TODO: verify translation`.

FORBIDDEN: Do NOT modify bot/ files, Social.tsx, Finance.tsx, Dashboard.tsx (already migrated), or test files.

BUILD VERIFY: cd mini-app && npm run build must pass.

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 52 Retrospectives" → "Agent A Retrospective", replacing the placeholder text. Then commit all changes.
```

**Agent B — Telegram Type Safety + `as any` Elimination**
```
Read c:\Users\Asus\Desktop\Wibecode-agent-b\PARALLEL_AGENTS.md — find "Run 52" and locate the "Agent B" section. You are Agent B.

YOUR TASK: Eliminate ALL `as any` casts from mini-app source files by creating proper TypeScript type declarations for Telegram WebApp.

OWNED FILES (only you modify these):
- mini-app/src/types/telegram.d.ts (NEW — create this file)
- mini-app/src/i18n/index.ts
- mini-app/src/components/settings/ThemeSettings.tsx
- mini-app/src/pages/Settings.tsx
- mini-app/src/pages/Leaderboard.tsx

CURRENT `as any` CASTS (8 total in source files):

1. i18n/index.ts:9 — `(window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code`
2. Settings.tsx:70 — `themeParams as any`
3. ThemeSettings.tsx:55 — `(themeParams as any)?.bg_color ?? (themeParams as any)?.bgColor`
4. ThemeSettings.tsx:56 — `(themeParams as any)?.text_color ?? (themeParams as any)?.textColor`
5. ThemeSettings.tsx:57 — `(themeParams as any)?.hint_color ?? (themeParams as any)?.hintColor`
6. ThemeSettings.tsx:58 — `(themeParams as any)?.link_color ?? (themeParams as any)?.linkColor`
7. ThemeSettings.tsx:59 — `(themeParams as any)?.button_color ?? (themeParams as any)?.buttonColor`
8. Leaderboard.tsx:65 — `(window as any).Telegram?.WebApp`

HOW TO FIX:

STEP 1 — Create `mini-app/src/types/telegram.d.ts`:
```typescript
// Global type augmentation for Telegram WebApp
interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    [key: string]: unknown;
  };
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  ready: () => void;
  expand: () => void;
  close: () => void;
  // Add other methods as needed from @twa-dev/sdk
}

interface TelegramThemeParams {
  bg_color?: string;
  bgColor?: string;
  text_color?: string;
  textColor?: string;
  hint_color?: string;
  hintColor?: string;
  link_color?: string;
  linkColor?: string;
  button_color?: string;
  buttonColor?: string;
  button_text_color?: string;
  buttonTextColor?: string;
  secondary_bg_color?: string;
  secondaryBgColor?: string;
  [key: string]: string | undefined;
}

interface TelegramGlobal {
  WebApp: TelegramWebApp;
}

declare global {
  interface Window {
    Telegram?: TelegramGlobal;
  }
}

export {};
```

STEP 2 — Fix each file:
- i18n/index.ts: Remove `as any`, use `window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code`
- ThemeSettings.tsx: Change prop type from `any` to `TelegramThemeParams`, remove all 10 `as any` casts. Access `themeParams?.bg_color ?? themeParams?.bgColor` directly.
- Settings.tsx: Pass `themeParams` without `as any` cast (it should now match TelegramThemeParams)
- Leaderboard.tsx: Remove `as any`, use `window.Telegram?.WebApp` directly

STEP 3 — Verify: Search for `as any` in all mini-app source files (excluding __tests__). Count should be ZERO.

IMPORTANT: Agent A is also modifying Leaderboard.tsx and Settings.tsx (for i18n). Your changes are on DIFFERENT LINES (type casts vs string replacements). These should merge cleanly.

FORBIDDEN: Do NOT modify bot/ files, test files, or any files not listed above.

BUILD VERIFY: cd mini-app && npm run build must pass.

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 52 Retrospectives" → "Agent B Retrospective", replacing the placeholder text. Then commit all changes.
```

**Agent C — Bot Security Hardening**
```
Read c:\Users\Asus\Desktop\Wibecode-agent-c\PARALLEL_AGENTS.md — find "Run 52" and locate the "Agent C" section. You are Agent C.

YOUR TASK: Fix security and validation gaps in bot API routes — pagination bounds, parseInt safety, input validation.

OWNED FILES (only you modify these):
- bot/src/api/routes/admin-users.ts
- bot/src/api/routes/admin-stats.ts
- bot/src/api/routes/admin-jobs.ts
- bot/src/api/routes/admin-quests.ts
- bot/src/api/routes/punishment.ts

TASK 1 — Fix pagination in admin-users.ts (lines 27-28):
Current code:
```typescript
const limit = parseInt(req.query.limit as string) || 50;
const offset = parseInt(req.query.offset as string) || 0;
```
Issues: (a) `parseInt('0') || 50` returns 50 when user wanted 0; (b) No upper bound on limit; (c) Negative values not blocked.

Fix: Import `safeParseInt` from leaderboard.ts (Agent C from Run 51 created it there) OR create a shared utility. Then:
```typescript
const limit = Math.min(safeParseInt(req.query.limit as string, 50), 200);
const offset = Math.max(0, safeParseInt(req.query.offset as string, 0));
```

TASK 2 — Apply same safeParseInt pattern to ANY other parseInt calls in admin routes:
- Check admin-stats.ts, admin-jobs.ts, admin-quests.ts for similar patterns
- Replace all `parseInt(x) || default` with `safeParseInt(x, default)` + bounds

TASK 3 — Validate custom_punishments in punishment.ts:
Current code (line ~98): `fields.custom_punishments = JSON.stringify(custom_punishments);`
Issue: No validation that custom_punishments is a valid array, within size limits, etc.

Add validation:
```typescript
if (custom_punishments !== undefined) {
  if (!Array.isArray(custom_punishments)) {
    throw new BadRequestError('custom_punishments must be an array');
  }
  if (custom_punishments.length > 20) {
    throw new BadRequestError('Maximum 20 custom punishments allowed');
  }
  fields.custom_punishments = JSON.stringify(custom_punishments);
}
```

TASK 4 — If `safeParseInt` is only in leaderboard.ts, extract it to a shared location:
Create `bot/src/utils/validation.ts` (NEW) with:
- `safeParseInt(value: string | undefined, defaultVal: number): number`
- `clampPagination(limit: number, offset: number, maxLimit?: number): { limit: number; offset: number }`
Then import from all admin route files.

FORBIDDEN: Do NOT modify mini-app files, non-admin routes, or test files.

BUILD VERIFY: cd bot && npm run build must pass.

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 52 Retrospectives" → "Agent C Retrospective", replacing the placeholder text. Then commit all changes.
```

**Agent D — Finance + Social Component Tests**
```
Read c:\Users\Asus\Desktop\Wibecode-agent-d\PARALLEL_AGENTS.md — find "Run 52" and locate the "Agent D" section. You are Agent D.

YOUR TASK: Write tests for untested mini-app components in the finance and social categories. These are the largest gaps in component test coverage.

OWNED FILES (only you create these):
- mini-app/src/__tests__/components/finance/BudgetForm.test.tsx (NEW)
- mini-app/src/__tests__/components/finance/BudgetSummary.test.tsx (NEW)
- mini-app/src/__tests__/components/finance/GoalForm.test.tsx (NEW)
- mini-app/src/__tests__/components/finance/SavingsGoal.test.tsx (NEW)
- mini-app/src/__tests__/components/social/ChallengeForm.test.tsx (NEW)
- mini-app/src/__tests__/components/social/ChallengesList.test.tsx (NEW)
- mini-app/src/__tests__/components/social/FriendRequestForm.test.tsx (NEW)

PATTERN: Read existing component tests for patterns:
- mini-app/src/__tests__/components/social/ChallengeCard.test.tsx
- mini-app/src/__tests__/components/social/FriendsList.test.tsx
- mini-app/src/__tests__/components/finance/BudgetTracker.test.tsx (if it exists)

These use @testing-library/react with vi.mock for API calls.

FINANCE TESTS:
1. **BudgetForm.test.tsx** (~5 tests):
   - Read mini-app/src/components/finance/BudgetForm.tsx first
   - Renders form with type selector (expense/income)
   - Validates amount input (numeric only)
   - Calls onSubmit with correct data
   - Shows loading state while saving
   - Cancel button hides the form

2. **BudgetSummary.test.tsx** (~4 tests):
   - Read mini-app/src/components/finance/BudgetSummary.tsx first
   - Renders income, expenses, balance
   - Shows category breakdown
   - Handles empty data gracefully
   - Formats currency values correctly

3. **GoalForm.test.tsx** (~4 tests):
   - Read mini-app/src/components/finance/GoalForm.tsx first
   - Renders form fields (name, target amount)
   - Validates required fields
   - Calls onSubmit with correct data
   - Cancel button works

4. **SavingsGoal.test.tsx** (~4 tests):
   - Read mini-app/src/components/finance/SavingsGoal.tsx first
   - Renders goals list
   - Shows progress for each goal
   - Shows empty state when no goals
   - "Create first goal" prompt shown when empty

SOCIAL TESTS (for new components from Run 51):
5. **ChallengeForm.test.tsx** (~3 tests):
   - Read mini-app/src/components/social/ChallengeForm.tsx first
   - Renders form fields
   - Validates input
   - Calls onSubmit

6. **ChallengesList.test.tsx** (~3 tests):
   - Read mini-app/src/components/social/ChallengesList.tsx first
   - Renders challenge cards
   - Shows empty state
   - Memoization works (React.memo)

7. **FriendRequestForm.test.tsx** (~3 tests):
   - Read mini-app/src/components/social/FriendRequestForm.tsx first
   - Renders input + submit button
   - Shows success/error messages
   - Validates input before submission

Target: ~25-30 tests across 7 files.

IMPORTANT: Components may use `useTranslation()` for i18n. Make sure tests either:
- Import '@/i18n' in the test file to initialize translations, OR
- The test setup already handles this (check mini-app/src/test/setup.ts — it should have `import '@/i18n'`)

FORBIDDEN: Do NOT modify any source files (test-only agent).

BUILD VERIFY: cd mini-app && npx vitest --run src/__tests__/components/finance/ src/__tests__/components/social/ChallengeForm.test.tsx src/__tests__/components/social/ChallengesList.test.tsx src/__tests__/components/social/FriendRequestForm.test.tsx

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 52 Retrospectives" → "Agent D Retrospective", replacing the placeholder text. Then commit all changes.
```

**Agent E — Bot Utility + Job Tests**
```
Read c:\Users\Asus\Desktop\Wibecode-agent-e\PARALLEL_AGENTS.md — find "Run 52" and locate the "Agent E" section. You are Agent E.

YOUR TASK: Write tests for untested bot utilities and the dailySummary job. These are core modules with zero test coverage.

OWNED FILES (only you create these):
- bot/src/__tests__/utils/achievementEngine.test.ts (NEW)
- bot/src/__tests__/utils/broadcast.test.ts (NEW)
- bot/src/__tests__/jobs/dailySummary.test.ts (NEW)

PATTERN: Read existing tests for patterns:
- bot/src/__tests__/utils/xpAward.test.ts (utility test pattern)
- bot/src/__tests__/utils/cache.test.ts (Run 51 — pure function testing)
- bot/src/__tests__/jobs/streakCheck.test.ts (job test pattern)

ACHIEVEMENT ENGINE TESTS (achievementEngine.test.ts — ~8 tests):
1. First read bot/src/utils/achievementEngine.ts to understand the API
2. Test: checkAndUnlockAchievements returns unlocked achievements for qualifying user
3. Test: returns empty array when no achievements qualify
4. Test: doesn't re-unlock already earned achievements
5. Test: handles multiple achievement types (streak-based, xp-based, quest-count-based)
6. Test: handles database errors gracefully (doesn't throw, logs error)
7. Test: correctly evaluates threshold conditions
8. Mock the database layer — do NOT connect to a real DB

BROADCAST TESTS (broadcast.test.ts — ~5 tests):
1. First read bot/src/utils/broadcast.ts to understand the API
2. Test: sends message to all active users
3. Test: handles send failures for individual users gracefully
4. Test: respects rate limiting (if implemented)
5. Test: returns summary of sent/failed counts
6. Mock the bot API — do NOT send real messages

DAILY SUMMARY JOB TESTS (dailySummary.test.ts — ~5 tests):
1. First read bot/src/jobs/definitions/dailySummary.ts to understand the job
2. Test: generates summary for users with activity
3. Test: skips users with no activity
4. Test: handles database errors gracefully
5. Test: sends formatted messages via bot
6. Follow the same pattern as streakCheck.test.ts for job setup/teardown

Target: ~18-20 tests across 3 files. Mock ALL external dependencies (database, bot API).

FORBIDDEN: Do NOT modify any source files or mini-app files (test-only agent).

BUILD VERIFY: cd bot && npx vitest --run src/__tests__/utils/achievementEngine.test.ts src/__tests__/utils/broadcast.test.ts src/__tests__/jobs/dailySummary.test.ts

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 52 Retrospectives" → "Agent E Retrospective", replacing the placeholder text. Then commit all changes.
```

---

### Agent A — i18n Migration for Remaining Pages

**Branch:** `feature/r52-i18n-remaining`
**Worktree:** `../Wibecode-agent-a`

**OWNED files:**
- `mini-app/src/pages/Quests.tsx`
- `mini-app/src/pages/Achievements.tsx`
- `mini-app/src/pages/Leaderboard.tsx`
- `mini-app/src/pages/Profile.tsx`
- `mini-app/src/pages/Settings.tsx`
- `mini-app/src/components/CheckInButton.tsx`
- `mini-app/src/components/onboarding/LaunchScreen.tsx`
- `mini-app/src/i18n/en.ts`
- `mini-app/src/i18n/ru.ts`
- `mini-app/src/i18n/zh.ts`

**FORBIDDEN:**
- All bot/ files, Social.tsx, Finance.tsx, Dashboard.tsx (already migrated), ThemeSettings.tsx (Agent B), i18n/index.ts (Agent B), test files

---

### Agent B — Telegram Type Safety

**Branch:** `feature/r52-telegram-types`
**Worktree:** `../Wibecode-agent-b`

**OWNED files:**
- `mini-app/src/types/telegram.d.ts` (NEW)
- `mini-app/src/i18n/index.ts`
- `mini-app/src/components/settings/ThemeSettings.tsx`
- `mini-app/src/pages/Settings.tsx` (GRAY AREA — type cast fix only, Agent A does i18n)
- `mini-app/src/pages/Leaderboard.tsx` (GRAY AREA — type cast fix only, Agent A does i18n)

**FORBIDDEN:**
- All bot/ files, Quests.tsx, Achievements.tsx, Profile.tsx (Agent A), CheckInButton.tsx, LaunchScreen.tsx, i18n/en.ts/ru.ts/zh.ts (Agent A), test files

---

### Agent C — Bot Security Hardening

**Branch:** `feature/r52-bot-security`
**Worktree:** `../Wibecode-agent-c`

**OWNED files:**
- `bot/src/api/routes/admin-users.ts`
- `bot/src/api/routes/admin-stats.ts`
- `bot/src/api/routes/admin-jobs.ts`
- `bot/src/api/routes/admin-quests.ts`
- `bot/src/api/routes/punishment.ts`
- `bot/src/utils/validation.ts` (NEW — shared safeParseInt)

**FORBIDDEN:**
- All mini-app files, non-admin routes, leaderboard.ts (has safeParseInt already), test files

---

### Agent D — Finance + Social Component Tests

**Branch:** `feature/r52-component-tests`
**Worktree:** `../Wibecode-agent-d`

**OWNED files:**
- `mini-app/src/__tests__/components/finance/BudgetForm.test.tsx` (NEW)
- `mini-app/src/__tests__/components/finance/BudgetSummary.test.tsx` (NEW)
- `mini-app/src/__tests__/components/finance/GoalForm.test.tsx` (NEW)
- `mini-app/src/__tests__/components/finance/SavingsGoal.test.tsx` (NEW)
- `mini-app/src/__tests__/components/social/ChallengeForm.test.tsx` (NEW)
- `mini-app/src/__tests__/components/social/ChallengesList.test.tsx` (NEW)
- `mini-app/src/__tests__/components/social/FriendRequestForm.test.tsx` (NEW)

**FORBIDDEN:**
- ALL source files (test-only agent)

---

### Agent E — Bot Utility + Job Tests

**Branch:** `feature/r52-bot-tests`
**Worktree:** `../Wibecode-agent-e`

**OWNED files:**
- `bot/src/__tests__/utils/achievementEngine.test.ts` (NEW)
- `bot/src/__tests__/utils/broadcast.test.ts` (NEW)
- `bot/src/__tests__/jobs/dailySummary.test.ts` (NEW)

**FORBIDDEN:**
- ALL source files, all mini-app files (test-only agent)

---

### Run 52 File Ownership Matrix

| File / Directory | A | B | C | D | E |
|---|---|---|---|---|---|
| `Quests.tsx` | **OWNED** | - | - | - | - |
| `Achievements.tsx` | **OWNED** | - | - | - | - |
| `Leaderboard.tsx` | **OWNED** | GRAY | - | - | - |
| `Profile.tsx` | **OWNED** | - | - | - | - |
| `Settings.tsx` | **OWNED** | GRAY | - | - | - |
| `CheckInButton.tsx` | **OWNED** | - | - | - | - |
| `LaunchScreen.tsx` | **OWNED** | - | - | - | - |
| `i18n/en.ts, ru.ts, zh.ts` | **OWNED** | - | - | - | - |
| `types/telegram.d.ts` (NEW) | - | **OWNED** | - | - | - |
| `i18n/index.ts` | - | **OWNED** | - | - | - |
| `ThemeSettings.tsx` | - | **OWNED** | - | - | - |
| `admin-users.ts` | - | - | **OWNED** | - | - |
| `admin-stats.ts` | - | - | **OWNED** | - | - |
| `admin-jobs.ts` | - | - | **OWNED** | - | - |
| `admin-quests.ts` | - | - | **OWNED** | - | - |
| `punishment.ts` | - | - | **OWNED** | - | - |
| `utils/validation.ts` (NEW) | - | - | **OWNED** | - | - |
| `__tests__/components/finance/*.test.tsx` | - | - | - | **NEW** | - |
| `__tests__/components/social/*.test.tsx` | - | - | - | **NEW** | - |
| `__tests__/utils/achievementEngine.test.ts` | - | - | - | - | **NEW** |
| `__tests__/utils/broadcast.test.ts` | - | - | - | - | **NEW** |
| `__tests__/jobs/dailySummary.test.ts` | - | - | - | - | **NEW** |
| `PARALLEL_AGENTS.md` | retro | retro | retro | retro | retro |

### Run 52 Merge Order

1. Agent C (bot security) — backend first
2. Agent B (Telegram types) — mini-app structural/type changes
3. Agent A (i18n migration) — mini-app content changes (GRAY AREA with B on Leaderboard/Settings)
4. Agent E (bot tests) — test only
5. Agent D (mini-app component tests) — test only, merge LAST

### Run 52 Retrospectives

#### Agent A Retrospective
**Task:** Migrate all hardcoded UI strings in 5 remaining pages + 2 components to use the i18n translation system.

**Result:** All 7 components fully migrated. ~40+ hardcoded English strings replaced with `t()` calls. 50+ new i18n keys added across all 3 language files (en/ru/zh). Build passes cleanly.

**Components migrated:**
- **Quests.tsx** (12 strings) — title, subtitle, tab labels, progress text with interpolation, empty states, explore button
- **Achievements.tsx** (8 strings) — rewards title, progress label, checking state, new unlocked count, category labels (refactored from CATEGORY_LABELS dict to CATEGORY_KEYS i18n lookup)
- **Leaderboard.tsx** (6 strings) — title, subtitle, empty state, divider text with rank interpolation
- **Profile.tsx** (6 strings) — error message, account info section, field labels, save success toast
- **Settings.tsx** (5 strings) — title, subtitle, error message, save button states
- **CheckInButton.tsx** (4 strings) — checking in state, remaining count with interpolation, last one, success toast
- **LaunchScreen.tsx** (8 strings) — error/retry, loading state, level label, all set heading, achievement text, go to dashboard

**Approach:** Added `useTranslation` import + `const { t } = useTranslation()` to each component. Used interpolation (`{{count}}`, `{{done}}`, `{{total}}`) for dynamic values. Category labels in Achievements refactored from a plain string map to i18n key references. Russian and Chinese translations provided for all new keys.

#### Agent B Retrospective
**Task:** Eliminate all `as any` casts from mini-app source files by adding proper TypeScript types for Telegram WebApp.

**Result:** All 8 `as any` casts removed from 4 source files. Zero `as any` remaining in non-test source code. Build passes cleanly.

**Approach:** Discovered the existing `types/telegram.ts` already had a global `Window` augmentation (`window.Telegram?.WebApp`) and `TelegramWebApp` interface. The `@twa-dev/types` package (transitive dep of `@twa-dev/sdk`) also provides a `ThemeParams` interface with all snake_case color properties (`bg_color`, `text_color`, etc.). No new `.d.ts` file was needed — just proper use of existing types.

**Changes:**
- **ThemeSettings.tsx** (5 casts removed) — Imported `ThemeParams` from `@twa-dev/types`, changed prop type from `Record<string, string> | undefined` to `ThemeParams | undefined`. Removed `as any` casts and unnecessary camelCase fallbacks (`?? bgColor` etc.) since the Telegram API only uses snake_case.
- **Settings.tsx** (1 cast removed) — Removed `themeParams as any` since `useTelegram().themeParams` is now assignable to the corrected `ThemeParams` prop type.
- **i18n/index.ts** (1 cast removed) — Changed `(window as any).Telegram` to `window.Telegram` — global augmentation from `types/telegram.ts` already declares this.
- **Leaderboard.tsx** (1 cast removed) — Same `window.Telegram` fix.

**Note for Agent 0:** The existing `types/telegram.ts` file's `declare global { interface Window { Telegram?: ... } }` block was already correct and just underutilized. No merge conflicts expected with Agent A (their i18n changes are on different lines).

#### Agent C Retrospective
**Completed all 4 tasks. Build passes.**

1. **Created `bot/src/utils/validation.ts`** — shared `safeParseInt()` and `clampPagination()` utilities. `safeParseInt` correctly handles `'0'` (unlike `parseInt(x) || default`). `clampPagination` enforces `limit ∈ [1, maxLimit]` and `offset ≥ 0`.
2. **Fixed `admin-users.ts`** — replaced `parseInt(x) || default` pagination with `safeParseInt` + `clampPagination` (maxLimit=200).
3. **Fixed `admin-stats.ts`** — replaced `parseInt(x) || 50` in logs route with `safeParseInt`, kept existing Math.min(200) bound, added Math.max(1) floor.
4. **Fixed `admin-quests.ts`** — replaced 3 bare `parseInt()` calls (mode_id filter, questId in PATCH, questId in DELETE) with `safeParseInt`.
5. **Fixed `punishment.ts`** — replaced `parseInt || default` in history pagination with `safeParseInt`; added array type check + length limit (max 20) for `custom_punishments` before `JSON.stringify`.
6. **`admin-jobs.ts`** — no parseInt calls for pagination/query params, only job name string param. No changes needed.

**Note for Agent 0:** The existing `safeParseInt` in `leaderboard.ts` is still there (unchanged per FORBIDDEN rules). Future cleanup could import from `validation.ts` instead, but that's outside this run's scope.

#### Agent D Retrospective
**Task:** Write tests for untested mini-app components in finance and social categories.

**Result:** 33 new tests across 6 files, all passing.

**Files created:**
- `BudgetForm.test.tsx` — 6 tests (toggle, category select, disabled states, type labels)
- `BudgetSummary.test.tsx` — 5 tests (totals, percentages, category breakdown, empty state)
- `GoalForm.test.tsx` — 5 tests (toggle, input validation, disabled states, submitting text)
- `ChallengeForm.test.tsx` — 6 tests (fields render, disable states, success/error/network messages)
- `ChallengesList.test.tsx` — 4 tests (empty state, renders cards, descriptions)
- `FriendRequestForm.test.tsx` — 7 tests (input/button, disable, success/error/network, validation)

**Note:** `SavingsGoal.test.tsx` already existed with 8 tests from a previous run — left untouched.

**BUILD VERIFY:** Full command ran 8 test files (6 new + 2 existing), 49 tests total — all green.

**Issues:** None. All components had clear, testable interfaces. Followed existing patterns from ChallengeCard.test.tsx and FriendsList.test.tsx (vi.mock for framer-motion/lucide-react, @testing-library/react for rendering).

#### Agent E Retrospective
**Task:** Write tests for untested bot utilities (achievementEngine, broadcast) and dailySummary job.

**Results:** 22 tests across 3 new files, all passing:
- `achievementEngine.test.ts` — 9 tests: criteria evaluation (level, xp, quest_count, streak, unknown type), unlock flow with XP bonus, ON CONFLICT dedup, cache invalidation, user-not-found path
- `broadcast.test.ts` — 6 tests: successful batch sending, individual failure handling, network errors, empty array, batch sizing (20 per batch), all-fail scenario
- `dailySummary.test.ts` — 7 tests: job name/cron, user selection with reminder_time, no-users skip, failed send counting, DB error propagation, null query result handling

**Approach:** Followed existing patterns from streakCheck.test.ts (job mocking) and xpAward.test.ts (utility mocking). Used `vi.mock()` hoisting for db, logger, cache, xpAward, and fetch. Used `vi.useFakeTimers()` + `vi.runAllTimersAsync()` for broadcast rate-limit delays.

**No source files modified** — test-only agent as required.

#### Agent 0 Retrospective
*(To be filled by Agent 0 after merge)*

### Run 53 Retrospectives

#### Agent C Retrospective
**Task:** Write tests for 7 untested admin + analytics mini-app components.

**Result:** 67 tests across 7 files, all passing.

**Files created:**
- `QuestForm.test.tsx` — 13 tests: heading variants (New/Edit), input field rendering, onUpdateField callback, onClose/onSave callbacks, mode select options, save button disabled states (empty title, saving), timer field visibility toggle
- `QuestList.test.tsx` — 3 tests: empty state message, quest title rendering, correct number of QuestPreview children
- `QuestPreview.test.tsx` — 11 tests: title, description (present/null), quest type badge, difficulty badge, XP reward, mode badge, timer badge (present/absent), onEdit/onDelete callbacks
- `AnswerChart.test.tsx` — 9 tests: question label, key-to-label fallback, total answer count, most common answer highlight, show more/less button visibility and toggle, percentage rendering
- `AnswerTable.test.tsx` — 5 tests: undefined mode empty state, respondent count, mode label, question charts rendering, empty questions state
- `ModeChart.test.tsx` — 11 tests: ProgressRing SVG + circles + custom size, WeeklyXpChart XP values + bar count, QuestHistoryList titles + XP badge + zero-XP exclusion + status badges + check-in counts + 10-item limit
- `ModeStatsCard.test.tsx` — 15 tests: ModeOverviewCard (name, completion rate, XP, streak badge visibility, onSelect callback, aria-label) + ModeDetailView (name, subtitle, stats row, Weekly XP section visibility, quest history, empty history, back button)

**Approach:** Followed existing patterns from AdminQuestEditor.test.tsx and AnswerAnalytics.test.tsx. Used `framerMotionMock` for components using framer-motion, `vi.mock('lucide-react')` for icon components. For AnswerChart, imported actual `useAnswerAnalytics` module to get real `formatLabel`/`getBarColor` functions.

**Fixes during run:** Two tests needed adjustment on first run — day label assertion in WeeklyXpChart (locale-dependent text, switched to DOM count) and duplicate text match in AnswerChart (switched to parent element check).

**No source files modified** — test-only agent as required.

<!-- Next run goes here. Agent 0 will append RUN 54 below this line. -->
