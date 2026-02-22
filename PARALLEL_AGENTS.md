# Parallel Agents Protocol

This file is the single source of truth for running parallel Claude Code agents on the Wibecode RPG bot project. Each "Run" launches 2-6 agents (A, B, C, D, E, F) in separate git worktrees, plus Agent 0 (orchestrator) in the main repo.

For completed run history (Runs 2–83), see `PARALLEL_AGENTS_HISTORY.md`.

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
| **79** | Re-enable Achievements + Payments + Trophies | 3 | ✅ |
| **80** | Re-enable Shop + Inventory + Avatars | 3 | ✅ |
| **81** | Re-enable Social + Finance | 3 | ✅ |
| **82** | Re-enable Content + Activities | 3 | ✅ |
| **83** | Re-enable Admin Panel + Big Polish (8 agents, G skipped) | 7 | ✅ |
| **84** | React Query Migration + Admin Refactor + Performance | 5 (A,G skip) | ✅ |
| **85** | Big Feature Removal (Finance, Learning, Content, Referral, Avatar Customizer, Admin Tests) | 7 | ✅ |
| **86** | Animation Polish + Medication Premium Unlock (Stars/XP) | 7 | ✅ |
| **87** | Medication Mode + Notification Enhancements | 8 | ⬜ |
| **88** | Social Polish + Dashboard Widgets + Test Coverage | 8 | ⬜ |

### Re-enable Pattern (Runs 79-83)
Each re-enable run follows the same 3-agent pattern:
- **Agent A (Backend)**: Uncomment `[MVP-DISABLED]` lines in `server.ts` + `registerJobs.ts` for target features. Verify `npm run build`. Fix any TypeScript errors.
- **Agent B (Frontend)**: Uncomment `[MVP-DISABLED]` lines in `App.tsx`. Update `Navigation.tsx` if pages need nav items. Verify `npm run build`.
- **Agent C (Tests)**: Run `npm run test:full` for both bot and mini-app. Fix ALL broken tests for re-enabled features. Verify `test:mvp` still passes too.

---
---

## RUN 84: Admin Tests + Polish + Performance (7 Agents + Agent 0)

### Focus: Fix admin tests (deferred from Run 83 Agent G) + React Query migration for remaining hooks + admin component refactoring + notification bot enhancements + bundle optimization

### Copy-Paste Prompts

**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent 0 for Run 84.
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent A of Run 84. Your task: Fix ALL admin test files and add them to test:mvp scripts. This is deferred work from Run 83 Agent G.

## What to do

### 1. Fix bot admin tests (10 files)
Run each individually and fix any failures:
- `cd bot && npx vitest --run src/__tests__/routes/admin.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/admin-bulk.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/admin-notifications.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/admin-players.test.ts`
- `cd bot && npx vitest --run src/__tests__/middleware/adminAuth.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/admin.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/admin-jobs.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/admin-stats.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/admin-users.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/admin-quests.http.test.ts`

### 2. Fix mini-app admin tests (22+ files)
Run each individually and fix any failures:
- `cd mini-app && npx vitest --run src/__tests__/api/adminClient.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminBroadcast.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminJobs.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminLogs.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminPagination.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminStatsCard.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminUserList.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminUserRow.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminUserSearch.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/admin/AdminLoginForm.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/admin/AdminOverview.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/admin/AdminPlayerActions.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/admin/AdminQuestEditor.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/admin/AdminUserDetail.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/admin/AnswerAnalytics.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/admin/answer-analytics/`
- `cd mini-app && npx vitest --run src/__tests__/components/admin/quest-editor/`
- `cd mini-app && npx vitest --run src/__tests__/pages/admin/AdminPlayerDetail.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/pages/admin/AdminPlayerList.test.tsx`

### 3. Add ALL admin tests to test:mvp scripts
In `bot/package.json` test:mvp, add all 10 bot admin test paths.
In `mini-app/package.json` test:mvp, add all 22+ mini-app admin test paths.

### 4. Verify
`cd bot && npm run test:mvp` — ALL must pass
`cd mini-app && npm run test:mvp` — ALL must pass

In your retrospective, report the final test counts (test:mvp for both projects).

