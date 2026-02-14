# Parallel Agents Protocol

This file is the single source of truth for running parallel Claude Code agents on the Wibecode RPG bot project. Each "Run" launches 2-6 agents (A, B, C, D, E, F) in separate git worktrees, plus Agent 0 (orchestrator) in the main repo.

For completed run history (Runs 2–59), see `PARALLEL_AGENTS_HISTORY.md`.

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
### Resolved (Run 60)
- ~~Celebrations not integrated into pages~~ — Agent B wired Confetti, LevelUpModal, XpFloat into Dashboard via useCelebration hook + useDashboardData callback. Haptic feedback on level-up/XP gain. Issue #11 resolved.
- ~~Stars payment invoice URL~~ — Agent A added `bot.api.createInvoiceLink()` to POST /create, Agent B updated usePayment.ts to use `payment.invoice_url` from API response. Real Telegram Stars invoice URLs now generated. Issue #12 resolved.

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

<!-- Run 59 archived to PARALLEL_AGENTS_HISTORY.md -->

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
- **Task**: Complete Telegram Stars payment backend — create real invoices via Bot API and handle payment events.
- **Files created (1)**: `bot/src/handlers/payments.ts` (190 lines) — Grammy handlers for `pre_checkout_query` and `message:successful_payment` events.
- **Files modified (3)**:
  1. `bot/src/utils/paymentHelpers.ts` — Added `TIER_PRICES` constant (`Record<Tier, number>`) mapping each tier to its Stars price (free=0, subscriber=0, premium=599).
  2. `bot/src/api/routes/payments.ts` — POST `/create` now calls `bot.api.createInvoiceLink()` to generate a real Telegram Stars invoice after creating the pending payment record. Returns `invoice_url` in response. On invoice creation failure, marks payment as `failed`. Added imports for `bot`, `TIER_PRICES`, `Tier`.
  3. `bot/src/index.ts` — Added import for `handlePreCheckoutQuery` and `handleSuccessfulPayment`, registered `bot.on('pre_checkout_query', ...)` and `bot.on('message:successful_payment', ...)` handlers (3 lines total, GRAY AREA).
- **Payment flow**: Mini-app calls POST `/create` → gets `invoice_url` → user opens invoice in Telegram → Telegram sends `pre_checkout_query` (we verify payment_id, amount, currency, status) → approve → Telegram charges user → `successful_payment` event → we complete payment + upsert subscription in a single DB transaction → send confirmation message.
- **Design decisions**:
  - `parsePayload()` helper validates JSON payload structure (requires `payment_id: number` + `tier`), used by both handlers.
  - Pre-checkout verifies 4 things: valid payload, payment exists & pending, amount matches, currency is XTR.
  - Successful payment is idempotent — if already completed, sends friendly confirmation instead of erroring.
  - Transaction pattern matches existing `payment-webhook.ts` (same UPDATE payments + UPSERT subscriptions).
  - `provider_token` is empty string for Telegram Stars (no external payment provider).
- **Build**: `tsc` passes clean, 0 errors.

#### Agent B Retrospective
**Task:** Wire celebration animations into Dashboard page and fix Stars payment mini-app to use real invoice URLs.
**Result:** All 3 tasks completed. Build passes clean (tsc + vite build, 0 errors).

**Files modified (4):**
1. **mini-app/src/pages/Dashboard.tsx** — Imported useCelebration hook + Confetti, LevelUpModal, XpFloat components. Added celebration hook call, passed `onDashboardData` to useDashboardData. Rendered all 3 celebration components at the bottom of the JSX. Added useEffect hooks for haptic feedback: `haptic.impact('heavy')` on level-up, `haptic.impact('light')` on XP gain.
2. **mini-app/src/hooks/useDashboardData.ts** — Added optional `onDashboardData?: (level: number, xp: number) => void` parameter. After successful stats load, calls `onDashboardData?.(response.data.user.level, response.data.user.xp)` to feed level/xp into the celebration system.
3. **mini-app/src/hooks/usePayment.ts** — Removed the fake URL construction (`https://t.me/$BOT?startattach=pay_ID`). Now uses `payment.invoice_url` from the backend API response, which will contain the real Telegram Stars invoice URL generated via `bot.api.createInvoiceLink()`.
4. **mini-app/src/api/payments.ts** — Added `invoice_url: string` field to `CreatePaymentResponse` interface to match the updated backend response.

