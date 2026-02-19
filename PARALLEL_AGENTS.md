# Parallel Agents Protocol

This file is the single source of truth for running parallel Claude Code agents on the Wibecode RPG bot project. Each "Run" launches 2-6 agents (A, B, C, D, E, F) in separate git worktrees, plus Agent 0 (orchestrator) in the main repo.

For completed run history (Runs 2–74), see `PARALLEL_AGENTS_HISTORY.md`.

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
13.5. **⚠️ CHECK THE MANDATORY ROADMAP — DO NOT SKIP.** Before designing ANY new run, scroll to the `## MANDATORY ROADMAP` section. If a roadmap exists:
    - Find the NEXT unexecuted run in the roadmap table (first row without a ✅ in the Status column)
    - Design the next run EXACTLY as specified — use the listed focus, agent count, and task breakdown
    - Do NOT deviate, improvise, or substitute different features
    - Do NOT skip runs or reorder them
    - If a roadmap run is partially obsolete (feature already built), note it in the retro and execute remaining tasks. If ALL tasks are done, mark it ✅ and move to the next run
    - Only design a run from scratch if ALL roadmap runs are marked ✅
    - **VIOLATING THIS RULE IS A CRITICAL FAILURE** — the roadmap is the user's explicit priority list. Improvising "more important" work is NOT your call. The user already decided what matters.
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
17. **Agent 0 MUST follow the MANDATORY ROADMAP if one exists** — Runs 56-64 deviated from a user-planned roadmap because (a) it was never written into the file, and (b) Agent 0's checklist didn't require checking it. The user lost 9 runs of planned features (avatars, trophies, shop, achievements) because Agent 0 kept improvising social/challenge features. NEVER design runs from scratch when a roadmap is present. The roadmap overrides codebase analysis.
18. **Agent 0 MUST handle SSH autonomously** — NEVER ask the user about SSH keys or connectivity. If key-based SSH fails, use password-based SSH: get the root password from the Timeweb API (`GET /api/v1/servers/6590889` → `root_pass` field) and pipe it via `powershell -Command "echo 'PASSWORD' | ssh root@85.239.58.205 'COMMAND'"`. If that also fails, try `eval $(ssh-agent -s) && ssh-add` first. The deploy must never stall waiting for user input.
19. **Agent 0 MUST commit and push autonomously** — NEVER ask the user "should I commit?" or "can I push?". After every phase (merge, test fixes, retro+prep), immediately `git add`, `git commit`, and `git push origin main`. This is a standing instruction — all changes must be committed and pushed without asking. See MEMORY.md "Workflow: Commit & Deploy (MANDATORY)".

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

#### Agent 0 Retrospective
*(To be filled by Agent 0)*
```

---

## MANDATORY ROADMAP (Runs 78-85) — MVP Recovery & Feature Re-enablement

⚠️ **This roadmap is NON-NEGOTIABLE. Agent 0 must execute these runs IN ORDER.**
⚠️ **Do NOT skip, reorder, or replace runs with "more important" work.**
⚠️ **If you are Agent 0 and you are about to design a new run, the NEXT unexecuted run below is your ONLY option.**

### Background
The project grew to 41 API routes, 24 pages, 2387 tests and became unstable. On 2026-02-19, an MVP recovery was performed:
- Disabled 16 non-MVP API routes (marked with `// [MVP-DISABLED]` in `server.ts`)
- Disabled 5 non-MVP background jobs (marked in `registerJobs.ts`)
- Disabled 17 non-MVP mini-app pages (marked in `App.tsx`)
- Simplified navigation to 5 tabs: Dashboard, Quests, Leaderboard, Profile, Settings
- Created `test:mvp` scripts (910 tests, ~21 seconds)

All disabled code is PRESERVED — just commented out. Each run below re-enables one batch of features, fixes any broken tests, and verifies everything works end-to-end.

### Current MVP State
- **Active pages**: Onboarding, Dashboard, Quests, Profile, Leaderboard, Settings
- **Active API routes**: users, quests, modes, leaderboard, onboarding, checkins, health, metrics
- **Active jobs**: dailyQuestReset, streakCheck, questReminders, leaderboardRefresh, dbCleanup
- **Tests**: 910 MVP tests passing in ~21s (`npm run test:mvp`)
- **Disabled**: achievements, admin, payments, social, avatars, trophies, shop, inventory, analytics, export, finance, channel, activities, content, recommendations, punishment

### The Roadmap

