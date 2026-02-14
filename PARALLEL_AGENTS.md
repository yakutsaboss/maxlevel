# Parallel Agents Protocol

This file is the single source of truth for running parallel Claude Code agents on the Wibecode RPG bot project. Each "Run" launches 2-6 agents (A, B, C, D, E, F) in separate git worktrees, plus Agent 0 (orchestrator) in the main repo.

For completed run history (Runs 2–58), see `PARALLEL_AGENTS_HISTORY.md`.

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

## Known Issues (Updated after Run 59)

### Still Open
1. **pg-boss Node.js mismatch** — Requires 22.12+, server has 20.20. Only triggers warnings, no functional impact yet.
3. **Delete account e2e testing** — confirm soft delete flow works end-to-end in Telegram (Agent B Run 18 recommendation).
4. **POST /analytics/export still uses executePythonTool** — Justified (Google Sheets OAuth integration), only remaining Python subprocess in ALL routes + jobs.
8. **No shop/purchasable content** — no shop page, trophies, or purchasable achievements.
11. **Celebrations not integrated into pages** — Confetti, LevelUpModal, XpFloat components built (Run 59) but not wired into Dashboard or Achievements pages.
12. **Stars payment invoice URL may need adjustment** — usePayment constructs URL as `https://t.me/$BOT_USERNAME?startattach=pay_ID` but may need the actual Telegram Stars invoice link format. Needs testing with real Stars.
### Resolved (Run 58)
- ~~safeParseInt + isNaN pattern~~ — Agent A audited all 4 route files; all already patched correctly. Issue #9 resolved.
- ~~SubscriptionSettings duplicates MODE_LIMITS~~ — Agent C imported from constants/tiers.ts, removed local copy. Issue #10 resolved.

### Resolved (Run 56)
- ~~Tier system unused by mini-app~~ — Full tier backend (free/subscriber/premium), channel verification API (`@yakutsaway`), premiumGate + mode gating (2/3/6 limits), SubscriptionSettings UI, useSubscription hook, 28 new tier tests. DB tables created on server.

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

## Run 59: Stars Payment Integration + Celebration Animations (4 Agents + Agent 0)

**Date**: 2026-02-14
**Agents**: 4 (A-D) + Agent 0
**Goal**: Wire Telegram Stars payment flow end-to-end, add celebration animations (confetti, level-up modal, XP floats), split payments.ts (380 lines), and test the new features.

**Current state (from codebase audit):**
- Backend payments API complete (`bot/src/api/routes/payments.ts`, 380 lines): POST /create, POST /webhook, GET /history, GET /status, POST /upgrade-tier
- Mini-app SubscriptionSettings has Stars upgrade button with empty TODO handler (line 229)
- Mini-app has Framer Motion installed, already used in Dashboard — ready for animations
- No celebration animations exist (no confetti, level-up modal, or XP float effects)
- `@twa-dev/sdk` provides `WebApp.openInvoice()` for Stars payment flow
- 1668 tests currently passing

---

### Run 59 Copy-Paste Prompts

**Agent A — Split payments.ts** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read c:\Users\Asus\Desktop\Wibecode-agent-a\PARALLEL_AGENTS.md — find "Run 59" and locate the "Agent A" section. You are Agent A.

YOUR TASK: Split bot/src/api/routes/payments.ts (380 lines) into focused modules.

OWNED FILES:
- bot/src/api/routes/payments.ts (refactor into slim router)
- bot/src/api/routes/payment-webhook.ts (NEW)
- bot/src/utils/paymentHelpers.ts (NEW)

TASK 1 — Create paymentHelpers.ts:
Extract these from payments.ts:
- VALID_TIERS constant + Tier type + isValidTier()
- verifyWebhookSecret()
- isPositiveInteger()
- Any other pure validation/helper functions

TASK 2 — Create payment-webhook.ts:
Move the webhook handler endpoint (POST /webhook) to its own file:
- Import helpers from paymentHelpers.ts
- Export a Router that handles POST /webhook
- Keep the crypto.timingSafeEqual logic intact

TASK 3 — Slim down payments.ts:
Keep only the user-facing endpoints:
- POST /create (create payment)
- GET /history (payment history)
- GET /status (payment status)
- POST /upgrade-tier (tier upgrade)
- Mount the webhook sub-router: router.use('/webhook', webhookRouter)
Import helpers from paymentHelpers.ts.
Target: ~200 lines max.

IMPORTANT: Use .js extensions in all import paths (ESM project).

FORBIDDEN: Do NOT modify mini-app files, test files, other route files, or middleware.