OWNED: All admin test files listed above, bot/package.json (test:mvp only), mini-app/package.json (test:mvp only)
FORBIDDEN: bot/src/api/*, bot/src/jobs/*, mini-app/src/pages/*, mini-app/src/components/* (source code), i18n files, tools/, hooks/
Write retrospective when done.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent B of Run 84. Your task: Migrate Dashboard and Profile data hooks to React Query.

## Context
In Run 83, Agent F migrated quest hooks to React Query with great results (instant check-in, no lag). Now extend that pattern to Dashboard and Profile.

## What to do

### 1. Create `mini-app/src/hooks/useDashboardQuery.ts` (new file)
React Query hooks for dashboard data. Follow the pattern from `useQuestsQuery.ts`:
- `useDashboardStats(userId)` — staleTime 2min, fetches user stats
- `useDashboardQuests(userId)` — staleTime 2min, fetches active quests preview
- `useDashboardAchievements(userId)` — staleTime 5min
- Export query keys for cache management

### 2. Refactor `mini-app/src/hooks/useDashboardData.ts`
- Replace useState + apiClient calls with React Query hooks from step 1
- Keep the public API the same (return shape) so Dashboard.tsx needs minimal changes
- Remove manual loading/error state — use React Query's isLoading/isError
- Keep pull-to-refresh callback (use refetchQueries instead of manual fetch)

### 3. Create `mini-app/src/hooks/useProfileQuery.ts` (new file)
- `useProfileStats(userId)` — staleTime 2min
- `useProfileAchievements(userId)` — staleTime 5min
- `useProfilePunishments(userId)` — staleTime 5min
- Export query keys

### 4. Refactor `mini-app/src/hooks/useProfileData.ts`
- Same pattern: replace useState + apiClient with React Query hooks
- Keep public API unchanged

### 5. Build verify
`cd mini-app && npx tsc --noEmit && npm run build`

OWNED: mini-app/src/hooks/useDashboardData.ts, mini-app/src/hooks/useDashboardQuery.ts (new), mini-app/src/hooks/useProfileData.ts, mini-app/src/hooks/useProfileQuery.ts (new)
FORBIDDEN: bot/, tools/, App.tsx, server.ts, test files, i18n files, admin components, useQuestsData.ts, useQuestsQuery.ts
Write retrospective when done.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent C of Run 84. Your task: Migrate Social, Shop, and Leaderboard hooks to React Query.

## Context
Run 83 Agent F migrated quest hooks to React Query. Run 84 Agent B handles Dashboard + Profile. You handle Social + Shop + Leaderboard.

## What to do

### 1. Create `mini-app/src/hooks/useSocialQuery.ts` (new file)
- `useFriendsList(userId)` — staleTime 2min
- `useFriendRequests(userId)` — staleTime 1min (changes frequently)
- `useChallenges(userId)` — staleTime 2min
- `useSendFriendRequestMutation()` — optimistic update (add to pending list instantly)
- `useAcceptFriendRequestMutation()` — optimistic update (move to friends list)
- Export query keys

### 2. Refactor `mini-app/src/hooks/useSocial.ts`
- Replace useState + apiClient with React Query hooks
- Keep public API the same
- Mutations get optimistic updates

### 3. Create `mini-app/src/hooks/useShopQuery.ts` (new file)
- `useShopItems(category?, page?)` — staleTime 5min, supports pagination
- `useInventory(userId)` — staleTime 2min
- `usePurchaseMutation()` — optimistic update (deduct balance, add to inventory)
- Export query keys

### 4. Refactor `mini-app/src/hooks/useShop.ts`
- Replace manual state with React Query hooks
- Keep public API

### 5. Extract Leaderboard data into hook
Currently `mini-app/src/pages/Leaderboard.tsx` has inline useState + apiClient.
- Create `mini-app/src/hooks/useLeaderboardQuery.ts` (new file)
  - `useLeaderboard(period, limit)` — staleTime 3min
  - `useUserRank(userId)` — staleTime 2min
- Refactor Leaderboard.tsx to use the new hook (reduce page size)

### 6. Build verify
`cd mini-app && npx tsc --noEmit && npm run build`

OWNED: mini-app/src/hooks/useSocial.ts, mini-app/src/hooks/useSocialQuery.ts (new), mini-app/src/hooks/useShop.ts, mini-app/src/hooks/useShopQuery.ts (new), mini-app/src/hooks/useLeaderboardQuery.ts (new), mini-app/src/pages/Leaderboard.tsx
FORBIDDEN: bot/, tools/, App.tsx, server.ts, test files, i18n files, admin components, Dashboard.tsx, Profile.tsx, useQuestsData.ts, useDashboardData.ts, useProfileData.ts
Write retrospective when done.
```

**Agent D** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent D of Run 84. Your task: Refactor large admin components into smaller pieces.

## The Problem
Three admin components are 640-716 lines each. They're hard to maintain and test.

## What to do

### 1. Refactor `mini-app/src/pages/admin/AdminPlayerDetail.tsx` (716 lines)
Split into sub-components:
- `AdminPlayerHeader.tsx` — player name, avatar, level badge
- `AdminPlayerStats.tsx` — XP, streaks, quest completion stats
- `AdminPlayerActions.tsx` — ban, reset, adjust XP, send message (if not already in separate file)
- `AdminPlayerDetail.tsx` — orchestrator that composes the above
Each sub-component should be in `mini-app/src/components/admin/player-detail/`

### 2. Refactor `mini-app/src/pages/admin/AdminPlayerList.tsx` (642 lines)
Split into:
- `AdminPlayerSearch.tsx` — search bar + filters
- `AdminPlayerTable.tsx` — table/card list of players
- `AdminBulkActions.tsx` — bulk action buttons
- `AdminPlayerList.tsx` — orchestrator
Sub-components in `mini-app/src/components/admin/player-list/`

### 3. Add React.memo to list item components
Wrap frequently-rendered child components in React.memo:
- Player row/card components
- Any stat cards rendered in loops
- Only memo components that receive primitive or stable props

### 4. Build verify
`cd mini-app && npx tsc --noEmit && npm run build`

OWNED: mini-app/src/pages/admin/AdminPlayerDetail.tsx, mini-app/src/pages/admin/AdminPlayerList.tsx, mini-app/src/components/admin/player-detail/ (new dir), mini-app/src/components/admin/player-list/ (new dir)
FORBIDDEN: bot/, tools/, test files, i18n files, hooks/, non-admin pages
Write retrospective when done.
```

**Agent E** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent E of Run 84. Your task: Enhance the notification bot with health monitoring features.

## What to do

### 1. Add PM2 crash detection to `/ping`
In `tools/notification_bot_handler.py`, enhance the `ping_command`:
- Check PM2 process info for `telegram-rpg-bot`: if `restart_time > 0` and last restart was within 60 minutes, add a warning line
- Use `subprocess.run(['pm2', 'jlist'], capture_output=True)` → parse JSON → check `pm2_env.restart_time`
- Show in ping output: "⚠️ Bot restarted N times in last hour" or "✅ No recent restarts"

### 2. Add SSL certificate expiration check
- New command `/ssl` OR add to `/ping` output
- Use subprocess: `openssl s_client -connect yakutsa.ru:443 -servername yakutsa.ru </dev/null 2>/dev/null | openssl x509 -noout -enddate`
- Parse expiry date, show days remaining
- Warn if <30 days: "⚠️ SSL cert expires in N days"

### 3. Add disk usage trend
- Enhance `/metrics` output
- Run `df -h /` to get current usage
- Store last 5 readings in a simple JSON file (`/tmp/wibecode_disk_history.json`)
- Show: "Disk: 45% (↑2% since yesterday)" or "Disk: 45% (stable)"

### 4. Add `/deploy` command
- Shows last deploy info: git log -1 (commit hash, message, time)
- PM2 uptime for telegram-rpg-bot
- Last restart time

### 5. Update `/help` with new commands/features

OWNED: tools/notification_bot_handler.py
FORBIDDEN: mini-app/src/, bot/src/, i18n files, test files, package.json files
Write retrospective when done.
```

**Agent F** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent F of Run 84. Your task: Optimize bundle size and add performance improvements.

## What to do

### 1. Verify admin pages are lazy-loaded
Check `mini-app/src/App.tsx` — admin routes should already use `React.lazy()` (they were enabled in Run 83). Verify they produce separate chunks in the build output. If they're NOT lazy-loaded, add lazy loading.

### 2. Optimize Vite chunk splitting
Read `mini-app/vite.config.ts` and check the manual chunks config.
- Verify recharts/chart library is in its own chunk (it's 359KB — biggest chunk!)
- If not already split, add recharts to its own manual chunk
- Consider splitting: `lucide-react` icons into a separate chunk if >30KB

### 3. Add React.memo to high-traffic list components
Find components rendered in loops/lists and wrap with React.memo where beneficial:
- `mini-app/src/components/QuestCard.tsx` or similar quest list items
- `mini-app/src/components/AchievementCard.tsx`
- Leaderboard row components
- Only where the component receives primitive/stable props

### 4. Verify code splitting works end-to-end
Run `cd mini-app && npm run build` and check output:
- Admin chunks should be separate (AdminDashboard-*.js, AdminPlayerList-*.js, AdminPlayerDetail-*.js)
- BarChart/recharts chunk should be separate
- Total gzip size of index-*.js should ideally be <80KB

### 5. Build verify
`cd mini-app && npx tsc --noEmit && npm run build`

OWNED: mini-app/vite.config.ts, mini-app/src/components/QuestCard.tsx (React.memo only), mini-app/src/components/AchievementCard.tsx (React.memo only)
GRAY AREA: Any component file — ONLY add React.memo wrapper, no other changes
FORBIDDEN: bot/, tools/, test files, i18n files, hooks/, admin page source (Agent D owns those)
Write retrospective when done.
```

**Agent G** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent G of Run 84. Your task: Fix tests broken by other agents' changes (React Query migrations, admin refactoring).

## Context
Other agents in this run make breaking changes:
- Agent B: Migrates Dashboard + Profile hooks to React Query
- Agent C: Migrates Social + Shop + Leaderboard hooks to React Query
- Agent D: Refactors admin components (splits large files into smaller pieces)

Your job is to fix any tests that break because of these changes.

## What to do

### 1. Fix Dashboard tests (broken by Agent B's React Query migration)
- `cd mini-app && npx vitest --run src/__tests__/pages/Dashboard.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/dashboard/`
- Tests may need QueryClientProvider wrapper
- Mock React Query hooks if asserting on loading/error states

### 2. Fix Profile tests (broken by Agent B's React Query migration)
- `cd mini-app && npx vitest --run src/__tests__/pages/Profile.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/profile/`
- Same pattern: add QueryClientProvider, update mocks

### 3. Fix Social/Shop tests (broken by Agent C's React Query migration)
- `cd mini-app && npx vitest --run src/__tests__/pages/Social.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/social/`
- `cd mini-app && npx vitest --run src/__tests__/pages/Shop.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/hooks/useShop.test.ts`
- `cd mini-app && npx vitest --run src/__tests__/hooks/useSocial.test.ts`
- `cd mini-app && npx vitest --run src/__tests__/pages/Leaderboard.test.tsx`

### 4. Fix admin tests if Agent D's refactoring breaks them
- Admin component tests may need updated imports if components moved to sub-directories
- Check: `cd mini-app && npx vitest --run src/__tests__/pages/admin/`
- Check: `cd mini-app && npx vitest --run src/__tests__/components/admin/`

### 5. Verify full test:mvp passes
- `cd bot && npm run test:mvp` — ALL must pass
- `cd mini-app && npm run test:mvp` — ALL must pass

OWNED: mini-app/src/__tests__/pages/Dashboard.test.tsx, mini-app/src/__tests__/components/dashboard/*, mini-app/src/__tests__/pages/Profile.test.tsx, mini-app/src/__tests__/components/profile/*, mini-app/src/__tests__/pages/Social.test.tsx, mini-app/src/__tests__/components/social/*, mini-app/src/__tests__/pages/Shop.test.tsx, mini-app/src/__tests__/hooks/useShop.test.ts, mini-app/src/__tests__/hooks/useSocial.test.ts, mini-app/src/__tests__/pages/Leaderboard.test.tsx, mini-app/src/__tests__/pages/admin/*.test.tsx, mini-app/src/__tests__/components/admin/**/*.test.tsx
FORBIDDEN: Source code files (only test files), App.tsx, server.ts, i18n files, tools/, bot/src/ (test files only)
Write retrospective when done.
```

### Run 84 File Ownership Matrix

| File/Dir | A | B | C | D | E | F | G |
|----------|---|---|---|---|---|---|---|
| bot admin test files (10) | OWN | - | - | - | - | - | - |
| mini-app admin test files (22+) | OWN | - | - | - | - | - | - |
| bot/package.json (test:mvp) | OWN | - | - | - | - | - | - |
| mini-app/package.json (test:mvp) | OWN | - | - | - | - | - | - |
| hooks/useDashboardData.ts | - | OWN | - | - | - | - | - |
| hooks/useDashboardQuery.ts (new) | - | OWN | - | - | - | - | - |
| hooks/useProfileData.ts | - | OWN | - | - | - | - | - |
| hooks/useProfileQuery.ts (new) | - | OWN | - | - | - | - | - |
| hooks/useSocial.ts | - | - | OWN | - | - | - | - |
| hooks/useSocialQuery.ts (new) | - | - | OWN | - | - | - | - |
| hooks/useShop.ts | - | - | OWN | - | - | - | - |
| hooks/useShopQuery.ts (new) | - | - | OWN | - | - | - | - |
| hooks/useLeaderboardQuery.ts (new) | - | - | OWN | - | - | - | - |
| pages/Leaderboard.tsx | - | - | OWN | - | - | - | - |
| pages/admin/AdminPlayerDetail.tsx | - | - | - | OWN | - | - | - |
| pages/admin/AdminPlayerList.tsx | - | - | - | OWN | - | - | - |
| components/admin/player-detail/ (new) | - | - | - | OWN | - | - | - |
| components/admin/player-list/ (new) | - | - | - | OWN | - | - | - |
| tools/notification_bot_handler.py | - | - | - | - | OWN | - | - |
| mini-app/vite.config.ts | - | - | - | - | - | OWN | - |
| components (React.memo only) | - | - | - | - | - | OWN | - |
| Dashboard/Profile/Social/Shop test files | - | - | - | - | - | - | OWN |
| Leaderboard test files | - | - | - | - | - | - | OWN |
| Admin test files (post-refactor fixes) | - | - | - | - | - | - | OWN |

### Run 84 Merge Order
1. Agent A (admin tests — independent, no source code changes)
2. Agent D (admin refactoring — affects admin component structure)
3. Agent B (Dashboard + Profile React Query migration)
4. Agent C (Social + Shop + Leaderboard React Query migration)
5. Agent F (bundle optimization, React.memo — independent)
6. Agent E (notification bot — fully independent Python)
7. Agent G (test fixes — depends on B, C, D all being done)

### Run 84 Retrospectives

#### Agent A Retrospective
**SKIPPED** — Agent A was assigned admin test fixing but got stuck both attempts. User decided to delete all 27 admin test files in Run 85 instead.

#### Agent B Retrospective
**Task**: Migrate Dashboard and Profile data hooks to React Query

**What was done:**
1. **Created `useDashboardQuery.ts`** — React Query hooks for dashboard data. All three hooks (`useDashboardStats`, `useDashboardQuests`, `useDashboardAchievements`) share the same query key and `queryFn` (since `getUserStats` returns all data in one API call), using `select` to extract subsets. Exported `dashboardKeys` for cache management.
2. **Refactored `useDashboardData.ts`** — Replaced `useState` + `useEffect` + `AbortController` pattern with `useDashboardStats` from React Query. Removed manual loading/error state management. Preserved: pull-to-refresh (uses `invalidateQueries`), achievement check on refresh, `onDashboardData` callback (via `useEffect` on stats), navigation handler. Public API unchanged — Dashboard.tsx needs zero changes.
3. **Created `useProfileQuery.ts`** — Three separate React Query hooks mapping to distinct API endpoints: `useProfileStats(userId)` (staleTime 2min, getUserStats), `useProfileAchievements(userId)` (staleTime 5min, getUserAchievements + getAchievements bundled), `useProfilePunishments(userId)` (staleTime 5min, getPunishmentSettings + getPunishmentHistory with silent error handling matching original behavior). Exported `profileKeys`.
4. **Refactored `useProfileData.ts`** — Replaced all `useState` + `useEffect` + `AbortController` with the three React Query hooks. Removed manual loading/error/abort logic. `loadProfileData` now invalidates all three query keys. Public API unchanged — Profile.tsx needs zero changes.
5. **Build verified** — `tsc --noEmit` clean, `npm run build` successful.

**Files created:**
- `mini-app/src/hooks/useDashboardQuery.ts` (44 lines) — 3 queries (shared cache key)
- `mini-app/src/hooks/useProfileQuery.ts` (67 lines) — 3 queries

**Files modified:**
- `mini-app/src/hooks/useDashboardData.ts` — full rewrite to React Query (103→82 lines, -20%)
- `mini-app/src/hooks/useProfileData.ts` — full rewrite to React Query (82→36 lines, -56%)

**Key design decisions:**
- Dashboard uses a single shared query key for all 3 hooks because the API returns everything in one `getUserStats` call. No wasted network requests.
- Profile uses separate query keys per endpoint, enabling independent cache lifetimes and parallel fetching.
- Punishment queries silently return defaults on failure (matching original try-catch behavior) — they never put React Query into error state.
- `errorMessage` kept in return type (empty string) for API compat, though no consumer uses it.

#### Agent C Retrospective
**Task**: Migrate Social, Shop, and Leaderboard hooks to React Query

**What was done:**
1. **Created `useSocialQuery.ts`** — React Query hooks for friends, friend requests, challenges, and discover challenges. Query keys exported as `socialKeys`. Mutations for send/accept/reject friend requests, remove friend, join/leave/update challenge progress — all with optimistic updates and rollback.
2. **Refactored `useSocial.ts`** — Replaced all `useState` + `useEffect` + `apiClient` patterns with React Query hooks from `useSocialQuery.ts`. Kept the same public API (friends, pendingRequests, challenges, availableChallenges, all action callbacks). Discover challenges uses state-driven `useDiscoverChallenges(mode, enabled)` internally to support the imperative `discoverChallenges(mode)` callback that Social.tsx depends on.
3. **Created `useShopQuery.ts`** — `useShopItems()` (staleTime 5min), `useInventory(userId)` (staleTime 2min), `usePurchaseMutation()` with optimistic inventory update. Query keys exported as `shopKeys`.
4. **Refactored `useShop.ts`** — Replaced manual data fetching with React Query hooks. Preserved all filtering/sorting logic (`filteredItems`, `featuredItems`, `ownedItemIds`, category/search state). Same public API.
5. **Created `useLeaderboardQuery.ts`** — `useLeaderboard(period, limit)` with staleTime 3min. Handles all three endpoints (all_time, weekly, monthly) based on period param. Exports `TimePeriod` type and `leaderboardKeys`.
6. **Refactored `Leaderboard.tsx`** — Replaced inline `useState` + `apiClient` with `useLeaderboard` hook. Removed all manual loading/error state. Preserved pull-to-refresh, share, and user rank detection.
7. **Build verified** — `tsc --noEmit` clean, `npm run build` successful.

**Files created:**
- `mini-app/src/hooks/useSocialQuery.ts` (250 lines) — 4 queries, 7 mutations
- `mini-app/src/hooks/useShopQuery.ts` (85 lines) — 2 queries, 1 mutation
- `mini-app/src/hooks/useLeaderboardQuery.ts` (28 lines) — 1 query

**Files modified:**
- `mini-app/src/hooks/useSocial.ts` — full rewrite to React Query
- `mini-app/src/hooks/useShop.ts` — full rewrite to React Query
- `mini-app/src/pages/Leaderboard.tsx` — refactored to use useLeaderboard

**Stale times:**
- Friends list: 2min | Friend requests: 1min | Challenges: 2min | Discover: 2min
- Shop items: 5min | Inventory: 2min
- Leaderboard: 3min

**Notes:**
- Social.tsx (not owned) imports `availableChallenges` and `discoverChallenges` from useSocial — kept working via state-driven React Query internally
- No changes to Social.tsx or Shop.tsx pages — the public API of useSocial and useShop is fully preserved

#### Agent D Retrospective
**Task**: Refactor large admin components into smaller pieces

**What was done:**
1. **Split AdminPlayerDetail.tsx (716→155 lines)** — Extracted into 5 sub-modules in `components/admin/player-detail/`:
   - `types.ts` (82 lines) — all interfaces (PlayerUser, PlayerMode, QuestInstance, etc.) + TabId type
   - `helpers.ts` (27 lines) — tierColor, xpForLevel, relativeTime utilities
   - `AdminPlayerHeader.tsx` (91 lines) — breadcrumb + player card (avatar, name, tier badge, level/XP bar), wrapped in `React.memo`
   - `AdminPlayerStats.tsx` (43 lines) — overview stat grid (6 cards), wrapped in `React.memo`
   - `PlayerTabContent.tsx` (280 lines) — Timeline, Modes, Quests, Achievements, Finance, Social tabs + TabSkeleton, all wrapped in `React.memo`
   - Orchestrator now uses the existing `AdminPlayerActions` component instead of the placeholder

2. **Split AdminPlayerList.tsx (642→170 lines)** — Extracted into 4 sub-modules in `components/admin/player-list/`:
   - `helpers.ts` (34 lines) — formatRelativeDate, TIER_BADGE_STYLES, generatePageNumbers
   - `AdminPlayerSearch.tsx` (168 lines) — search bar + FilterPanel with all filter controls
   - `AdminPlayerTable.tsx` (218 lines) — table header + rows + SortHeader, KebabMenu, TierBadge
   - `AdminBulkActions.tsx` (33 lines) — selected count indicator with clear button

3. **React.memo applied to all frequently-rendered components:**
   - `AdminPlayerHeader`, `AdminPlayerStats` — detail page header/stats
   - `TimelineTab`, `ModesTab`, `QuestsTab`, `AchievementsTab`, `FinanceTab`, `SocialTab` — all tab content
   - `PlayerTableRow` — individual table rows in player list (most impactful)
   - `AdminPlayerSearch`, `AdminPlayerTable`, `AdminBulkActions` — list page sections

4. **Build verified** — `tsc --noEmit` clean, `npm run build` successful.

**Files created (9):**
- `mini-app/src/components/admin/player-detail/types.ts`
- `mini-app/src/components/admin/player-detail/helpers.ts`
- `mini-app/src/components/admin/player-detail/AdminPlayerHeader.tsx`
- `mini-app/src/components/admin/player-detail/AdminPlayerStats.tsx`
- `mini-app/src/components/admin/player-detail/PlayerTabContent.tsx`
- `mini-app/src/components/admin/player-list/helpers.ts`
- `mini-app/src/components/admin/player-list/AdminPlayerSearch.tsx`
- `mini-app/src/components/admin/player-list/AdminPlayerTable.tsx`
- `mini-app/src/components/admin/player-list/AdminBulkActions.tsx`

**Files modified (2):**
- `mini-app/src/pages/admin/AdminPlayerDetail.tsx` — rewritten as 155-line orchestrator
- `mini-app/src/pages/admin/AdminPlayerList.tsx` — rewritten as 170-line orchestrator

**Line count reduction:**
- AdminPlayerDetail: 716 → 155 lines (−78%)
- AdminPlayerList: 642 → 170 lines (−74%)

**Notes:**
- Wired the existing `AdminPlayerActions` component into the detail page's "Admin" tab, replacing the placeholder
- All extracted types in shared `types.ts` — other agents can import from there if needed

#### Agent E Retrospective
**Task**: Enhance notification bot with health monitoring features

**What was done:**
1. **PM2 crash detection in /ping** — Added `_check_pm2_restarts()` that runs `pm2 jlist` via SSH, parses JSON, and warns if the bot restarted within the last 60 minutes. Shows lifetime restart count when stable.
2. **SSL certificate expiry in /ping** — Added `_check_ssl_expiry()` using Python's `ssl` + `socket` modules to check yakutsa.ru cert directly (no SSH needed). Shows days remaining with color-coded warnings (<7d = red, <30d = yellow, else green).
3. **Disk usage trend in /metrics** — Added `_get_disk_trend()` that stores last 5 disk usage readings in `/tmp/wibecode_disk_history.json` on the server. Shows trend arrows (up/down/stable) compared to oldest reading.
4. **New /deploy command** — Shows last git commit (hash, message, time) from `/opt/wibecode-bot` plus PM2 process info (status, uptime, memory, restart count) in a single SSH call.
5. **Updated /help and /start** — Reorganized help into categories (Health & Monitoring, Project, Reference). Added /deploy to all command lists and Telegram menu registration.

**Files changed:**
- `tools/notification_bot_handler.py` — added imports (`ssl`, `socket`, `datetime`), 3 new helper functions, 1 new command handler, updated help/start text, updated BotCommand registration

#### Agent F Retrospective
**Task**: Optimize bundle size and add performance improvements

**What was done:**
1. **Verified admin lazy-loading** — All 3 admin pages (AdminDashboard, AdminPlayerList, AdminPlayerDetail) already use `React.lazy()` in App.tsx lines 38-40. No changes needed.
2. **Added recharts to manual chunks** — `recharts` (380KB, the single biggest dependency) was NOT in a separate chunk. Added `'vendor-charts': ['recharts']` to `vite.config.ts` manualChunks. Now only loads on Analytics/Finance pages.
3. **Wrapped QuestCard with React.memo** — `LeaderboardRow` and `AchievementCard` already had `memo`. Only `QuestCard` was missing it. Added `memo` wrapper.
4. **Build passed** — `tsc --noEmit` clean, `npm run build` successful with proper chunk splitting.

**Files changed:**
- `mini-app/vite.config.ts` — added `'vendor-charts': ['recharts']` to manualChunks
- `mini-app/src/components/quests/QuestCard.tsx` — wrapped with `React.memo`

**Bundle impact:**
- `vendor-charts` chunk: 380KB (111KB gzip) — now isolated, not loaded on initial page
- No new chunk size warnings
- lucide-react was already split as `vendor-icons` (37KB)

**Notes for future:**
- QuestCard's `onClick` prop is an inline closure per-item `() => handleQuestSelect(quest)`, which creates new refs each render. For full memo benefit, parent could use `useCallback` + quest ID. Low priority — current memo still prevents re-renders when unrelated state changes.
- Consider dynamic import for recharts inside the chart components themselves (currently lazy-loaded at page level which is sufficient).

#### Agent G Retrospective
**SKIPPED** — Agent G was assigned test fixing but didn't complete. Agent 0 fixed the 3 test files that needed QueryClientProvider wrappers after React Query migration.

#### Agent 0 Retrospective
- **Merge**: 5 agent commits on main (B, F already committed by agents; C, D, E committed by Agent 0). Agent A and G skipped.
- **Build**: Both projects pass `tsc --noEmit`. Mini-app vite build clean.
- **Tests**: Bot 76 files / 972 tests PASS. Mini-app 121 files / 831 tests PASS. Total: 1,803.
- **Test fixes (Agent G's work)**: 3 test files needed QueryClientProvider wrappers after React Query migration:
  - `useShop.test.ts` — added createWrapper with QueryClientProvider
  - `useSocial.test.ts` — same wrapper + fixed error test (must reject all 3 queries, not just friends) + fixed discoverChallenges tests (need waitFor for async React Query state)
  - `Leaderboard.test.tsx` — added renderWithQuery helper
- **Deploy**: e7bf1bd deployed, health OK.
- **Key stats**: React Query migration now covers Dashboard, Profile, Social, Shop, Leaderboard, and Quests hooks. Admin pages split from 700+ lines to ~150-line orchestrators with extracted sub-components.

**Next**: Run 85 — Big Feature Removal (Finance, Learning, Content, Referral onboarding, AvatarCustomizer, all admin tests)

---

## RUN 85: Big Feature Removal (7 Agents + Agent 0)

### Focus: Remove Finance mode, Learning/Content mode, Referral onboarding step, AvatarCustomizer page, and ALL broken admin test files. Keep money/book punishments, keep avatar display in profile/leaderboard.

### Copy-Paste Prompts

#### Agent A — Bot Backend Cleanup
```
Read PARALLEL_AGENTS.md — you are Agent A of Run 85. Your task: Clean up bot backend by removing Finance, Content, and Recommendations routes.