**Design decisions:**
- Haptic feedback is triggered via useEffect in Dashboard.tsx (as the consuming page), not inside useCelebration — matching Agent C's recommendation from Run 59 retro.
- `onDashboardData` is passed as a hook param (not a global event) to keep data flow explicit and testable.

**Notes for Agent 0:**
- The `onDashboardData` callback in useDashboardData is called on EVERY successful stat load (initial + refresh). The useCelebration hook handles deduplication via its internal localStorage tracking.
- No i18n changes needed — celebration text keys were already added by Agent C in Run 59.

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
**Merge**: All 3 branches merged in order A→B→C. Agent C committed directly to main (no branch commits), so only A and B were actual merges. PARALLEL_AGENTS.md conflicted twice (expected — resolved with `--ours` + manual retro splice).

**Post-merge test failures (20 total, all fixed):**
- **payments.test.ts (14)**: Agent C exported `handlePreCheckout` but Agent A's real export is `handlePreCheckoutQuery`. Also: missing `transaction`/`paymentHelpers.js` mocks, mock amounts as numbers instead of strings (DB returns DECIMAL as string), successful_payment tests used `mockExecute` but handler uses `transaction(client => client.query(...))`, DB error tests expected graceful handling but handlers let errors propagate to Grammy's `bot.catch()`.
- **DashboardCelebrations.test.tsx (3)**: `const Stub` defined outside `vi.mock()` wasn't hoisted — moved factory function inside the callback. Missing lucide-react icon exports (Calendar, Award, AlertCircle, RefreshCw, Clock, CheckCircle).
- **usePayment.test.ts (1)**: Old test expected URL containing `pay_10` but Agent B changed hook to use `payment.invoice_url` from API. Added `invoice_url` to all mock responses.
- **payments.http.test.ts (6)**: Missing `verifyWebhookSecret` in paymentHelpers mock — webhook handler got `undefined()` TypeError. Added async mock with real `UnauthorizedError` import.

**Result**: 1732 tests pass (906 bot + 826 mini-app). Deployed commit `5b71630`.

**Lessons**: Agent C (test agent) continues to write tests against assumed function signatures rather than the actual code. The `handlePreCheckout` vs `handlePreCheckoutQuery` mismatch cost 14 test fixes. Also, HTTP tests that use mocked routes need ALL transitive imports mocked — the webhook route imports `verifyWebhookSecret` from paymentHelpers, which wasn't in the mock. Consider having the test agent explicitly list ALL imports of the file under test.

<!-- Next run goes here. Agent 0 will append RUN 62 below this line. -->

## Run 61: Social Features Enhancement (3 Agents + Agent 0)

**Date**: 2026-02-14
**Agents**: 3 (A-C) + Agent 0
**Goal**: Complete the Social features — add missing backend endpoints (user search, pending requests, challenge join/progress, unfriend), create a dedicated mini-app social API client, refactor Social.tsx to use it, and add comprehensive test coverage.

**Current state (from codebase audit):**
- Backend `bot/src/api/routes/social.ts` (160 lines) has 5 endpoints: POST /friends/request, POST /friends/accept, GET /friends/:userId, POST /challenges/create, GET /challenges/:userId
- **Missing backend**: no user search, no pending friend requests view, no friend reject/unfriend, no challenge join, no challenge progress update
- Mini-app `Social.tsx` (197 lines) calls real APIs with raw `fetch()` — no dedicated API client like `api/payments.ts`
- No `mini-app/src/api/social.ts` exists — Social page uses inline `fetch()` calls
- Social HTTP tests exist (`social.http.test.ts`, 267 lines) but only cover existing endpoints
- 1732 tests currently passing

---

### Run 61 Copy-Paste Prompts

**Agent A — Social Backend Enhancements** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read c:\Users\Asus\Desktop\Wibecode-agent-a\PARALLEL_AGENTS.md — find "Run 61" and locate the "Agent A" section. You are Agent A.

YOUR TASK: Add missing social backend endpoints to complete the social features.

OWNED FILES:
- bot/src/api/routes/social.ts (modify — add 5 new endpoints)

TASK 1 — GET /friends/pending/:userId (incoming pending friend requests):
List pending friend requests where to_user_id = userId and status = 'pending'.
Return: array of { id, from_user: { id, username, first_name, current_level }, created_at }.
Join with users table to get requester info.
Use authenticateTelegram + authorizeUser + readLimiter.