BUILD VERIFY: cd bot && npm run build must pass.

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 59 Retrospectives" → "Agent A Retrospective", replacing the placeholder text. Then commit all changes.
```

**Agent B — Wire Stars Payment in Mini-App** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read c:\Users\Asus\Desktop\Wibecode-agent-b\PARALLEL_AGENTS.md — find "Run 59" and locate the "Agent B" section. You are Agent B.

YOUR TASK: Wire Telegram Stars payment flow from mini-app SubscriptionSettings to the backend payments API.

OWNED FILES:
- mini-app/src/components/settings/SubscriptionSettings.tsx (modify)
- mini-app/src/hooks/usePayment.ts (NEW)
- mini-app/src/api/payments.ts (NEW — API client functions)

TASK 1 — Create payments API client (mini-app/src/api/payments.ts):
Add functions to call the backend payments API:
- createPayment(userId: number, tier: string, amount: number): Promise<{invoiceUrl: string, paymentId: number}>
- getPaymentStatus(paymentId: number): Promise<{status: string, tier: string}>
- getPaymentHistory(userId: number): Promise<Payment[]>
Use the existing API pattern — check mini-app/src/api/ for conventions (base URL from VITE_API_URL, auth headers, error handling).

TASK 2 — Create usePayment hook (mini-app/src/hooks/usePayment.ts):
Hook that manages the Stars payment flow:
1. Call createPayment() to get an invoice URL
2. Use WebApp.openInvoice(invoiceUrl, callback) from @twa-dev/sdk to open Stars dialog
3. Handle callback: 'paid' → poll getPaymentStatus() → update local state, 'cancelled'/'failed' → show error
4. Expose: { initiatePayment, isLoading, error, paymentResult }

TASK 3 — Wire into SubscriptionSettings.tsx:
Replace the TODO comment (line 229) with the actual payment flow:
1. Import and use usePayment hook
2. On button click: call initiatePayment('premium', 599)
3. Show loading state while payment processes
4. On success: show success message, refetch subscription data
5. On failure: show error toast

CONTEXT:
- Backend POST /api/payments/create expects: { userId, amount, tier }
- Backend returns: { data: { invoiceUrl, paymentId } }
- WebApp.openInvoice(url, (status) => { ... }) — status is 'paid' | 'cancelled' | 'failed' | 'pending'
- The existing useTelegram hook provides access to WebApp via tg = WebApp

Check mini-app/src/api/ for existing API call patterns. Check mini-app/src/hooks/ for hook conventions.

FORBIDDEN: bot/ files, database/ files, test files, other settings components.

BUILD VERIFY: cd mini-app && npm run build must pass.

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 59 Retrospectives" → "Agent B Retrospective", replacing the placeholder text. Then commit all changes.
```

**Agent C — Celebration Animations** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read c:\Users\Asus\Desktop\Wibecode-agent-c\PARALLEL_AGENTS.md — find "Run 59" and locate the "Agent C" section. You are Agent C.

YOUR TASK: Add celebration animations to the mini-app: confetti burst, level-up modal, and XP float effect.

OWNED FILES:
- mini-app/src/components/celebrations/Confetti.tsx (NEW)
- mini-app/src/components/celebrations/LevelUpModal.tsx (NEW)
- mini-app/src/components/celebrations/XpFloat.tsx (NEW)
- mini-app/src/hooks/useCelebration.ts (NEW)
- mini-app/src/components/AchievementToast.tsx (modify — add confetti trigger)

TASK 1 — Create Confetti.tsx:
A full-screen confetti burst component using Framer Motion (already installed):
- 30-50 particles with random colors, sizes, and trajectories
- Auto-dismiss after 2-3 seconds
- Props: { show: boolean; onComplete?: () => void }
- Use CSS transforms + Framer Motion animate for performance
- DO NOT add new npm dependencies — use only Framer Motion + CSS

TASK 2 — Create LevelUpModal.tsx:
A celebration modal for level-up events:
- Shows when user gains a level (detect from dashboard data)
- Displays: new level number, "Level Up!" text, glow/scale animation
- Auto-dismiss after 3 seconds or on tap
- Props: { level: number; show: boolean; onClose: () => void }
- Use Framer Motion AnimatePresence for enter/exit

TASK 3 — Create XpFloat.tsx:
A floating "+X XP" indicator:
- Small text that floats upward and fades out
- Props: { amount: number; show: boolean; onComplete?: () => void }
- Use Framer Motion for the float animation (y: 0 → -60, opacity: 1 → 0)
- Duration: ~1.5 seconds

TASK 4 — Create useCelebration.ts hook:
Central hook for triggering celebrations:
- Tracks: lastKnownLevel, lastKnownXp (from localStorage)
- On dashboard data change: compare current vs stored values
- If level increased: trigger LevelUpModal + Confetti
- If XP increased: trigger XpFloat
- Expose: { showConfetti, showLevelUp, showXpFloat, levelUpData, xpGained, dismiss }

TASK 5 — Integrate into AchievementToast.tsx:
Add a mini confetti burst when an achievement toast appears:
- Import Confetti component
- Render Confetti with show={true} when toast is visible
- Keep existing toast functionality intact

DESIGN GUIDELINES:
- Match the existing dark theme (bg-telegram-bg, text-telegram-text colors)
- Keep animations smooth — use GPU-accelerated properties (transform, opacity)
- Respect haptic feedback: trigger haptic.impact('heavy') on level-up, haptic.impact('light') on XP gain
- All text must use i18n translations — add keys to en.ts, ru.ts, zh.ts under a new 'celebrations' namespace

FORBIDDEN: bot/ files, database/ files, test files, hooks/useTelegram.ts, pages/ files (integration into pages will be done in a later run).