## Context
The user decided to remove Finance mode, Learning/Content mode from the app entirely. The bot backend has routes and utilities that serve these features.

## What to do

### DELETE these files:
- `bot/src/api/routes/finance.ts`
- `bot/src/api/routes/content.ts`
- `bot/src/api/routes/recommendations.ts`
- `bot/src/utils/contentRecommender.ts`

### DELETE these test files:
- `bot/src/__tests__/routes/http/finance.http.test.ts`
- `bot/src/__tests__/routes/admin.test.ts`
- `bot/src/__tests__/middleware/adminAuth.test.ts`
- `bot/src/__tests__/routes/http/admin.http.test.ts`
- `bot/src/__tests__/routes/http/admin-jobs.http.test.ts`
- `bot/src/__tests__/routes/http/admin-stats.http.test.ts`
- `bot/src/__tests__/routes/http/admin-users.http.test.ts`
- `bot/src/__tests__/routes/http/admin-quests.http.test.ts`
- `bot/src/__tests__/routes/admin-notifications.test.ts`
- `bot/src/__tests__/routes/admin-players.test.ts`
- `bot/src/__tests__/routes/admin-bulk.test.ts`

### MODIFY `bot/src/api/server.ts`:
- Remove the import for `financeRouter` (and its `app.use()` line)
- Remove the import for `contentRouter` (and its `app.use()` line)
- Remove the import for `recommendationsRouter` (and its `app.use()` line)
- Keep ALL other routes (admin, users, quests, modes, leaderboard, onboarding, etc.)

### Verify:
- `cd bot && npx tsc --noEmit` — zero errors

### IMPORTANT:
- Do NOT delete admin ROUTES or admin middleware — only admin TEST files
- Do NOT touch any punishment-related code (money punishment, book punishment)
- Write your retrospective in PARALLEL_AGENTS.md under Run 85 Retrospectives
```

#### Agent B — Mini-App Page Deletions + App.tsx
```
Read PARALLEL_AGENTS.md — you are Agent B of Run 85. Your task: Delete removed feature pages and clean up App.tsx routes.

## Context
The user decided to remove: Finance page, AvatarCustomizer page, ContentFeed page, ArticleReader page, ReadingHistory page. Also remove the content API client.

## What to do

### DELETE these page files:
- `mini-app/src/pages/Finance.tsx`
- `mini-app/src/pages/AvatarCustomizer.tsx`
- `mini-app/src/pages/ContentFeed.tsx`
- `mini-app/src/pages/ArticleReader.tsx`
- `mini-app/src/pages/ReadingHistory.tsx`

### DELETE this API file:
- `mini-app/src/api/content.ts`

### MODIFY `mini-app/src/App.tsx`:
- Remove the lazy() imports for all 5 deleted pages
- Remove the <Route> entries for all 5 deleted pages (and any /article/:id route for ArticleReader)
- Keep ALL other routes (Dashboard, Quests, Profile, Leaderboard, Settings, Onboarding, Social, Shop, Admin pages, etc.)

### Verify:
- `cd mini-app && npx tsc --noEmit` — zero errors

### IMPORTANT:
- Do NOT delete Social.tsx, Shop.tsx, or any admin pages
- Do NOT modify Navigation.tsx unless it references deleted pages
- Write your retrospective in PARALLEL_AGENTS.md under Run 85 Retrospectives
```

#### Agent C — Component Deletions + ProfileEditModal
```
Read PARALLEL_AGENTS.md — you are Agent C of Run 85. Your task: Delete removed feature components and clean up ProfileEditModal.

## Context
The user decided to remove Finance components, Content components, and the ReferralSource onboarding component. Also remove the "Avatar Studio" button from ProfileEditModal (keep avatar DISPLAY, just remove the customizer link).

## What to do

### DELETE these directories (all files inside):
- `mini-app/src/components/finance/` — entire directory (11 files: BudgetTracker.tsx, BudgetForm.tsx, BudgetSummary.tsx, SpendingChart.tsx, CategoryBreakdown.tsx, SavingsGoal.tsx, GoalForm.tsx, GoalCard.tsx, GoalContribution.tsx, useBudget.ts, useSavingsGoals.ts)
- `mini-app/src/components/content/` — entire directory (3 files: ContentCard.tsx, TodaysReadWidget.tsx, ContentQuiz.tsx)

### DELETE this component:
- `mini-app/src/components/onboarding/ReferralSource.tsx`

### MODIFY `mini-app/src/components/ProfileEditModal.tsx`:
- Find and remove the "Avatar Studio" or "Customize Avatar" button/link that navigates to AvatarCustomizer
- Keep all other profile editing functionality
- If there's an import for AvatarCustomizer or a navigate('/avatar-customizer') call, remove it

### Verify:
- `cd mini-app && npx tsc --noEmit` — zero errors

### IMPORTANT:
- Do NOT delete avatar DISPLAY components (UserAvatar, etc.) — only the customizer link in ProfileEditModal
- Do NOT delete onboarding components other than ReferralSource
- Write your retrospective in PARALLEL_AGENTS.md under Run 85 Retrospectives
```

#### Agent D — Hook Deletions + Onboarding Flow
```
Read PARALLEL_AGENTS.md — you are Agent D of Run 85. Your task: Delete removed hooks and simplify onboarding flow.

## Context
The user decided to remove Finance mode and Learning/Content mode entirely. The onboarding flow currently has steps for choosing finance mode, learning mode, and a "referral source" page. These must be removed. Keep: fitness, hydration, medication, habits modes. Also keep "discipline" and "social" modes if they exist.

## What to do

### DELETE these hook files:
- `mini-app/src/hooks/useFinanceAnalytics.ts`
- `mini-app/src/hooks/useContentFeed.ts`
- `mini-app/src/hooks/useReadingHistory.ts`

### MODIFY `mini-app/src/hooks/useOnboarding.ts`:
- Remove any step types related to finance, learning, referral (e.g., 'finance_setup', 'learning_setup', 'referral_source')
- Remove any data fields that store finance/learning preferences
- Keep all other onboarding steps intact

### MODIFY `mini-app/src/hooks/useOnboardingNavigation.ts`:
- Remove finance, learning, and referral steps from the step sequence
- The flow should go from path selection (where only fitness/hydration/medication/habits are shown) straight to the next step, skipping finance/learning/referral setup

### MODIFY `mini-app/src/pages/Onboarding.tsx`:
- Remove the referral source case from the step renderer
- Remove any finance/learning setup step rendering
- Remove imports for ReferralSource component
- Rewire navigation so skipping removed steps goes to the next valid step

### MODIFY `mini-app/src/hooks/useOnboardingFlow.ts`:
- Remove finance and learning badge/mode mappings if they exist
- Keep fitness, hydration, medication, habits mappings

### Verify:
- `cd mini-app && npx tsc --noEmit` — zero errors

### IMPORTANT:
- Do NOT remove fitness, hydration, medication, habits, discipline, or social modes
- Do NOT remove the punishment system (money punishment / book punishment)
- The onboarding should still work: welcome → name → path select (4 modes) → quiz → complete
- Write your retrospective in PARALLEL_AGENTS.md under Run 85 Retrospectives
```

#### Agent E — Data + i18n + Seed Cleanup
```
Read PARALLEL_AGENTS.md — you are Agent E of Run 85. Your task: Clean up data files, i18n translations, mode badges, and seed data.

## Context
Finance mode and Learning/Content mode are being removed. All references in data files, i18n, path selection, and seed data must be cleaned up.

## What to do

### MODIFY `mini-app/src/data/onboardingQuestions.ts`:
- DELETE the FINANCE_QUESTIONS array/section entirely
- DELETE the LEARNING_QUESTIONS array/section entirely
- DELETE REFERRAL_OPTIONS if it exists
- Keep questions for fitness, hydration, medication, habits

### MODIFY `mini-app/src/components/onboarding/PathSelect.tsx`:
- Remove 'finance' and 'learning' from the MODES array (or whatever array lists available paths)
- Keep fitness, hydration, medication, habits (and discipline/social if present)

### MODIFY `mini-app/src/data/modeBadges.ts`:
- Remove finance and learning entries
- Keep all other mode badge definitions

### MODIFY i18n files — remove ALL finance/learning/referral/content translation keys:
- `mini-app/src/i18n/en.ts` — remove finance, learning, content, referral sections
- `mini-app/src/i18n/ru.ts` — remove finance, learning, content, referral sections
- `mini-app/src/i18n/zh.ts` — remove finance, learning, content, referral sections
- Be careful: search for keys containing 'finance', 'learning', 'content', 'referral', 'article', 'reading', 'budget', 'savings', 'goal' (in context of finance goals)
- Do NOT remove 'content' if it's used in a general UI sense (like "content area") — only remove content-as-learning-feature keys

### MODIFY `database/seed_data.sql`:
- Remove finance-related quest templates (mode = 'finance')
- Remove learning-related quest templates (mode = 'learning')
- Remove finance/learning achievement seed data
- Keep the mode rows themselves in the modes table for FK safety (just remove quests/achievements that reference them)
- Do NOT remove punishment-related seed data

### Verify:
- `cd mini-app && npx tsc --noEmit` — zero errors

### IMPORTANT:
- Do NOT remove i18n keys for punishment (money, book)
- Do NOT remove i18n keys for modes that are kept (fitness, hydration, medication, habits, discipline, social)
- Write your retrospective in PARALLEL_AGENTS.md under Run 85 Retrospectives
```

#### Agent F — Test File Deletions
```
Read PARALLEL_AGENTS.md — you are Agent F of Run 85. Your task: Delete all test files for removed features and fix remaining test files that reference them.

## Context
Finance, Learning/Content, AvatarCustomizer, and ReferralSource are being removed. All their test files must be deleted. Some surviving test files (Onboarding, App) may reference removed features and need updating.

## What to do

### DELETE all mini-app admin test files (27 files):
- `mini-app/src/__tests__/pages/admin/AdminPlayerDetail.test.tsx`
- `mini-app/src/__tests__/pages/admin/AdminPlayerList.test.tsx`
- `mini-app/src/__tests__/components/admin/AdminUserDetail.test.tsx`
- `mini-app/src/__tests__/components/admin/AdminLoginForm.test.tsx`
- `mini-app/src/__tests__/components/admin/AdminOverview.test.tsx`
- `mini-app/src/__tests__/components/admin/AdminQuestEditor.test.tsx`
- `mini-app/src/__tests__/components/admin/AnswerAnalytics.test.tsx`
- `mini-app/src/__tests__/components/admin/AdminPlayerActions.test.tsx`
- `mini-app/src/__tests__/components/admin/answer-analytics/AnswerChart.test.tsx`
- `mini-app/src/__tests__/components/admin/answer-analytics/AnswerTable.test.tsx`
- `mini-app/src/__tests__/components/admin/answer-analytics/useAnswerAnalytics.test.ts`
- `mini-app/src/__tests__/components/admin/quest-editor/QuestForm.test.tsx`
- `mini-app/src/__tests__/components/admin/quest-editor/QuestList.test.tsx`
- `mini-app/src/__tests__/components/admin/quest-editor/QuestPreview.test.tsx`
- `mini-app/src/__tests__/components/admin/quest-editor/useQuestEditor.test.ts`

### DELETE all finance test files:
- `mini-app/src/__tests__/pages/Finance.test.tsx`
- `mini-app/src/__tests__/components/finance/BudgetTracker.test.tsx`
- `mini-app/src/__tests__/components/finance/BudgetForm.test.tsx`
- `mini-app/src/__tests__/components/finance/BudgetSummary.test.tsx`
- `mini-app/src/__tests__/components/finance/SavingsGoal.test.tsx`
- `mini-app/src/__tests__/components/finance/GoalForm.test.tsx`
- `mini-app/src/__tests__/components/finance/GoalCard.test.tsx`
- `mini-app/src/__tests__/components/finance/GoalContribution.test.tsx`
- `mini-app/src/__tests__/components/finance/useBudget.test.ts`
- `mini-app/src/__tests__/components/finance/useSavingsGoals.test.ts`

### DELETE all content/learning test files:
- `mini-app/src/__tests__/pages/ContentFeed.test.tsx`
- `mini-app/src/__tests__/pages/ArticleReader.test.tsx`
- `mini-app/src/__tests__/pages/ReadingHistory.test.tsx`
- `mini-app/src/__tests__/hooks/useContentFeed.test.ts`
- `mini-app/src/__tests__/hooks/useReadingHistory.test.ts`
- `mini-app/src/__tests__/api/content.test.ts`
- `mini-app/src/__tests__/components/content/ContentQuiz.test.tsx`

### DELETE avatar/referral test files:
- `mini-app/src/__tests__/pages/AvatarCustomizer.test.tsx`
- `mini-app/src/__tests__/components/onboarding/ReferralSource.test.tsx`

### MODIFY surviving test files (remove finance/learning/referral assertions):
- `mini-app/src/__tests__/pages/Onboarding.test.tsx` — remove any test cases that test finance/learning/referral steps
- `mini-app/src/__tests__/hooks/useOnboardingFlow.test.ts` — remove finance/learning badge mapping tests
- `mini-app/src/__tests__/App.test.tsx` — remove route assertions for deleted pages (Finance, ContentFeed, ArticleReader, ReadingHistory, AvatarCustomizer)
- `mini-app/src/__tests__/components/onboarding/PathSelect.test.tsx` — remove finance/learning mode assertions if present

### Verify:
- `cd mini-app && npx vitest run src/__tests__/pages/Onboarding.test.tsx src/__tests__/hooks/useOnboardingFlow.test.ts src/__tests__/App.test.tsx` — all pass

### IMPORTANT:
- Do NOT delete test files for kept features (Social, Shop, Leaderboard, Dashboard, Profile, etc.)
- Do NOT delete analytics test files unless they specifically test finance analytics
- Write your retrospective in PARALLEL_AGENTS.md under Run 85 Retrospectives
```

#### Agent G — Test-Fixer + Package.json + Final Verification (MERGE LAST)
```
Read PARALLEL_AGENTS.md — you are Agent G of Run 85. Your task: Update test:mvp scripts, fix any remaining test failures, and verify everything works. YOU MERGE LAST after all other agents.