| Run | Focus | Agents | Status |
|-----|-------|--------|--------|
| **78** | MVP Hardening — fix bugs, e2e test core flow in Telegram | serial | ✅ |
| **79** | Re-enable Achievements + Payments + Trophies | 3 | ⬜ |
| **80** | Re-enable Shop + Inventory + Avatars | 3 | ⬜ |
| **81** | Re-enable Social + Finance | 3 | ⬜ |
| **82** | Re-enable Content + Activities | 3 | ⬜ |
| **83** | Re-enable Admin Panel | 3 | ⬜ |
| **84** | Polish + Performance Optimization | 3 | ⬜ |
| **85** | Launch Prep + Final QA | 3 | ⬜ |

### Re-enable Pattern (Runs 79-83)
Each re-enable run follows the same 3-agent pattern:
- **Agent A (Backend)**: Uncomment `[MVP-DISABLED]` lines in `server.ts` + `registerJobs.ts` for target features. Verify `npm run build`. Fix any TypeScript errors.
- **Agent B (Frontend)**: Uncomment `[MVP-DISABLED]` lines in `App.tsx`. Update `Navigation.tsx` if pages need nav items. Verify `npm run build`.
- **Agent C (Tests)**: Run `npm run test:full` for both bot and mini-app. Fix ALL broken tests for re-enabled features. Verify `test:mvp` still passes too.

---

## Completed Runs (Summary)

### Run 75 ✅ — Activity Hub (9 agents)
Sport/activity logging system: activity DB schema + 22 seeded activities, 7 API endpoints, ActivityHub page, WorkoutTimer component, ActivityHistory + calendar heatmap, activity→quest auto-integration, 15 activity achievements, i18n (en/ru/zh), 70+ tests. All merged and deployed.

### Run 76 ✅ — Knowledge Feed (8 agents)
Content delivery system: content DB schema (4 tables, 30 articles, 80+ quiz questions), 8 content API endpoints, ContentFeed page, ArticleReader, quiz system, ReadingHistory + bookmarks, content recommendation engine + Dashboard widget, 111 tests. All merged and deployed.

### Run 77 ⚠️ — Admin Panel (partially merged)
Admin panel revolution: Admin layout/dashboard, player list with search/sort/pagination, player detail view, admin actions (award XP, change tier, send message), bulk operations, notification center, admin i18n. **Partially merged** — some branches completed, but the combined result caused test suite bloat (2387 tests, timing out). Code preserved but ALL admin features were disabled during MVP recovery.

---

## RUN 78: MVP Hardening (3 Agents + Agent 0)

### Focus: Fix bugs in the core MVP flow, ensure end-to-end functionality works in Telegram, harden tests

### Copy-Paste Prompts

**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent 0 for Run 78.
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read PARALLEL_AGENTS.md — you are Agent A of Run 78. Your task: Bot-side bug fixes and core flow verification.

Test the following flows by reading code and tracing the logic end-to-end:
1. Onboarding: /start → mode selection → quiz → plan generation → completion state saved
2. Quest assignment: After onboarding, verify quests get assigned correctly (dailyQuestReset job)
3. Check-in flow: User opens quest → checks in → XP awarded → streak updated
4. Streak logic: Verify streakCheck job correctly increments/resets streaks
5. Leaderboard: Verify leaderboardRefresh job populates rankings

Fix any bugs you find. Pay special attention to:
- Quest assignment after onboarding (does the first quest appear?)
- XP award consistency (xpAward.ts + xpConsistency checks)
- Check-in validation (timer windows, duplicate check-ins)
- Daily quest reset logic (timezone handling)