BUILD VERIFY: cd mini-app && npm run build must pass.

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 59 Retrospectives" → "Agent C Retrospective", replacing the placeholder text. Then commit all changes.
```

**Agent D — Tests for Run 59 Changes** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-d`):
```
Read c:\Users\Asus\Desktop\Wibecode-agent-d\PARALLEL_AGENTS.md — find "Run 59" and locate the "Agent D" section. You are Agent D.

YOUR TASK: Write tests for the payments split, Stars payment hook, and celebration components.

OWNED FILES (all NEW or update):
- bot/src/__tests__/utils/paymentHelpers.test.ts (NEW)
- mini-app/src/__tests__/hooks/usePayment.test.ts (NEW)
- mini-app/src/__tests__/components/celebrations/Confetti.test.tsx (NEW)
- mini-app/src/__tests__/components/celebrations/LevelUpModal.test.tsx (NEW)
- mini-app/src/__tests__/components/celebrations/XpFloat.test.tsx (NEW)

TASK 1 — paymentHelpers.test.ts (~8-10 tests):
Test the extracted payment helper functions:
- isValidTier returns true for 'free', 'subscriber', 'premium'
- isValidTier returns false for invalid strings
- isPositiveInteger accepts positive integers, rejects 0, -1, floats, strings
- verifyWebhookSecret throws on missing secret
- verifyWebhookSecret throws on wrong secret
- verifyWebhookSecret passes on correct secret

TASK 2 — usePayment.test.ts (~6-8 tests):
Test the Stars payment hook:
- initiatePayment calls API with correct params
- handles 'paid' status from openInvoice callback
- handles 'cancelled' status
- handles 'failed' status
- sets isLoading during payment flow
- clears error on new attempt

TASK 3 — Celebration component tests (~10-12 tests):
- Confetti.test.tsx: renders particles when show=true, calls onComplete, doesn't render when show=false
- LevelUpModal.test.tsx: shows level number, auto-dismiss, click to close
- XpFloat.test.tsx: shows XP amount, animates out

PATTERN: Read existing test files for patterns:
- Bot utils: bot/src/__tests__/utils/validation.test.ts
- Mini-app hooks: mini-app/src/__tests__/hooks/useSubscription.test.ts
- Mini-app components: mini-app/src/__tests__/components/ (any .test.tsx)

NOTE: Agent A is splitting payments.ts, Agent B is creating usePayment hook, Agent C is creating celebration components. Your tests import from the NEW file locations. If imports fail because other agents haven't merged yet, that's expected — tests will pass after merge.

IMPORTANT: Export ALL helper functions you plan to test. If Agent A's paymentHelpers.ts has private functions you want to test, note that in your retro and Agent 0 will add exports (like Run 58).

FORBIDDEN: ALL source files (test-only agent).

BUILD VERIFY: Run your tests after Agent A/B/C merge: cd bot && npx vitest --run src/__tests__/utils/paymentHelpers.test.ts && cd ../mini-app && npx vitest --run src/__tests__/hooks/usePayment.test.ts src/__tests__/components/celebrations/

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 59 Retrospectives" → "Agent D Retrospective", replacing the placeholder text. Then commit all changes.
```

---

### Agent A — Split payments.ts

**Branch:** `feature/r59-payments-split`
**Worktree:** `../Wibecode-agent-a`

**OWNED files:**
- `bot/src/api/routes/payments.ts` (refactor)
- `bot/src/api/routes/payment-webhook.ts` (NEW)
- `bot/src/utils/paymentHelpers.ts` (NEW)

**FORBIDDEN:**
- All mini-app files, test files, other route files, middleware

---

### Agent B — Wire Stars Payment in Mini-App

**Branch:** `feature/r59-stars-payment`
**Worktree:** `../Wibecode-agent-b`

**OWNED files:**
- `mini-app/src/components/settings/SubscriptionSettings.tsx` (modify)
- `mini-app/src/hooks/usePayment.ts` (NEW)
- `mini-app/src/api/payments.ts` (NEW)

**FORBIDDEN:**
- All bot/ files, database/ files, test files, other settings components

---

### Agent C — Celebration Animations

**Branch:** `feature/r59-celebrations`
**Worktree:** `../Wibecode-agent-c`

**OWNED files:**
- `mini-app/src/components/celebrations/Confetti.tsx` (NEW)
- `mini-app/src/components/celebrations/LevelUpModal.tsx` (NEW)
- `mini-app/src/components/celebrations/XpFloat.tsx` (NEW)
- `mini-app/src/hooks/useCelebration.ts` (NEW)
- `mini-app/src/components/AchievementToast.tsx` (modify)

**FORBIDDEN:**
- All bot/ files, database/ files, test files, hooks/useTelegram.ts, pages/

---

### Agent D — Tests for Run 59 Changes

**Branch:** `feature/r59-tests`
**Worktree:** `../Wibecode-agent-d`

**OWNED files:**
- `bot/src/__tests__/utils/paymentHelpers.test.ts` (NEW)
- `mini-app/src/__tests__/hooks/usePayment.test.ts` (NEW)
- `mini-app/src/__tests__/components/celebrations/Confetti.test.tsx` (NEW)
- `mini-app/src/__tests__/components/celebrations/LevelUpModal.test.tsx` (NEW)
- `mini-app/src/__tests__/components/celebrations/XpFloat.test.tsx` (NEW)

**FORBIDDEN:**
- ALL source files (test-only agent)

---

### Run 59 File Ownership Matrix