## Context
Agents A-F are deleting Finance, Learning/Content, AvatarCustomizer, ReferralSource, and admin test files. You need to update both package.json test:mvp scripts to remove references to deleted files, then verify all remaining tests pass.

## What to do

### STEP 1: MODIFY `bot/package.json`:
- In the `test:mvp` script, remove ALL paths referencing deleted test files:
  - Remove finance test paths
  - Remove admin test paths (admin.test, adminAuth.test, admin-*.test, admin.http.test)
- Keep all other test paths

### STEP 2: MODIFY `mini-app/package.json`:
- In the `test:mvp` script, remove ALL paths referencing deleted test/dirs:
  - Remove: Finance page test, ContentFeed test, ArticleReader test, ReadingHistory test
  - Remove: AvatarCustomizer test
  - Remove: ALL admin test paths (pages/admin, components/admin)
  - Remove: content API test, content component tests
  - Remove: finance component test paths
  - Remove: useContentFeed test, useReadingHistory test
  - Remove: ReferralSource test
- Keep all other test paths

### STEP 3: Run full verification:
- `cd bot && npx tsc --noEmit` — zero errors
- `cd mini-app && npx tsc --noEmit` — zero errors
- `cd mini-app && npm run build` — build succeeds
- `cd bot && npm run test:mvp` — all pass
- `cd mini-app && npm run test:mvp` — all pass
- Report final test counts for both

### STEP 4: Fix any failures:
- If any test imports a deleted file, update the test
- If any source file imports from a deleted module, fix the import
- If tsc reports missing module errors, trace and fix

### IMPORTANT:
- You MERGE LAST — wait for all other agents to finish
- Report final test counts in your retrospective
- Write your retrospective in PARALLEL_AGENTS.md under Run 85 Retrospectives
```

### Run 85 File Ownership Matrix

| File/Dir | A | B | C | D | E | F | G |
|----------|---|---|---|---|---|---|---|
| bot/src/api/server.ts | OWN | - | - | - | - | - | - |
| bot/src/api/routes/finance.ts | DEL | - | - | - | - | - | - |
| bot/src/api/routes/content.ts | DEL | - | - | - | - | - | - |
| bot/src/api/routes/recommendations.ts | DEL | - | - | - | - | - | - |
| bot/src/utils/contentRecommender.ts | DEL | - | - | - | - | - | - |
| bot/__tests__/ (admin+finance tests) | DEL | - | - | - | - | - | - |
| mini-app/src/App.tsx | - | OWN | - | - | - | - | - |
| 5 deleted pages | - | DEL | - | - | - | - | - |
| mini-app/src/api/content.ts | - | DEL | - | - | - | - | - |
| components/finance/ (11 files) | - | - | DEL | - | - | - | - |
| components/content/ (3 files) | - | - | DEL | - | - | - | - |
| components/onboarding/ReferralSource.tsx | - | - | DEL | - | - | - | - |
| ProfileEditModal.tsx | - | - | OWN | - | - | - | - |
| useFinanceAnalytics.ts | - | - | - | DEL | - | - | - |
| useContentFeed.ts | - | - | - | DEL | - | - | - |
| useReadingHistory.ts | - | - | - | DEL | - | - | - |
| useOnboarding.ts | - | - | - | OWN | - | - | - |
| useOnboardingNavigation.ts | - | - | - | OWN | - | - | - |
| Onboarding.tsx | - | - | - | OWN | - | - | - |
| useOnboardingFlow.ts | - | - | - | OWN | - | - | - |
| onboardingQuestions.ts | - | - | - | - | OWN | - | - |
| PathSelect.tsx | - | - | - | - | OWN | - | - |
| modeBadges.ts | - | - | - | - | OWN | - | - |
| i18n/en.ts, ru.ts, zh.ts | - | - | - | - | OWN | - | - |
| seed_data.sql | - | - | - | - | OWN | - | - |
| All deleted test files (~50) | - | - | - | - | - | DEL | - |
| Onboarding.test.tsx | - | - | - | - | - | OWN | - |
| useOnboardingFlow.test.ts | - | - | - | - | - | OWN | - |
| App.test.tsx | - | - | - | - | - | OWN | - |
| PathSelect.test.tsx | - | - | - | - | - | OWN | - |
| bot/package.json (test:mvp) | - | - | - | - | - | - | OWN |
| mini-app/package.json (test:mvp) | - | - | - | - | - | - | OWN |

### Run 85 Merge Order
A → E → B → C → D → F → G (G always last — runs full verification)

### Run 85 Retrospectives

#### Agent A Retrospective
**Task**: Remove Finance, Content, Recommendations routes + admin/finance test files from bot backend

**What was done:**
1. **Deleted 4 source files**: `routes/finance.ts`, `routes/content.ts`, `routes/recommendations.ts`, `utils/contentRecommender.ts`
2. **Deleted 11 test files**: 1 finance HTTP test + 8 admin test files (admin.test, admin-bulk, admin-notifications, admin-players, adminAuth, admin.http, admin-jobs.http, admin-stats.http, admin-users.http, admin-quests.http)
3. **Modified `server.ts`**: Removed 3 imports (financeRouter, contentRouter, recommendationsRouter) and 3 `app.use()` lines. Kept all other routes (admin, users, quests, modes, leaderboard, etc.)
4. **TypeScript verification**: `tsc --noEmit` — zero errors

**Files deleted (15):** 4 source + 11 tests = 4,391 lines removed
**Files modified (1):** `bot/src/api/server.ts` — removed 6 lines (3 imports + 3 routes)

**Notes:**
- Admin ROUTES and middleware are preserved — only admin TEST files were deleted (as instructed)
- Punishment-related code untouched
- No other files reference the deleted routes, so no cascading breakages

#### Agent B Retrospective
**Task**: Delete removed feature pages and clean up App.tsx routes

**What was done:**
1. **Deleted 5 page files**: Finance.tsx, AvatarCustomizer.tsx, ContentFeed.tsx, ArticleReader.tsx, ReadingHistory.tsx
2. **Deleted 1 API file**: mini-app/src/api/content.ts
3. **Cleaned up App.tsx**: Removed 5 lazy() imports (Finance, AvatarCustomizer, ContentFeed, ArticleReader, ReadingHistory) and 6 Route entries (/finance, /avatar, /content, /content/:articleId, /content/bookmarks)
4. **Verified**: No tsc errors from Agent B's files. All other routes preserved (Dashboard, Quests, Profile, Leaderboard, Social, Achievements, Settings, TrophyCase, Inventory, Shop, Analytics, Notifications, Activity, Admin pages).

**Files deleted (6):**
- `mini-app/src/pages/Finance.tsx` (5,250 bytes)
- `mini-app/src/pages/AvatarCustomizer.tsx` (10,365 bytes)
- `mini-app/src/pages/ContentFeed.tsx` (6,340 bytes)
- `mini-app/src/pages/ArticleReader.tsx` (20,034 bytes)
- `mini-app/src/pages/ReadingHistory.tsx` (16,482 bytes)
- `mini-app/src/api/content.ts` (4,615 bytes)

**Files modified (1):**
- `mini-app/src/App.tsx` — removed 5 lazy imports + 6 route entries (210→200 lines)

**Total lines removed**: 1,768

**Notes:**
- Navigation.tsx does NOT reference any deleted pages — no changes needed
- Pre-existing tsc errors in onboarding files are from Agent C/D domains, not Agent B

#### Agent C Retrospective
**Task**: Delete removed feature components and clean up ProfileEditModal

**What was done:**
1. **Deleted `mini-app/src/components/finance/` directory** — 11 files (BudgetTracker, BudgetForm, BudgetSummary, SpendingChart, CategoryBreakdown, SavingsGoal, GoalForm, GoalCard, GoalContribution, useBudget, useSavingsGoals)
2. **Deleted `mini-app/src/components/content/` directory** — 3 files (ContentCard, TodaysReadWidget, ContentQuiz)
3. **Deleted `mini-app/src/components/onboarding/ReferralSource.tsx`**
4. **Modified `ProfileEditModal.tsx`** — removed Avatar Studio button/link:
   - Removed `useNavigate`, `Palette`, `AvatarRenderer` imports
   - Removed `handleOpenAvatarStudio` function and entire Avatar Section JSX
   - Removed unused `currentAvatar` variable
   - Kept `equippedItems` optional prop in interface (avoids breaking callers)
   - Kept `AVATAR_KEYS` + `AVATAR_OPTIONS` export (used by `ProfileHeader.tsx`)

**Files deleted (15):** 11 finance + 3 content + 1 referral = 2,076 lines removed
**Files modified (1):** `ProfileEditModal.tsx` — 197 to 162 lines (-35 lines)

**Build verification:** `tsc --noEmit` — zero new errors from my changes. Pre-existing errors from Agent D's onboarding type changes only.

**Notes:**
- `ProfileEditModal.test.tsx` references `profile.customizeAvatar` — may need Agent G update
- i18n keys `openAvatarStudio`/`customizeAvatarDesc` still in en/ru/zh — Agent E's domain

#### Agent D Retrospective
**Task**: Delete removed hooks and simplify onboarding flow

**What was done:**
1. **Deleted 3 hook files**: `useFinanceAnalytics.ts` (135 lines), `useContentFeed.ts` (111 lines), `useReadingHistory.ts` (201 lines) — 447 lines removed
2. **Modified `useOnboarding.ts`**: Removed 11 finance/learning step types from `OnboardingStep` union, removed `'referral'` step, removed `referral_source`, `referral_source_other`, `finance`, and `learning` fields from `OnboardingData` interface (−35 lines)
3. **Modified `useOnboardingNavigation.ts`**: Removed `'referral'` from initial step sequence, removed finance (5 steps) and learning (6 steps) conditional blocks from `buildStepSequence()` (−22 lines)
4. **Modified `Onboarding.tsx`**: Removed `ReferralSource` import, removed entire `case 'referral':` block, changed PathSelect's `onNext` from `goToStep('referral')` to `advanceFrom('paths')` so it skips directly to the first quiz step for the selected mode (−15 lines)
5. **Modified `useOnboardingFlow.ts`**: Removed finance/learning badge mappings from `getModeBadge()`, kept only fitness/hydration (the only modes with entries in `MODE_BADGES`) (−2 lines)
6. **TypeScript verification**: `tsc --noEmit` — zero errors

**Files deleted (3):** 447 lines removed
**Files modified (4):** `useOnboarding.ts`, `useOnboardingNavigation.ts`, `Onboarding.tsx`, `useOnboardingFlow.ts` — 74 lines removed total

**Onboarding flow after changes:** splash → hero_intro → avatar → paths → [fitness/hydration/medication/habits quiz steps based on selected modes] → punishments → notifications → summary → launch

#### Agent E Retrospective
**Task**: Clean up data files, i18n translations, mode badges, and seed data

**What was done:**
1. **onboardingQuestions.ts** — Removed FINANCE_QUESTIONS (5 questions), LEARNING_QUESTIONS (6 questions), REFERRAL_OPTIONS array. Updated header comment and getQuestionForStep() spread.
2. **PathSelect.tsx** — Removed finance and learning entries from MODES array (only fitness + hydration remain).
3. **modeBadges.ts** — Removed finance and learning from MODE_BADGES record (only fitness + hydration remain).
4. **i18n en.ts** — Removed nav.finance, nav.knowledge, onboarding mode entries, referral keys, settings.notifModes, achievements categories, entire finance section (~60 keys), content/article/quiz/reading/recommendation sections, onboardingQuiz finance (5 groups) + learning (6 groups) + referral sections, flavor.dailyLearner.
5. **i18n ru.ts** — Same removals as en.ts (Russian translations).
6. **i18n zh.ts** — Same removals as en.ts (Chinese translations).
7. **seed_data.sql** — Removed finance achievements (5 rows), learning achievements (5 rows), finance quest templates (7 rows), learning quest templates (9 rows). Kept mode rows and variable declarations for FK safety.

**Preserved (not removed):**
- social.mode_finance / social.mode_learning (Social challenge mode filters, owned by Agent C)
- admin.sidebar.content (general admin UI term)
- admin.playerDetail.financial (admin panel functionality)
- Punishment-related keys (money, book) kept
- All fitness/hydration/medication/habits/discipline/social keys kept

**Verification**: `npx tsc --noEmit` passes cleanly.

#### Agent F Retrospective
**Task**: Delete all test files for removed features and fix remaining test files that reference them

**What was done:**
1. **Deleted 15 mini-app admin test files** — all files in `__tests__/pages/admin/` (2) and `__tests__/components/admin/` (13 including subdirectories answer-analytics/ and quest-editor/)
2. **Deleted 10 finance test files** — `Finance.test.tsx` page test + 9 component tests in `__tests__/components/finance/`
3. **Deleted 7 content/learning test files** — `ContentFeed.test.tsx`, `ArticleReader.test.tsx`, `ReadingHistory.test.tsx` page tests + `useContentFeed.test.ts`, `useReadingHistory.test.ts` hook tests + `content.test.ts` API test + `ContentQuiz.test.tsx`
4. **Deleted 2 avatar/referral test files** — `AvatarCustomizer.test.tsx` + `ReferralSource.test.tsx`
5. **Fixed `Onboarding.test.tsx`** — removed `ReferralSource` component mock, removed 'referral' from `getAllSteps` mock, updated `getTotalSteps` from 7 to 6
6. **Fixed `useOnboardingFlow.test.ts`** — removed `finance` and `learning` from `MODE_BADGES` mock
7. **Fixed `PathSelect.test.tsx`** — changed "renders all 4 mode cards" to assert Finance/Learning are NOT present (using `queryByText().not.toBeInTheDocument()`)
8. **App.test.tsx** — no changes needed (already had no route assertions for deleted pages)
9. **Cleaned up empty directories** — removed `__tests__/components/admin/`, `__tests__/components/finance/`, `__tests__/components/content/`, `__tests__/pages/admin/`

**Files deleted (34 total):**
- 15 admin test files (pages + components + subdirectories)
- 10 finance test files (page + 9 component tests)
- 7 content/learning test files (3 pages + 2 hooks + 1 API + 1 component)
- 2 avatar/referral test files

**Files modified (3):**
- `mini-app/src/__tests__/pages/Onboarding.test.tsx` — removed ReferralSource mock, updated step list
- `mini-app/src/__tests__/hooks/useOnboardingFlow.test.ts` — removed finance/learning from MODE_BADGES
- `mini-app/src/__tests__/components/onboarding/PathSelect.test.tsx` — updated mode assertions

**Verification:** All 4 modified test files pass (20 tests, 2.1s)

#### Agent G Retrospective
**Task**: Update test:mvp scripts, fix tsc errors and broken tests from feature removal

**What was done:**
1. **Updated bot/package.json test:mvp** — removed `finance.http.test.ts` path (deleted by Agent A)
2. **Updated mini-app/package.json test:mvp** — removed 10 test paths: AvatarCustomizer, Finance, ContentFeed, ArticleReader, ReadingHistory page tests; content API test; finance + content component directories; useContentFeed + useReadingHistory hook tests
3. **Fixed tsc errors in 2 source files** — `useQuizState.ts` (removed `learning` case from `getRequiredDayCount`) and `SummaryModeCard.tsx` (removed finance/learning MODE_INFO entries, summary functions, and render blocks). These files fell between agent ownership boundaries.
4. **Fixed SummaryModeCard.test.tsx** — removed 2 finance/learning test cases + updated combined test to only test fitness/hydration modes
5. **Committed Agent E's uncommitted i18n work** — ru.ts (237 lines removed) + zh.ts (13 lines removed) were staged but uncommitted
6. **Full verification passed**:
   - Bot: `tsc --noEmit` clean, 75 test files / **953 tests** PASS
   - Mini-app: `tsc --noEmit` clean, `npm run build` clean, 102 test files / **615 tests** PASS
   - **Total: 177 test files / 1,568 tests**

**Files modified (4):**
- `bot/package.json` — removed 1 test path from test:mvp
- `mini-app/package.json` — removed 10 test paths from test:mvp
- `mini-app/src/components/onboarding/quiz/useQuizState.ts` — removed `learning` case
- `mini-app/src/components/onboarding/summary/SummaryModeCard.tsx` — removed finance/learning code

**Files fixed (1 test):**
- `mini-app/src/__tests__/components/onboarding/summary/SummaryModeCard.test.tsx` — removed finance/learning assertions

**Issues found:**
- 2 source files (`useQuizState.ts`, `SummaryModeCard.tsx`) were not owned by any agent but referenced removed `OnboardingData` fields — fell through agent boundaries
- Agent E's i18n changes (ru.ts, zh.ts) were left uncommitted — committed by Agent G

#### Agent 0 Retrospective
- **Merge**: All 7 agents committed directly to main. 17 commits total. Agent G merged before Agent E finished (out of order) — but no issues resulted since E's remaining work was i18n data files that don't affect TypeScript builds.
- **Build**: Bot `tsc --noEmit` clean. Mini-app `tsc --noEmit` clean. Vite build clean (index bundle: 255KB → 222KB, -13%).
- **Tests**: Bot 75 files / 953 tests. Mini-app 102 files / 615 tests. Total: 1,568 (down from 1,803 — removed 235 tests with deleted features).
- **Deploy**: 316e8df deployed, health OK. 97 files changed, -17,700 lines.
- **What was removed**: Finance mode, Learning/Content mode (5 pages, 14 components, 3 hooks, 3 bot routes, 1 utility, ~750 i18n keys, 49 seed rows, 34 test files, 15 admin test files)
- **What was kept**: Money/book punishments, avatar display in profile/leaderboard, admin page/routes, all other modes (fitness, hydration, medication, habits, discipline, social)
- **Merge order issue**: Agent G (final verification) committed at 7bc159f, but Agent E's last 2 commits (60bea59, 316e8df) came after. G actually committed E's uncommitted work too. No test failures resulted — verified clean by Agent 0.
- **Note for Run 86**: PathSelect.tsx was fixed by Agent 0 — restored medication + habits modes with i18n keys. Now shows 4 modes.

---

## RUN 86: Animation Polish + Medication Premium Unlock (7 Agents + Agent 0)

### Focus: Polish animations across onboarding, page transitions, and navigation. Add medication as a premium module (300 stars or 10,000 XP to unlock). Replace tier system with per-mode pricing.

### User Decisions:
- Medication = 300 Telegram Stars OR 10,000 XP to unlock
- Fitness, hydration, habits = free (no lock)
- Replace the 599-star premium tier with per-mode pricing
- Polish: page transitions, progress bar, avatar step, nav bar animations

### Copy-Paste Prompts

#### Agent A — Page Transition Animations
```
Read PARALLEL_AGENTS.md — you are Agent A of Run 86. Your task: Add smooth page transition animations to the app.