TASK 2 — POST /friends/reject (reject a friend request):
Body: { requestId, userId }. Validate requestId is a pending request where to_user_id = userId.
UPDATE friend_requests SET status = 'rejected' WHERE id = requestId.
Invalidate cache for both users. Return success message.

TASK 3 — DELETE /friends/:userId/:friendId (unfriend):
Remove an accepted friendship. DELETE the friend_requests row where both users match and status = 'accepted'.
Invalidate cache for both users. Return success message.
Validate both IDs are positive integers.

TASK 4 — POST /challenges/:challengeId/join (join an existing challenge):
Body: { userId }. Validate: challenge exists, user not already joined, challenge is still 'active'.
INSERT INTO challenge_participants. Invalidate challenges cache for the user.

TASK 5 — PATCH /challenges/:challengeId/progress (update challenge progress):
Body: { userId, progress }. Validate: user is a participant, progress is a non-negative integer.
UPDATE challenge_participants SET progress = $1 WHERE challenge_id = $2 AND user_id = $3.
Invalidate challenges cache.

CONTEXT:
Read the existing social.ts to match patterns (asyncHandler, validateRequired, successResponse, error classes).
Database tables: friend_requests (id, from_user_id, to_user_id, status, created_at), challenges (id, creator_id, title, description, mode, target_value, start_date, end_date, status), challenge_participants (id, challenge_id, user_id, progress, joined_at).

IMPORTANT: Use .js extensions in all import paths (ESM project).

FORBIDDEN: Do NOT modify mini-app files, test files, other route files.

BUILD VERIFY: cd bot && npm run build must pass.

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 61 Retrospectives" → "Agent A Retrospective", replacing the placeholder text. Then commit all changes.
```

**Agent B — Social Mini-App API Client + Page Refactor** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read c:\Users\Asus\Desktop\Wibecode-agent-b\PARALLEL_AGENTS.md — find "Run 61" and locate the "Agent B" section. You are Agent B.

YOUR TASK: Create a dedicated social API client for the mini-app and refactor Social.tsx to use it. Add pending requests UI and challenge join functionality.

OWNED FILES:
- mini-app/src/api/social.ts (NEW — social API client)
- mini-app/src/hooks/useSocial.ts (NEW — social data hook)
- mini-app/src/pages/Social.tsx (modify — use new hook + API client)

TASK 1 — Create mini-app/src/api/social.ts:
Dedicated API client for social endpoints (match the pattern of mini-app/src/api/payments.ts):
Functions:
- getFriends(userId: number): Promise<Friend[]>
- getPendingRequests(userId: number): Promise<PendingRequest[]>
- sendFriendRequest(fromUserId: number, toUserId: number): Promise<void>
- acceptFriendRequest(requestId: number, userId: number): Promise<void>
- rejectFriendRequest(requestId: number, userId: number): Promise<void>
- removeFriend(userId: number, friendId: number): Promise<void>
- getChallenges(userId: number): Promise<Challenge[]>
- createChallenge(data: CreateChallengeParams): Promise<Challenge>
- joinChallenge(challengeId: number, userId: number): Promise<void>
- updateChallengeProgress(challengeId: number, userId: number, progress: number): Promise<void>

Export interfaces: Friend, PendingRequest, Challenge, CreateChallengeParams.
Use the same auth pattern as api/payments.ts (X-Telegram-Init-Data header from @twa-dev/sdk).

TASK 2 — Create mini-app/src/hooks/useSocial.ts:
Hook that manages social data:
- Loads friends + pending requests + challenges on mount
- Exposes: { friends, pendingRequests, challenges, loading, error, refresh }
- Exposes mutation functions: { sendRequest, acceptRequest, rejectRequest, removeFriend, joinChallenge }
- Uses useCallback for stability, refreshes after mutations

TASK 3 — Refactor Social.tsx:
Replace the inline fetch() calls with the useSocial hook:
- Remove the raw fetch + API_BASE_URL pattern (lines 12, 91-92)
- Use useSocial hook for all data loading and mutations
- Add a "Pending Requests" section that shows incoming requests with Accept/Reject buttons
- Add "Join" button on challenges the user hasn't joined yet
- Keep existing UI structure (tabs, skeleton, error handling, forms)

CONTEXT:
Read the existing Social.tsx to understand its current structure. It has tabs (Friends/Challenges), forms, loading skeleton, and error handling.
Read mini-app/src/api/payments.ts for the API client pattern (auth headers, error handling).
The backend endpoints (existing + Agent A's additions):
- GET /api/social/friends/:userId
- GET /api/social/friends/pending/:userId (NEW by Agent A)
- POST /api/social/friends/request
- POST /api/social/friends/accept
- POST /api/social/friends/reject (NEW by Agent A)
- DELETE /api/social/friends/:userId/:friendId (NEW by Agent A)
- GET /api/social/challenges/:userId
- POST /api/social/challenges/create
- POST /api/social/challenges/:challengeId/join (NEW by Agent A)
- PATCH /api/social/challenges/:challengeId/progress (NEW by Agent A)

FORBIDDEN: bot/ files, database/ files, test files, celebration components.

BUILD VERIFY: cd mini-app && npm run build must pass.

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 61 Retrospectives" → "Agent B Retrospective", replacing the placeholder text. Then commit all changes.
```