| File / Directory | A | B | C | D |
|---|---|---|---|---|
| `bot/routes/payments.ts` | **OWNED** | - | - | - |
| `bot/routes/payment-webhook.ts` | **NEW** | - | - | - |
| `bot/utils/paymentHelpers.ts` | **NEW** | - | - | - |
| `settings/SubscriptionSettings.tsx` | - | **OWNED** | - | - |
| `hooks/usePayment.ts` | - | **NEW** | - | - |
| `api/payments.ts` (mini-app) | - | **NEW** | - | - |
| `celebrations/Confetti.tsx` | - | - | **NEW** | - |
| `celebrations/LevelUpModal.tsx` | - | - | **NEW** | - |
| `celebrations/XpFloat.tsx` | - | - | **NEW** | - |
| `hooks/useCelebration.ts` | - | - | **NEW** | - |
| `AchievementToast.tsx` | - | - | **OWNED** | - |
| `__tests__/utils/paymentHelpers.test.ts` | - | - | - | **NEW** |
| `__tests__/hooks/usePayment.test.ts` | - | - | - | **NEW** |
| `__tests__/celebrations/*.test.tsx` | - | - | - | **NEW** |
| `PARALLEL_AGENTS.md` | retro | retro | retro | retro |

### Run 59 Merge Order

1. Agent A (payments.ts split) — backend refactoring first
2. Agent B (Stars payment wiring) — depends on API structure
3. Agent C (celebration animations) — independent frontend
4. Agent D (tests) — test only, merge last

### Run 59 Retrospectives

#### Agent A Retrospective
- **Task**: Split `bot/src/api/routes/payments.ts` (380 lines) into focused modules.
- **Files created**: `bot/src/utils/paymentHelpers.ts` (47 lines), `bot/src/api/routes/payment-webhook.ts` (97 lines)
- **Files modified**: `bot/src/api/routes/payments.ts` (380→269 lines)
- **What was done**: Extracted 3 helper functions (`isValidTier`, `verifyWebhookSecret`, `isPositiveInteger`) + `VALID_TIERS` constant + `Tier` type into `paymentHelpers.ts`. Moved POST `/webhook` handler into `payment-webhook.ts`. Refactored `payments.ts` to import helpers and mount webhook sub-router.
- **Backward compatibility**: `paymentsRouter` export unchanged, server.ts requires zero changes.
- **Build**: `tsc` passes clean, no errors.

#### Agent B Retrospective
**Task:** Wire Telegram Stars payment flow from mini-app SubscriptionSettings to backend payments API.
**Result:** All 3 tasks completed. Build passes clean (tsc + vite build, 0 errors).

**Files created (2):**
1. **mini-app/src/api/payments.ts** (~110 lines) — Dedicated payments API client with 3 functions: `createPayment(userId, tier, amount)` calls POST `/api/payments/create`, `getPaymentStatus(userId)` calls GET `/api/payments/subscription/:userId`, `getPaymentHistory(userId)` calls GET `/api/payments/history/:userId`. Uses same auth header pattern (`X-Telegram-Init-Data`) as main apiClient. Exports response types for each function.
2. **mini-app/src/hooks/usePayment.ts** (~115 lines) — Hook managing full Stars payment flow: (1) call backend to create pending payment, (2) open Telegram Stars invoice via `WebApp.openInvoice()`, (3) handle invoice callback (paid/cancelled/failed), (4) poll `getPaymentStatus()` up to 5 times with 1.5s delay to confirm tier upgrade. Exposes `{ initiatePayment, isLoading, error, paymentResult }`. Takes `{ userId, onSuccess, onError }` params.

**Files modified (4):**
1. **mini-app/src/components/settings/SubscriptionSettings.tsx** — Replaced TODO comment on premium upgrade button with actual payment flow. Added `usePayment` hook integration, `internalUserId` state (fetched from getUserStats), payment loading/success/error states. Button now calls `initiatePayment('premium', 599)`, shows Loader2 spinner during processing, disabled while loading. Added success banner (green, CheckCircle2) and error banner (red, AlertCircle) above the premium CTA.
2. **mini-app/src/i18n/en.ts** — Added 2 keys: `settings.subscription.processing`, `settings.subscription.paymentSuccess`
3. **mini-app/src/i18n/ru.ts** — Same 2 keys in Russian
4. **mini-app/src/i18n/zh.ts** — Same 2 keys in Chinese

**Design decisions:**
- Used standalone `api/payments.ts` with raw `fetch()` instead of adding to main `apiClient` class — keeps the new code isolated from the existing singleton and avoids touching GRAY AREA files.
- Invoice URL constructed as `https://t.me/$BOT_USERNAME?startattach=pay_PAYMENT_ID` — this may need adjustment based on actual Telegram Stars invoice URL format. The backend currently creates a payment record but doesn't return an invoice URL, so the flow assumes the bot handles invoice creation separately.
- Polling loop (5 attempts × 1.5s) for status confirmation — handles the async nature of webhook processing.
- `internalUserId` (DB id, not telegram_id) is needed for payment API calls and is extracted from `getUserStats` response.

**Notes for Agent 0:**
- The i18n files are GRAY AREA for Agent C (celebration animations may add keys too). Merge Agent B before Agent C to avoid conflicts.
- The invoice URL construction in `usePayment.ts` uses `VITE_BOT_USERNAME` env var (fallback: `yakutsa_bot`). This env var may need to be added to `.env` files.
- `api/payments.ts` is a separate module from `api/client.ts` — some payment methods already exist in `apiClient` (from Run 56 Agent E). Agent 0 may optionally consolidate later.

