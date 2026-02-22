# Parallel Agents Protocol

This file is the single source of truth for running parallel Claude Code agents on the Wibecode RPG bot project. Each "Run" launches 2-6 agents (A, B, C, D, E, F) in separate git worktrees, plus Agent 0 (orchestrator) in the main repo.

For completed run history (Runs 2–79), see `PARALLEL_AGENTS_HISTORY.md`.

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
| **83** | Re-enable Admin Panel | 3 | ⬜ |
| **84** | Polish + Performance Optimization | 3 | ⬜ |
| **85** | Launch Prep + Final QA | 3 | ⬜ |

### Re-enable Pattern (Runs 79-83)
Each re-enable run follows the same 3-agent pattern:
- **Agent A (Backend)**: Uncomment `[MVP-DISABLED]` lines in `server.ts` + `registerJobs.ts` for target features. Verify `npm run build`. Fix any TypeScript errors.
- **Agent B (Frontend)**: Uncomment `[MVP-DISABLED]` lines in `App.tsx`. Update `Navigation.tsx` if pages need nav items. Verify `npm run build`.
- **Agent C (Tests)**: Run `npm run test:full` for both bot and mini-app. Fix ALL broken tests for re-enabled features. Verify `test:mvp` still passes too.

---


## RUN 80: Re-enable Shop + Inventory + Avatars (3 Agents + Agent 0)

### Focus: Uncomment all [MVP-DISABLED] code for shop, inventory, and avatars across backend, frontend, and tests

### Copy-Paste Prompts

**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent 0 for Run 80.
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read PARALLEL_AGENTS.md — you are Agent A of Run 80. Your task: Re-enable shop, inventory, and avatars on the BACKEND.

## What to do

### 1. Uncomment routes in `bot/src/api/server.ts`
Uncomment these 6 lines (remove `// [MVP-DISABLED] ` prefix):
- Line 23: `import { avatarRouter } from './routes/avatars.js';`
- Line 25: `import { shopRouter } from './routes/shop.js';`
- Line 26: `import { inventoryRouter } from './routes/inventory.js';`
- Line 127: `app.use('/api/avatars', avatarRouter);`
- Line 129: `app.use('/api/shop', shopRouter);`
- Line 130: `app.use('/api/inventory', inventoryRouter);`

### 2. No jobs to uncomment
Shop/inventory/avatars have no background jobs in registerJobs.ts.

### 3. Verify route files exist and compile
Check that these files exist and have no TypeScript errors:
- `bot/src/api/routes/avatars.ts`
- `bot/src/api/routes/shop.ts`
- `bot/src/api/routes/inventory.ts`

### 4. Build verification
Run: `cd bot && npx tsc --noEmit`
Fix any TypeScript errors that arise from re-enabling these features.