**Agent C — Social Tests** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read c:\Users\Asus\Desktop\Wibecode-agent-c\PARALLEL_AGENTS.md — find "Run 61" and locate the "Agent C" section. You are Agent C.

YOUR TASK: Write comprehensive tests for the social features — backend HTTP tests for new endpoints and mini-app hook/component tests.

OWNED FILES (all NEW or UPDATE):
- bot/src/__tests__/routes/http/social.http.test.ts (UPDATE — add tests for 5 new endpoints)
- mini-app/src/__tests__/hooks/useSocial.test.ts (NEW)
- mini-app/src/__tests__/pages/Social.test.tsx (NEW)

TASK 1 — Update social.http.test.ts (~15-20 new tests):
Read the EXISTING test file first to match patterns and avoid duplicating tests.
Add tests for Agent A's new endpoints:
a) GET /friends/pending/:userId:
   - Returns pending requests for the user
   - Returns empty array when no pending requests
   - Returns 400 for non-numeric userId
b) POST /friends/reject:
   - Rejects a pending request
   - Returns 400 for missing fields
   - Returns 404 when request not found
   - Returns 400 when request is not pending
c) DELETE /friends/:userId/:friendId:
   - Removes an accepted friendship
   - Returns 404 when friendship not found
   - Returns 400 for non-numeric IDs
d) POST /challenges/:challengeId/join:
   - Joins an active challenge
   - Returns 400 when already joined
   - Returns 404 when challenge not found
e) PATCH /challenges/:challengeId/progress:
   - Updates progress for a participant
   - Returns 400 for negative progress
   - Returns 404 when not a participant

IMPORTANT: Read the existing social.http.test.ts FIRST. Match its mock setup pattern (createMockDb, createMockCache, createMockRateLimiters, authenticateTelegram mock, buildApp pattern). Do NOT duplicate existing test helpers or change existing tests.

TASK 2 — Create useSocial.test.ts (~8-10 tests):
Test the social data hook:
- Loads friends on mount
- Loads pending requests
- Loads challenges
- Sets loading state correctly
- Handles API errors
- acceptRequest calls API and refreshes
- rejectRequest calls API and refreshes
- joinChallenge calls API and refreshes

Mock mini-app/src/api/social.ts functions. Use renderHook + act pattern from existing hook tests (e.g., mini-app/src/__tests__/hooks/usePayment.test.ts).

TASK 3 — Create Social.test.tsx (~6-8 tests):
Test the Social page rendering:
- Shows loading skeleton initially
- Shows friends list after loading
- Shows challenges tab content
- Shows pending requests section
- Shows error state
- Add friend form submission

Mock useSocial hook, useTelegram, react-router-dom, framer-motion, lucide-react.
Pattern: Read mini-app/src/__tests__/pages/DashboardCelebrations.test.tsx for page-level test patterns.

CRITICAL: Read the ACTUAL source files created by Agent A and Agent B before writing tests.
- Read bot/src/api/routes/social.ts to see exact endpoint signatures, parameter names, response shapes
- Read mini-app/src/hooks/useSocial.ts to see exact hook return type and function signatures
- Read mini-app/src/api/social.ts to see exact API function signatures
If Agent A/B haven't merged yet, base your tests on the descriptions in this prompt but keep them flexible.

FORBIDDEN: ALL source files (test-only agent).

BUILD VERIFY: cd bot && npx vitest --run src/__tests__/routes/http/social.http.test.ts && cd ../mini-app && npx vitest --run src/__tests__/hooks/useSocial.test.ts src/__tests__/pages/Social.test.tsx