#### Agent C Retrospective
- **Task**: Add celebration animations — confetti burst, level-up modal, XP float effect, useCelebration hook, and confetti integration in AchievementToast.
- **Files created**: `Confetti.tsx` (70 lines), `LevelUpModal.tsx` (82 lines), `XpFloat.tsx` (42 lines), `useCelebration.ts` (133 lines)
- **Files modified**: `AchievementToast.tsx` (added Confetti import + render, +6 lines)
- **i18n**: Added `celebrations` namespace to en/ru/zh.ts with `levelUp` and `tapToDismiss` keys.
- **Design**: 40 confetti particles (8 colors, GPU-accelerated), purple gradient level-up modal with spring animation, teal XP float (+60px fade). useCelebration uses localStorage-backed level/XP tracking.
- **Note**: useCelebration exposes `onDashboardData(level, xp)` — caller should invoke this when dashboard stats load. Haptic feedback should be triggered by the consuming page.
- **Build**: `tsc + vite build` passes clean.

#### Agent D Retrospective
- **Task**: Write tests for payments split, Stars payment hook, and celebration components.
- **Files created (5)**: `paymentHelpers.test.ts` (18 tests), `usePayment.test.ts` (7 tests), `Confetti.test.tsx` (4 tests), `LevelUpModal.test.tsx` (5 tests), `XpFloat.test.tsx` (5 tests)
- **Total**: 39 tests across 5 files (target was ~24-30, exceeded for better coverage).
- **Patterns**: Bot tests use vi.mock + mockRequest; mini-app hook tests use renderHook/act/waitFor; component tests mock framer-motion to plain divs + vi.useFakeTimers.
- **IMPORTANT**: paymentHelpers.test.ts imports `isValidTier`, `isPositiveInteger`, `verifyWebhookSecret` — Agent A must export all 3.

#### Agent 0 Retrospective
**Merge**: All 4 branches merged in order A→B→C→D. Only PARALLEL_AGENTS.md conflicted (expected — resolved with `--ours` + manual retro splice). i18n files (en/ru/zh.ts) auto-merged cleanly between Agent B (subscription keys) and Agent C (celebrations namespace).

**Post-merge test failures (15 total, all fixed):**
- **usePayment.test.ts (7)** — Agent D wrote tests against assumed API but Agent B's actual hook had different signature: `usePayment({ userId })` not `usePayment()`, `initiatePayment(tier, amount)` not `initiatePayment(id, tier, amount)`, snake_case `payment_id` not camelCase. Also missing logger mock and real `setTimeout(1500)` caused 5s timeout. Fixed: updated all call signatures, added logger mock, used `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(2000)`, added `is_active: true` for polling exit.
- **LevelUpModal.test.tsx (1)** — Test clicked level number (inner div with `stopPropagation`), but `onClose` is on backdrop. Fixed: click `container.querySelector('.fixed')`.
- **AchievementToast.test.tsx (3)** — Agent C added Confetti import to source but existing test had no mock. Fixed: added `vi.mock` for Confetti + AnimatePresence.

**Result**: 1707 tests pass (892 bot + 815 mini-app). Deployed commit `52c0048`. Archived Runs 55-58 to history (main file: 2424→773 lines).

**Lessons**: Agent D (test agent) needs the exact function signatures from source agents. Consider having test agents read the actual source files rather than guessing from prompts. Alternatively, merge source agents first, then let the test agent work on merged code.

<!-- Next run goes here. Agent 0 will append RUN 61 below this line. -->

## Run 60: Stars Payment Flow + Dashboard Celebrations (3 Agents + Agent 0)

**Date**: 2026-02-14
**Agents**: 3 (A-C) + Agent 0
**Goal**: Complete the Telegram Stars payment end-to-end flow (backend invoice creation + bot payment handlers + mini-app fix), and wire celebration animations (built in Run 59) into the Dashboard page.

**Current state (from codebase audit):**
- Backend `POST /payments/create` creates a DB record but does NOT generate a Telegram Stars invoice — no `createInvoiceLink` call (Known Issue #12)
- Bot has NO `pre_checkout_query` or `successful_payment` handlers — Telegram Stars payments cannot complete
- Mini-app `usePayment.ts` constructs a fake URL `https://t.me/$BOT?startattach=pay_ID` — this won't open a Stars payment dialog
- Celebration components (Confetti, LevelUpModal, XpFloat, useCelebration) are built but NOT rendered in any page (Known Issue #11)
- 1707 tests currently passing

---

### Run 60 Copy-Paste Prompts

**Agent A — Stars Payment Backend** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read c:\Users\Asus\Desktop\Wibecode-agent-a\PARALLEL_AGENTS.md — find "Run 60" and locate the "Agent A" section. You are Agent A.

YOUR TASK: Complete the Telegram Stars payment backend — create real invoices via Bot API and handle payment events.

OWNED FILES:
- bot/src/handlers/payments.ts (NEW — Grammy payment handlers)
- bot/src/api/routes/payments.ts (modify — create real invoice in POST /create)
- bot/src/utils/paymentHelpers.ts (modify — add TIER_PRICES constant)

GRAY AREA:
- bot/src/index.ts — ONLY add handler import + registration lines (2-3 lines max)

TASK 1 — Create bot/src/handlers/payments.ts:
Grammy handlers for the Telegram Stars payment flow:
a) pre_checkout_query handler:
   - Verify the payment: check that the payload contains a valid payment_id, the amount matches
   - Call ctx.answerPreCheckoutQuery(true) to approve, or false with error message to reject
   - Log the pre-checkout event
b) successful_payment handler (on 'message:successful_payment'):
   - Extract payment details from ctx.message.successful_payment
   - Update the payments table: SET status='completed', telegram_payment_charge_id=..., provider_payment_charge_id=...
   - Upgrade the user's subscription tier (upsert into subscriptions table)
   - Send a confirmation message to the user
   - Log the success