OWNED: bot/src/api/server.ts, bot/src/api/routes/avatars.ts, bot/src/api/routes/shop.ts, bot/src/api/routes/inventory.ts
FORBIDDEN: mini-app/*, bot/src/__tests__/* (test files), PARALLEL_AGENTS.md (except your retrospective section)
GRAY AREA: bot/src/api/server.ts — ONLY uncomment the 6 lines listed above. Do NOT touch other [MVP-DISABLED] lines.
After done, verify build: cd bot && npx tsc --noEmit. Write retrospective.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read PARALLEL_AGENTS.md — you are Agent B of Run 80. Your task: Re-enable shop, inventory, and avatars on the FRONTEND (mini-app).

## What to do

### 1. Uncomment pages in `mini-app/src/App.tsx`
Uncomment these lines (remove comment markers):

Lazy imports:
- Line 27: `const AvatarCustomizer = lazy(() => import('@/pages/AvatarCustomizer').then(m => ({ default: m.AvatarCustomizer })));`
- Line 29: `const Inventory = lazy(() => import('@/pages/Inventory').then(m => ({ default: m.Inventory })));`
- Line 30: `const Shop = lazy(() => import('@/pages/Shop').then(m => ({ default: m.Shop })));`

Routes (inside the <Routes> block):
- Line 152: `<Route path="/avatar" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><AvatarCustomizer /></ProtectedRoute>} />`
- Line 154: `<Route path="/inventory" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><Inventory /></ProtectedRoute>} />`
- Line 155: `<Route path="/shop" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><Shop /></ProtectedRoute>} />`
- Line 156: `<Route path="/shop/:itemId" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><Shop /></ProtectedRoute>} />`

### 2. Verify page components and hooks exist
Check these files exist and compile:
- `mini-app/src/pages/AvatarCustomizer.tsx`
- `mini-app/src/pages/Inventory.tsx`
- `mini-app/src/pages/Shop.tsx`
- `mini-app/src/components/avatar/*` (AvatarRenderer, AvatarAnimator, AvatarSprites)
- `mini-app/src/components/shop/*` (PurchaseModal, PurchaseSuccessAnimation)
- `mini-app/src/hooks/useAvatar.ts`
- `mini-app/src/hooks/useInventory.ts`
- `mini-app/src/hooks/useShop.ts`

### 3. Build verification
Run: `cd mini-app && npx tsc --noEmit && npm run build`
Fix any TypeScript errors.

OWNED: mini-app/src/App.tsx, mini-app/src/pages/AvatarCustomizer.tsx, mini-app/src/pages/Inventory.tsx, mini-app/src/pages/Shop.tsx, mini-app/src/components/avatar/*, mini-app/src/components/shop/*, mini-app/src/hooks/useAvatar.ts, mini-app/src/hooks/useInventory.ts, mini-app/src/hooks/useShop.ts
FORBIDDEN: bot/*, PARALLEL_AGENTS.md (except your retrospective section)
GRAY AREA: mini-app/src/App.tsx — ONLY uncomment the 7 lines listed above. Do NOT touch other [MVP-DISABLED] lines.
After done, verify build: cd mini-app && npx tsc --noEmit && npm run build. Write retrospective.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read PARALLEL_AGENTS.md — you are Agent C of Run 80. Your task: Fix and verify ALL tests for shop, inventory, and avatars.

## What to do

### 1. Run all shop/inventory/avatar tests individually
Run each test file and fix failures:

Bot tests:
- `cd bot && npx vitest --run src/__tests__/routes/http/avatars.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/shop.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/inventory.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/integration/shop-purchase-equip.test.ts`

Mini-app tests:
- `cd mini-app && npx vitest --run src/__tests__/pages/AvatarCustomizer.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/pages/Inventory.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/pages/Shop.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/avatar/AvatarRenderer.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/avatar/AvatarAnimator.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/hooks/useAvatar.test.ts`
- `cd mini-app && npx vitest --run src/__tests__/hooks/useShop.test.ts`
- `cd mini-app && npx vitest --run src/__tests__/data/avatarOptions.test.ts`

Note: `avatars.http.test.ts` had 6 failures in Run 79 test:full — these MUST be fixed.

### 2. Fix any failing tests
Common issues to watch for:
- Mock/spy setups that reference old API patterns
- Missing database table mocks
- Component import errors if page structure changed

### 3. Update test:mvp scripts
After fixing tests, update `test:mvp` in BOTH package.json files to include shop/inventory/avatar test files:
- `bot/package.json` — add avatars, shop, inventory, shop-purchase-equip test files
- `mini-app/package.json` — add AvatarCustomizer, Shop, Inventory pages + avatar components + hooks

### 4. Verify everything passes
- Run: `cd bot && npm run test:mvp` — ALL must pass
- Run: `cd mini-app && npm run test:mvp` — ALL must pass

OWNED: bot/src/__tests__/routes/http/avatars.http.test.ts, bot/src/__tests__/routes/http/shop.http.test.ts, bot/src/__tests__/routes/http/inventory.http.test.ts, bot/src/__tests__/integration/shop-purchase-equip.test.ts, mini-app/src/__tests__/pages/AvatarCustomizer.test.tsx, mini-app/src/__tests__/pages/Inventory.test.tsx, mini-app/src/__tests__/pages/Shop.test.tsx, mini-app/src/__tests__/components/avatar/*.test.tsx, mini-app/src/__tests__/hooks/useAvatar.test.ts, mini-app/src/__tests__/hooks/useShop.test.ts, mini-app/src/__tests__/data/avatarOptions.test.ts, bot/package.json (ONLY test:mvp script), mini-app/package.json (ONLY test:mvp script)
FORBIDDEN: bot/src/api/*, bot/src/jobs/*, mini-app/src/pages/*, mini-app/src/components/* (source code — only test files), PARALLEL_AGENTS.md (except your retrospective section)
After done, verify: cd bot && npm run test:mvp && cd ../mini-app && npm run test:mvp. Write retrospective.
```

### Run 80 File Ownership Matrix

| File/Dir | Agent A | Agent B | Agent C |
|----------|---------|---------|---------|
| bot/src/api/server.ts | OWNED | ❌ | ❌ |
| bot/src/api/routes/avatars.ts | OWNED | ❌ | ❌ |
| bot/src/api/routes/shop.ts | OWNED | ❌ | ❌ |
| bot/src/api/routes/inventory.ts | OWNED | ❌ | ❌ |
| mini-app/src/App.tsx | ❌ | OWNED | ❌ |
| mini-app/src/pages/AvatarCustomizer.tsx | ❌ | OWNED | ❌ |
| mini-app/src/pages/Shop.tsx | ❌ | OWNED | ❌ |
| mini-app/src/pages/Inventory.tsx | ❌ | OWNED | ❌ |
| mini-app/src/components/avatar/* | ❌ | OWNED | ❌ |
| mini-app/src/components/shop/* | ❌ | OWNED | ❌ |
| mini-app/src/hooks/use{Avatar,Shop,Inventory}.ts | ❌ | OWNED | ❌ |
| bot/src/__tests__/** (avatar/shop/inventory) | ❌ | ❌ | OWNED |
| mini-app/src/__tests__/** (avatar/shop/inventory) | ❌ | ❌ | OWNED |
| bot/package.json (test:mvp only) | ❌ | ❌ | OWNED |
| mini-app/package.json (test:mvp only) | ❌ | ❌ | OWNED |

### Run 80 Merge Order
1. Agent A (backend — re-enable routes)
2. Agent B (frontend — re-enable pages)
3. Agent C (tests — fix tests + update test:mvp scripts)

### Run 80 Retrospectives

#### Agent A Retrospective
- **Task**: Re-enable shop, inventory, and avatars on the backend
- **Changes**: Uncommented 6 lines in `bot/src/api/server.ts` — 3 imports (avatarRouter, shopRouter, inventoryRouter) and 3 route mounts (`/api/avatars`, `/api/shop`, `/api/inventory`)
- **Verification**: All 3 route files exist. `npx tsc --noEmit` passed with zero errors.
- **Issues**: None. Clean uncomment, no dependency or type issues.
- **Time**: ~2 minutes

#### Agent B Retrospective
- **Task**: Re-enable shop, inventory, and avatars on the frontend (mini-app)
- **Changes**: Uncommented 7 lines in `mini-app/src/App.tsx` — 3 lazy imports (AvatarCustomizer, Inventory, Shop) and 4 route definitions (`/avatar`, `/inventory`, `/shop`, `/shop/:itemId`)
- **Verification**: All page components, hooks (useAvatar, useInventory, useShop), and sub-components (avatar/*, shop/*) confirmed present. `npx tsc --noEmit` passed with zero errors. `npm run build` succeeded — new chunks: AvatarCustomizer (7.91 kB), AvatarRenderer (7.87 kB), Inventory (8.41 kB), Shop (15.17 kB).
- **Issues**: None. Clean uncomment, all files were already in place from pre-MVP development.
- **Time**: ~3 minutes

#### Agent C Retrospective
**Status:** COMPLETE

**What was done:**
- Ran all 4 bot test files: shop (21 pass), inventory (15 pass), shop-purchase-equip integration (20 pass), avatars (6 failed / 5 passed)
- Fixed avatars.http.test.ts: 6 tests failed because the avatar route resolves `telegram_id → DB user_id` via an initial `queryOne` call, but tests only mocked the second query. Added user lookup mock (`{ id: N }`) as the first `mockResolvedValueOnce` in all 6 failing tests.
- Ran all 8 mini-app test files: AvatarCustomizer (8 pass), Inventory (11 pass), Shop (11 pass), AvatarRenderer (8 pass), AvatarAnimator (14 pass), useAvatar (10 pass), useShop (12 pass), avatarOptions (11 pass) — ALL passed immediately, 0 fixes needed.
- Updated bot `test:mvp` script: added 4 entries (avatars.http, shop.http, inventory.http, shop-purchase-equip)
- Updated mini-app `test:mvp` script: added 7 entries (AvatarCustomizer, Inventory, Shop pages + avatar components dir + useAvatar, useShop hooks + avatarOptions data)
- Final verification: bot test:mvp = 65 files / 780 tests ALL PASS; mini-app test:mvp = 90 files / 476 tests ALL PASS

**Files changed:** bot/src/__tests__/routes/http/avatars.http.test.ts (test fix), bot/package.json (test:mvp), mini-app/package.json (test:mvp)

**Recommendations:** None — all shop/inventory/avatar tests passing cleanly.

#### Agent 0 Retrospective
- **Merge**: Agents A & B left uncommitted changes in main repo (same pattern as Run 79 — agents ignore worktrees). Agent C made 3 commits to main. Committed A+B changes as a6a4266.
- **Build**: Both projects pass `tsc --noEmit`. Initial server deploy failed (`tsc: not found`) because `npm install --omit=dev` was used — fixed by running `npm install` (with dev deps).
- **Tests**: Bot 65 files / 780 tests, Mini-app 90 files / 476 tests. Total: 1,256 tests (up from 1,104 in Run 79).
- **Deploy**: a6a4266 deployed, health OK, mini-app API URL verified.
- **Archive**: Moved Runs 75-79 to PARALLEL_AGENTS_HISTORY.md (archive point after Run 80). History now covers Runs 2-79, main file has Run 80 only.
- **Cleanup**: Removed 3 worktrees + deleted feature/r80-* branches (local + remote).

**Recommendations**:
- Run 81 per roadmap: Re-enable Social + Finance
- Drop worktree creation — agents consistently work in main repo. Just create branches for documentation purposes.

---

## RUN 81: Re-enable Social + Finance (3 Agents + Agent 0)

### Focus: Uncomment all [MVP-DISABLED] code for social and finance features across backend, frontend, and tests

### Copy-Paste Prompts

**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent 0 for Run 81.
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent A of Run 81. Your task: Re-enable social and finance on the BACKEND.

## What to do

### 1. Uncomment routes in `bot/src/api/server.ts`
Uncomment these 4 lines (remove `// [MVP-DISABLED] ` prefix):
- Line 22: `import { socialRouter } from './routes/social.js';`
- Line 29: `import { financeRouter } from './routes/finance.js';`
- Line 126: `app.use('/api/social', socialRouter);`
- Line 133: `app.use('/api/finance', financeRouter);`

### 2. No jobs to uncomment
Social/finance have no specific background jobs in registerJobs.ts.

### 3. Verify route files exist and compile
Check that these files exist and have no TypeScript errors:
- `bot/src/api/routes/social.ts`
- `bot/src/api/routes/finance.ts`

### 4. Build verification
Run: `cd bot && npx tsc --noEmit`
Fix any TypeScript errors that arise from re-enabling these features.

OWNED: bot/src/api/server.ts, bot/src/api/routes/social.ts, bot/src/api/routes/finance.ts
FORBIDDEN: mini-app/*, bot/src/__tests__/* (test files), PARALLEL_AGENTS.md (except your retrospective section)
GRAY AREA: bot/src/api/server.ts — ONLY uncomment the 4 lines listed above. Do NOT touch other [MVP-DISABLED] lines.
After done, verify build: cd bot && npx tsc --noEmit. Write retrospective in PARALLEL_AGENTS.md under "Run 81 Retrospectives > Agent A Retrospective".
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent B of Run 81. Your task: Re-enable social and finance on the FRONTEND (mini-app).

## What to do

### 1. Uncomment pages in `mini-app/src/App.tsx`
Uncomment these lines (remove comment markers):

Lazy imports:
- Line 25: `const Social = lazy(() => import('@/pages/Social').then(m => ({ default: m.Social })));`
- Line 26: `const Finance = lazy(() => import('@/pages/Finance').then(m => ({ default: m.Finance })));`

Routes (inside the <Routes> block):
- Line 148: `<Route path="/social" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><Social /></ProtectedRoute>} />`
- Line 149: `<Route path="/finance" element={<ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy><Finance /></ProtectedRoute>} />`

### 2. Verify page components and hooks exist
Check these files exist and compile:
- `mini-app/src/pages/Social.tsx`
- `mini-app/src/pages/Finance.tsx`
- `mini-app/src/hooks/useSocial.ts`
- `mini-app/src/hooks/useFinanceAnalytics.ts`
- `mini-app/src/components/social/*` (ChallengeCard, ChallengeDetailModal, ChallengeForm, ChallengesList, FriendRequestForm, FriendsList)
- `mini-app/src/components/finance/*` (BudgetForm, BudgetSummary, BudgetTracker, GoalCard, GoalContribution, GoalForm, SavingsGoal)

### 3. Build verification
Run: `cd mini-app && npx tsc --noEmit && npm run build`
Fix any TypeScript errors.

OWNED: mini-app/src/App.tsx, mini-app/src/pages/Social.tsx, mini-app/src/pages/Finance.tsx, mini-app/src/components/social/*, mini-app/src/components/finance/*, mini-app/src/hooks/useSocial.ts, mini-app/src/hooks/useFinanceAnalytics.ts
FORBIDDEN: bot/*, PARALLEL_AGENTS.md (except your retrospective section)
GRAY AREA: mini-app/src/App.tsx — ONLY uncomment the 4 lines listed above. Do NOT touch other [MVP-DISABLED] lines.
After done, verify build: cd mini-app && npx tsc --noEmit && npm run build. Write retrospective in PARALLEL_AGENTS.md under "Run 81 Retrospectives > Agent B Retrospective".
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent C of Run 81. Your task: Fix and verify ALL tests for social and finance features.

## What to do

### 1. Run all social/finance tests individually
Run each test file and fix failures:

Bot tests:
- `cd bot && npx vitest --run src/__tests__/routes/http/social.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/finance.http.test.ts`

Mini-app tests:
- `cd mini-app && npx vitest --run src/__tests__/pages/Social.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/pages/Finance.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/hooks/useSocial.test.ts`
- `cd mini-app && npx vitest --run src/__tests__/components/social/ChallengeCard.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/social/ChallengeDetailModal.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/social/ChallengeForm.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/social/ChallengesList.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/social/FriendRequestForm.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/social/FriendsList.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/finance/BudgetForm.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/finance/BudgetSummary.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/finance/BudgetTracker.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/finance/GoalCard.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/finance/GoalContribution.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/finance/GoalForm.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/finance/SavingsGoal.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/finance/useBudget.test.ts`
- `cd mini-app && npx vitest --run src/__tests__/components/finance/useSavingsGoals.test.ts`

### 2. Fix any failing tests
Common issues to watch for:
- Mock/spy setups that reference old API patterns
- Missing database table mocks (social has friends/challenges tables)
- Component import errors if page structure changed

### 3. Update test:mvp scripts
After fixing tests, update `test:mvp` in BOTH package.json files to include social/finance test files:
- `bot/package.json` — add social.http, finance.http test files
- `mini-app/package.json` — add Social, Finance pages + social components dir + finance components dir + useSocial hook

### 4. Verify everything passes
- Run: `cd bot && npm run test:mvp` — ALL must pass
- Run: `cd mini-app && npm run test:mvp` — ALL must pass

OWNED: bot/src/__tests__/routes/http/social.http.test.ts, bot/src/__tests__/routes/http/finance.http.test.ts, mini-app/src/__tests__/pages/Social.test.tsx, mini-app/src/__tests__/pages/Finance.test.tsx, mini-app/src/__tests__/hooks/useSocial.test.ts, mini-app/src/__tests__/components/social/*.test.tsx, mini-app/src/__tests__/components/finance/*.test.tsx, mini-app/src/__tests__/components/finance/*.test.ts, bot/package.json (ONLY test:mvp script), mini-app/package.json (ONLY test:mvp script)
FORBIDDEN: bot/src/api/*, bot/src/jobs/*, mini-app/src/pages/*, mini-app/src/components/* (source code — only test files), PARALLEL_AGENTS.md (except your retrospective section)
After done, verify: cd bot && npm run test:mvp && cd ../mini-app && npm run test:mvp. Write retrospective in PARALLEL_AGENTS.md under "Run 81 Retrospectives > Agent C Retrospective".
```

### Run 81 File Ownership Matrix

| File/Dir | Agent A | Agent B | Agent C |
|----------|---------|---------|---------|
| bot/src/api/server.ts | OWNED | ❌ | ❌ |
| bot/src/api/routes/social.ts | OWNED | ❌ | ❌ |
| bot/src/api/routes/finance.ts | OWNED | ❌ | ❌ |
| mini-app/src/App.tsx | ❌ | OWNED | ❌ |
| mini-app/src/pages/Social.tsx | ❌ | OWNED | ❌ |
| mini-app/src/pages/Finance.tsx | ❌ | OWNED | ❌ |
| mini-app/src/components/social/* | ❌ | OWNED | ❌ |
| mini-app/src/components/finance/* | ❌ | OWNED | ❌ |
| mini-app/src/hooks/use{Social,FinanceAnalytics}.ts | ❌ | OWNED | ❌ |
| bot/src/__tests__/** (social/finance) | ❌ | ❌ | OWNED |
| mini-app/src/__tests__/** (social/finance) | ❌ | ❌ | OWNED |
| bot/package.json (test:mvp only) | ❌ | ❌ | OWNED |
| mini-app/package.json (test:mvp only) | ❌ | ❌ | OWNED |

### Run 81 Merge Order
1. Agent A (backend — re-enable routes)
2. Agent B (frontend — re-enable pages)
3. Agent C (tests — fix tests + update test:mvp scripts)

### Run 81 Retrospectives

#### Agent A Retrospective
- **Task**: Re-enable social and finance on the backend
- **Changes**: Uncommented 4 lines in `bot/src/api/server.ts` — 2 imports (socialRouter, financeRouter) and 2 route mounts (`/api/social`, `/api/finance`)
- **Verification**: Both route files exist (`social.ts`, `finance.ts`). `npx tsc --noEmit` passed with zero errors.
- **Issues**: None. Clean uncomment, no dependency or type issues.
- **Time**: ~2 minutes

#### Agent B Retrospective
- **Task**: Re-enable social and finance on the frontend (mini-app)
- **Changes**: Uncommented 4 lines in `mini-app/src/App.tsx` — 2 lazy imports (Social, Finance) and 2 route definitions (`/social`, `/finance`)
- **Verification**: All page components (Social.tsx, Finance.tsx), hooks (useSocial.ts, useFinanceAnalytics.ts), and sub-components (social/6 files, finance/11 files) confirmed present. `npx tsc --noEmit` passed with zero errors. `npm run build` succeeded — new chunks: Social (33.56 kB), Finance (405.91 kB).
- **Issues**: None. Clean uncomment, all files were already in place from pre-MVP development.
- **Time**: ~3 minutes

#### Agent C Retrospective
**Status:** COMPLETE

**What was done:**
- Ran all 2 bot test files: social (58 pass), finance (19 pass) — ALL passed immediately, 0 fixes needed.
- Ran all 19 mini-app test files: Social page (22 pass), Finance page (11 pass), useSocial hook (19 pass), 6 social components (48 pass: ChallengeCard 10, ChallengeDetailModal 12, ChallengeForm 10, ChallengesList 4, FriendRequestForm 7, FriendsList 5), 9 finance components (80 pass: BudgetForm 6, BudgetSummary 5, BudgetTracker 8, GoalCard 11, GoalContribution 9, GoalForm 5, SavingsGoal 8, useBudget 12, useSavingsGoals 16) — ALL passed immediately, 0 fixes needed.
- Updated bot `test:mvp` script: added 2 entries (social.http, finance.http)
- Updated mini-app `test:mvp` script: added 5 entries (Social page, Finance page, useSocial hook, social components dir, finance components dir)
- Final verification: bot test:mvp = 67 files / 857 tests ALL PASS; mini-app test:mvp = 108 files / 656 tests ALL PASS

**Files changed:** bot/package.json (test:mvp script), mini-app/package.json (test:mvp script)

**Recommendations:** None — all social/finance tests passing cleanly with zero fixes required. Total test count now 1,513 (up from 1,256 in Run 80).

#### Agent 0 Retrospective
- **Merge**: Agents A+B committed to main (3 commits). Agent C left uncommitted package.json changes (test:mvp updates). Committed as ed0d4b1.
- **Build**: Both projects pass `tsc --noEmit`.
- **Tests**: Bot 67 files / 857 tests, Mini-app 108 files / 656 tests. Total: 1,513 tests (up from 1,256 in Run 80).
- **Deploy**: 4132021 deployed, health OK, mini-app API URL verified.
- **Note**: Finance chunk is 405.91 kB — may need code splitting in a future optimization run.

**Recommendations**:
- Run 82 per roadmap: Re-enable Content + Activities

---

## RUN 82: Re-enable Content + Activities (3 Agents + Agent 0)

### Focus: Uncomment ALL remaining [MVP-DISABLED] code EXCEPT admin panel. This includes: analytics, export, channel, activities, content, recommendations, punishment, and all remaining background jobs.

### Copy-Paste Prompts

**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent 0 for Run 82.
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent A of Run 82. Your task: Re-enable ALL remaining non-admin backend routes and background jobs.

## What to do

### 1. Uncomment routes in `bot/src/api/server.ts`
Uncomment these 14 lines (remove `// [MVP-DISABLED] ` prefix):

Imports:
- Line 20: `import { punishmentRouter } from './routes/punishment.js';`
- Line 27: `import { analyticsRouter } from './routes/analytics.js';`
- Line 28: `import { exportRouter } from './routes/export.js';`
- Line 30: `import { channelRouter } from './routes/channel.js';`
- Line 31: `import { activityRouter } from './routes/activities.js';`
- Line 32: `import { contentRouter } from './routes/content.js';`
- Line 33: `import { recommendationsRouter } from './routes/recommendations.js';`

Routes:
- Line 124: `app.use('/api/punishment', punishmentRouter);`
- Line 131: `app.use('/api/analytics', analyticsRouter);`
- Line 132: `app.use('/api/export', exportRouter);`
- Line 134: `app.use('/api/channel', channelRouter);`
- Line 135: `app.use('/api/activities', activityRouter);`
- Line 136: `app.use('/api/content', contentRouter);`
- Line 137: `app.use('/api/recommendations', recommendationsRouter);`

⚠️ Do NOT uncomment line 16 (adminRouter import) or line 120 (admin route) — those are for Run 83.

### 2. Uncomment jobs in `bot/src/jobs/registerJobs.ts`
Uncomment these 8 lines:

Imports:
- Line 18: `import * as analyticsExport from './definitions/analyticsExport.js';`
- Line 19: `import * as dailySummary from './definitions/dailySummary.js';`
- Line 22: `import * as punishmentCheck from './definitions/punishmentCheck.js';`

Job definitions:
- Line 36: `{ name: analyticsExport.JOB_NAME, cron: analyticsExport.CRON_SCHEDULE, handler: analyticsExport.handler },`
- Line 37: `{ name: dailySummary.JOB_NAME, cron: dailySummary.CRON_SCHEDULE, handler: dailySummary.handler },`
- Line 40: `{ name: punishmentCheck.JOB_NAME, cron: punishmentCheck.CRON_SCHEDULE, handler: punishmentCheck.handler },`

Bot instance setters:
- Line 46: `dailySummary.setBotInstance(bot);`
- Line 48: `punishmentCheck.setBotInstance(bot);`

### 3. Verify route and job files exist
Check these all compile: analytics.ts, export.ts, channel.ts, activities.ts, content.ts, recommendations.ts, punishment.ts, analyticsExport.ts, dailySummary.ts, punishmentCheck.ts

### 4. Build verification
Run: `cd bot && npx tsc --noEmit`

OWNED: bot/src/api/server.ts, bot/src/jobs/registerJobs.ts, bot/src/api/routes/{analytics,export,channel,activities,content,recommendations,punishment}.ts, bot/src/jobs/definitions/{analyticsExport,dailySummary,punishmentCheck}.ts
FORBIDDEN: mini-app/*, bot/src/__tests__/*, PARALLEL_AGENTS.md (except your retrospective section)
GRAY AREA: server.ts — ONLY uncomment the 14 lines listed. Do NOT touch adminRouter. registerJobs.ts — uncomment ALL 8 lines listed.
After done, verify build: cd bot && npx tsc --noEmit. Write retrospective.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent B of Run 82. Your task: Re-enable ALL remaining non-admin frontend pages.

## What to do

### 1. Uncomment pages in `mini-app/src/App.tsx`

Component import (line 8):
- `import { LazyPageWrapper } from '@/components/LazyPageWrapper';`

Lazy page imports (lines 31-37):
- Line 31: `const Analytics = lazy(() => import('@/pages/Analytics').then(m => ({ default: m.Analytics })));`
- Line 32: `const NotificationHistory = lazy(() => import('@/pages/NotificationHistory').then(m => ({ default: m.NotificationHistory })));`
- Line 33: `const ActivityHub = lazy(() => import('@/pages/ActivityHub').then(m => ({ default: m.ActivityHub })));`
- Line 34: `const ActivityHistory = lazy(() => import('@/pages/ActivityHistory').then(m => ({ default: m.ActivityHistory })));`
- Line 35: `const ContentFeed = lazy(() => import('@/pages/ContentFeed').then(m => ({ default: m.ContentFeed })));`
- Line 36: `const ArticleReader = lazy(() => import('@/pages/ArticleReader').then(m => ({ default: m.ArticleReader })));`
- Line 37: `const ReadingHistory = lazy(() => import('@/pages/ReadingHistory').then(m => ({ default: m.ReadingHistory })));`

Routes (lines 157-163):
- Line 157: `<Route path="/analytics" element={...} />`
- Line 158: `<Route path="/notifications" element={...} />`
- Line 159: `<Route path="/activity" element={...} />`
- Line 160: `<Route path="/activity/history" element={...} />`
- Line 161: `<Route path="/content" element={...} />`
- Line 162: `<Route path="/content/:articleId" element={...} />`
- Line 163: `<Route path="/content/bookmarks" element={...} />`

⚠️ Do NOT uncomment lines 38-40 (admin pages) or lines 164-167 (admin routes) — those are for Run 83.

### 2. Verify page components exist
Check these files compile: Analytics.tsx, NotificationHistory.tsx, ActivityHub.tsx, ActivityHistory.tsx, ContentFeed.tsx, ArticleReader.tsx, ReadingHistory.tsx, and their hooks/components.

### 3. Build verification
Run: `cd mini-app && npx tsc --noEmit && npm run build`

OWNED: mini-app/src/App.tsx, mini-app/src/pages/{Analytics,NotificationHistory,ActivityHub,ActivityHistory,ContentFeed,ArticleReader,ReadingHistory}.tsx, mini-app/src/components/{activity,content}/*, mini-app/src/hooks/{useAnalytics,useContentFeed,useNotificationHistory,useActivities,useReadingHistory}.ts
FORBIDDEN: bot/*, PARALLEL_AGENTS.md (except your retrospective section)
GRAY AREA: App.tsx — ONLY uncomment the 15 lines listed. Do NOT touch admin pages (lines 38-40, 164-167).
After done, verify build: cd mini-app && npx tsc --noEmit && npm run build. Write retrospective.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent C of Run 82. Your task: Fix and verify ALL tests for content, activities, analytics, punishment, and related features.

## What to do

### 1. Run all tests individually and fix failures

Bot tests (10 files):
- `cd bot && npx vitest --run src/__tests__/routes/http/analytics.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/channel.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/punishment.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/punishment-deduct.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/activities.test.ts`
- `cd bot && npx vitest --run src/__tests__/utils/activityQuestMatcher.test.ts`
- `cd bot && npx vitest --run src/__tests__/jobs/analyticsExport.test.ts`
- `cd bot && npx vitest --run src/__tests__/jobs/dailySummary.test.ts`
- `cd bot && npx vitest --run src/__tests__/jobs/punishmentCheck.test.ts`
- `cd bot && npx vitest --run src/__tests__/handlers/dailySummary.test.ts`

Mini-app tests (11 files):
- `cd mini-app && npx vitest --run src/__tests__/pages/ActivityHub.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/pages/ActivityHistory.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/pages/ContentFeed.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/pages/ArticleReader.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/pages/ReadingHistory.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/hooks/useContentFeed.test.ts`
- `cd mini-app && npx vitest --run src/__tests__/hooks/useReadingHistory.test.ts`
- `cd mini-app && npx vitest --run src/__tests__/api/content.test.ts`
- `cd mini-app && npx vitest --run src/__tests__/components/content/ContentQuiz.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/analytics/ModeAnalytics.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/analytics/useModeAnalytics.test.ts`

### 2. Fix any failing tests
Common issues:
- Mock setups referencing old API patterns
- Missing database table mocks for activities/content/punishment tables
- Timer-related issues in punishment/dailySummary tests

### 3. Update test:mvp scripts
Update `test:mvp` in BOTH package.json files:
- `bot/package.json` — add: analytics.http, channel.http, punishment.http, punishment-deduct.http, activities, activityQuestMatcher, analyticsExport, dailySummary (job), dailySummary (handler), punishmentCheck
- `mini-app/package.json` — add: ActivityHub, ActivityHistory, ContentFeed, ArticleReader, ReadingHistory pages + useContentFeed, useReadingHistory hooks + content API test + content/ContentQuiz component + analytics dir

### 4. Verify everything passes
- Run: `cd bot && npm run test:mvp` — ALL must pass
- Run: `cd mini-app && npm run test:mvp` — ALL must pass

OWNED: All test files listed above, bot/package.json (ONLY test:mvp script), mini-app/package.json (ONLY test:mvp script)
FORBIDDEN: bot/src/api/*, bot/src/jobs/*, mini-app/src/pages/*, mini-app/src/components/* (source code), PARALLEL_AGENTS.md (except your retrospective section)
After done, verify: cd bot && npm run test:mvp && cd ../mini-app && npm run test:mvp. Write retrospective.
```

### Run 82 File Ownership Matrix

| File/Dir | Agent A | Agent B | Agent C |
|----------|---------|---------|---------|
| bot/src/api/server.ts | OWNED | ❌ | ❌ |
| bot/src/jobs/registerJobs.ts | OWNED | ❌ | ❌ |
| bot/src/api/routes/{analytics,export,channel,activities,content,recommendations,punishment}.ts | OWNED | ❌ | ❌ |
| bot/src/jobs/definitions/{analyticsExport,dailySummary,punishmentCheck}.ts | OWNED | ❌ | ❌ |
| mini-app/src/App.tsx | ❌ | OWNED | ❌ |
| mini-app/src/pages/{Analytics,NotificationHistory,ActivityHub,ActivityHistory,ContentFeed,ArticleReader,ReadingHistory}.tsx | ❌ | OWNED | ❌ |
| mini-app/src/components/{activity,content}/* | ❌ | OWNED | ❌ |
| mini-app/src/hooks/{useAnalytics,useContentFeed,useNotificationHistory,useActivities,useReadingHistory}.ts | ❌ | OWNED | ❌ |
| bot/src/__tests__/** (content/activities/analytics/punishment) | ❌ | ❌ | OWNED |
| mini-app/src/__tests__/** (content/activities/analytics) | ❌ | ❌ | OWNED |
| bot/package.json (test:mvp only) | ❌ | ❌ | OWNED |
| mini-app/package.json (test:mvp only) | ❌ | ❌ | OWNED |

### Run 82 Merge Order
1. Agent A (backend — re-enable routes + jobs)
2. Agent B (frontend — re-enable pages)
3. Agent C (tests — fix tests + update test:mvp scripts)

### Run 82 Retrospectives

#### Agent A Retrospective
- **Task**: Re-enable all remaining non-admin backend routes and background jobs
- **Changes in server.ts**: Uncommented 14 lines — 7 imports (punishmentRouter, analyticsRouter, exportRouter, channelRouter, activityRouter, contentRouter, recommendationsRouter) and 7 route mounts (`/api/punishment`, `/api/analytics`, `/api/export`, `/api/channel`, `/api/activities`, `/api/content`, `/api/recommendations`)
- **Changes in registerJobs.ts**: Uncommented 8 lines — 3 imports (analyticsExport, dailySummary, punishmentCheck), 3 job definitions in the jobs array, and 2 bot instance setters (dailySummary.setBotInstance, punishmentCheck.setBotInstance)
- **Remaining disabled**: Only admin lines remain in server.ts (line 16 import + line 120 route mount) — reserved for Run 83
- **Verification**: All 7 route files and 3 job definition files exist. `npx tsc --noEmit` passed with zero errors.
- **Issues**: None. Clean uncomment, no dependency or type issues.
- **Time**: ~3 minutes

#### Agent B Retrospective
- **Task**: Re-enable all remaining non-admin frontend pages (analytics, notifications, activities, content)
- **Changes**: Uncommented 14 lines in `mini-app/src/App.tsx` — 7 lazy imports (Analytics, NotificationHistory, ActivityHub, ActivityHistory, ContentFeed, ArticleReader, ReadingHistory) and 7 route definitions (`/analytics`, `/notifications`, `/activity`, `/activity/history`, `/content`, `/content/:articleId`, `/content/bookmarks`)
- **Note**: Did NOT uncomment `LazyPageWrapper` import (line 8) — it's only used by admin routes (Run 83) and TypeScript flagged it as unused (TS6133). Left it commented to keep a clean build.
- **Verification**: All 7 page components, 5 hooks (useAnalytics, useContentFeed, useNotificationHistory, useActivities, useReadingHistory), and 6 sub-components (activity/3, content/3) confirmed present. `npx tsc --noEmit` passed with zero errors. `npm run build` succeeded — new chunks: Analytics (9.44 kB), NotificationHistory (4.29 kB), ActivityHub (10.43 kB), ActivityHistory (14.57 kB), ContentFeed (8.33 kB), ArticleReader (11.95 kB), ReadingHistory (13.06 kB).
- **Issues**: None. Clean uncomment, all files were already in place from pre-MVP development.
- **Time**: ~3 minutes

#### Agent C Retrospective
**Status:** COMPLETE

**What was done:**
- Ran all 10 bot test files: analytics (10 pass), channel (8 pass), punishment (24 pass), punishment-deduct (11 pass), activities (24 pass), activityQuestMatcher (10 pass), analyticsExport (6 pass), dailySummary job (16 pass), punishmentCheck (6 pass), dailySummary handler (8 pass) — ALL passed immediately, 0 fixes needed.
- Ran all 11 mini-app test files: ActivityHub (12 pass), ActivityHistory (8 pass), ContentFeed (13 pass), ArticleReader (11 pass), ReadingHistory (14 pass), useContentFeed (11 pass), useReadingHistory (14 pass), content API (26 pass), ContentQuiz (22 pass), ModeAnalytics (8 pass), useModeAnalytics (10 pass) — ALL passed immediately, 0 fixes needed.
- Updated bot `test:mvp` script: added 9 entries (analytics.http, channel.http, punishment.http, punishment-deduct.http, activities, activityQuestMatcher, analyticsExport, dailySummary job, punishmentCheck). Note: dailySummary handler was already covered by `src/__tests__/handlers` dir entry.
- Updated mini-app `test:mvp` script: added 10 entries (ActivityHub, ActivityHistory, ContentFeed, ArticleReader, ReadingHistory pages + useContentFeed, useReadingHistory hooks + content API test + content components dir + analytics components dir)
- Final verification: bot test:mvp = 76 files / 972 tests ALL PASS; mini-app test:mvp = 121 files / 831 tests ALL PASS

**Files changed:** bot/package.json (test:mvp script), mini-app/package.json (test:mvp script)

**Recommendations:** None — all content/activities/analytics/punishment tests passing cleanly with zero fixes required. Total test count now 1,803 (up from 1,513 in Run 81).

#### Agent 0 Retrospective
- **Merge**: All 4 agent commits already on main (clean tree). No uncommitted changes this time.
- **Build**: Both projects pass `tsc --noEmit`.
- **Tests**: Bot 76 files / 972 tests, Mini-app 121 files / 831 tests. Total: 1,803 tests (up from 1,513 in Run 81).
- **Deploy**: 6da1490 deployed, health OK.
- **Note**: All non-admin features now re-enabled. Only adminRouter (2 lines) and admin pages (8 lines) remain disabled. All 3 background jobs (analyticsExport, dailySummary, punishmentCheck) restored.

**Recommendations**:
- Run 83 per roadmap: Re-enable Admin Panel + expanded scope (8 agents) — onboarding i18n fix, punishment rebalance, quest performance, reference docs export

---

## RUN 83: Admin Panel + Big Polish (8 Agents + Agent 0)

### Focus: Complete MVP recovery (admin re-enable) + fix onboarding i18n + rebalance punishments + fix quest performance + create reference docs + optimize tests

### Copy-Paste Prompts

**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent 0 for Run 83.
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent A of Run 83. Your task: Re-enable the Admin Panel (backend + frontend) — the FINAL MVP-DISABLED uncomment.

## What to do

### 1. Uncomment admin in `bot/src/api/server.ts`
- Line 16: `import { adminRouter } from './routes/admin.js';`
- Line 120: `app.use('/api/admin', adminRouter);`

### 2. Uncomment admin in `mini-app/src/App.tsx`
- Line 8: `import { LazyPageWrapper } from '@/components/LazyPageWrapper';`
- Line 38: `const AdminDashboard = lazy(...)`
- Line 39: `const AdminPlayerList = lazy(...)`
- Line 40: `const AdminPlayerDetail = lazy(...)`
- Line 164: `<Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />`
- Line 165: `<Route path="/admin/dashboard" element={<LazyPageWrapper><AdminDashboard /></LazyPageWrapper>} />`
- Line 166: `<Route path="/admin/players" element={<LazyPageWrapper><AdminPlayerList /></LazyPageWrapper>} />`
- Line 167: `<Route path="/admin/players/:userId" element={<LazyPageWrapper><AdminPlayerDetail /></LazyPageWrapper>} />`

### 3. Build verify
- `cd bot && npx tsc --noEmit`
- `cd mini-app && npx tsc --noEmit && npm run build`

After this, there should be ZERO `[MVP-DISABLED]` lines left in the entire codebase.

OWNED: bot/src/api/server.ts, mini-app/src/App.tsx
FORBIDDEN: All test files, i18n files, onboarding components, tools/, hooks/
Write retrospective when done.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent B of Run 83. Your task: Fix onboarding i18n — all onboarding text must use proper i18n keys with correct Russian translations.

## The Problem
The user did onboarding and half was in Russian, half in English. Russian translations have mistakes. Many strings are hardcoded English in components and data files.

## What to do

### 1. Convert onboarding question text to i18n keys
File: `mini-app/src/data/onboardingQuestions.ts`
- All ~41 questions have hardcoded `title` and `subtitle` strings in English
- All question `options` have hardcoded `label` and `sublabel` strings
- Convert these to i18n key strings (e.g., `'onboardingQuiz.fitness.motivation.title'`)
- The QuizScreen.tsx component will call `t()` on these keys

### 2. Update QuizScreen.tsx to use t()
File: `mini-app/src/components/onboarding/QuizScreen.tsx`
- Import `useTranslation` from react-i18next
- Call `t()` on `config.title`, `config.subtitle`, and option labels/sublabels
- This means the data file stores i18n keys, and QuizScreen resolves them

### 3. Fix hardcoded text in summary components
- `SummaryStats.tsx`: avatar labels ("Gym Warrior" etc.), "Level", "XP"
- `SummarySchedule.tsx`: "Accountability", "Notifications", "No accountability enabled", "Safe Mode ON"
- `SummaryModeCard.tsx`: "Focus Areas", mode names
- Add all these strings as i18n keys

### 4. Fix hardcoded text in punishment components
- `punishment/constants.ts`: "Workout", "Book", "Money", "20 pushups" (NOTE: change values to "3 pushups" per user request — ultra-light for easy), "Read 10 pages" → "Read 3 pages", "Donate $1" → "Donate $0.25"
- `DifficultySelector.tsx`: "How tough?", "Change type", "Safe Mode", "Limits daily losses..."
- Wrap all in i18n keys

### 5. Enable Russian in SplashScreen
File: `mini-app/src/components/onboarding/SplashScreen.tsx`
- Change Russian `available: false` → `available: true`

### 6. Add i18n keys to en.ts
Add ~400+ new keys under `onboardingQuiz` section organized by mode:
- `onboardingQuiz.fitness.motivation.title`, `.subtitle`, `.options.lose_weight`, etc.
- `onboardingQuiz.hydration.*`, `onboardingQuiz.finance.*`, etc.
- `onboardingQuiz.summary.*` for summary screen text
- `onboardingQuiz.punishment.*` for punishment config text

### 7. Add Russian translations to ru.ts
- Add all new keys with CORRECT, high-quality Russian translations
- Review existing Russian onboarding keys for mistakes and fix them
- Pay attention to: proper grammar, natural phrasing, correct verb forms

### 8. Add English placeholder to zh.ts
- Add all new keys but use the ENGLISH text as placeholder (to be translated later)

### 9. Build verify
`cd mini-app && npx tsc --noEmit && npm run build`

OWNED: mini-app/src/i18n/en.ts, mini-app/src/i18n/ru.ts, mini-app/src/i18n/zh.ts, mini-app/src/data/onboardingQuestions.ts, mini-app/src/components/onboarding/QuizScreen.tsx, mini-app/src/components/onboarding/summary/SummaryStats.tsx, mini-app/src/components/onboarding/summary/SummarySchedule.tsx, mini-app/src/components/onboarding/summary/SummaryModeCard.tsx, mini-app/src/components/onboarding/punishment/constants.ts (i18n wrapping + value changes), mini-app/src/components/onboarding/punishment/DifficultySelector.tsx, mini-app/src/components/onboarding/SplashScreen.tsx, mini-app/src/components/onboarding/PunishmentConfig.tsx
FORBIDDEN: bot/, tools/, test files, App.tsx, server.ts, hooks/useQuestsData.ts
Write retrospective when done.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent C of Run 83. Your task: Create Python export tools for onboarding reference data.

## What to do

### 1. Create `tools/onboarding_text_export.py`
Reads i18n files (en.ts, ru.ts) and onboardingQuestions.ts. Outputs a table with columns: Key, English Text, Russian Text. Organized by mode (Fitness, Hydration, Finance, Learning, Medication, Habits) then by question.
- Parse TypeScript files using regex (extract key-value pairs from i18n objects)
- Support `--format markdown` (default) and `--format telegram` (formatted for Telegram message, split into chunks if >4096 chars)

### 2. Create `tools/onboarding_flow_export.py`
Reads onboardingQuestions.ts and useOnboarding.ts to create a flow diagram showing:
- Step sequence (splash → hero_intro → avatar → paths → referral → [mode questions] → punishments → notifications → summary → launch)
- Conditional branching (which mode questions appear based on paths selection)
- What each answer affects (dataKey, nestedKey, stored in which DB table)
- Special conditionals (e.g., fitness_target_weight only shows if motivation includes lose_weight/build_muscle)
- Output as structured text/markdown tree

### 3. Create `tools/punishment_reference_export.py`
Reads punishment constants from frontend and backend to create a reference table:
- All punishment types (workout, book, money) with their labels per difficulty
- XP multipliers per intensity (low=0.25, medium=0.5, high=1.0, extreme=1.5)
- Stars penalty rates per intensity
- Safe mode caps
- Level-based scaling formula
- Output as markdown table

Each tool should:
- Be standalone (runnable with `python tools/tool_name.py`)
- Accept `--format markdown` or `--format telegram` flag
- Read source files relative to project root
- Handle missing files gracefully with clear error messages

OWNED: tools/onboarding_text_export.py (new), tools/onboarding_flow_export.py (new), tools/punishment_reference_export.py (new)
FORBIDDEN: mini-app/src/ (source code — READ ONLY), bot/src/ (READ ONLY), notification_bot_handler.py
Write retrospective when done.
```

**Agent D** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent D of Run 83. Your task: Add reference doc commands to the notification bot.

## What to do

### 1. Add `/onboarding` command
In `tools/notification_bot_handler.py`:
- Add handler for `/onboarding` command
- Calls `tools/onboarding_text_export.py --format telegram` via subprocess
- Sends the output as Telegram message(s) (split if >4096 chars)
- If the tool doesn't exist yet (Agent C hasn't committed), show: "Export tool not available yet. Run from project root: python tools/onboarding_text_export.py"

### 2. Add `/punishments` command
- Calls `tools/punishment_reference_export.py --format telegram`
- Same pattern as /onboarding

### 3. Add `/flow` command
- Calls `tools/onboarding_flow_export.py --format telegram`
- Same pattern as /onboarding

### 4. Update `/help` and `/start`
- Add descriptions for the 3 new commands in the help text
- Update the command list in /start

### 5. Register commands with Telegram
- If there's a `set_my_commands` call, add the new commands
- If not, add one during bot startup

OWNED: tools/notification_bot_handler.py
FORBIDDEN: mini-app/src/, bot/src/, i18n files, App.tsx, server.ts, export tools (Agent C owns those)
Write retrospective when done.
```

**Agent E** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent E of Run 83. Your task: Rebalance the punishment system to be ultra-light for beginners.

## User feedback: "20 pushups as punishment for a beginner is too much"

## New target values

### Frontend display labels (punishment/constants.ts)
NOTE: Agent B may have already wrapped these in i18n keys. If so, update the i18n VALUES in en.ts/ru.ts instead.
- Easy: 3 pushups / Read 3 pages / Donate $0.25
- Medium: 10 pushups / Read 10 pages / Donate $1
- Hard: 25 pushups / Read 25 pages / Donate $3
- Extreme: 50 pushups / Read 50 pages / Donate $10

### Backend XP multipliers (bot/src/api/utils/constants.ts)
Change STARS_PENALTY_RATES to: light=0, moderate=1, strict=3, extreme=5

### Backend punishment job (bot/src/jobs/definitions/punishmentCheck.ts)
1. Change INTENSITY_MULTIPLIER: low=0.25, medium=0.5, high=1.0, extreme=1.5
2. Add level-based scaling AFTER calculating base penalty:
   ```
   const levelScale = Math.min(1.0, (userLevel || 1) / 10);
   xpPenalty = Math.round(xpPenalty * levelScale);
   ```
   This means: Level 1 = 10% penalty, Level 5 = 50%, Level 10+ = full penalty
3. The user query already has access to user data. Add `u.level` to the SELECT if not already there.

### Build verify
`cd bot && npx tsc --noEmit`

OWNED: bot/src/api/utils/constants.ts, bot/src/jobs/definitions/punishmentCheck.ts
GRAY AREA: mini-app/src/components/onboarding/punishment/constants.ts — ONLY change numerical values and display text. If Agent B has wrapped in i18n, update the i18n key values in en.ts instead. Coordinate with Agent B.
FORBIDDEN: App.tsx, server.ts, test files, tools/, hooks/
Write retrospective when done.
```

**Agent F** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent F of Run 83. Your task: Fix quest check-in lag by migrating to React Query.

## The Problem
Every quest check-in triggers 3 full API refetches (active quests, completed quests, today checkins). No caching, no optimistic updates. Result: lag and slow refresh.

## What to do

### 1. Create `mini-app/src/hooks/useQuestsQuery.ts` (new file)
React Query hooks for quest data. NOTE: QueryClient is already configured in App.tsx with staleTime: 5 minutes.

```typescript
// Query keys
const questKeys = {
  all: ['quests'] as const,
  active: (userId: number) => ['quests', 'active', userId] as const,
  completed: (userId: number) => ['quests', 'completed', userId] as const,
  todayCheckins: (userId: number) => ['checkins', 'today', userId] as const,
};

// Hooks using useQuery/useMutation from @tanstack/react-query
// - useActiveQuests(userId) — fetches active quests, staleTime 2min
// - useCompletedQuests(userId) — fetches completed quests, staleTime 5min
// - useTodayCheckins(userId) — fetches today's checkin count, staleTime 1min
// - useCheckinMutation() — POST check-in with optimistic update:
//     onMutate: increment progress in cache instantly
//     onError: rollback
//     onSettled: invalidate active + checkins queries
```

### 2. Refactor `mini-app/src/hooks/useQuestsData.ts`
- Replace useState for activeQuests/completedQuests/todayCheckinCount with data from React Query hooks
- Replace loadQuests() calls with queryClient.invalidateQueries()
- Keep the filtering/sorting useMemo logic (it's fine)
- Keep the handleRefresh callback (just call refetchQueries instead of loadQuests)
- Remove manual loading/error state — React Query provides these via isLoading/isError
- The hook's public API should remain the same so Quests.tsx doesn't need major changes

### 3. Add request cancellation
React Query automatically passes AbortSignal to query functions. Make sure apiClient methods accept and forward the signal.
Check `mini-app/src/api/client.ts` — the deduplicatedGet method already accepts a signal config. Ensure the query functions pass it through.

### 4. Build verify
`cd mini-app && npx tsc --noEmit && npm run build`

OWNED: mini-app/src/hooks/useQuestsData.ts, mini-app/src/hooks/useQuestsQuery.ts (new)
GRAY AREA: mini-app/src/api/client.ts — ONLY if signal forwarding needs a small fix
FORBIDDEN: bot/, tools/, App.tsx, server.ts, i18n files, onboarding components, test files
Write retrospective when done.
```

**Agent G** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent G of Run 83. Your task: Fix admin tests and update test:mvp scripts to include ALL tests.

## What to do

### 1. Run all admin test files individually and fix failures

Bot admin tests (10 files):
- `cd bot && npx vitest --run src/__tests__/routes/admin.test.ts`
- `cd bot && npx vitest --run src/__tests__/middleware/adminAuth.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/admin.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/admin-jobs.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/admin-stats.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/admin-users.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/admin-quests.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/admin-notifications.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/admin-players.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/admin-bulk.test.ts`

Mini-app admin tests (17 files):
- `cd mini-app && npx vitest --run src/__tests__/api/adminClient.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminUserList.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminJobs.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminLogs.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminStatsCard.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminBroadcast.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminUserSearch.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminPagination.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/AdminUserRow.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/admin/AdminUserDetail.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/admin/AdminLoginForm.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/admin/AdminOverview.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/admin/AdminQuestEditor.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/Admin.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/admin/AdminPlayerActions.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/pages/admin/AdminPlayerDetail.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/pages/admin/AdminPlayerList.test.tsx`

### 2. Update test:mvp scripts
Add ALL admin test files to both package.json test:mvp scripts.

### 3. Test suite analysis
After fixing, run `cd bot && npm run test:full` and `cd mini-app && npm run test:full`.
In your retrospective, document:
- Total test count (test:mvp vs test:full)
- Any obviously redundant test files
- Recommendations for test consolidation (but do NOT delete tests — just document)

### 4. Verify
`cd bot && npm run test:mvp && cd ../mini-app && npm run test:mvp` — ALL must pass

OWNED: All admin test files listed above, bot/package.json (test:mvp only), mini-app/package.json (test:mvp only)
FORBIDDEN: bot/src/api/*, bot/src/jobs/*, mini-app/src/pages/*, mini-app/src/components/* (source code), i18n files, tools/
Write retrospective when done.
```

**Agent H** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent H of Run 83. Your task: Fix tests broken by other agents' changes (i18n, punishment rebalance, React Query migration).

## Context
Other agents in this run make breaking changes that affect tests:
- Agent B: Converts hardcoded onboarding strings to i18n keys
- Agent E: Changes punishment XP multipliers and Stars rates
- Agent F: Migrates quest data hooks from manual state to React Query

Your job is to fix any tests that break because of these changes.

## What to do

### 1. Fix onboarding tests (broken by Agent B's i18n changes)
- `cd mini-app && npx vitest --run src/__tests__/components/onboarding/`
- `cd mini-app && npx vitest --run src/__tests__/pages/Onboarding.test.tsx`
- Tests may assert on English strings that are now i18n keys
- Fix: Mock i18n or update assertions to match new key-based rendering

### 2. Fix punishment tests (broken by Agent E's rebalance)
- `cd bot && npx vitest --run src/__tests__/routes/http/punishment.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/routes/http/punishment-deduct.http.test.ts`
- `cd bot && npx vitest --run src/__tests__/jobs/punishmentCheck.test.ts`
- Tests may assert on old XP multiplier values (was 0.5/1.0/1.5/2.0, now 0.25/0.5/1.0/1.5)
- Tests may assert on old Stars rates (was 1/3/5/10, now 0/1/3/5)

### 3. Fix quest tests (broken by Agent F's React Query migration)
- `cd mini-app && npx vitest --run src/__tests__/pages/Quests.test.tsx`
- `cd mini-app && npx vitest --run src/__tests__/components/quests/`
- `cd mini-app && npx vitest --run src/__tests__/components/CheckInButton.test.tsx`
- Tests may need QueryClientProvider wrapper if they don't have one
- Mock React Query hooks if needed

### 4. Verify full test:mvp passes
- `cd bot && npm run test:mvp` — ALL must pass
- `cd mini-app && npm run test:mvp` — ALL must pass

OWNED: mini-app/src/__tests__/components/onboarding/*, mini-app/src/__tests__/pages/Onboarding.test.tsx, bot/src/__tests__/routes/http/punishment.http.test.ts, bot/src/__tests__/routes/http/punishment-deduct.http.test.ts, bot/src/__tests__/jobs/punishmentCheck.test.ts, mini-app/src/__tests__/pages/Quests.test.tsx, mini-app/src/__tests__/components/quests/*, mini-app/src/__tests__/components/CheckInButton.test.tsx
FORBIDDEN: Source code files (only test files), App.tsx, server.ts, i18n files, tools/
Write retrospective when done.
```

### Run 83 File Ownership Matrix

| File/Dir | A | B | C | D | E | F | G | H |
|----------|---|---|---|---|---|---|---|---|
| bot/src/api/server.ts | OWN | - | - | - | - | - | - | - |
| mini-app/src/App.tsx | OWN | - | - | - | - | - | - | - |
| mini-app/src/i18n/{en,ru,zh}.ts | - | OWN | - | - | - | - | - | - |
| mini-app/src/data/onboardingQuestions.ts | - | OWN | R | - | - | - | - | - |
| onboarding components (QuizScreen, summary, punishment, Splash) | - | OWN | - | - | - | - | - | - |
| tools/onboarding_*_export.py (new) | - | - | OWN | - | - | - | - | - |
| tools/punishment_reference_export.py (new) | - | - | OWN | - | - | - | - | - |
| tools/notification_bot_handler.py | - | - | - | OWN | - | - | - | - |
| bot/src/api/utils/constants.ts | - | - | R | - | OWN | - | - | - |
| bot/src/jobs/definitions/punishmentCheck.ts | - | - | R | - | OWN | - | - | - |
| punishment/constants.ts (values) | - | i18n | - | - | vals | - | - | - |
| mini-app/src/hooks/useQuestsData.ts | - | - | - | - | - | OWN | - | - |
| mini-app/src/hooks/useQuestsQuery.ts (new) | - | - | - | - | - | OWN | - | - |
| Admin test files (27) | - | - | - | - | - | - | OWN | - |
| bot/package.json (test:mvp) | - | - | - | - | - | - | OWN | - |
| mini-app/package.json (test:mvp) | - | - | - | - | - | - | OWN | - |
| Onboarding test files | - | - | - | - | - | - | - | OWN |
| Punishment test files | - | - | - | - | - | - | - | OWN |
| Quest test files | - | - | - | - | - | - | - | OWN |

### Run 83 Merge Order
1. Agent A (admin re-enable — touches server.ts + App.tsx)
2. Agent B (onboarding i18n — large change, must precede E)
3. Agent E (punishment rebalance — depends on B for constants.ts)
4. Agent F (quest performance — independent React Query migration)
5. Agent C (export tools — independent Python, no conflicts)
6. Agent D (notification bot — depends on C's tools existing)
7. Agent G (admin tests — depends on A for admin code)
8. Agent H (test fixes — depends on B, E, F for broken tests)

### Run 83 Retrospectives

#### Agent A Retrospective
*(To be filled by Agent A)*

#### Agent B Retrospective
*(To be filled by Agent B)*

#### Agent C Retrospective
*(To be filled by Agent C)*

#### Agent D Retrospective
*(To be filled by Agent D)*

#### Agent E Retrospective
*(To be filled by Agent E)*

#### Agent F Retrospective
*(To be filled by Agent F)*

#### Agent G Retrospective
*(To be filled by Agent G)*

#### Agent H Retrospective
*(To be filled by Agent H)*

#### Agent 0 Retrospective
*(To be filled by Agent 0)*