After completing work, write your retrospective in PARALLEL_AGENTS.md under "Run 61 Retrospectives" → "Agent C Retrospective", replacing the placeholder text. Then commit all changes.
```

---

### Agent A — Social Backend Enhancements

**Branch:** `feature/r61-social-backend`
**Worktree:** `../Wibecode-agent-a`

**OWNED files:**
- `bot/src/api/routes/social.ts` (modify)

**FORBIDDEN:**
- All mini-app files, test files, other route files, middleware

---

### Agent B — Social Mini-App API Client + Page Refactor

**Branch:** `feature/r61-social-miniapp`
**Worktree:** `../Wibecode-agent-b`

**OWNED files:**
- `mini-app/src/api/social.ts` (NEW)
- `mini-app/src/hooks/useSocial.ts` (NEW)
- `mini-app/src/pages/Social.tsx` (modify)

**FORBIDDEN:**
- All bot/ files, database/ files, test files, celebration components

---

### Agent C — Social Tests

**Branch:** `feature/r61-social-tests`
**Worktree:** `../Wibecode-agent-c`

**OWNED files:**
- `bot/src/__tests__/routes/http/social.http.test.ts` (UPDATE)
- `mini-app/src/__tests__/hooks/useSocial.test.ts` (NEW)
- `mini-app/src/__tests__/pages/Social.test.tsx` (NEW)

**FORBIDDEN:**
- ALL source files (test-only agent)

---

### Run 61 File Ownership Matrix

| File / Directory | A | B | C |
|---|---|---|---|
| `bot/routes/social.ts` | **OWNED** | - | - |
| `api/social.ts` (mini-app) | - | **NEW** | - |
| `hooks/useSocial.ts` | - | **NEW** | - |
| `pages/Social.tsx` | - | **OWNED** | - |
| `__tests__/routes/http/social.http.test.ts` | - | - | **UPDATE** |
| `__tests__/hooks/useSocial.test.ts` | - | - | **NEW** |
| `__tests__/pages/Social.test.tsx` | - | - | **NEW** |
| `PARALLEL_AGENTS.md` | retro | retro | retro |

### Run 61 Merge Order

1. Agent A (social backend) — backend endpoints must exist first
2. Agent B (social mini-app) — depends on API structure
3. Agent C (tests) — test only, merge last

### Run 61 Retrospectives

#### Agent A Retrospective
- **Task**: Add 5 new social backend endpoints to `bot/src/api/routes/social.ts`.
- **Files modified (1)**: `bot/src/api/routes/social.ts` (160→321 lines)
- **Endpoints added (5)**:
  1. **GET /friends/pending/:userId** — Lists incoming pending friend requests with requester info (id, username, first_name, current_level) via JOIN on users table. Uses authorizeUser + readLimiter.
  2. **POST /friends/reject** — Rejects a pending friend request. Validates requestId + userId, ensures request belongs to user and is pending. Invalidates cache for both users.
  3. **DELETE /friends/:userId/:friendId** — Unfriends by deleting the accepted friend_requests row (bidirectional match). Validates both IDs as positive integers. Invalidates cache for both users.
  4. **POST /challenges/:challengeId/join** — Joins an active challenge. Validates challenge exists, is active, and user hasn't already joined. Invalidates challenge cache for user.
  5. **PATCH /challenges/:challengeId/progress** — Updates participant progress. Validates progress is a non-negative integer, user is a participant. Invalidates challenge cache.
- **Patterns followed**: All endpoints use `asyncHandler`, `validateRequired`, `BadRequestError`/`NotFoundError`, `safeParseInt` for URL params, `successResponse` wrapper, cache invalidation via `invalidate()`.
- **Route ordering note**: GET `/friends/pending/:userId` is registered BEFORE GET `/friends/:userId` to prevent Express from matching "pending" as a userId parameter.
- **Build**: `tsc` passes clean, 0 errors.
- **Notes for Agent 0**: No new imports or dependencies added. No changes to other files. All new endpoints follow existing patterns exactly.

#### Agent B Retrospective
**Task:** Create social API client, useSocial hook, and refactor Social.tsx with pending requests UI and unfriend functionality.
**Result:** All 3 tasks completed. Build passes clean (tsc + vite build, 0 errors).

**Files created (2):**
1. **mini-app/src/api/social.ts** (~130 lines) — Dedicated social API client with 10 functions: getFriends, getPendingRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, getChallenges, createChallenge, joinChallenge, updateChallengeProgress. Shared `request<T>()` helper handles auth headers, error parsing, and `{success, data}` unwrapping. Exports interfaces: Friend, PendingRequest, Challenge, CreateChallengeParams.
2. **mini-app/src/hooks/useSocial.ts** (~95 lines) — Hook managing social data lifecycle: loads friends + pending requests + challenges on mount via Promise.all. Exposes mutation functions (sendRequest, acceptRequest, rejectRequest, removeFriend, joinChallenge) that auto-refresh after each mutation. Uses useCallback for stability.

**Files modified (4):**
1. **mini-app/src/pages/Social.tsx** (197→343 lines) — Complete refactor: replaced inline fetch() calls with useSocial hook, removed API_BASE_URL and manual headers. Added PendingRequestCard component (shows incoming requests with Accept/Reject buttons, yellow avatar badge). Added FriendCardWithRemove component (replaces FriendsList with per-friend unfriend button + confirmation). Pending requests section appears above friends when requests exist, with count badge. Removed FriendsList dependency (inlined with unfriend support).
2. **mini-app/src/i18n/en.ts** — Added 4 keys: pendingRequests, accept, reject, unfriend
3. **mini-app/src/i18n/ru.ts** — Same 4 keys in Russian
4. **mini-app/src/i18n/zh.ts** — Same 4 keys in Chinese

**Design decisions:**
- Used standalone `api/social.ts` with shared `request<T>()` helper (same pattern as `api/payments.ts`) — keeps isolation from main apiClient singleton.
- Unfriend has a 2-step confirmation (tap → confirm/cancel) to prevent accidental removals.
- Pending requests section only renders when there are pending requests (no empty state).
- Challenge join functionality is exposed via the hook but not rendered in UI — no "all challenges" endpoint exists yet, so join-by-ID would need a separate UI. The hook is ready for when that endpoint is added.

**Notes for Agent 0:**
- i18n files have 4 new keys per language (social namespace). No conflict with other agents expected.
- The FriendsList component is no longer used by Social.tsx (replaced with FriendCardWithRemove inline). FriendsList still exists and is not deleted (outside OWNED scope).
- The ChallengeForm and ChallengesList components still use their own inline fetch() — they are not in OWNED scope. A future run could refactor them to use the social API client too.

#### Agent C Retrospective
**Files created/modified:**
- `bot/src/__tests__/routes/http/social.http.test.ts` (UPDATED — added 18 tests for 5 new endpoints)
- `mini-app/src/__tests__/hooks/useSocial.test.ts` (NEW — 9 tests for social data hook)
- `mini-app/src/__tests__/pages/Social.test.tsx` (REWRITTEN — 9 tests, switched from fetch mocking to useSocial hook mocking)

**Total: 36 tests across 3 files.**

**Approach:**
- TASK 1: Added 5 new `describe` blocks to social.http.test.ts matching existing patterns (createMockDb, buildApp, supertest). Tests cover: GET /friends/pending/:userId (3 tests), POST /friends/reject (4 tests), DELETE /friends/:userId/:friendId (4 tests), POST /challenges/:challengeId/join (4 tests), PATCH /challenges/:challengeId/progress (5 tests). Each block tests happy path, missing fields, not-found, and invalid input cases.
- TASK 2: Created useSocial.test.ts using renderHook + waitFor pattern (matching usePayment.test.ts conventions). Tests cover: data loading on mount (friends, pending, challenges), loading state transitions, API error handling, mutation functions (acceptRequest, rejectRequest, joinChallenge) with post-mutation refresh verification, and explicit refresh() call. Mocks api/social.ts functions individually.
- TASK 3: Rewrote Social.test.tsx from `globalThis.fetch` mocking to `useSocial` hook mocking to match Agent B's refactor. Tests: loading skeleton, friends list rendering, no-friends message, challenges list, no-challenges message, error state with Retry, ARIA regions, pending requests section (new feature), no-pending-section when empty.

**Notes for Agent 0:**
- Social.test.tsx was REWRITTEN (not appended) because the existing tests mock `globalThis.fetch` directly, which will break after Agent B's refactor to `useSocial` hook. The new tests use the same hook-mocking pattern as DashboardCelebrations.test.tsx.
- The useSocial.test.ts assumes `useSocial(userId)` call signature — if Agent B uses a different signature (e.g., object param like `useSocial({ userId })`), Agent 0 will need to adjust.
- HTTP tests assume Agent A follows standard patterns (asyncHandler, validateRequired, BadRequestError, NotFoundError, safeParseInt). Mock setup matches existing tests exactly (same vi.mock factories, same db/cache/auth mocks).

#### Agent 0 Retrospective
**Merge**: A→B→C, all auto-merged cleanly (no conflicts). Retrospectives auto-merged into PARALLEL_AGENTS.md.
**Cross-agent test fixes (20 total across 4 files)**:
1. `bot/src/api/routes/social.ts` — Agent A missed `userId === 0` validation in `GET /friends/pending/:userId` (other endpoints had it). Added `if (userId === 0) throw new BadRequestError('Invalid userId')`.
2. `bot/src/__tests__/routes/http/social.http.test.ts` (3 fixes) — Agent C assumed 200 for join (Agent A returns 201), lowercase `'already'` (message starts with capital `'Already'`), `'not found'` (actual message is `'Not a participant'`).
3. `mini-app/src/__tests__/hooks/useSocial.test.ts` (9 fixes) — Agent C used `useSocial(1)` but Agent B's hook takes `useSocial({ userId: 1 })`. All 9 renderHook calls updated.
4. `mini-app/src/__tests__/pages/Social.test.tsx` (7 fixes) — Missing `UserMinus` in lucide-react mock (Agent B added unfriend button), plus `FriendsList` mock not used (Agent B inlined `FriendCardWithRemove`).
**Tests**: Bot 78/78 files, 926 tests. Mini-app 146/146 files, 831 tests. All pass.
**Deploy**: Server updated, PM2 restarted, API URL verified, notification sent.
**Known issue from Agent C retro**: `useSocial(userId)` vs `useSocial({ userId })` was correctly predicted by Agent C and confirmed during merge. Good self-awareness from the test agent.

---

## Run 62: Challenge Discovery + Test Hardening

**Theme**: Build challenge browsing/discovery so users can find and join challenges (Run 61 added join endpoint but no browse UI), plus close the useCelebration test gap.

### Run 62 Agents

#### Agent A — Challenge Discovery Backend
**Scope**: Add 2 new endpoints + enhance 1 existing endpoint in `bot/src/api/routes/social.ts`.

**Tasks**:
1. **GET /challenges/discover** — List all active public challenges. Returns: id, title, description, mode, target_value, start_date, end_date, status, creator (username, first_name), participant_count. Ordered by created_at DESC. Supports `?mode=fitness` filter and `?limit=20&offset=0` pagination. Uses `readLimiter`. No auth required (public discovery).
2. **GET /challenges/:challengeId/details** — Full challenge detail view. Returns: challenge data + array of participants (user_id, username, first_name, current_level, progress, joined_at). Uses JOIN on `challenge_participants` + `users`. Auth required (`authenticateTelegram`).
3. **Enhancement**: In existing POST `/challenges/create`, add `description` and `mode` fields to the INSERT (currently only `title`, `target_value`, `creator_id`). Validate `mode` is a known mode name if provided.

**File ownership**:
| File | Agent A |
|------|---------|
| `bot/src/api/routes/social.ts` | **OWNED** |

**Patterns to follow**: `asyncHandler`, `safeParseInt`, `BadRequestError`/`NotFoundError`, `successResponse`, `readLimiter`/`mutationLimiter`, cache with `invalidate()`. Register routes with proper ordering (specific before generic).

#### Agent B — Challenge Discovery UI + useCelebration Tests
**Scope**: Add challenge browsing UI to Social page + create missing useCelebration test.

**Tasks**:
1. **useCelebration.test.ts** (NEW) — Test the celebration hook (`mini-app/src/hooks/useCelebration.ts`). Test cases: initial call stores baseline without celebrating, level-up triggers confetti+levelUp, XP gain triggers xpFloat, dismiss functions clear state, subsequent calls compare with stored values, handles missing localStorage gracefully. Mock `localStorage` with vi.stubGlobal.
2. **Challenge discovery section** in `mini-app/src/pages/Social.tsx` — Add a "Discover Challenges" tab/section that shows active public challenges from GET /challenges/discover. Each card shows: title, mode badge, participant count, progress bar (if user joined), Join button (calls existing `joinChallenge` from useSocial). Filter by mode dropdown.
3. **api/social.ts** — Add `discoverChallenges(mode?: string)` and `getChallengeDetails(challengeId: number)` functions.
4. **useSocial.ts** — Add `discoverChallenges` data + `availableChallenges` state to the hook.

**File ownership**:
| File | Agent B |
|------|---------|
| `mini-app/src/hooks/useCelebration.ts` | READ ONLY |
| `mini-app/src/__tests__/hooks/useCelebration.test.ts` | **NEW** |
| `mini-app/src/pages/Social.tsx` | **OWNED** |
| `mini-app/src/api/social.ts` | **OWNED** |
| `mini-app/src/hooks/useSocial.ts` | **OWNED** |
| `mini-app/src/i18n/en.ts` | **OWNED** |
| `mini-app/src/i18n/ru.ts` | **OWNED** |
| `mini-app/src/i18n/zh.ts` | **OWNED** |

**Key constraints**:
- useSocial hook signature is `useSocial({ userId: number | undefined })` — use this exact signature.
- Social.tsx uses useSocial hook + inline components (FriendCardWithRemove, PendingRequestCard) — follow same pattern.
- Use lucide-react icons (Compass for discover, Users for participants).

#### Agent C — Tests for Challenge Discovery
**Scope**: HTTP tests for new endpoints + Social page test updates.

**Tasks**:
1. **Update `bot/src/__tests__/routes/http/social.http.test.ts`** — Add tests for:
   - GET /challenges/discover: returns active challenges, supports mode filter, supports pagination, returns empty array
   - GET /challenges/:challengeId/details: returns challenge with participants, returns 404 for non-existent, returns 400 for non-numeric
   - POST /challenges/create enhancement: accepts description and mode fields
2. **Update `mini-app/src/__tests__/pages/Social.test.tsx`** — Add tests for discover section: renders challenge cards, mode filter, join button interaction.
3. **Update `mini-app/src/__tests__/hooks/useSocial.test.ts`** — Add tests for `discoverChallenges` state and function.

**File ownership**:
| File | Agent C |
|------|---------|
| `bot/src/__tests__/routes/http/social.http.test.ts` | **UPDATE** |
| `mini-app/src/__tests__/pages/Social.test.tsx` | **UPDATE** |
| `mini-app/src/__tests__/hooks/useSocial.test.ts` | **UPDATE** |

**Key constraints**:
- HTTP test mock pattern: use `createMockDb()`, `createMockCache()`, `createMockRateLimiters()` from httpMocks.
- useSocial.test.ts uses `useSocial({ userId: 1 })` call signature (NOT `useSocial(1)`).
- Social.test.tsx mocks lucide-react — add any new icons Agent B uses.
- Social.test.tsx mocks useSocial — add new `discoverChallenges`/`availableChallenges` to baseSocialReturn.

### Run 62 File Ownership Matrix

| File | Agent A | Agent B | Agent C |
|------|---------|---------|---------|
| `bot/src/api/routes/social.ts` | **OWNED** | - | - |
| `mini-app/src/pages/Social.tsx` | - | **OWNED** | - |
| `mini-app/src/api/social.ts` | - | **OWNED** | - |
| `mini-app/src/hooks/useSocial.ts` | - | **OWNED** | - |
| `mini-app/src/hooks/useCelebration.ts` | - | READ | - |
| `mini-app/src/__tests__/hooks/useCelebration.test.ts` | - | **NEW** | - |
| `mini-app/src/i18n/*.ts` | - | **OWNED** | - |
| `bot/src/__tests__/routes/http/social.http.test.ts` | - | - | **UPDATE** |
| `mini-app/src/__tests__/pages/Social.test.tsx` | - | - | **UPDATE** |
| `mini-app/src/__tests__/hooks/useSocial.test.ts` | - | - | **UPDATE** |
| `PARALLEL_AGENTS.md` | retro | retro | retro |

### Run 62 Merge Order

1. Agent A (challenge backend) — endpoints must exist first
2. Agent B (challenge mini-app) — depends on API structure
3. Agent C (tests) — test only, merge last

### Run 62 Retrospectives

#### Agent A Retrospective
*(To be filled after completion)*

#### Agent B Retrospective
*(To be filled after completion)*

#### Agent C Retrospective
*(To be filled after completion)*

#### Agent 0 Retrospective
*(To be filled by Agent 0 after merge)*