Import the bot type from bot.ts: `import type { MyContext } from '../bot.js'`
Use the database utilities: `import { query, queryOne, execute } from '../utils/db.js'`

TASK 2 — Modify bot/src/api/routes/payments.ts:
In the POST /create handler, AFTER creating the pending payment record:
- Import the bot instance: `import { bot } from '../../bot.js'`
- Use `bot.api.createInvoiceLink()` to generate a real Telegram Stars invoice:
  ```typescript
  const invoiceUrl = await bot.api.createInvoiceLink(
    'Premium Subscription',           // title
    'Upgrade to Premium tier (6 modes, all features)', // description
    JSON.stringify({ payment_id: payment.id, tier }), // payload
    '',                                // provider_token (empty for Stars)
    'XTR',                            // currency (Telegram Stars)
    [{ label: 'Premium', amount: numericAmount }], // prices (LabeledPrice[])
  );
  ```
- Return `invoice_url` in the response alongside other fields

TASK 3 — Add TIER_PRICES to paymentHelpers.ts:
Add a constant mapping tier names to their Star prices:
```typescript
export const TIER_PRICES: Record<string, number> = {
  premium: 599,
};
```
This is used by the pre_checkout_query handler to verify amounts.

TASK 4 — Register handlers in index.ts (GRAY AREA):
Add these lines after the existing handler registrations:
```typescript
import { handlePreCheckout, handleSuccessfulPayment } from './handlers/payments.js';
bot.on('pre_checkout_query', handlePreCheckout);
bot.on('message:successful_payment', handleSuccessfulPayment);
```

IMPORTANT: Use .js extensions in all import paths (ESM project).
IMPORTANT: The bot instance is exported as `export const bot = new Bot<MyContext>(botToken)` from bot.ts. You can import it in payments.ts route.

FORBIDDEN: Do NOT modify mini-app files, test files, celebration components, or other route files.

BUILD VERIFY: cd bot && npm run build must pass.

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 60 Retrospectives" → "Agent A Retrospective", replacing the placeholder text. Then commit all changes.
```

**Agent B — Dashboard Celebrations + Stars Mini-App Fix** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read c:\Users\Asus\Desktop\Wibecode-agent-b\PARALLEL_AGENTS.md — find "Run 60" and locate the "Agent B" section. You are Agent B.

YOUR TASK: Wire celebration animations into the Dashboard page and fix the Stars payment mini-app to use real invoice URLs.

OWNED FILES:
- mini-app/src/pages/Dashboard.tsx (modify — render celebration components)
- mini-app/src/hooks/useDashboardData.ts (modify — call onDashboardData for celebrations)
- mini-app/src/hooks/usePayment.ts (modify — use invoice_url from API response)
- mini-app/src/api/payments.ts (modify — add invoice_url to response type)

TASK 1 — Wire celebrations into Dashboard.tsx:
Import and render the celebration components:
```tsx
import { useCelebration } from '@/hooks/useCelebration';
import { Confetti } from '@/components/celebrations/Confetti';
import { LevelUpModal } from '@/components/celebrations/LevelUpModal';
import { XpFloat } from '@/components/celebrations/XpFloat';
```

In the Dashboard component:
a) Call useCelebration hook:
   ```tsx
   const {
     showConfetti, showLevelUp, showXpFloat,
     levelUpData, xpGained,
     dismissConfetti, dismissLevelUp, dismissXpFloat,
   } = useCelebration();
   ```
b) Render celebration components at the BOTTOM of the JSX (before closing </div>), after the AchievementToast:
   ```tsx
   <Confetti show={showConfetti} onComplete={dismissConfetti} />
   <LevelUpModal level={levelUpData} show={showLevelUp} onClose={dismissLevelUp} />
   <XpFloat amount={xpGained} show={showXpFloat} onComplete={dismissXpFloat} />
   ```
c) Add haptic feedback: when showLevelUp becomes true, call haptic.impact('heavy'). When showXpFloat becomes true, call haptic.impact('light'). Use a useEffect for this.

TASK 2 — Connect dashboard data to celebrations in useDashboardData.ts:
The useCelebration hook exposes `onDashboardData(level, xp)`. Call it whenever stats are loaded:
a) Accept `onDashboardData` as an optional callback in the hook params
b) After stats are successfully loaded (inside `loadUserStats`), call:
   ```typescript
   onDashboardData?.(response.data.user.level, response.data.user.xp);
   ```
c) In Dashboard.tsx, pass `onDashboardData` from useCelebration to useDashboardData:
   ```tsx
   const { onDashboardData, ... } = useCelebration();
   const { stats, ... } = useDashboardData({ userId: user?.id, haptic, onDashboardData });
   ```

TASK 3 — Fix usePayment.ts to use real invoice URL:
The backend (Agent A) will now return `invoice_url` in the POST /create response. Update:
a) In `mini-app/src/api/payments.ts`: Add `invoice_url: string` to `CreatePaymentResponse` interface
b) In `mini-app/src/hooks/usePayment.ts`:
   - Remove the fake URL construction: `const invoiceUrl = \`https://t.me/$\${...}\``
   - Instead, use the real URL from the response: `const invoiceUrl = payment.invoice_url`
   - Keep the rest of the flow (openInvoice, polling) as-is