OWNED: bot/src/api/routes/users.ts, bot/src/api/routes/quests.ts, bot/src/api/routes/quest-*.ts, bot/src/api/routes/checkins.ts, bot/src/api/routes/onboarding.ts, bot/src/api/routes/modes.ts, bot/src/api/routes/leaderboard.ts, bot/src/utils/xpAward.ts, bot/src/utils/streak.ts, bot/src/handlers/*.ts, bot/src/jobs/definitions/dailyQuestReset.ts, bot/src/jobs/definitions/streakCheck.ts, bot/src/jobs/definitions/questReminders.ts, bot/src/jobs/definitions/leaderboardRefresh.ts
FORBIDDEN: mini-app/*, PARALLEL_AGENTS.md (except your retrospective section)
After done, verify build: cd bot && npx tsc --noEmit && npm run test:mvp. Write retrospective.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read PARALLEL_AGENTS.md — you are Agent B of Run 78. Your task: Mini-app page polish and UX verification.

Open the mini-app dev server (cd mini-app && npm run dev) and test ALL 6 active pages in browser:

1. Onboarding: Complete flow works, state persists on refresh, quiz data saves
2. Dashboard: Loads user data, shows daily goals, quest cards, XP progress
3. Quests: Active/completed tabs, quest detail modal, check-in button works
4. Profile: Shows user stats, streaks, active modes, level/XP
5. Leaderboard: Rankings display, time period tabs (7d/30d/all), user avatars
6. Settings: Preferences save correctly, timezone, notification toggles

Fix any issues you find:
- Loading states and skeleton screens
- Error handling (API failures show user-friendly messages)
- Navigation between pages (no broken links, back button works)
- Responsive layout (mobile-first, safe area handling)
- Telegram theme integration (colors, dark mode)

OWNED: mini-app/src/pages/Dashboard.tsx, mini-app/src/pages/Quests.tsx, mini-app/src/pages/Profile.tsx, mini-app/src/pages/Leaderboard.tsx, mini-app/src/pages/Settings.tsx, mini-app/src/pages/Onboarding.tsx, mini-app/src/components/Navigation.tsx, mini-app/src/components/dashboard/*, mini-app/src/components/profile/*, mini-app/src/components/leaderboard/*, mini-app/src/components/quests/*, mini-app/src/components/settings/*
FORBIDDEN: bot/*, PARALLEL_AGENTS.md (except your retrospective section)
After done, verify build: cd mini-app && npx tsc --noEmit && npm run build. Write retrospective.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read PARALLEL_AGENTS.md — you are Agent C of Run 78. Your task: Test hardening.

1. Run `cd bot && npm run test:mvp` — all 573 tests must pass. Fix any failures.
2. Run `cd mini-app && npm run test:mvp` — all 337 tests must pass. Fix any failures.
3. Review test coverage gaps in MVP features:
   - Are there tests for quest assignment flow?
   - Are there tests for check-in validation edge cases?
   - Are there tests for streak reset/increment logic?
   - Are there tests for onboarding state management?
   - Are there tests for leaderboard ranking logic?
4. Add 10-20 targeted tests for any gaps you find
5. Verify both test:mvp AND test:full scripts work (test:full may have failures in disabled features — that's OK, document them)

OWNED: bot/src/__tests__/** (only test files for MVP features), mini-app/src/__tests__/** (only test files for MVP features)
FORBIDDEN: bot/src/api/*, bot/src/jobs/*, mini-app/src/pages/*, mini-app/src/components/* (source files — only tests)
After done, verify: npm run test:mvp in both bot/ and mini-app/. Write retrospective.
```

### Run 78 File Ownership Matrix

| File/Dir | Agent A | Agent B | Agent C |
|----------|---------|---------|---------|
| bot/src/api/routes/* (MVP) | OWNED | ❌ | ❌ |
| bot/src/utils/* | OWNED | ❌ | ❌ |
| bot/src/handlers/* | OWNED | ❌ | ❌ |
| bot/src/jobs/definitions/* (MVP) | OWNED | ❌ | ❌ |
| mini-app/src/pages/* (MVP) | ❌ | OWNED | ❌ |
| mini-app/src/components/* (MVP) | ❌ | OWNED | ❌ |
| bot/src/__tests__/* | ❌ | ❌ | OWNED |
| mini-app/src/__tests__/* | ❌ | ❌ | OWNED |

### Run 78 Merge Order
1. Agent A (backend fixes)
2. Agent C (test fixes — may depend on Agent A's changes)
3. Agent B (frontend fixes)

### Run 78 Retrospective (Serial — Agent 0 only)

**Approach**: All 3 parallel agents got stuck (0 commits across all worktrees). Switched to serial execution by Agent 0.

**Completed**:
| Task | Status |
|------|--------|
| Fix race condition in quest-progress.ts (SELECT FOR UPDATE) | ✅ |
| Fix race condition in checkins.ts (SELECT FOR UPDATE) | ✅ |
| Add ON CONFLICT to dailyQuestReset.ts | ✅ |
| Remove 4 dead navigation buttons from Profile.tsx | ✅ |
| Remove dead notification history link from Settings.tsx | ✅ |
| Remove SubscriptionSettings from Settings.tsx | ✅ |
| Remove onViewAll from ProfileAchievements.tsx | ✅ |
| Add 8 missing tables to schema.sql | ✅ |
| Update 3 test files for new transaction patterns | ✅ |
| Clean up stuck worktrees + branches | ✅ |
| Deploy + verify (90d976d) | ✅ |

**Tests**: 573 bot + 337 mini-app = 910 passing (test:mvp)

**Recommendations for next run**:
- Run 79 per roadmap: Re-enable Achievements + Payments + Trophies
- Consider serial execution again if parallel agents continue to get stuck