## Context
Currently, switching between tabs (Dashboard, Quests, Leaderboard, Profile, Settings) has NO page transition — pages just appear instantly. The user wants polished tab opening animations.

## What to do

### Create `mini-app/src/components/PageTransition.tsx`:
A reusable wrapper component using framer-motion AnimatePresence + motion.div that wraps page content with a fade+slide animation.

Animation spec:
- Enter: opacity 0→1, y: 8→0, duration 200ms, ease "easeOut"
- Exit: opacity 1→0, duration 100ms
- Use `AnimatePresence mode="wait"` keyed on current pathname
- Keep it lightweight — no heavy spring physics, just smooth fade+slide

### MODIFY `mini-app/src/App.tsx`:
- Import PageTransition
- Wrap the `<Routes>` block inside `<PageTransition>` keyed on `location.pathname`
- Use `useLocation()` from react-router-dom to get current path

### Verify:
- `cd mini-app && npx tsc --noEmit` — zero errors
- `cd mini-app && npm run build` — no errors

### IMPORTANT:
- Do NOT change route definitions or lazy imports
- Do NOT change Navigation.tsx (Agent B handles that)
- Keep animation lightweight — this runs on every page switch
- Write your retrospective in PARALLEL_AGENTS.md under Run 86 Retrospectives
```

#### Agent B — Navigation Bar Animation Polish
```
Read PARALLEL_AGENTS.md — you are Agent B of Run 86. Your task: Enhance the bottom navigation bar with better animations.

## Context
The nav bar at `mini-app/src/components/Navigation.tsx` already has spring-based layout animations for the active tab indicator. The user wants more polish.

## Current state (Navigation.tsx):
- 5 tabs: Home, Quests, Leaderboard, Profile, Settings (lucide-react icons)
- Active tab: `layoutId="activeTab"` background + `layoutId="activeIndicator"` underline
- Spring transition: stiffness 300, damping 30
- Quest badge: red circle with count

## What to do

### MODIFY `mini-app/src/components/Navigation.tsx`:
1. **Icon scale animation**: Active icon should scale up slightly (1.0 → 1.15) with spring transition when tab becomes active. Inactive icons scale back to 1.0.
2. **Settings icon rotation**: When Settings tab is active, rotate the Settings gear icon 90 degrees with a spring animation. Use `motion.div` wrapper with `animate={{ rotate: isActive ? 90 : 0 }}`.
3. **Quest badge pop-in**: When badge count changes from 0 to >0, add a scale pop animation (0→1.2→1) with spring physics.
4. **Subtle bounce on tap**: Add `whileTap={{ scale: 0.9, y: -1 }}` to nav buttons for tactile feel.

### Verify:
- `cd mini-app && npx tsc --noEmit` — zero errors

### IMPORTANT:
- Keep existing layoutId animations (activeTab, activeIndicator) — enhance, don't replace
- Keep keyboard navigation and ARIA attributes
- Do NOT change the icon set or tab structure
- Write your retrospective in PARALLEL_AGENTS.md under Run 86 Retrospectives
```

#### Agent C — Onboarding Progress Bar + Step Transitions
```
Read PARALLEL_AGENTS.md — you are Agent C of Run 86. Your task: Polish the onboarding progress bar and step transition animations.

## Context
The onboarding progress bar is at `mini-app/src/components/onboarding/ui/ProgressBar.tsx`. Step transitions in `mini-app/src/pages/Onboarding.tsx` use basic opacity fade (150ms). The user wants these polished.

## Current state:
- ProgressBar: yellow→orange gradient, width animates with 400ms easeOut, shows step label + percentage
- Step transitions: `AnimatePresence mode="sync"` with `initial={{ opacity: 0 }}, animate={{ opacity: 1 }}, exit={{ opacity: 0 }}, transition={{ duration: 0.15 }}`

## What to do

### MODIFY `mini-app/src/components/onboarding/ui/ProgressBar.tsx`:
1. **Glow effect**: Add a subtle glow/shadow on the progress bar fill that pulses when progress increases. Use `boxShadow` with the gradient color.
2. **Step completion tick**: When progress jumps (step completes), briefly flash the bar brighter (opacity pulse from 1→0.7→1 over 300ms).
3. **Percentage counter animation**: Animate the percentage number counting up smoothly instead of jumping. Use framer-motion's `useMotionValue` + `useTransform` + `animate` to smoothly interpolate between old and new values.
4. **Make bar slightly thicker**: h-2 → h-2.5 for better visibility.

### MODIFY `mini-app/src/pages/Onboarding.tsx`:
1. **Better step transitions**: Replace plain opacity fade with directional slide:
   - Forward (next step): slide from right (`x: 40→0`, opacity 0→1)
   - Exit: fade + slide left (`x: 0→-20`, opacity 1→0)
   - Duration: 200ms enter, 150ms exit
   - Use `custom` prop to pass direction if needed
2. Keep `AnimatePresence mode="wait"` (was "sync" — change to "wait" for cleaner transitions)

### Verify:
- `cd mini-app && npx tsc --noEmit` — zero errors

### IMPORTANT:
- Do NOT change step sequence, data flow, or component props
- Do NOT modify any step components (AvatarSelect, PathSelect, etc.) — only Onboarding.tsx wrapper
- Write your retrospective in PARALLEL_AGENTS.md under Run 86 Retrospectives
```

#### Agent D — Avatar Select + PathSelect Animation Polish
```
Read PARALLEL_AGENTS.md — you are Agent D of Run 86. Your task: Polish animations on avatar selection and path/mode selection screens.

## Context
- `mini-app/src/components/onboarding/AvatarSelect.tsx`: Avatar buttons stagger in from left (x: -20), scale 0.98 on tap
- `mini-app/src/components/onboarding/PathSelect.tsx`: Mode cards animate with stagger + whileTap, has Lock icon pattern for locked modes

## What to do

### MODIFY `mini-app/src/components/onboarding/AvatarSelect.tsx`:
1. **Selection animation**: When user selects an avatar, animate the selected card with a satisfying bounce: scale 1→1.05→1 over 300ms. Unselected cards should slightly dim (opacity 0.7).
2. **Checkmark indicator**: Add an animated checkmark (or blue circle) that scales in (0→1) on the selected avatar card. Use `AnimatePresence` for mount/unmount.
3. **Better stagger**: Increase stagger to 100ms (from 80ms) and add a slight y offset too (y: 10→0) for a cascade feel.