CONTEXT:
- useCelebration hook (Run 59): tracks level/xp in localStorage, compares on each call. Returns show* booleans + dismiss callbacks.
- Confetti renders 40 particles, auto-dismisses. LevelUpModal shows level number, auto-closes 3s. XpFloat shows "+X XP" floating up.
- Dashboard currently gets stats from useDashboardData which returns stats.user.level and stats.user.xp.

Read the existing celebration files to understand their props:
- mini-app/src/hooks/useCelebration.ts
- mini-app/src/components/celebrations/Confetti.tsx
- mini-app/src/components/celebrations/LevelUpModal.tsx
- mini-app/src/components/celebrations/XpFloat.tsx

FORBIDDEN: bot/ files, database/ files, test files, celebration component source files (don't modify Confetti/LevelUpModal/XpFloat/useCelebration).

BUILD VERIFY: cd mini-app && npm run build must pass.

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 60 Retrospectives" → "Agent B Retrospective", replacing the placeholder text. Then commit all changes.
```

**Agent C — Tests for Run 60 Changes** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read c:\Users\Asus\Desktop\Wibecode-agent-c\PARALLEL_AGENTS.md — find "Run 60" and locate the "Agent C" section. You are Agent C.

YOUR TASK: Write tests for the Stars payment handlers and Dashboard celebration integration.

OWNED FILES (all NEW or update):
- bot/src/__tests__/handlers/payments.test.ts (NEW)
- mini-app/src/__tests__/hooks/usePayment.test.ts (UPDATE — add invoice URL tests)
- mini-app/src/__tests__/pages/DashboardCelebrations.test.tsx (NEW)

TASK 1 — bot/src/__tests__/handlers/payments.test.ts (~10-12 tests):
Test the Grammy payment event handlers:
a) pre_checkout_query handler:
   - Approves valid payment with correct amount
   - Rejects payment with invalid payload
   - Rejects payment with mismatched amount
   - Calls ctx.answerPreCheckoutQuery with correct arguments
b) successful_payment handler:
   - Updates payment status to 'completed' in DB
   - Upserts subscription with correct tier
   - Sends confirmation message to user
   - Handles missing payment record gracefully

PATTERN: Read existing handler test files for conventions:
- bot/src/__tests__/handlers/settings.test.ts
- bot/src/__tests__/handlers/stats.test.ts
Grammy handler tests typically mock ctx with: ctx.answerPreCheckoutQuery, ctx.reply, ctx.message, ctx.preCheckoutQuery, etc.

TASK 2 — Update mini-app/src/__tests__/hooks/usePayment.test.ts (~3-4 new tests):
Add tests for the updated invoice URL behavior:
- Verify initiatePayment uses invoice_url from API response (not a constructed URL)
- Mock createPayment to return { ..., invoice_url: 'https://example.com/invoice' }
- Verify WebApp.openInvoice is called with the response URL
- Keep existing tests working (they should still pass with the updated mock shape)

IMPORTANT: Read the CURRENT usePayment.test.ts first — it was heavily rewritten by Agent 0 in Run 59 merge. Match the existing patterns (vi.useFakeTimers, renderHook with { userId: 42 }, etc.).

TASK 3 — mini-app/src/__tests__/pages/DashboardCelebrations.test.tsx (~6-8 tests):
Test that the Dashboard renders celebration components:
- Level up: when stats.user.level increases, LevelUpModal appears
- XP gain: when stats.user.xp increases, XpFloat appears
- Confetti: shows alongside LevelUpModal on level up
- Dismiss: celebrations disappear after timeout
- No celebration on first load (baseline initialization)

PATTERN: Read the existing Dashboard test approach. Mock useDashboardData to return controlled stats. Mock useCelebration to control show* flags. Render Dashboard and assert celebration components are present.
You'll need to mock: useDashboardData, useCelebration, useTelegram, react-router-dom, framer-motion, celebration components.

NOTE: Agent A is modifying backend payment handlers, Agent B is wiring celebrations into Dashboard. Your tests import from the NEW/MODIFIED locations. If imports fail because other agents haven't merged yet, that's expected — tests will pass after merge.

FORBIDDEN: ALL source files (test-only agent).

BUILD VERIFY: Run your tests after Agent A/B merge: cd bot && npx vitest --run src/__tests__/handlers/payments.test.ts && cd ../mini-app && npx vitest --run src/__tests__/hooks/usePayment.test.ts src/__tests__/pages/DashboardCelebrations.test.tsx

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 60 Retrospectives" → "Agent C Retrospective", replacing the placeholder text. Then commit all changes.
```

---

### Agent A — Stars Payment Backend

**Branch:** `feature/r60-stars-backend`
**Worktree:** `../Wibecode-agent-a`

**OWNED files:**
- `bot/src/handlers/payments.ts` (NEW)
- `bot/src/api/routes/payments.ts` (modify)
- `bot/src/utils/paymentHelpers.ts` (modify)

**GRAY AREA:**
- `bot/src/index.ts` — ONLY add 3 lines: import + 2 handler registrations

**FORBIDDEN:**
- All mini-app files, test files, other route files, celebration components

---

### Agent B — Dashboard Celebrations + Stars Mini-App Fix

**Branch:** `feature/r60-celebrations-dashboard`
**Worktree:** `../Wibecode-agent-b`

**OWNED files:**
- `mini-app/src/pages/Dashboard.tsx` (modify)
- `mini-app/src/hooks/useDashboardData.ts` (modify)
- `mini-app/src/hooks/usePayment.ts` (modify)
- `mini-app/src/api/payments.ts` (modify)

**FORBIDDEN:**
- All bot/ files, database/ files, test files, celebration component source files (Confetti.tsx, LevelUpModal.tsx, XpFloat.tsx, useCelebration.ts)

---

### Agent C — Tests for Run 60

**Branch:** `feature/r60-tests`
**Worktree:** `../Wibecode-agent-c`

**OWNED files:**
- `bot/src/__tests__/handlers/payments.test.ts` (NEW)
- `mini-app/src/__tests__/hooks/usePayment.test.ts` (UPDATE)
- `mini-app/src/__tests__/pages/DashboardCelebrations.test.tsx` (NEW)

**FORBIDDEN:**
- ALL source files (test-only agent)

---

### Run 60 File Ownership Matrix

| File / Directory | A | B | C |
|---|---|---|---|
| `bot/handlers/payments.ts` | **NEW** | - | - |
| `bot/routes/payments.ts` | **OWNED** | - | - |
| `bot/utils/paymentHelpers.ts` | **OWNED** | - | - |
| `bot/index.ts` | **GRAY** | - | - |
| `pages/Dashboard.tsx` | - | **OWNED** | - |
| `hooks/useDashboardData.ts` | - | **OWNED** | - |
| `hooks/usePayment.ts` | - | **OWNED** | - |
| `api/payments.ts` (mini-app) | - | **OWNED** | - |
| `__tests__/handlers/payments.test.ts` | - | - | **NEW** |
| `__tests__/hooks/usePayment.test.ts` | - | - | **UPDATE** |
| `__tests__/pages/DashboardCelebrations.test.tsx` | - | - | **NEW** |
| `PARALLEL_AGENTS.md` | retro | retro | retro |

### Run 60 Merge Order

1. Agent A (Stars payment backend) — backend must be in place first
2. Agent B (Dashboard celebrations + mini-app payment fix) — depends on API response shape
3. Agent C (tests) — test only, merge last

### Run 60 Retrospectives

#### Agent A Retrospective
*(To be filled by Agent A)*

#### Agent B Retrospective
*(To be filled by Agent B)*

#### Agent C Retrospective
**Files created/modified:**
- `bot/src/__tests__/handlers/payments.test.ts` (NEW — 14 tests: 7 pre_checkout + 7 successful_payment)
- `mini-app/src/__tests__/hooks/usePayment.test.ts` (UPDATED — added 3 invoice URL tests)
- `mini-app/src/__tests__/pages/DashboardCelebrations.test.tsx` (NEW — 8 tests for celebration integration)

**Total: 25 new tests across 3 files.**

**Approach:**
- TASK 1: Payment handler tests follow the existing convention from settings.test.ts and stats.test.ts — mock db (queryOne/execute), create context helpers, test both happy path and error cases. Tests cover pre_checkout_query approval/rejection (valid payload, invalid JSON, missing payment_id, missing DB record, amount mismatch, DB errors) and successful_payment flow (DB update to 'completed', subscription upsert, confirmation message, missing record handling, charge ID extraction, invalid payload, DB errors).
- TASK 2: Added a new `describe('usePayment — invoice URL from API')` block with 3 tests verifying that after Agent B's changes, `openInvoice` receives the exact `invoice_url` from the API response instead of a constructed URL. Preserved all existing tests unchanged. Matched existing patterns (vi.useFakeTimers, renderHook with { userId: 42 }, flushPolling).
- TASK 3: Created DashboardCelebrations.test.tsx mocking useCelebration to control show* flags and celebration components as simple test-visible elements. Tests: no celebrations on normal load, LevelUpModal appears with correct level, Confetti + LevelUpModal together on level up, XpFloat with correct amount, no XpFloat when hidden, no celebrations during loading/error states, onDashboardData passed to useDashboardData.

**Notes:**
- Tests import from locations that Agent A (handlers/payments.ts) and Agent B (useCelebration in Dashboard) are creating/modifying. Tests won't pass until after merge.
- Used the shared `framerMotionMock` from `@/test/mocks/framer-motion` for the Dashboard test to match project conventions.
- No issues encountered during test writing.

#### Agent 0 Retrospective
*(To be filled by Agent 0 after merge)*