### MODIFY `mini-app/src/components/onboarding/PathSelect.tsx`:
1. **Card hover/press effect**: Add `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.95 }}` (already has whileTap on some, make consistent).
2. **Selection animation**: Selected cards should have a pulse glow effect on the border (use CSS animation or framer-motion).
3. **Lock animation for medication**: When medication card is locked, add a subtle shake animation on tap attempt (like ContinueButton's disabled shake: `x: [0, -4, 4, -3, 3, 0]` over 300ms). Show a toast/tooltip "Unlock with 300 Stars or 10,000 XP".
4. **Lock badge styling**: Update the lock badge to show the price: "300 ⭐ or 10K XP" instead of just "Soon".

### Verify:
- `cd mini-app && npx tsc --noEmit` — zero errors

### IMPORTANT:
- Do NOT change mode data (MODES array values) — those are set by Agent E
- Do NOT change the `available` logic — Agent E handles that
- Focus purely on visual animation polish
- Write your retrospective in PARALLEL_AGENTS.md under Run 86 Retrospectives
```

#### Agent E — Medication Unlock System (Backend + Data)
```
Read PARALLEL_AGENTS.md — you are Agent E of Run 86. Your task: Build the medication unlock system — per-mode purchasing with Stars or XP.

## Context
The user wants to replace the 599-star premium tier with per-mode pricing. Medication costs 300 Telegram Stars OR 10,000 XP to unlock. Fitness, hydration, and habits are free.

## Current state:
- `bot/src/api/middleware/premiumGate.ts`: MODE_LIMITS = { free: 2, subscriber: 3, premium: 6 }
- `bot/src/api/routes/payments.ts`: Creates invoice for premium tier (599 stars)
- `bot/src/api/routes/modes.ts`: Validates mode count against tier limit
- `database/schema.sql`: Has `subscriptions` table for tier tracking
- PathSelect.tsx has `available` prop per mode — ready for dynamic locking

## What to do

### ADD to `database/schema.sql` — new table `mode_unlocks`:
```sql
CREATE TABLE IF NOT EXISTS mode_unlocks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  mode_name VARCHAR(50) NOT NULL,
  unlock_method VARCHAR(20) NOT NULL, -- 'stars' or 'xp'
  amount_paid INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, mode_name)
);
```

### MODIFY `bot/src/api/routes/modes.ts`:
1. Add new route `GET /api/modes/unlocks/:userId` — returns list of unlocked modes for this user
2. Add new route `POST /api/modes/unlock` — unlock a mode with Stars or XP:
   - Input: `{ userId, modeName, method: 'stars' | 'xp' }`
   - For XP: check user has >= 10,000 XP, atomically deduct via `UPDATE users SET total_xp = total_xp - 10000 WHERE id = $1 AND total_xp >= 10000 RETURNING total_xp`
   - For Stars: create a payment (300 stars) via same flow as existing payments, return invoice_url
   - Insert into `mode_unlocks` on success
3. Update the mode addition validation: remove tier-based mode limits. Instead, check that the mode is either free (fitness/hydration/habits) or unlocked in `mode_unlocks`

### MODIFY `bot/src/api/middleware/premiumGate.ts`:
- Update `MODE_LIMITS` concept — no longer tier-based. Instead:
  - Free modes: ['fitness', 'hydration', 'habits'] — anyone can use
  - Paid modes: ['medication'] — requires entry in `mode_unlocks`
- Add helper: `isModeFreeOrUnlocked(userId, modeName): Promise<boolean>`

### MODIFY `bot/src/api/routes/payments.ts`:
- Update `POST /create` to support mode unlocks (not just tier upgrades):
  - Accept `{ userId, amount: 300, type: 'mode_unlock', modeName: 'medication' }`
  - Create invoice with title "Unlock Medication Mode" and 300 XTR price
- Update `GET /tiers` to return mode pricing info instead of tier info

### Verify:
- `cd bot && npx tsc --noEmit` — zero errors

### IMPORTANT:
- Do NOT delete the subscriptions table (might have data)
- Keep backward compatibility — existing premium users should still have access
- The XP deduction must be atomic (single UPDATE with WHERE clause)
- Write your retrospective in PARALLEL_AGENTS.md under Run 86 Retrospectives
```

#### Agent F — Medication Unlock UI (Mini-App)
```
Read PARALLEL_AGENTS.md — you are Agent F of Run 86. Your task: Build the medication unlock UI in the mini-app.

## Context
Agent E builds the backend. You build the frontend. Medication costs 300 Stars or 10,000 XP.

## What to do

### MODIFY `mini-app/src/components/onboarding/PathSelect.tsx`:
1. The MODES array `medication` entry should have `available` driven by an `unlockedModes` prop:
   - Add prop: `unlockedModes?: string[]`
   - Set `available: unlockedModes ? unlockedModes.includes('medication') || mode.id !== 'medication' : mode.id !== 'medication'`
   - For fitness/hydration/habits: always available
   - For medication: available only if in unlockedModes

### CREATE `mini-app/src/components/ModeUnlockModal.tsx`:
A modal that appears when user taps a locked mode. Shows:
- Mode icon + name (medication 💊)
- Two unlock options:
  1. "Unlock with 300 ⭐" button — calls payment API, opens Telegram Stars invoice
  2. "Unlock with 10,000 XP" button — calls XP unlock API (disabled if user has < 10,000 XP, show current XP)
- Framer-motion entrance animation (scale from 0.9→1, opacity 0→1)
- Close button / tap outside to dismiss

### CREATE `mini-app/src/hooks/useModeUnlock.ts`:
Hook that:
- Fetches user's unlocked modes via `GET /api/modes/unlocks/:userId`
- Provides `unlockWithStars(modeName)` — calls backend, opens invoice
- Provides `unlockWithXP(modeName)` — calls backend XP deduction
- Returns: `{ unlockedModes, isUnlocking, unlockWithStars, unlockWithXP, userXP }`

### MODIFY other pages that show modes:
- If mode lock status is shown on Dashboard or Profile, update those too
- Check if Settings page shows mode management — update if needed

### Verify:
- `cd mini-app && npx tsc --noEmit` — zero errors

### IMPORTANT:
- Use existing `usePayment` hook patterns for the Stars flow
- The modal should feel premium — polish the design
- Write your retrospective in PARALLEL_AGENTS.md under Run 86 Retrospectives
```

#### Agent G — Test Fixes + Final Verification (MERGE LAST)
```
Read PARALLEL_AGENTS.md — you are Agent G of Run 86. Your task: Fix tests, update test:mvp scripts, and verify everything works. YOU MERGE LAST.

## Context
Agents A-F are adding:
- Page transition animations (Agent A)
- Nav bar animation enhancements (Agent B)
- Onboarding progress bar + step transitions (Agent C)
- Avatar + PathSelect animation polish (Agent D)
- Medication unlock backend (Agent E — new table, new routes, modified payment flow)
- Medication unlock UI (Agent F — new modal, new hook, modified PathSelect)

## What to do

### STEP 1: Fix any TypeScript errors
- `cd bot && npx tsc --noEmit` — fix all errors
- `cd mini-app && npx tsc --noEmit` — fix all errors

### STEP 2: Run the new DB migration on the server
- SSH to 85.239.58.205
- Run: `PGPASSWORD=postgres psql -h localhost -U postgres -d telegram_rpg -c "CREATE TABLE IF NOT EXISTS mode_unlocks (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), mode_name VARCHAR(50) NOT NULL, unlock_method VARCHAR(20) NOT NULL, amount_paid INTEGER NOT NULL DEFAULT 0, unlocked_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, mode_name));"`

### STEP 3: Update test:mvp scripts if needed
- Add any new test files created by other agents
- Remove any test paths that reference deleted files

### STEP 4: Fix failing tests
- PathSelect tests may need updating for new `unlockedModes` prop
- Payment tests may need updating for new payment types
- Mode tests may need updating for new unlock flow

### STEP 5: Full verification
- `cd bot && npx tsc --noEmit` — zero errors
- `cd mini-app && npx tsc --noEmit && npm run build` — zero errors
- `cd bot && npm run test:mvp` — all pass
- `cd mini-app && npm run test:mvp` — all pass
- Report final test counts

### IMPORTANT:
- You MERGE LAST — after all other agents
- Create the mode_unlocks table on the server
- Write your retrospective in PARALLEL_AGENTS.md under Run 86 Retrospectives
```

### Run 86 File Ownership Matrix

| File/Dir | A | B | C | D | E | F | G |
|----------|---|---|---|---|---|---|---|
| mini-app/src/components/PageTransition.tsx | NEW | - | - | - | - | - | - |
| mini-app/src/App.tsx | OWN | - | - | - | - | - | - |
| mini-app/src/components/Navigation.tsx | - | OWN | - | - | - | - | - |
| mini-app/src/components/onboarding/ui/ProgressBar.tsx | - | - | OWN | - | - | - | - |
| mini-app/src/pages/Onboarding.tsx | - | - | OWN | - | - | - | - |
| mini-app/src/components/onboarding/AvatarSelect.tsx | - | - | - | OWN | - | - | - |
| mini-app/src/components/onboarding/PathSelect.tsx | - | - | - | OWN | - | OWN | - |
| database/schema.sql | - | - | - | - | OWN | - | - |
| bot/src/api/routes/modes.ts | - | - | - | - | OWN | - | - |
| bot/src/api/middleware/premiumGate.ts | - | - | - | - | OWN | - | - |
| bot/src/api/routes/payments.ts | - | - | - | - | OWN | - | - |
| mini-app/src/components/ModeUnlockModal.tsx | - | - | - | - | - | NEW | - |
| mini-app/src/hooks/useModeUnlock.ts | - | - | - | - | - | NEW | - |
| Both package.json (test:mvp) | - | - | - | - | - | - | OWN |

**Note**: PathSelect.tsx is shared between D (animations) and F (unlock logic). D handles visual animations only, F handles the `available` prop logic. If conflicts arise, F's logic changes take priority.

### Run 86 Merge Order
A → B → C → D → E → F → G (G always last)

### Run 86 Retrospectives

#### Agent A Retrospective
**Task**: Page transition animations (fade+slide on route change)

**Files changed**:
- `mini-app/src/components/PageTransition.tsx` — NEW. Reusable wrapper using framer-motion `AnimatePresence mode="wait"` + `motion.div` keyed on `location.pathname`. Enter: opacity 0→1, y 8→0, 200ms easeOut. Exit: opacity 0, 100ms.
- `mini-app/src/App.tsx` — Imported PageTransition, wrapped `<Routes>` inside `<PageTransition>`, added `location={location}` prop to `<Routes>` so exit animations hold the old route content.

**Verification**: `npx tsc --noEmit` shows zero errors in my files. Build fails only due to Agent F's `ModeUnlockModal.tsx` (i18n type mismatch) and Agent C/F's Onboarding changes — not related to my work. Agent G should fix these at merge time.

**Notes for Agent 0**: Merge order is straightforward — my changes are isolated to PageTransition.tsx (new file) and App.tsx (import + wrapper). No conflicts expected with other agents since no one else touches App.tsx routing structure.

#### Agent B Retrospective
**Status**: Complete — all 4 animation enhancements implemented, `tsc --noEmit` passes with zero errors.

**Changes to `mini-app/src/components/Navigation.tsx`:**
1. **Refactored icon rendering**: Changed `navItems` from pre-rendered `icon: <Home />` to component references `Icon: Home` (using `LucideIcon` type) so icons can be wrapped in `motion.div` and respond to active state.
2. **Icon scale animation**: Active icon scales to 1.15 with spring transition (`stiffness: 300, damping: 30`), inactive scales back to 1.0.
3. **Settings gear rotation**: When Settings tab is active, gear icon rotates 90° via `motion.div` `animate={{ rotate: isActive ? 90 : 0 }}`.
4. **Quest badge pop-in**: Wrapped badge in `AnimatePresence` + `motion.span` with `initial={{ scale: 0 }}` → `animate={{ scale: 1 }}` using a snappier spring (`stiffness: 500, damping: 15`) for a playful pop effect.
5. **Bounce on tap**: Changed `<button>` to `<motion.button>` with `whileTap={{ scale: 0.9, y: -1 }}` for tactile press feedback.
6. **Extracted `springTransition` constant** to avoid repeating the same spring config across 4 motion elements.

**What was preserved**: All existing `layoutId` animations (activeTab background + activeIndicator underline), keyboard navigation (`handleNavKeyDown`), ARIA attributes, tab structure, and safe-area handling.

**No new dependencies added** — `AnimatePresence` was already available from `framer-motion`; `LucideIcon` type from `lucide-react`.

#### Agent C Retrospective
**ProgressBar.tsx** — 4 enhancements:
1. Glow effect: persistent `boxShadow` (yellow/orange) on the fill bar for depth
2. Step completion pulse: `glowOpacity` MotionValue animates 0→0.8→0 on each progress increase via an overlay div
3. Animated percentage counter: `animate()` + `onUpdate` callback drives `displayPercent` state for smooth number counting (avoids MotionValue-as-children anti-pattern)
4. Thicker bar: `h-2` → `h-2.5`, added `tabular-nums` to prevent layout shift during counting

**Onboarding.tsx** — step transition overhaul:
- Changed `AnimatePresence mode="sync"` → `mode="wait"` for clean sequential transitions (old step fully exits before new enters)
- Directional slide: enter from right (`x: 40→0`, 200ms easeOut), exit to left (`x: 0→-20`, 150ms easeIn)
- Gives a clear sense of forward progression through the onboarding flow

**No files outside ownership touched.** Zero TS errors in my files (pre-existing PathSelect errors belong to Agent D).

#### Agent D Retrospective
**AvatarSelect.tsx** — Added 3 animation enhancements:
1. Selection bounce: selected card does `scale 1→1.05→1` over 300ms. Unselected cards dim to `opacity: 0.7`.
2. Animated checkmark: blue circle with `Check` icon scales in via `AnimatePresence` (spring, stiffness 500, damping 25). Exits with scale-to-zero.
3. Improved stagger: changed from `x: -20` only to `x: -20, y: 10→0` with 100ms stagger (was 80ms) for a cascade feel.

**PathSelect.tsx** — Added 4 animation enhancements:
1. Consistent `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.95 }}` on available cards.
2. Selection glow: selected cards get a pulsing border ring (opacity 0.4→1→0.4, 2s infinite) + colored boxShadow matching mode color.
3. Lock shake: tapping a locked mode triggers `x: [0, -4, 4, -3, 3, 0]` over 300ms + haptic `notification('warning')`. Shows inline toast "Unlock with 300 Stars or 10,000 XP" for 2.5s.
4. Lock badge: replaced "Soon" text with "300 ⭐ / 10K XP" pricing.

**Merge note**: Agent F's linter changes arrived mid-edit (removed `available` from MODES, added `isModeAvailable()`, `ModeUnlockModal` import, and `unlockedModes` props). I adapted to use `isModeAvailable(mode.id)` throughout and wired up the `ModeUnlockModal` render. PathSelect.tsx and AvatarSelect.tsx both compile with zero TS errors. Remaining errors are in Agent F's `ModeUnlockModal.tsx` and Agent C's `Onboarding.tsx` — for Agent G to resolve.

#### Agent E Retrospective
**Status**: Complete — all files modified, `tsc --noEmit` passes with zero errors.

**What was done**:
1. **`database/schema.sql`** — Added `mode_unlocks` table with `(user_id, mode_name)` unique constraint, `unlock_method` ('stars'/'xp'), `amount_paid`, and index on `user_id`.
2. **`bot/src/api/middleware/premiumGate.ts`** — Added exports: `FREE_MODES`, `PAID_MODES`, `MODE_PRICES`, `isModeFreeOrUnlocked()`, `getUserUnlockedModes()`. Kept all existing exports intact for backward compatibility. Premium tier users get automatic access to all paid modes (backward compat).
3. **`bot/src/api/routes/modes.ts`** — Added two new routes:
   - `GET /api/modes/unlocks/:userId` — returns unlocked modes, user XP, free/paid mode lists, and mode prices
   - `POST /api/modes/unlock` — unlocks a paid mode via Stars (creates invoice) or XP (atomic deduction with `WHERE total_xp >= $1`)
   - Updated `POST /api/users/:userId/modes` to validate per-mode unlock status before tier-based limit check
4. **`bot/src/api/routes/payments.ts`** — Updated `POST /create` to support `type: 'mode_unlock'` with `modeName` field. Updated `GET /tiers` to include `modePricing`, `freeModes`, and `paidModes` in response.
5. **`bot/src/api/routes/payment-webhook.ts`** — Updated webhook handler to detect `mode_unlock` payments via `metadata.type` and insert into `mode_unlocks` table (with `ON CONFLICT DO NOTHING` for idempotency).

**Key decisions**:
- XP deduction is atomic: `UPDATE users SET total_xp = total_xp - $1 WHERE id = $2 AND total_xp >= $1 RETURNING total_xp`
- Subscriptions table NOT deleted — backward compat maintained
- Premium tier users bypass mode unlock checks (existing premium users keep access)
- Mode unlock via Stars follows same invoice flow as tier upgrades but with different metadata

**Note for Agent G**: The `mode_unlocks` table needs to be created on the server. SQL: `CREATE TABLE IF NOT EXISTS mode_unlocks (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), mode_name VARCHAR(50) NOT NULL, unlock_method VARCHAR(20) NOT NULL, amount_paid INTEGER NOT NULL DEFAULT 0, unlocked_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, mode_name));`

**No issues or blockers.**

#### Agent F Retrospective
**Created:**
- `mini-app/src/hooks/useModeUnlock.ts` — Hook that fetches unlocked modes from `GET /api/modes/unlocks/:userId`, provides `unlockWithStars()` (opens Telegram Stars invoice via WebApp.openInvoice) and `unlockWithXP()` (calls backend XP deduction). Gracefully degrades to showing medication as locked if backend endpoint returns 404 (Agent E not deployed yet). Exports `MODE_PRICES` config.
- `mini-app/src/components/ModeUnlockModal.tsx` — Premium-feeling modal with framer-motion spring animation (scale 0.9→1). Shows mode icon, two unlock options: Stars (yellow gradient) and XP (purple gradient, disabled if insufficient XP with current/needed display). Uses FocusTrap for accessibility.

**Modified:**
- `mini-app/src/components/onboarding/PathSelect.tsx` — Removed hardcoded `available: true` from MODES array. Added `unlockedModes`, `userXP`, `isUnlocking`, `unlockError`, `onUnlockWithStars`, `onUnlockWithXP` props. Free modes (fitness/hydration/habits) always available, medication available only if in `unlockedModes`. Tapping locked mode opens unlock modal (if callbacks provided) or falls back to existing toast. Preserved all of Agent D's animation work (shake, glow ring, box shadow).
- `mini-app/src/pages/Onboarding.tsx` — Wired `useModeUnlock` hook, passes unlock data to PathSelect via StepRenderer.
- `mini-app/src/i18n/{en,ru,zh}.ts` — Added `modeUnlock` translation section (description, unlockWithStars, starsHint, unlockWithXP, xpReady, xpNotEnough, or).

**Verified:** `npx tsc --noEmit` — zero errors.

**Notes:**
- PathSelect shared with Agent D — preserved D's animation additions (shakeKeyframes, pulse glow, box shadow), only changed `available` logic from static to dynamic.
- Dashboard/Profile/Settings don't need changes — they only show already-activated modes, not mode selection.
- i18n used `{{amount}}` instead of `{{count}}` to avoid conflict with i18next's built-in `count` (which must be a number for pluralization).
- A linter auto-fixed `toLocaleString()` calls in ModeUnlockModal to pass raw numbers to i18n instead — this is fine, formatting is handled by i18n.

#### Agent G Retrospective
**Status**: Complete — all tests green, DB migration done, TypeScript clean

**What was done**:
1. **Fixed 4 mini-app test files** (19 tests) — AvatarSelect, PathSelect, Summary, ProgressBar all had incomplete inline framer-motion mocks missing `AnimatePresence` and `useMotionValue`. Replaced with the shared mock from `src/test/mocks/framer-motion.ts`.
2. **Fixed TypeScript error in ModeUnlockModal.tsx** — Agent F passed `toLocaleString()` (string) to `t()` interpolation where i18next types expected number. Changed to pass raw numbers.
3. **Fixed bot import crash** — Agent E added `import { bot } from '../../bot.js'` at top level of `modes.ts`, which throws `TELEGRAM_BOT_TOKEN not set` during tests. Converted to dynamic `await import()` inside the handler that uses it.
4. **Fixed modes-gating.test.ts** (6 tests) — Mock of premiumGate.js was missing new exports: `isModeFreeOrUnlocked`, `getUserUnlockedModes`, `FREE_MODES`, `PAID_MODES`, `MODE_PRICES`.
5. **Fixed modes.http.test.ts** (1 test) — Updated "mode not found" test to reflect new behavior: unknown modes now get 400 "requires unlock" instead of silently failing.
6. **Ran DB migration** — Created `mode_unlocks` table on production server.

**Final counts**: Bot 75 files / 953 tests, Mini-app 102 files / 615 tests — ALL PASSING.
**Builds**: Both `bot` and `mini-app` compile and build cleanly.

#### Agent 0 Retrospective
- **Merge**: 7 agent commits on main. Agents B, C, E, F, G committed directly to main. Agent A (PageTransition.tsx + App.tsx) and Agent D (AvatarSelect.tsx) had uncommitted changes — committed by Agent 0 as 6f2100c and e7f2bb4.
- **Build**: Both projects pass `tsc --noEmit`. Mini-app vite build clean (index 234KB).
- **Tests**: Bot 75 files / 953 tests PASS. Mini-app 102 files / 615 tests PASS. Total: 1,568.
- **Deploy**: e7f2bb4 deployed, mode_unlocks table created on production, health OK.
- **Key wins**: Smooth page transitions (AnimatePresence), nav bar icon animations (spring scale, gear rotation, badge pop-in, tap bounce), onboarding progress bar glow + directional step slide, avatar selection bounce + animated checkmark, PathSelect lock shake + glow ring + unlock modal. Medication unlock backend fully wired (Stars 300 / XP 10K).
- **Issues**: Agent D and F both touched PathSelect.tsx — Agent D committed animation polish, Agent F committed unlock logic. F preserved D's work. No conflicts but shared file ownership should be avoided in future runs.
- **Roadmap**: Run 86 was a user-requested feature run (post-roadmap). All mandatory roadmap runs (78-85) are ✅.

---

## RUN 87: Medication Mode + Notification Enhancements (8 Agents + Agent 0)

### Focus: Full medication tracking system (DB, API, jobs, UI) + streak milestone notifications + notification history polish

### Copy-Paste Prompts

**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent 0 for Run 87.
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read PARALLEL_AGENTS.md — you are Agent A of Run 87. Your task: Add medication database tables and seed data.

## What to do

### 1. Add `medications` table to `database/schema.sql`
Add after the `mode_unlocks` table:
```sql
CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(20) CHECK (frequency IN ('daily', 'twice_daily', 'three_times', 'weekly', 'as_needed')) NOT NULL DEFAULT 'daily',
    time_of_day TIME[] NOT NULL DEFAULT '{08:00}',
    color VARCHAR(20) DEFAULT 'blue',
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_medications_user ON medications(user_id);
CREATE INDEX idx_medications_active ON medications(user_id, is_active);
```

### 2. Add `medication_logs` table
```sql
CREATE TABLE medication_logs (
    id SERIAL PRIMARY KEY,
    medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_time TIME NOT NULL,
    status VARCHAR(20) CHECK (status IN ('taken', 'skipped', 'postponed')) NOT NULL,
    logged_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_med_logs_user_date ON medication_logs(user_id, scheduled_date);
CREATE INDEX idx_med_logs_medication ON medication_logs(medication_id, scheduled_date);
CREATE UNIQUE INDEX idx_med_logs_unique ON medication_logs(medication_id, scheduled_date, scheduled_time);
```

### 3. Add `notification_log` table
```sql
CREATE TABLE notification_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);
CREATE INDEX idx_notif_log_user ON notification_log(user_id, sent_at DESC);
```

### 4. Add medication quest templates to `database/seed_data.sql`
Find the medication mode ID from the `modes` INSERT, then add quests:
- Daily: "Take morning medications" (easy, 30 XP)
- Daily: "Take evening medications" (easy, 30 XP)
- Weekly: "Perfect medication week — no missed doses" (hard, 200 XP)

### 5. Create migration script `database/migrations/run87_medication.sql`
Combine all 3 CREATE TABLE statements + indexes + seed quests in one file for production deployment.

OWNED: `database/schema.sql`, `database/seed_data.sql`, `database/migrations/run87_medication.sql` (new dir + file)
FORBIDDEN: bot/src/*, mini-app/src/*, i18n files
Write retrospective when done.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read PARALLEL_AGENTS.md — you are Agent B of Run 87. Your task: Create medication CRUD API routes.

## Context
Agent A adds the `medications` and `medication_logs` tables. You create the Express routes. Follow the pattern in `bot/src/api/routes/checkins.ts` (auth, validation, error handling).

## What to do

### 1. Create `bot/src/api/routes/medications.ts`
Endpoints:
- `GET /api/medications/:userId` — list user's active medications (sorted by time_of_day[0])
- `POST /api/medications` — add medication { telegram_id, name, dosage, frequency, time_of_day, color, notes }
- `PATCH /api/medications/:id` — edit medication (validate ownership via telegram_id)
- `DELETE /api/medications/:id` — soft-delete (SET is_active=false, validate ownership)
- `GET /api/medications/:userId/today` — today's schedule: JOIN medications with medication_logs for current date, return each med with status (taken/skipped/pending)

Use: `authenticateTelegram`, `requireOwnership` (or validate telegram_id), `mutationLimiter`, `readLimiter`, `asyncHandler`, `validateRequired`, `successResponse`, error classes from `../utils/errors.js`. Use `query` from `../../utils/db.js`.

### 2. Create `bot/src/api/routes/medication-logs.ts`
Endpoints:
- `POST /api/medication-logs` — log taken/skipped/postponed { telegram_id, medication_id, scheduled_time, status }. Use UPSERT (ON CONFLICT UPDATE) so re-tapping toggles status.
- `GET /api/medication-logs/:userId/history?days=7` — last N days of logs grouped by date, include medication names via JOIN. Calculate adherence rate (taken / total scheduled).

### 3. Register in `bot/src/api/server.ts`
Add 2 lines at the import section:
```typescript
import { medicationRouter } from './routes/medications.js';
import { medicationLogRouter } from './routes/medication-logs.js';
```
Add 2 lines in the route registration section:
```typescript
app.use('/api/medications', medicationRouter);
app.use('/api/medication-logs', medicationLogRouter);
```

### 4. Build verify
`cd bot && npx tsc --noEmit`

IMPORTANT: Use ESM imports with `.js` extensions for all local imports.

OWNED: `bot/src/api/routes/medications.ts` (new), `bot/src/api/routes/medication-logs.ts` (new), `bot/src/api/server.ts` (add 2 imports + 2 app.use only)
FORBIDDEN: mini-app/src/*, i18n files, jobs/, test files
Write retrospective when done.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read PARALLEL_AGENTS.md — you are Agent C of Run 87. Your task: Create medication reminder job and streak milestone notification job.

## Context
Follow the pattern in `bot/src/jobs/definitions/questReminders.ts` exactly:
- Export JOB_NAME, CRON_SCHEDULE, handler, setBotInstance
- DND-aware + timezone-aware
- Rate-limited batching (30 msg/sec)
- Use `logger.child({ component: '...' })`

## What to do

### 1. Create `bot/src/jobs/definitions/medicationReminder.ts`
- JOB_NAME: 'medication-reminders'
- CRON_SCHEDULE: '*/15 * * * *' (every 15 minutes)
- Handler logic:
  1. Query users with active medication mode AND notification_enabled=true
  2. For each user, check if any medication's time_of_day is within ±7 min of current time in user's timezone
  3. Skip users in DND window
  4. Send Telegram message with medication name + dosage using medicationReminderTemplate
  5. Log to notification_log table (type='medication_reminder')
  6. Batch at 30 msg/sec, handle 429 rate limits

### 2. Create `bot/src/jobs/definitions/streakMilestone.ts`
- JOB_NAME: 'streak-milestones'
- CRON_SCHEDULE: '0 1 * * *' (daily at 1 AM UTC)
- Handler logic:
  1. Query users whose current_streak is exactly 7, 14, 30, 60, or 100
  2. Skip users with notification_enabled=false or in DND
  3. Send congratulatory message using streakMilestoneTemplate
  4. Log to notification_log table (type='streak_milestone')

### 3. Add notification templates to `bot/src/utils/notificationTemplates.ts`
Add 2 new exported template functions:
- `medicationReminderTemplate(medName, dosage)` — "💊 Time for {medName}! Dosage: {dosage}. Tap to mark as taken."
- `streakMilestoneTemplate(days, mode)` — "🔥 {days}-day streak! You're on fire with {mode}!"
Both should return HTML strings matching the existing template style.

### 4. Register both jobs in `bot/src/jobs/registerJobs.ts`
- Add imports for medicationReminder and streakMilestone
- Add both to the `jobs` array
- Add `medicationReminder.setBotInstance(bot)` and `streakMilestone.setBotInstance(bot)` in registerAllJobs

### 5. Build verify
`cd bot && npx tsc --noEmit`

OWNED: `bot/src/jobs/definitions/medicationReminder.ts` (new), `bot/src/jobs/definitions/streakMilestone.ts` (new), `bot/src/jobs/registerJobs.ts`, `bot/src/utils/notificationTemplates.ts`
FORBIDDEN: mini-app/src/*, server.ts, API routes, test files
Write retrospective when done.
```

**Agent D** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-d`):
```
Read PARALLEL_AGENTS.md — you are Agent D of Run 87. Your task: Create the Medications page and components for the mini-app.

## Context
This is a new page for managing medications. Follow existing page patterns (see Dashboard.tsx, Quests page). Use Tailwind + framer-motion for animations. Components should use i18n keys (Agent G adds translations).

## What to do

### 1. Create `mini-app/src/pages/Medications.tsx`
Full medication management page:
- Header with 💊 icon and page title
- "Today's Schedule" section at top — shows DailyMedTracker component
- "My Medications" section — list of MedicationCard components
- FAB (floating action button) to add new medication
- Empty state when no medications ("Add your first medication")
- Pull-to-refresh support
- Loading skeleton while fetching
- Uses `useMedicationData` hook (Agent E creates it)

### 2. Create `mini-app/src/components/medication/MedicationCard.tsx`
Individual medication card:
- Color dot (user-chosen color), medication name, dosage
- Schedule times shown as chips (e.g., "8:00 AM", "8:00 PM")
- Frequency label (Daily, Twice daily, etc.)
- Swipe or long-press to reveal edit/delete actions
- framer-motion entry animation (stagger from list)

### 3. Create `mini-app/src/components/medication/MedicationForm.tsx`
Add/edit medication form (slide-up modal):
- Name input (required)
- Dosage input (e.g., "500mg", "2 tablets")
- Frequency selector (daily, twice_daily, three_times, weekly, as_needed)
- Time picker(s) — show 1-3 time inputs based on frequency
- Color picker (6 preset colors)
- Notes textarea (optional)
- Save/Cancel buttons
- framer-motion slide-up animation

### 4. Create `mini-app/src/components/medication/DailyMedTracker.tsx`
Today's medication checklist:
- List of medications due today with times
- Each item has a checkbox (tap to mark taken)
- Skipped button (tap to mark skipped)
- Visual progress: "3/5 taken" with progress bar
- Color-coded: green=taken, red=skipped, gray=pending
- Uses `useMedicationData` hook for today's schedule + logging

### 5. Add lazy route in `mini-app/src/App.tsx`
Add after the existing lazy imports:
```typescript
const Medications = lazy(() => import('@/pages/Medications').then(m => ({ default: m.Medications })));
```
Add route inside Routes:
```tsx
<Route path="/medications" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><Medications /></ProtectedRoute>} />
```

### 6. Build verify
`cd mini-app && npx tsc --noEmit`

OWNED: `mini-app/src/pages/Medications.tsx` (new), `mini-app/src/components/medication/MedicationCard.tsx` (new), `mini-app/src/components/medication/MedicationForm.tsx` (new), `mini-app/src/components/medication/DailyMedTracker.tsx` (new), `mini-app/src/App.tsx` (add 1 import + 1 route)
FORBIDDEN: bot/src/*, Dashboard.tsx, hooks/, i18n files, Navigation.tsx, test files
Write retrospective when done.
```

**Agent E** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-e`):
```
Read PARALLEL_AGENTS.md — you are Agent E of Run 87. Your task: Create medication React Query hooks and API client methods.

## Context
Follow the pattern in `mini-app/src/hooks/useDashboardQuery.ts` and `mini-app/src/hooks/useSocialQuery.ts` for React Query hooks. Follow `mini-app/src/api/client.ts` for API client methods.

## What to do

### 1. Add medication API methods to `mini-app/src/api/client.ts`
Add these methods to the apiClient object:
- `getMedications(userId: number)` — GET /api/medications/:userId
- `addMedication(data: { telegram_id: number, name: string, dosage?: string, frequency: string, time_of_day: string[], color?: string, notes?: string })` — POST /api/medications
- `updateMedication(id: number, data: Partial<...>)` — PATCH /api/medications/:id
- `deleteMedication(id: number, telegramId: number)` — DELETE /api/medications/:id
- `getTodaySchedule(userId: number)` — GET /api/medications/:userId/today
- `logMedication(data: { telegram_id: number, medication_id: number, scheduled_time: string, status: string })` — POST /api/medication-logs
- `getMedicationHistory(userId: number, days?: number)` — GET /api/medication-logs/:userId/history?days=N

### 2. Create `mini-app/src/hooks/useMedicationQuery.ts`
React Query hooks:
- `useMedications(userId)` — staleTime 2min, queries getMedications
- `useTodaySchedule(userId)` — staleTime 1min (changes frequently as user logs)
- `useMedicationHistory(userId, days)` — staleTime 5min
- `useAddMedicationMutation()` — invalidates medications + todaySchedule queries on success
- `useUpdateMedicationMutation()` — invalidates medications query
- `useDeleteMedicationMutation()` — optimistic remove from list
- `useLogMedicationMutation()` — optimistic status update in todaySchedule
- Export `medicationKeys` for cache management

### 3. Create `mini-app/src/hooks/useMedicationData.ts`
Wrapper hook providing a clean public API:
```typescript
export function useMedicationData(userId?: number) {
  // Use React Query hooks internally
  // Return: { medications, todaySchedule, history, loading, error, addMedication, updateMedication, deleteMedication, logMedication, refresh }
}
```

### 4. Build verify
`cd mini-app && npx tsc --noEmit`

OWNED: `mini-app/src/api/client.ts` (add medication methods), `mini-app/src/hooks/useMedicationQuery.ts` (new), `mini-app/src/hooks/useMedicationData.ts` (new)
FORBIDDEN: bot/src/*, pages/, components/, i18n files, test files
Write retrospective when done.
```

**Agent F** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-f`):
```
Read PARALLEL_AGENTS.md — you are Agent F of Run 87. Your task: Add Medications to navigation, create dashboard widget, polish notification history.

## Context
The Medications page (Agent D) and hooks (Agent E) are being created in parallel. You handle the integration points: navigation tab, dashboard widget, and notification history page.

## What to do

### 1. Add Medications tab to `mini-app/src/components/Navigation.tsx`
- Add a 💊 Pill icon tab (use `Pill` from lucide-react, or fallback to a custom icon)
- Place it between Quests and Leaderboard in the nav order
- Only show this tab if user has medication mode active (check user's active modes from stats data or add a simple check)
- Follow existing animation patterns (motion.button, whileTap, icon scale)
- Label: use i18n key `nav.medications`

### 2. Create `mini-app/src/components/dashboard/MedicationWidget.tsx`
Dashboard widget showing today's medication status:
- Title: "Today's Medications" with 💊 icon
- Progress circle or bar: "3/5 taken"
- Next medication due: "Aspirin — in 2 hours"
- Tap to navigate to /medications page
- Uses `useMedicationData` hook (Agent E) or direct API call
- Compact design (fits in dashboard flow)
- framer-motion fade-in animation

### 3. Add MedicationWidget to `mini-app/src/pages/Dashboard.tsx`
- Import and render MedicationWidget after StreakSection
- Only render if user has medication mode active (check stats.activeModes or similar)
- Wrap in motion.div with stagger animation matching other sections

### 4. Polish `mini-app/src/pages/NotificationHistory.tsx`
- Read the current implementation first
- Ensure it shows notifications from the API (notification_log table)
- Add type filter (all, quest, achievement, medication, streak)
- Mark notifications as read when viewed
- Empty state for no notifications
- Pull-to-refresh

### 5. Build verify
`cd mini-app && npx tsc --noEmit`

OWNED: `mini-app/src/components/Navigation.tsx`, `mini-app/src/components/dashboard/MedicationWidget.tsx` (new), `mini-app/src/pages/Dashboard.tsx` (add widget), `mini-app/src/pages/NotificationHistory.tsx`
FORBIDDEN: bot/src/*, hooks/, api/client.ts, App.tsx, i18n files, test files
Write retrospective when done.
```

**Agent G** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-g`):
```
Read PARALLEL_AGENTS.md — you are Agent G of Run 87. Your task: Add i18n translations for all medication and notification strings.

## What to do

### 1. Add medication strings to `mini-app/src/i18n/en.ts`
Add a `medication` section:
- `medication.title` — "Medications"
- `medication.todaySchedule` — "Today's Schedule"
- `medication.myMedications` — "My Medications"
- `medication.addMedication` — "Add Medication"
- `medication.editMedication` — "Edit Medication"
- `medication.name` — "Medication Name"
- `medication.dosage` — "Dosage"
- `medication.frequency` — "Frequency"
- `medication.timeOfDay` — "Time of Day"
- `medication.color` — "Color"
- `medication.notes` — "Notes (optional)"
- `medication.save` — "Save"
- `medication.cancel` — "Cancel"
- `medication.delete` — "Delete"
- `medication.deleteConfirm` — "Remove this medication?"
- `medication.taken` — "Taken"
- `medication.skipped` — "Skipped"
- `medication.postponed` — "Postponed"
- `medication.pending` — "Pending"
- `medication.progress` — "{{taken}}/{{total}} taken"
- `medication.nextDue` — "Next: {{name}} in {{time}}"
- `medication.noDue` — "All done for today!"
- `medication.emptyState` — "No medications added yet"
- `medication.emptyHint` — "Tap + to add your first medication"
- `medication.adherence` — "Adherence: {{rate}}%"
- `medication.history` — "History"
- `medication.frequencyDaily` — "Daily"
- `medication.frequencyTwice` — "Twice daily"
- `medication.frequencyThree` — "Three times daily"
- `medication.frequencyWeekly` — "Weekly"
- `medication.frequencyAsNeeded` — "As needed"

Add navigation key:
- `nav.medications` — "Medications"

Add dashboard widget keys:
- `dashboard.medicationWidget` — "Today's Medications"
- `dashboard.medicationProgress` — "{{taken}}/{{total}} taken"
- `dashboard.nextMedication` — "Next: {{name}}"

Add notification keys:
- `notifications.title` — "Notifications"
- `notifications.filterAll` — "All"
- `notifications.filterQuest` — "Quests"
- `notifications.filterAchievement` — "Achievements"
- `notifications.filterMedication` — "Medication"
- `notifications.filterStreak` — "Streaks"
- `notifications.empty` — "No notifications yet"
- `notifications.streakMilestone` — "🔥 {{days}}-day streak!"

### 2. Add same strings to `mini-app/src/i18n/ru.ts` (Russian)
Translate all keys to Russian.

### 3. Add same strings to `mini-app/src/i18n/zh.ts` (Chinese)
Translate all keys to Chinese.

### 4. Build verify
`cd mini-app && npx tsc --noEmit`

OWNED: `mini-app/src/i18n/en.ts`, `mini-app/src/i18n/ru.ts`, `mini-app/src/i18n/zh.ts`
FORBIDDEN: bot/src/*, pages/, components/, hooks/, test files
Write retrospective when done.
```

**Agent H** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-h`):
```
Read PARALLEL_AGENTS.md — you are Agent H of Run 87. Your task: Write tests for all new medication code and fix any build/test failures.

## What to do

### 1. Create `bot/src/__tests__/routes/http/medications.http.test.ts`
Test medication CRUD API:
- GET /api/medications/:userId — returns list
- POST /api/medications — creates medication, validates required fields
- PATCH /api/medications/:id — updates medication
- DELETE /api/medications/:id — soft-deletes
- GET /api/medications/:userId/today — returns today's schedule
Follow pattern from existing http tests (e.g., `checkins.http.test.ts` or `modes.http.test.ts`).

### 2. Create `bot/src/__tests__/routes/http/medication-logs.http.test.ts`
Test logging API:
- POST /api/medication-logs — logs taken/skipped
- GET /api/medication-logs/:userId/history — returns history with adherence rate

### 3. Create `mini-app/src/__tests__/hooks/useMedicationData.test.ts`
Test the medication data hook:
- Fetches medications on mount
- Fetches today's schedule
- addMedication mutation works
- logMedication mutation works
- Wrap in QueryClientProvider (follow useShop.test.ts pattern)

### 4. Create `mini-app/src/__tests__/pages/Medications.test.tsx`
Test the Medications page:
- Renders medication list
- Shows empty state when no medications
- Add medication button works
- Daily tracker shows today's schedule
Mock useMedicationData hook. Mock framer-motion with shared mock from `src/test/mocks/framer-motion.ts`.

### 5. Add test paths to package.json test:mvp
In `bot/package.json` test:mvp, add:
- `src/__tests__/routes/http/medications.http.test.ts`
- `src/__tests__/routes/http/medication-logs.http.test.ts`

In `mini-app/package.json` test:mvp, add:
- `src/__tests__/hooks/useMedicationData.test.ts`
- `src/__tests__/pages/Medications.test.tsx`

### 6. Fix any build/test failures from other agents
Run full test suites and fix any issues:
- `cd bot && npm run test:mvp`
- `cd mini-app && npm run test:mvp`
Report final test counts.

OWNED: All new test files listed above, `bot/package.json` (test:mvp), `mini-app/package.json` (test:mvp)
FORBIDDEN: Source code files (except to fix build errors from other agents)
Write retrospective when done.
```

### Run 87 File Ownership Matrix

| File/Dir | A | B | C | D | E | F | G | H |
|----------|---|---|---|---|---|---|---|---|
| database/schema.sql | OWN | - | - | - | - | - | - | - |
| database/seed_data.sql | OWN | - | - | - | - | - | - | - |
| database/migrations/run87_medication.sql | NEW | - | - | - | - | - | - | - |
| bot/src/api/routes/medications.ts | - | NEW | - | - | - | - | - | - |
| bot/src/api/routes/medication-logs.ts | - | NEW | - | - | - | - | - | - |
| bot/src/api/server.ts | - | OWN | - | - | - | - | - | - |
| bot/src/jobs/definitions/medicationReminder.ts | - | - | NEW | - | - | - | - | - |
| bot/src/jobs/definitions/streakMilestone.ts | - | - | NEW | - | - | - | - | - |
| bot/src/jobs/registerJobs.ts | - | - | OWN | - | - | - | - | - |
| bot/src/utils/notificationTemplates.ts | - | - | OWN | - | - | - | - | - |
| mini-app/src/pages/Medications.tsx | - | - | - | NEW | - | - | - | - |
| mini-app/src/components/medication/ (3 files) | - | - | - | NEW | - | - | - | - |
| mini-app/src/App.tsx | - | - | - | OWN | - | - | - | - |
| mini-app/src/hooks/useMedicationQuery.ts | - | - | - | - | NEW | - | - | - |
| mini-app/src/hooks/useMedicationData.ts | - | - | - | - | NEW | - | - | - |
| mini-app/src/api/client.ts | - | - | - | - | OWN | - | - | - |
| mini-app/src/components/Navigation.tsx | - | - | - | - | - | OWN | - | - |
| mini-app/src/pages/Dashboard.tsx | - | - | - | - | - | OWN | - | - |
| mini-app/src/components/dashboard/MedicationWidget.tsx | - | - | - | - | - | NEW | - | - |
| mini-app/src/pages/NotificationHistory.tsx | - | - | - | - | - | OWN | - | - |
| mini-app/src/i18n/en.ts, ru.ts, zh.ts | - | - | - | - | - | - | OWN | - |
| New test files (4) | - | - | - | - | - | - | - | NEW |
| bot/package.json (test:mvp) | - | - | - | - | - | - | - | OWN |
| mini-app/package.json (test:mvp) | - | - | - | - | - | - | - | OWN |

### Run 87 Merge Order
1. Agent A (DB schema — foundation for everything)
2. Agent B (API routes — depends on schema)
3. Agent C (Jobs — depends on schema, uses bot patterns)
4. Agent E (Hooks + API client — depends on API routes)
5. Agent G (i18n — independent strings)
6. Agent D (Pages + components — depends on hooks)
7. Agent F (Navigation + Dashboard widget — depends on pages + hooks)
8. Agent H (Tests — depends on all source code)

### Run 87 Retrospectives

#### Agent A Retrospective
**Status**: Complete — 3 new tables + migration script + seed quests.

- Added 3 new tables to `database/schema.sql`: `medications`, `medication_logs`, `notification_log` — all placed after `mode_unlocks` with `IF NOT EXISTS` guards, proper indexes, and table comments.
- Added DROP TABLE statements for the 3 new tables at the top of schema.sql (for fresh installs).
- Added 3 medication tracker quest templates to `database/seed_data.sql`: "Take morning medications" (daily, easy, 30 XP), "Take evening medications" (daily, easy, 30 XP), "Perfect medication week" (weekly, hard, 200 XP).
- Created `database/migrations/run87_medication.sql` — wraps all 3 CREATE TABLE + indexes + seed quests in a single transaction (BEGIN/COMMIT) for safe production deployment.
- No issues encountered.

#### Agent B Retrospective
**Status**: Complete — 2 new route files created, server.ts updated, `tsc --noEmit` clean.

**What was done**:
- Created `bot/src/api/routes/medications.ts` with 5 endpoints:
  - `GET /:telegramId` — list active medications sorted by first time_of_day
  - `POST /` — add medication with frequency/time_of_day validation
  - `PATCH /:id` — dynamic partial update with ownership check
  - `DELETE /:id` — soft-delete (is_active=false) with ownership check
  - `GET /:telegramId/today` — today's schedule via CROSS JOIN LATERAL unnest + LEFT JOIN medication_logs, returns per-dose status + summary counts
- Created `bot/src/api/routes/medication-logs.ts` with 2 endpoints:
  - `POST /` — UPSERT log (ON CONFLICT updates status so re-tapping toggles)
  - `GET /:telegramId/history?days=7` — last N days grouped by date, adherence rate calculation
- Registered both routers in `bot/src/api/server.ts` (2 imports + 2 app.use lines)
- All routes follow existing patterns: authenticateTelegram, requireOwnership/ForbiddenError, readLimiter/mutationLimiter, asyncHandler, validateRequired, successResponse

**Decisions**:
- Used `telegramId` as URL param (not `userId`) to match checkins.ts pattern and enable requireOwnership helper
- Used CROSS JOIN LATERAL unnest for today's schedule to expand time_of_day array into individual rows
- Adherence rate calculated as taken/total (not taken/(taken+skipped)) to include pending doses in denominator
- History days clamped to [1, 90] to prevent excessive queries

#### Agent C Retrospective
*(To be filled by Agent C)*

#### Agent D Retrospective
*(To be filled by Agent D)*

#### Agent E Retrospective
**Status**: Complete — all 3 files created/modified, `tsc --noEmit` clean (only error is in Dashboard.tsx — Agent F's domain).

**Created/modified**:
- `mini-app/src/types/medication.ts` (new) — 8 types/interfaces: Medication, MedicationLog, TodayScheduleItem, MedicationHistoryDay, MedicationHistoryResponse, AddMedicationData, LogMedicationData + frequency/status enums. Re-exported via `types/index.ts`.
- `mini-app/src/api/client.ts` (modified) — Added 7 methods to ApiClient: getMedications, addMedication, updateMedication, deleteMedication, getTodaySchedule, logMedication, getMedicationHistory. Used deduplicatedGet for reads, TIMEOUT_FAST for user-facing endpoints.
- `mini-app/src/hooks/useMedicationQuery.ts` (new) — 4 queries (useMedications 2min stale, useTodaySchedule 1min stale, useMedicationHistory 5min stale) + 4 mutations (add, update, delete with optimistic remove, log with optimistic status toggle). Exported `medicationKeys` for external cache management.
- `mini-app/src/hooks/useMedicationData.ts` (new) — Wrapper hook exposing clean API: `{ medications, todaySchedule, history, loading, error, addMedication, updateMedication, deleteMedication, logMedication, refresh }`. Uses useCallback for stable function references.

**Design decisions**:
- Used `userId` (telegram_id) consistently as the user identifier, matching the pattern in Agent B's API routes
- Optimistic updates on delete (remove from list) and log (toggle status) for instant feedback
- AddMedicationVars extends AddMedicationData with userId for cache invalidation after mutation
- deleteMedication sends telegram_id in request body (matching Agent B's ownership validation pattern)
- useMedicationData wraps all queries/mutations so page components don't need to know about React Query internals

#### Agent F Retrospective
**Status**: Complete — all 4 tasks done, `tsc --noEmit` passes with zero errors in my files.

**What was done:**
1. **Navigation.tsx** — Added conditional Pill tab (lucide-react `Pill` icon). Uses `useDashboardStats` hook to read cached stats and check if medication mode is in user's active modes. Tab inserts between Quests and Leaderboard. Adjusted padding when 6 items shown. Fixed `handleNavKeyDown` dependency array.
2. **MedicationWidget.tsx** (new) — Compact dashboard card with emerald-themed pill icon, progress bar (taken/total), next-due medication with time-until, all-done checkmark state, empty state hint. Navigates to /medications on tap. Uses `memo` + framer-motion fade-in.
3. **Dashboard.tsx** — Imported and rendered `MedicationWidget` after `StreakSection` inside `motion.div` with stagger delay. Conditionally shown only when `stats.modes` includes medication mode.
4. **NotificationHistory.tsx** — Added 5 filter tabs (all/quest/achievement/medication/streak) with `FILTER_ACTIVITY_TYPES` mapping. Added medication & streak icons. Added `AnimatePresence mode="popLayout"` for smooth filter transitions. Added hint text when filter has no results.

**Files changed:**
- `mini-app/src/components/Navigation.tsx` — Added `Pill`, `useMemo`, `useDashboardStats` imports; conditional `MEDICATION_NAV_ITEM`; `hasMedicationMode` check.
- `mini-app/src/components/dashboard/MedicationWidget.tsx` — NEW. ~120 lines.
- `mini-app/src/pages/Dashboard.tsx` — Added `MedicationWidget` import + conditional render.
- `mini-app/src/pages/NotificationHistory.tsx` — Rewritten with filter state, `FilterType` union, `AnimatePresence`.

**Build**: Only remaining errors are in `Medications.tsx` (Agent D — dosage type mismatch). Agent H should fix.

#### Agent G Retrospective
**Status**: Complete — all 3 i18n files updated, `tsc --noEmit` clean.

**What was done**:
- Added `medication` section (31 keys) to en.ts, ru.ts, zh.ts — covers medication CRUD, status labels (taken/skipped/postponed/pending), frequency options, progress strings with interpolation, empty states
- Added `notifications` section (8 keys) — filter tabs (All/Quests/Achievements/Medication/Streaks), empty state, streak milestone template
- Added `nav.medications` to all 3 files
- Added 3 dashboard widget keys: `medicationWidget`, `medicationProgress`, `nextMedication`
- Total: 141 lines added across 3 files

**Russian translations**: Natural Russian with proper cases (принято/пропущено/отложено/ожидает, дозировка, частота приёма, etc.)
**Chinese translations**: Simplified Chinese with natural phrasing (已服用/已跳过/已推迟/待服用, 剂量, 服用频率, etc.)

**Issues**: None. Clean build, no conflicts with other agents' files.
**Commit**: `61af2b4` on `feature/r87-i18n`

#### Agent H Retrospective
*(To be filled by Agent H)*

#### Agent 0 Retrospective
*(To be filled by Agent 0)*
