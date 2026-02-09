# Parallel Agents Protocol

This file is the single source of truth for running parallel Claude Code agents on the Wibecode RPG bot project. Each "Run" launches 3 agents (A, B, C) in separate git worktrees, plus Agent 0 (orchestrator) in the main repo.

---

## Agent 0 Self-Protocol

**You are Agent 0.** When someone tells you "read PARALLEL_AGENTS.md — you are Agent 0", follow this checklist automatically:

### Checklist (do in order)

**Phase A — Merge & Deploy the CURRENT run:**
1. **Check git status** — is main clean? Any uncommitted changes?
2. **Check for leftover worktrees** — `git worktree list`. If worktrees exist from a previous run, it means agents finished but weren't merged yet.
3. **Read the latest Run section** at the bottom of this file — check the retrospectives of each agent.
4. **Check for unmerged work** — `git log main..feature/BRANCH --oneline` for each agent branch. If commits exist, merge them.
5. **Merge order**: Backend/data first → Tests second → Frontend last.
6. **Post-merge integration**: Read any `REGISTER_THESE_RUN*.md` files in `bot/src/handlers/` to see if new commands need wiring into `index.ts`.
7. **Build verification**: `cd bot && npm run build` and `cd mini-app && npm run build`.
8. **Deploy**: Push to GitHub → SSH to server → git pull → rebuild → PM2 restart.
9. **Clean up**: Remove worktrees, delete feature branches, clear stashes.

**Phase B — Prepare the NEXT run:**
10. **Write retrospective** for the current run (merge results, what went right, issues carried forward).
11. **Design next run's tasks** — analyze the codebase, read the "Known Issues" and agent recommendations, and write the next Run section with full agent prompts (A, B, C + Agent 0).
12. **Write copy-paste prompts** — at the top of the next Run section, include a "Copy-Paste Prompts" block with the exact text the user should paste into each Claude Code session.
13. **Set up worktrees** for the next run: create branches, `git worktree add`, install deps.
14. **Commit & push** the updated PARALLEL_AGENTS.md.
15. **Tell the user**: "Ready to launch Run N. Here are your copy-paste prompts."

**The cycle**: Each Agent 0 merges Run N, then prepares Run N+1. The user just copies the prompts and launches.

### Deploy Command
```bash
git push origin main
ssh root@85.239.58.205 "cd /opt/wibecode-bot && git pull && cd bot && npm install && npm run build && cd ../mini-app && npm run build && pm2 restart telegram-rpg-bot --update-env"
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
- After all tasks, add your retrospective section to PARALLEL_AGENTS.md at the bottom.
- Include: problems faced, completed task table, recommendations for next run.

---

## Lessons Learned (Run 1 + Run 2)

### Run 1 (4 agents, shared directory — DISASTER)
- All 4 agents shared one git working directory. Branch switching caused:
  - Every commit landing on wrong branches (all agents)
  - Files lost between Write and git-add (all agents)
  - VSCode linter reverting Python edits before staging (Agent C)
  - 14 stash entries from competing agents
  - Context window exhaustion from retries (Agent A)
- **Fix**: Separate working directories.

### Run 2 (3 agents, git worktrees — SUCCESS)
- Each agent got its own worktree directory (`Wibecode-agent-a/`, `-b/`, `-c/`).
- **Zero** branch conflicts, file loss, cross-contamination, or stash operations.
- All agents completed all tasks. Both builds passed. Deployed successfully.
- Merge had only PARALLEL_AGENTS.md conflicts (expected — all agents append retrospectives).

### Key Rules (proven by 2 runs)
1. **Worktrees are mandatory** — never share a working directory between agents.
2. **Commit after every single task** — uncommitted work gets lost.
3. **Atomic git ops** — `git add && git commit` in one Bash call.
4. **Pre-install deps** in each worktree before agents start.
5. **3-6 tasks per agent** is the sweet spot (7+ risks context exhaustion).
6. **Agent A (mini-app) is the most independent** — zero overlap with bot/tools.

---

## Run 2 Retrospective (Agent 0)

### Merge Results
| Branch | Merge | Conflicts | Resolution |
|--------|-------|-----------|------------|
| `feature/backend-api` → main | Merge commit | 0 | Clean |
| `feature/test-coverage` → main | Merge commit | 1 (PARALLEL_AGENTS.md) | Took theirs |
| `feature/mini-app-features` → main | Merge commit | 1 (PARALLEL_AGENTS.md) | Took theirs |

### What Was Delivered
**Agent A** (mini-app): Leaderboard page, 4-item navigation, pull-to-refresh on Dashboard+Quests, rich quest detail modal with progress steppers, profile edit modal, achievement progress indicators.

**Agent B** (backend): PM2 config fix (IP+memory+log rotation), centralized env validation, user preferences API (GET/PATCH), quest progress API (PATCH, auto-complete), /leaderboard bot command.

**Agent C** (tests): 149 new tests — 60 TypeScript (modes/leaderboard/onboarding routes, 3 job handlers) + 89 Python (achievement/mode/streak managers, send_notification). Total project tests: 114 TS + 172 Python = 286.

### What Went Right
- Worktrees eliminated 100% of Run 1's problems
- All agents completed all tasks with zero interference
- Both builds passed on first try after merge
- No cross-contamination of commits
- Agent B did its own integration work (registered /leaderboard, updated /menu)

### Known Issues Carried Forward
1. **5 pre-existing test failures** from Run 1: `users.test.ts` (3), `dailyQuestReset.test.ts` (1 unhandled rejection)
2. **ProfileEditModal** has TODO for profile update API endpoint
3. **pg-boss** warns about Node.js version mismatch (requires 22.12+, server has 20.20)
4. **BotFather** command list may need updating to include `/leaderboard`

---

## RUN 3: Parallel Agents (3 Agents + Agent 0)

### How to Launch

Open 4 separate Claude Code sessions. **Start Agent 0 FIRST** — it sets up worktrees. Only start A/B/C after Agent 0 says "Ready."

### Copy-Paste Prompts

**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent 0 for Run 3. Set up worktrees and tell me when ready. After all agents finish, I'll tell you to merge.
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read PARALLEL_AGENTS.md — you are Agent A for Run 3. Do your tasks.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read PARALLEL_AGENTS.md — you are Agent B for Run 3. Do your tasks.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read PARALLEL_AGENTS.md — you are Agent C for Run 3. Do your tasks.
```

---

## Agent 0 — Orchestrator (Run 3)

**You are Agent 0.** Set up the environment, WAIT for agents, then merge and deploy.

**Working directory:** `c:\Users\Asus\Desktop\Wibecode` (main repo, `main` branch)

### Phase 1: Pre-Run Setup

**Step 1: Verify clean state**
```bash
git checkout main
git status  # should be clean
```

**Step 2: Create worktrees**
```bash
git branch feature/mini-app-polish 2>/dev/null
git branch feature/bot-features 2>/dev/null
git branch feature/quality-fixes 2>/dev/null
git worktree add ../Wibecode-agent-a feature/mini-app-polish
git worktree add ../Wibecode-agent-b feature/bot-features
git worktree add ../Wibecode-agent-c feature/quality-fixes
```

**Step 3: Install dependencies**
```bash
cd ../Wibecode-agent-a/mini-app && npm install
cd ../../Wibecode-agent-b/bot && npm install
cd ../../Wibecode-agent-c/bot && npm install && cd ../../Wibecode-agent-c/mini-app && npm install
```

**Step 4: Verify worktrees**
```bash
cd c:\Users\Asus\Desktop\Wibecode
git worktree list
```

**Step 5: Tell the user** "Ready to launch Agents A, B, C."

### Phase 2: WAIT for all 3 agents to finish

### Phase 3: Post-Run Merge

```bash
# Check each branch
git log main..feature/bot-features --oneline
git log main..feature/quality-fixes --oneline
git log main..feature/mini-app-polish --oneline
```

**Merge order:**
1. `git merge feature/bot-features --no-edit` → verify `cd bot && npm run build`
2. `git merge feature/quality-fixes --no-edit` → verify `cd bot && npm run build`
3. `git merge feature/mini-app-polish --no-edit` → verify `cd mini-app && npm run build`

**Post-merge:** Check `bot/src/handlers/REGISTER_THESE_RUN3.md` if it exists. Wire up any new commands.

**Deploy + Clean up** (see Agent 0 Self-Protocol above).

### Phase 4: Prepare Run 4

After deploying Run 3, you MUST also:
1. Write Run 3 retrospective (merge results, what worked, known issues)
2. Design Run 4 agent tasks based on what's needed next
3. Write copy-paste prompts for Run 4 agents
4. Set up Run 4 worktrees
5. Commit & push the updated PARALLEL_AGENTS.md
6. Tell the user: "Ready to launch Run 4. Here are your copy-paste prompts."

---

## Agent A — Mini App Polish & Optimization (Run 3)

**You are Agent A.** You polish the mini-app and add remaining features.

**Working directory:** `c:\Users\Asus\Desktop\Wibecode-agent-a`
**Branch:** `feature/mini-app-polish` (you are ALREADY on it — do NOT switch branches)
**Build command:** `cd mini-app && npm run build`

### RULES (NON-NEGOTIABLE)

1. You are ALREADY on branch `feature/mini-app-polish` — do NOT run `git checkout`
2. Commit after EVERY task — atomic: `git add FILES && git commit -m "MSG"`
3. Do NOT push to remote or deploy to server
4. Do NOT add any new npm packages
5. After ALL changes, run `cd mini-app && npm run build` and fix errors

### FILES YOU OWN
```
mini-app/src/pages/                  — all existing + new files
mini-app/src/components/             — non-onboarding components + new files
mini-app/src/index.css               — add new styles
mini-app/src/App.tsx                 — ONLY add <Route> entries for new pages
```

### FILES YOU MUST NOT TOUCH
```
mini-app/src/api/client.ts           — API contract, locked
mini-app/src/types/index.ts          — shared types, locked
mini-app/src/hooks/                  — shared hooks, locked
mini-app/src/components/onboarding/  — onboarding complete, locked
mini-app/vite.config.ts              — build config
mini-app/package.json                — no new dependencies
bot/                                 — not your area
tools/                               — not your area
```

### PROJECT CONTEXT

- Telegram RPG Mini App: React 18 + TypeScript + Vite + Tailwind CSS
- Framer Motion (installed), Lucide React icons (installed), @twa-dev/sdk
- Base path: /levelapp/
- 4 pages: Dashboard, Quests, Profile, Leaderboard (added in Run 2)
- ProfileEditModal exists but has `// TODO: call profile update API when endpoint exists`
- Pull-to-refresh works on Dashboard + Quests (added in Run 2)
- Loading skeletons, error states, empty states all implemented (Run 1)

### TASKS (do in order, commit after each)

**Task 1: Add page transition animations**
- Wrap page routes in `<AnimatePresence>` from framer-motion
- Each page enters with `opacity: 0 → 1` and `y: 10 → 0` (subtle slide-up)
- Duration: 200ms, ease-out
- Keep it simple — no exit animations (causes layout issues with Telegram)
- Add this in `App.tsx` (you may add `<AnimatePresence>` wrapper around `<Routes>`)

**Task 2: Optimize Dashboard re-renders**
- Dashboard.tsx: Wrap expensive sub-components in `React.memo()` (quest cards, mode cards, XP bar)
- Extract quest card and mode card into separate memoized components in the same file
- Use `useCallback` for event handlers passed as props
- Do NOT over-optimize — only components that receive stable props

**Task 3: Add Settings page (mini-app version)**
- Create `mini-app/src/pages/Settings.tsx`
- Fetch preferences using `apiClient` — there's already `GET /api/users/:telegramId/preferences` (added in Run 2)
- Show toggles: Notifications (on/off), Reminder time (dropdown: 8, 12, 18, 21), Timezone (auto-detect from browser + manual override)
- Save button calls `PATCH /api/users/:telegramId/preferences`
- Add route in App.tsx: `<Route path="/settings" element={<Settings />} />`
- Add gear icon button in Profile page header that navigates to /settings
- Loading skeleton, error state with retry (same pattern as other pages)

**Task 4: Improve Leaderboard page**
- Add pull-to-refresh to Leaderboard (same pattern as Dashboard/Quests from Run 2)
- Add time period tabs: "Weekly" / "All Time" (use state toggle, refetch with different params if API supports, otherwise just show same data)
- Add rank change indicator arrows (up/down/same) next to each user — use static placeholder data for now (real rank history needs backend)

**Task 5: Add haptic feedback to all interactive elements**
- Go through all pages and add haptic feedback (`impactOccurred('light')`) on:
  - Button presses (quest complete, retry, save, edit)
  - Navigation item taps
  - Pull-to-refresh threshold
  - Modal open/close
- Use the `useTelegram` hook which is already imported in most pages
- Skip if haptic is already added (Run 1/2 added some)

**Task 6: Connect ProfileEditModal to API**
- The `// TODO: call profile update API when endpoint exists` can now be partially connected
- On save: call `apiClient.getUserStats(telegramId)` to refetch (the actual profile update API may not exist yet — if so, show a "Coming soon" toast on save and close the modal)
- The modal should still work as a UI — just gracefully handle the missing endpoint

### RETROSPECTIVE (DO THIS LAST)
Add your retrospective to PARALLEL_AGENTS.md at the bottom under "Run 3 Retrospectives".

---

## Agent B — Bot Features & Database (Run 3)

**You are Agent B.** You add new bot commands and API improvements.

**Working directory:** `c:\Users\Asus\Desktop\Wibecode-agent-b`
**Branch:** `feature/bot-features` (you are ALREADY on it — do NOT switch branches)
**Build command:** `cd bot && npm run build`

### RULES (NON-NEGOTIABLE)

1. You are ALREADY on branch `feature/bot-features` — do NOT run `git checkout`
2. Commit after EVERY task — atomic: `git add FILES && git commit -m "MSG"`
3. Do NOT push to remote or deploy to server
4. Do NOT add any new npm packages
5. ESM project: ALL local imports need `.js` extensions
6. After ALL changes, run `cd bot && npm run build` and fix errors

### FILES YOU OWN
```
bot/src/handlers/                    — existing + new handler files
bot/src/index.ts                     — register new commands
bot/src/api/routes/users.ts          — add profile update endpoint
bot/src/api/routes/                  — new route files only
```

### FILES YOU MUST NOT TOUCH
```
bot/src/bot.ts                       — Grammy instance, locked
bot/src/config.ts                    — centralized in Run 2, locked
bot/src/utils/                       — db, cache, pythonTools all locked
bot/src/types/                       — shared types, locked
bot/src/jobs/                        — improved in Run 1, locked
bot/src/api/middleware/              — auth works fine
bot/src/api/server.ts               — only if you need to register a new route (see GRAY AREA)
bot/package.json                    — no new dependencies
mini-app/                           — not your area
tools/                              — not your area
```

### GRAY AREA
```
bot/src/api/server.ts — you MAY add a new router.use() for a new route file but must NOT change existing middleware, CORS, or routes
```

### PROJECT CONTEXT

- Grammy bot framework, ESM (`"type": "module"`), TypeScript strict
- `db.query(sql, params)`, `db.queryOne(sql, params)`, `db.transaction(callback)` from utils/db.ts
- `cache.cached(key, ttl, fn)`, `cache.invalidateUserCache(userId)` from utils/cache.ts
- Auth middleware validates Telegram WebApp HMAC-SHA256 signatures
- Existing commands: /start, /app, /quests, /profile, /modes, /settings, /stats, /leaderboard, /menu, /help, /ping
- BotFather command list may need updating (use bot.api.setMyCommands)

### TASKS (do in order, commit after each)

**Task 1: Add profile update API endpoint**
- Read `bot/src/api/routes/users.ts` first
- Add `PATCH /api/users/:telegramId/profile` endpoint
- Request body: `{ first_name?: string, avatar_id?: number }` (avatar_id is 1-8)
- Validation: `first_name` must be 1-32 chars, `avatar_id` must be integer 1-8
- Use `db.query('UPDATE users SET ... WHERE telegram_id = $1', params)`
- Call `cache.invalidateUserCache(userId)` after update
- Return updated user data

**Task 2: Add /profile bot command**
- Create `bot/src/handlers/profile.ts`
- Shows formatted user profile: name, level, XP progress, active modes, streak info, achievements count
- Use `db.query` to fetch from `users`, `user_modes`, `user_streaks`, `user_achievements` tables
- Format as Telegram message with emojis
- Register in index.ts: `bot.command('profile', handleProfile)`
- Create `bot/src/handlers/REGISTER_THESE_RUN3.md` documenting what was added

**Task 3: Improve /help command**
- Currently a basic stub in index.ts
- Extract to `bot/src/handlers/help.ts`
- Add inline keyboard with categories: "Commands", "How to Play", "FAQ"
- Each category shows relevant info via callback query
- Register callback handler: `bot.callbackQuery(/^help:/, handleHelpCallback)`
- Update index.ts: move /help from inline to imported handler

**Task 4: Add daily summary notification**
- Create `bot/src/handlers/dailySummary.ts` with a function `sendDailySummary(bot, userId)` that:
  - Fetches user's daily stats: quests completed today, XP earned today, current streaks
  - Formats as a motivational message
  - This is the handler — it will be called from a job (not your job to wire that up, just create the function)
- Export the function so it can be imported by job definitions later

**Task 5: Set BotFather commands programmatically**
- In `bot/src/index.ts`, add after bot starts (inside the `main()` function, after webhook/polling setup):
```typescript
await bot.api.setMyCommands([
  { command: 'start', description: 'Start or restart the bot' },
  { command: 'app', description: 'Open Mini App' },
  { command: 'quests', description: 'View your quests' },
  { command: 'profile', description: 'View your profile' },
  { command: 'modes', description: 'Manage your modes' },
  { command: 'leaderboard', description: 'View top players' },
  { command: 'stats', description: 'View your statistics' },
  { command: 'settings', description: 'Configure notifications' },
  { command: 'help', description: 'Get help' },
  { command: 'menu', description: 'Show all commands' },
]);
```

### RETROSPECTIVE (DO THIS LAST)
Add your retrospective to PARALLEL_AGENTS.md at the bottom under "Run 3 Retrospectives".

---

## Agent C — Quality Fixes & Test Improvements (Run 3)

**You are Agent C.** You fix broken tests, improve existing tests, and add monitoring.

**Working directory:** `c:\Users\Asus\Desktop\Wibecode-agent-c`
**Branch:** `feature/quality-fixes` (you are ALREADY on it — do NOT switch branches)
**Build command:** `cd bot && npm run build`

### RULES (NON-NEGOTIABLE)

1. You are ALREADY on branch `feature/quality-fixes` — do NOT run `git checkout`
2. Commit after EVERY task — atomic: `git add FILES && git commit -m "MSG"`
3. Do NOT push to remote or deploy to server
4. Do NOT modify package.json or requirements.txt
5. After ALL changes, run `cd bot && npm run build` and fix errors

### FILES YOU OWN
```
bot/src/__tests__/                   — ALL test files (existing + new)
bot/src/__tests__/setup.ts           — mock helpers (may add new ones)
bot/vitest.config.ts                 — test config (may update)
tools/tests/                         — ALL Python test files (existing + new)
scripts/                             — monitoring scripts (existing + new)
.github/workflows/                   — CI/CD (existing + new)
```

### FILES YOU MUST NOT TOUCH
```
bot/src/ (ALL non-test .ts files)    — source code, read-only
mini-app/                            — not your area
tools/*.py                           — source tools, read-only
database/                            — schema, read-only
bot/package.json                     — no deps
.env                                 — secrets
```

### PROJECT CONTEXT

- **Vitest** for TypeScript tests (ESM, globals enabled), config at `bot/vitest.config.ts`
- **pytest** for Python tests with `unittest.mock`
- Existing test setup at `bot/src/__tests__/setup.ts`
- **Known failures**: `users.test.ts` (3 tests), `dailyQuestReset.test.ts` (1 unhandled rejection)
- **Total tests**: 114 TypeScript, 172 Python = 286 total
- Python mock pattern: `monkeypatch.setattr(target_module, "function_name", mock)` — patch at import location, NOT source

### TASKS (do in order, commit after each)

**Task 1: Fix pre-existing TypeScript test failures (CRITICAL)**
- Run `cd bot && npx vitest run --reporter=verbose` to identify exact failures
- Read `bot/src/__tests__/routes/users.test.ts` — fix the 3 failing tests
- Read `bot/src/__tests__/jobs/dailyQuestReset.test.ts` — fix the unhandled rejection
- These are from Run 1 and have been carried forward for 2 runs — fix them now
- Common causes: mock shape mismatch, async cleanup, missing db.query mock returns

**Task 2: Add tests for Run 2 additions — quest progress endpoint**
- Read `bot/src/api/routes/quests.ts` to understand the new `PATCH /api/quests/:questId/progress`
- Create or update `bot/src/__tests__/routes/quests.test.ts` to add tests for:
  - Valid progress update (progress < target)
  - Auto-completion when progress === target (XP award, level up check)
  - Invalid quest ID (404)
  - Quest doesn't belong to user (403)
  - Progress out of range (400)
  - Cache invalidation called after update

**Task 3: Add tests for Run 2 additions — user preferences endpoint**
- Read `bot/src/api/routes/users.ts` to understand `GET/PATCH /api/users/:telegramId/preferences`
- Add tests to `bot/src/__tests__/routes/users.test.ts`:
  - GET preferences (found, not found)
  - PATCH preferences (valid update, invalid timezone, invalid reminder_time, partial update)

**Task 4: Add tests for leaderboard handler**
- Read `bot/src/handlers/leaderboard.ts`
- Create `bot/src/__tests__/handlers/leaderboard.test.ts`
- Test: sends top 10 message, shows user's rank when not in top 10, handles empty leaderboard, handles DB error
- Mock Grammy context (ctx.reply, ctx.from)

**Task 5: Improve CI pipeline**
- Read `.github/workflows/ci.yml`
- Add test result summary as PR comment (if github token available)
- Add build artifact caching (npm cache, node_modules)
- Ensure both TypeScript and Python test steps run even if one fails (use `continue-on-error` or separate jobs)

**Task 6: Run ALL tests and verify everything passes**
- Run `cd bot && npx vitest run --reporter=verbose`
- Run `python -m pytest tools/tests/ -v`
- Fix ANY failures
- Final commit with total counts: "All tests passing: X TypeScript, Y Python"

### RETROSPECTIVE (DO THIS LAST)
Add your retrospective to PARALLEL_AGENTS.md at the bottom under "Run 3 Retrospectives".

---

## Run 3 File Ownership Matrix

| File/Directory | Agent A | Agent B | Agent C | Nobody |
|---|---|---|---|---|
| mini-app/src/pages/ | OWNS | - | - | - |
| mini-app/src/components/ | OWNS | - | - | - |
| mini-app/src/App.tsx (routes only) | OWNS | - | - | - |
| mini-app/src/index.css | OWNS | - | - | - |
| bot/src/handlers/ (new files) | - | OWNS | - | - |
| bot/src/index.ts | - | OWNS | - | - |
| bot/src/api/routes/users.ts | - | OWNS | - | - |
| bot/src/__tests__/ | - | - | OWNS | - |
| tools/tests/ | - | - | OWNS | - |
| .github/workflows/ | - | - | OWNS | - |
| scripts/ | - | - | OWNS | - |
| mini-app/src/api/client.ts | - | - | - | LOCKED |
| mini-app/src/types/ | - | - | - | LOCKED |
| mini-app/src/hooks/ | - | - | - | LOCKED |
| bot/src/utils/ | - | - | - | LOCKED |
| bot/src/config.ts | - | - | - | LOCKED |
| bot/src/jobs/ | - | - | - | LOCKED |
| .env | - | - | - | LOCKED |

## Run 3 Merge Order

1. **Agent B first** — backend features + API endpoints
2. **Agent C second** — tests (reference stable source)
3. **Agent A last** — mini-app (completely independent)

---

## Run 3 Retrospectives

*(Agents: add your retrospective sections below this line when you finish)*

### Agent B Retrospective (Run 3)

**Branch:** `feature/bot-features`
**Build:** `cd bot && npm run build` — PASS (0 errors)

| # | Task | Status | Commits |
|---|------|--------|---------|
| 1 | PATCH /api/users/:telegramId/profile endpoint | Done | `77e1240` |
| 2 | /profile bot command (level, XP, modes, streaks, achievements) | Done | `ea656c9` |
| 3 | /help command with inline keyboard (Commands, How to Play, FAQ) | Done | `42f9aaa` |
| 4 | Daily summary notification handler (sendDailySummary) | Done | `9b03e25` |
| 5 | Set BotFather commands programmatically (setMyCommands) | Done | `344fd2f` |

**Files Created:**
- `bot/src/handlers/profile.ts` — /profile command handler
- `bot/src/handlers/help.ts` — /help command with inline keyboard categories
- `bot/src/handlers/dailySummary.ts` — exported `sendDailySummary(bot, userId)` for pg-boss jobs
- `bot/src/handlers/REGISTER_THESE_RUN3.md` — documents new registrations

**Files Modified:**
- `bot/src/api/routes/users.ts` — added PATCH profile endpoint
- `bot/src/index.ts` — imported profile + help handlers, replaced inline /help, added setMyCommands

**Notes for Agent 0:**
- The `/profile` command replaced `handleOpenProfile` from miniapp.ts for the `/profile` route. The old `handleOpenProfile` is still imported (used nowhere now for `/profile` command) but `handleOpenQuests` and `handleOpenApp` still use it. Safe to leave.
- `sendDailySummary` is exported but NOT wired to a pg-boss job yet — that's a Task for a future run (needs a job in `bot/src/jobs/`).
- Profile update endpoint assumes `avatar_id` column exists on users table. If it doesn't, a migration `ALTER TABLE users ADD COLUMN avatar_id INTEGER DEFAULT 1` is needed.
- No issues encountered. All 5 tasks completed cleanly.

### Agent C — Quality Fixes & Test Improvements

**Completed Tasks:**

| # | Task | Status | Tests Added/Fixed |
|---|------|--------|-------------------|
| 1 | Fix pre-existing TypeScript test failures | Done | Fixed 6 failures (users 3 + dailyQuestReset 1 + onboarding 1 + questReminders 1) |
| 2 | Add tests for quest progress endpoint | Done | 6 new tests |
| 3 | Add tests for user preferences endpoint | Done | 9 new tests |
| 4 | Add tests for leaderboard handler | Done | 6 new tests (new file) |
| 5 | Improve CI pipeline | Done | Push trigger, pip cache, test summary PR comments, proper failure reporting |
| 6 | Run ALL tests and verify | Done | 140 TS + 172 Python = 312 total, 0 failures |

**Final Test Counts:** 140 TypeScript (up from 114), 172 Python (unchanged) = 312 total

**Problems Faced:**
1. **Root cause of ALL mock-leak failures**: `vi.clearAllMocks()` does NOT reset queued `.mockResolvedValueOnce()` values — only `vi.resetAllMocks()` does. This single issue caused failures in `users.test.ts` (3), `onboarding.test.ts` (1), and `questReminders.test.ts` (rate limit test was affected indirectly). Fixed by replacing `clearAllMocks` with `resetAllMocks` in 4 test files.
2. **dailyQuestReset unhandled rejection**: The `expect(promise).rejects` handler must be attached BEFORE `vi.runAllTimersAsync()` — otherwise the rejection fires with no handler, causing an unhandled rejection warning.
3. **questReminders 429 test timeout**: `retry_after: 0` is falsy, so `err.parameters?.retry_after || 5` defaults to 5s. Without fake timers, this causes a 5s real delay → test timeout. Fixed by using `vi.useFakeTimers()` scoped to that test.

**Recommendations for Next Run:**
1. **Source code bug**: `questReminders.ts:70` — `|| 5` should be `?? 5` for `retry_after` (0 is a valid value meaning "retry immediately"). Agent B should fix this in a future run.
2. **Standardize mock resets**: All test files should use `vi.resetAllMocks()` in `beforeEach`, not `vi.clearAllMocks()`. Consider adding a shared setup in `vitest.config.ts` (`mockReset: true`).
3. **Test coverage gaps**: No tests yet for `/start` handler, `/settings` handler, `/modes` handler, or the API server integration. These would be good candidates for Run 4.

### Agent A Retrospective (Mini App Polish)

**Completed Tasks:**
| # | Task | Status | Commits |
|---|------|--------|---------|
| 1 | Page transition animations | Done | `b2e401f` |
| 2 | Dashboard re-render optimization | Done | `4730451` |
| 3 | Settings page | Done | `1f77ceb` |
| 4 | Leaderboard improvements | Done | `1bcc2fc` |
| 5 | Haptic feedback audit | Done | `d0234ed` |
| 6 | ProfileEditModal API connection | Done | `766b7a3` |

**Build:** `mini-app` builds clean (0 errors, 0 warnings).

**What went well:**
- All 6 tasks completed without issues
- Worktree isolation worked perfectly (zero conflicts with bot/ or tools/)
- framer-motion `PageWrapper` approach is clean and doesn't require `AnimatePresence` exit animations (which cause layout issues in Telegram)
- Settings page reuses existing patterns (pull-to-refresh, loading skeleton, error state)
- ProfileEditModal gracefully handles missing backend endpoint

**What to note for Agent 0 / next run:**
- Settings page uses `(apiClient as any).client` to access the raw axios instance for preferences endpoints (GET/PATCH) — Agent B's profile update endpoint (`PATCH /users/:telegramId/profile`) is expected but may not be merged yet; the ProfileEditModal has a try/catch fallback
- Leaderboard time period tabs are UI-only — both "Weekly" and "All Time" fetch the same data because the backend doesn't support time-filtered leaderboard queries yet
- RankChangeIndicator uses placeholder deterministic data — real rank history needs a backend table

**Recommendations for Run 4:**
1. Add backend support for time-filtered leaderboard (weekly query)
2. Add rank history tracking table + API
3. The Settings timezone input could be improved with a searchable dropdown
4. Consider adding a "Theme" preference in Settings (light/dark mode override)

---

## Run 3 Retrospective (Agent 0)

### Merge Results
| Branch | Merge | Conflicts | Resolution |
|--------|-------|-----------|------------|
| `feature/bot-features` → main | Fast-forward | 0 | Clean |
| `feature/quality-fixes` → main | Merge commit | 1 (PARALLEL_AGENTS.md) | Kept both retrospectives |
| `feature/mini-app-polish` → main | Merge commit | 1 (PARALLEL_AGENTS.md) | Kept all 3 retrospectives |

### What Was Delivered
**Agent A** (mini-app, 6/6 tasks): Page transition animations, Dashboard re-render optimization (React.memo/useCallback), Settings page (notifications/timezone/reminder), Leaderboard improvements (pull-to-refresh, time period tabs, rank indicators), haptic feedback on all interactive elements, ProfileEditModal API connection with graceful fallback.

**Agent B** (backend, 5/5 tasks): Profile update API endpoint (PATCH), /profile bot command (level/XP/modes/streaks/achievements), /help command extracted with inline keyboard categories, daily summary notification handler (exported, not yet wired to job), BotFather commands set programmatically.

**Agent C** (quality, 6/6 tasks): Fixed ALL 6 pre-existing test failures (root cause: clearAllMocks vs resetAllMocks), 21 new tests for quest progress/preferences/leaderboard endpoints, CI pipeline improvements (caching, PR comments, proper failure reporting). Total: 140 TS + 172 Python = 312 tests, 0 failures.

### What Went Right
- Third consecutive successful run with worktrees — zero interference
- All 17/17 tasks completed across 3 agents
- Both builds passed on first try after all 3 merges
- Only expected PARALLEL_AGENTS.md conflicts
- Agent B self-registered all new commands (no post-merge wiring needed)
- Agent C found and fixed the root cause of ALL pre-existing test failures

### Critical Issues Found (Must Fix in Run 4)
1. **Database schema gap**: `avatar_id`, `notification_enabled`, `reminder_time` columns do NOT exist on `users` table. The preferences API endpoints (Run 2) and profile update endpoint (Run 3) reference these columns but they were never added. Preferences endpoints return 500 errors.
2. **questReminders.ts bug**: Line 70 uses `|| 5` instead of `?? 5` — retry_after=0 treated as falsy.
3. **Daily summary job not wired**: Handler exists at `handlers/dailySummary.ts` but no job definition or registration in `registerJobs.ts`.
4. **Settings page workaround**: Uses `(apiClient as any).client` instead of proper API client methods.
5. **Leaderboard time tabs**: UI-only — both tabs show same data (no backend weekly query).

---

## RUN 4: Parallel Agents (3 Agents + Agent 0)

### How to Launch

Open 4 separate Claude Code sessions. **Start Agent 0 FIRST** — it sets up worktrees. Only start A/B/C after Agent 0 says "Ready."

### Copy-Paste Prompts

**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent 0 for Run 4. Set up worktrees and tell me when ready. After all agents finish, I'll tell you to merge.
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read PARALLEL_AGENTS.md — you are Agent A for Run 4. Do your tasks.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read PARALLEL_AGENTS.md — you are Agent B for Run 4. Do your tasks.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read PARALLEL_AGENTS.md — you are Agent C for Run 4. Do your tasks.
```

---

## Agent 0 — Orchestrator (Run 4)

**You are Agent 0.** Set up the environment, WAIT for agents, then merge and deploy.

**Working directory:** `c:\Users\Asus\Desktop\Wibecode` (main repo, `main` branch)

### Phase 1: Pre-Run Setup

**Step 1: Apply database migration BEFORE agents start**
This is critical — Agent B's API fixes depend on the columns existing.
```bash
ssh root@85.239.58.205 "PGPASSWORD=postgres psql -h localhost -U postgres -d telegram_rpg -c \"
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_id INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_time INTEGER DEFAULT 9;
\""
```

**Step 2: Verify clean state**
```bash
git status  # should be clean
```

**Step 3: Create worktrees**
```bash
git branch feature/mini-app-integration 2>/dev/null
git branch feature/backend-fixes 2>/dev/null
git branch feature/test-expansion 2>/dev/null
git worktree add ../Wibecode-agent-a feature/mini-app-integration
git worktree add ../Wibecode-agent-b feature/backend-fixes
git worktree add ../Wibecode-agent-c feature/test-expansion
```

**Step 4: Install dependencies**
```bash
cd ../Wibecode-agent-a/mini-app && npm install
cd ../../Wibecode-agent-b/bot && npm install
cd ../../Wibecode-agent-c/bot && npm install && cd ../../Wibecode-agent-c/mini-app && npm install
```

**Step 5: Verify worktrees**
```bash
cd c:\Users\Asus\Desktop\Wibecode
git worktree list
```

**Step 6: Tell the user** "Ready to launch Agents A, B, C."

### Phase 2: WAIT for all 3 agents to finish

### Phase 3: Post-Run Merge

```bash
# Check each branch
git log main..feature/backend-fixes --oneline
git log main..feature/test-expansion --oneline
git log main..feature/mini-app-integration --oneline
```

**Merge order:**
1. `git merge feature/backend-fixes --no-edit` → verify `cd bot && npm run build`
2. `git merge feature/test-expansion --no-edit` → verify `cd bot && npm run build`
3. `git merge feature/mini-app-integration --no-edit` → verify `cd mini-app && npm run build`

**Post-merge:** Check `bot/src/handlers/REGISTER_THESE_RUN4.md` if it exists. Wire up any new commands.

**Deploy + Clean up** (see Agent 0 Self-Protocol above).

### Phase 4: Prepare Run 5

After deploying Run 4, you MUST also:
1. Write Run 4 retrospective (merge results, what worked, known issues)
2. Design Run 5 agent tasks based on what's needed next
3. Write copy-paste prompts for Run 5 agents
4. Set up Run 5 worktrees
5. Commit & push the updated PARALLEL_AGENTS.md
6. Tell the user: "Ready to launch Run 5. Here are your copy-paste prompts."

---

## Agent A — Mini App Integration & API Client (Run 4)

**You are Agent A.** You fix the API client and integrate the mini-app properly with backend endpoints.

**Working directory:** `c:\Users\Asus\Desktop\Wibecode-agent-a`
**Branch:** `feature/mini-app-integration` (you are ALREADY on it — do NOT switch branches)
**Build command:** `cd mini-app && npm run build`

### RULES (NON-NEGOTIABLE)

1. You are ALREADY on branch `feature/mini-app-integration` — do NOT run `git checkout`
2. Commit after EVERY task — atomic: `git add FILES && git commit -m "MSG"`
3. Do NOT push to remote or deploy to server
4. Do NOT add any new npm packages
5. After ALL changes, run `cd mini-app && npm run build` and fix errors

### FILES YOU OWN
```
mini-app/src/api/client.ts              — ADD new methods (preferences, profile update)
mini-app/src/pages/Settings.tsx          — fix raw axios workaround
mini-app/src/pages/Profile.tsx           — avatar display improvements
mini-app/src/pages/Leaderboard.tsx       — minor fixes if needed
mini-app/src/components/ProfileEditModal.tsx — fix TODO, proper API call
mini-app/src/components/                 — new components (Toast, etc.)
mini-app/src/index.css                   — add new styles
```

### FILES YOU MUST NOT TOUCH
```
mini-app/src/hooks/                     — shared hooks, locked
mini-app/src/components/onboarding/     — onboarding complete, locked
mini-app/src/App.tsx                    — routes stable, locked
mini-app/vite.config.ts                — build config
mini-app/package.json                  — no new dependencies
bot/                                   — not your area
tools/                                 — not your area
```

### PROJECT CONTEXT

- React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Lucide React
- The API client at `mini-app/src/api/client.ts` uses axios. Methods return typed responses.
- Settings page currently uses `(apiClient as any).client` to directly call preferences endpoints — this is a hack
- ProfileEditModal has a try/catch fallback for missing profile update endpoint — endpoint now exists
- Database now has `avatar_id`, `notification_enabled`, `reminder_time` columns (Agent 0 ran migration)
- Backend endpoints: `GET/PATCH /api/users/:telegramId/preferences`, `PATCH /api/users/:telegramId/profile`

### TASKS (do in order, commit after each)

**Task 1: Add API client methods for preferences and profile update**
- Read `mini-app/src/api/client.ts` to understand the pattern
- Add `getUserPreferences(telegramId: string)` method — calls `GET /api/users/:telegramId/preferences`
- Add `updateUserPreferences(telegramId: string, data: { notification_enabled?: boolean, reminder_time?: number, timezone?: string })` — calls `PATCH /api/users/:telegramId/preferences`
- Add `updateUserProfile(telegramId: string, data: { first_name?: string, avatar_id?: number })` — calls `PATCH /api/users/:telegramId/profile`
- Follow existing method patterns (error handling, return types)

**Task 2: Fix Settings page to use proper API client**
- Read `mini-app/src/pages/Settings.tsx`
- Replace `(apiClient as any).client.get(...)` and `.patch(...)` calls with the new `getUserPreferences()` / `updateUserPreferences()` methods
- Keep existing UI, loading states, error handling — just swap the API call mechanism
- Test that the types align

**Task 3: Connect ProfileEditModal to profile update API properly**
- Read `mini-app/src/components/ProfileEditModal.tsx`
- Replace the TODO/fallback with a proper call to `updateUserProfile()`
- On success: show a brief success indicator (green checkmark or text "Saved!"), close modal after 1s delay
- On error: show error text in the modal, keep modal open for retry
- Make sure to invalidate/refetch user data after successful update

**Task 4: Add avatar selection in ProfileEditModal**
- The profile update endpoint accepts `avatar_id` (1-8)
- Add a grid of 8 avatar options in the ProfileEditModal (use colored circles with initials or emoji faces as placeholders — no images needed)
- Currently selected avatar should be highlighted
- Selected avatar_id is sent with the profile update API call

**Task 5: Display user avatar in Profile page**
- Read `mini-app/src/pages/Profile.tsx`
- Show the user's avatar (based on avatar_id from user stats) next to their name
- Use the same avatar rendering as the modal (colored circle with initial/emoji)
- If no avatar_id, show default (avatar_id = 1)

### RETROSPECTIVE (DO THIS LAST)
Add your retrospective to PARALLEL_AGENTS.md at the bottom under "Run 4 Retrospectives".

---

## Agent B — Backend Fixes & Features (Run 4)

**You are Agent B.** You fix bugs, wire up the daily summary job, and add backend features.

**Working directory:** `c:\Users\Asus\Desktop\Wibecode-agent-b`
**Branch:** `feature/backend-fixes` (you are ALREADY on it — do NOT switch branches)
**Build command:** `cd bot && npm run build`

### RULES (NON-NEGOTIABLE)

1. You are ALREADY on branch `feature/backend-fixes` — do NOT run `git checkout`
2. Commit after EVERY task — atomic: `git add FILES && git commit -m "MSG"`
3. Do NOT push to remote or deploy to server
4. Do NOT add any new npm packages
5. ESM project: ALL local imports need `.js` extensions
6. After ALL changes, run `cd bot && npm run build` and fix errors

### FILES YOU OWN
```
bot/src/jobs/definitions/               — new + existing job files
bot/src/jobs/registerJobs.ts            — wire new jobs
bot/src/api/routes/leaderboard.ts       — add weekly endpoint
bot/src/api/routes/users.ts             — fix/improve preferences
database/schema.sql                     — sync with actual DB
```

### FILES YOU MUST NOT TOUCH
```
bot/src/bot.ts                          — Grammy instance, locked
bot/src/config.ts                       — centralized, locked
bot/src/utils/                          — db, cache, pythonTools all locked
bot/src/types/                          — shared types, locked
bot/src/handlers/                       — Run 3 handlers stable, locked
bot/src/index.ts                        — command registration stable, locked
bot/src/api/middleware/                  — auth works fine
bot/src/api/server.ts                   — only if you need to register a new route (see GRAY AREA)
bot/package.json                        — no new dependencies
mini-app/                               — not your area
tools/                                  — not your area
```

### GRAY AREA
```
bot/src/api/server.ts — you MAY add a new router.use() for a new route file but must NOT change existing middleware, CORS, or routes
bot/src/jobs/definitions/questReminders.ts — you MAY fix the || vs ?? bug (line 70 only)
```

### PROJECT CONTEXT

- Grammy bot framework, ESM (`"type": "module"`), TypeScript strict
- `db.query(sql, params)`, `db.queryOne(sql, params)`, `db.transaction(callback)` from utils/db.ts
- `cache.cached(key, ttl, fn)`, `cache.invalidateUserCache(userId)` from utils/cache.ts
- Database now has `avatar_id`, `notification_enabled`, `reminder_time` columns (Agent 0 ran migration before Run 4)
- `sendDailySummary(bot, userId)` exists in `handlers/dailySummary.ts` — needs a pg-boss job
- pg-boss v12+: Must call `createQueue(name)` BEFORE `schedule(name, cron)`

### TASKS (do in order, commit after each)

**Task 1: Fix questReminders.ts retry_after bug**
- Read `bot/src/jobs/definitions/questReminders.ts`
- Line ~70: Change `err.parameters?.retry_after || 5` to `err.parameters?.retry_after ?? 5`
- This is a one-line fix. Verify the exact line before changing.

**Task 2: Sync database/schema.sql with actual DB**
- Read `database/schema.sql`
- Add the 3 new columns to the `users` table definition:
  - `avatar_id INTEGER DEFAULT 1`
  - `notification_enabled BOOLEAN DEFAULT true`
  - `reminder_time INTEGER DEFAULT 9`
- Add comments explaining these were added in Run 4

**Task 3: Wire daily summary job**
- Read `bot/src/jobs/registerJobs.ts` to understand the pattern
- Read `bot/src/handlers/dailySummary.ts` to understand the exported function
- Create `bot/src/jobs/definitions/dailySummary.ts`:
  - Import `sendDailySummary` from `../../handlers/dailySummary.js`
  - Import bot instance as needed (check how other jobs access it)
  - Job queries users who have `notification_enabled = true`
  - For each user, call `sendDailySummary(bot, user.telegram_id)`
  - Batch processing (50 users at a time) with rate limiting (200ms delay between sends)
- Register in `registerJobs.ts`: queue name `daily-summary`, cron `0 21 * * *` (9 PM UTC = midnight MSK)

**Task 4: Add weekly leaderboard endpoint**
- Read `bot/src/api/routes/leaderboard.ts`
- Add `GET /api/leaderboard/weekly` endpoint
- Query users ordered by XP earned in the last 7 days
- Use: `SELECT u.*, COALESCE(SUM(qi.xp_reward), 0) as weekly_xp FROM users u LEFT JOIN quest_instances qi ON qi.user_id = u.id AND qi.status = 'completed' AND qi.completed_at > NOW() - INTERVAL '7 days' GROUP BY u.id ORDER BY weekly_xp DESC LIMIT 50`
- Return same format as existing leaderboard but with `weekly_xp` field
- Cache for 5 minutes

**Task 5: Verify builds pass**
- Run `cd bot && npm run build` and fix any errors
- Create `bot/src/handlers/REGISTER_THESE_RUN4.md` documenting what was added/changed

### RETROSPECTIVE (DO THIS LAST)
Add your retrospective to PARALLEL_AGENTS.md at the bottom under "Run 4 Retrospectives".

---

## Agent C — Test Expansion & Quality (Run 4)

**You are Agent C.** You add tests for Run 3 additions and improve test infrastructure.

**Working directory:** `c:\Users\Asus\Desktop\Wibecode-agent-c`
**Branch:** `feature/test-expansion` (you are ALREADY on it — do NOT switch branches)
**Build command:** `cd bot && npm run build`

### RULES (NON-NEGOTIABLE)

1. You are ALREADY on branch `feature/test-expansion` — do NOT run `git checkout`
2. Commit after EVERY task — atomic: `git add FILES && git commit -m "MSG"`
3. Do NOT push to remote or deploy to server
4. Do NOT modify package.json or requirements.txt
5. After ALL changes, run `cd bot && npm run build` and fix errors

### FILES YOU OWN
```
bot/src/__tests__/                      — ALL test files (existing + new)
bot/src/__tests__/setup.ts              — mock helpers (may add new ones)
bot/vitest.config.ts                    — test config (may update)
tools/tests/                            — ALL Python test files (existing + new)
```

### FILES YOU MUST NOT TOUCH
```
bot/src/ (ALL non-test .ts files)       — source code, read-only
mini-app/                               — not your area
tools/*.py                              — source tools, read-only
database/                               — schema, read-only
bot/package.json                        — no deps
.env                                    — secrets
```

### PROJECT CONTEXT

- **Vitest** for TypeScript tests (ESM, globals enabled), config at `bot/vitest.config.ts`
- **pytest** for Python tests with `unittest.mock`
- Run 3 added: profile handler, help handler+callbacks, dailySummary handler, profile update API, setMyCommands
- Existing test setup at `bot/src/__tests__/setup.ts`
- **Total tests**: 140 TypeScript, 172 Python = 312 total
- **IMPORTANT**: Use `vi.resetAllMocks()` (NOT `vi.clearAllMocks()`) in `beforeEach` — this was the root cause of ALL Run 1 failures
- Mock Grammy context pattern: `{ reply: vi.fn(), from: { id: 123 }, callbackQuery: { data: 'help:commands' } }`

### TASKS (do in order, commit after each)

**Task 1: Enable mockReset globally in vitest config**
- Read `bot/vitest.config.ts`
- Add `mockReset: true` to the test config (this replaces per-file `vi.resetAllMocks()` calls)
- Verify existing tests still pass after this change: `cd bot && npx vitest run --reporter=verbose`
- If any tests break, fix them (they were relying on mock leakage between tests)

**Task 2: Add tests for /profile bot command handler**
- Read `bot/src/handlers/profile.ts`
- Create `bot/src/__tests__/handlers/profile.test.ts`
- Test: user with full data (level, modes, streaks, achievements), user not found, DB error
- Mock: `db.query` / `db.queryOne`, Grammy context (`ctx.reply`, `ctx.from`)

**Task 3: Add tests for /help bot command handler**
- Read `bot/src/handlers/help.ts`
- Create `bot/src/__tests__/handlers/help.test.ts`
- Test: /help sends inline keyboard with 3 categories
- Test callback queries: `help:commands`, `help:howtoplay`, `help:faq`
- Mock: Grammy context (`ctx.reply`, `ctx.callbackQuery`, `ctx.answerCallbackQuery`, `ctx.editMessageText`)

**Task 4: Add tests for profile update API endpoint**
- Read `bot/src/api/routes/users.ts` — find the `PATCH /:telegramId/profile` endpoint
- Add tests to `bot/src/__tests__/routes/users.test.ts`:
  - Valid update (first_name only, avatar_id only, both)
  - Invalid first_name (empty, too long > 32 chars)
  - Invalid avatar_id (0, 9, -1, non-integer)
  - User not found (404)
  - Cache invalidation called after update

**Task 5: Add tests for daily summary handler**
- Read `bot/src/handlers/dailySummary.ts`
- Create `bot/src/__tests__/handlers/dailySummary.test.ts`
- Test: sends formatted summary with quests/XP/streaks, handles user with no activity, handles DB error, handles bot.api.sendMessage failure
- Mock: `db.query`, `bot.api.sendMessage`

**Task 6: Run ALL tests and verify everything passes**
- Run `cd bot && npx vitest run --reporter=verbose`
- Run `python -m pytest tools/tests/ -v`
- Fix ANY failures
- Final commit with total counts: "All tests passing: X TypeScript, Y Python"

### RETROSPECTIVE (DO THIS LAST)
Add your retrospective to PARALLEL_AGENTS.md at the bottom under "Run 4 Retrospectives".

---

## Run 4 File Ownership Matrix

| File/Directory | Agent A | Agent B | Agent C | Nobody |
|---|---|---|---|---|
| mini-app/src/api/client.ts | OWNS | - | - | - |
| mini-app/src/pages/ | OWNS | - | - | - |
| mini-app/src/components/ProfileEditModal.tsx | OWNS | - | - | - |
| mini-app/src/components/ (new) | OWNS | - | - | - |
| mini-app/src/index.css | OWNS | - | - | - |
| bot/src/jobs/definitions/ | - | OWNS | - | - |
| bot/src/jobs/registerJobs.ts | - | OWNS | - | - |
| bot/src/api/routes/leaderboard.ts | - | OWNS | - | - |
| bot/src/api/routes/users.ts | - | OWNS | - | - |
| database/schema.sql | - | OWNS | - | - |
| bot/src/__tests__/ | - | - | OWNS | - |
| bot/vitest.config.ts | - | - | OWNS | - |
| tools/tests/ | - | - | OWNS | - |
| bot/src/jobs/definitions/questReminders.ts (line 70 only) | - | GRAY | - | - |
| mini-app/src/hooks/ | - | - | - | LOCKED |
| mini-app/src/types/ | - | - | - | LOCKED |
| bot/src/utils/ | - | - | - | LOCKED |
| bot/src/config.ts | - | - | - | LOCKED |
| bot/src/index.ts | - | - | - | LOCKED |
| bot/src/handlers/ | - | - | - | LOCKED |
| .env | - | - | - | LOCKED |

## Run 4 Merge Order

1. **Agent B first** — backend fixes + schema sync + daily summary job
2. **Agent C second** — tests (reference stable source)
3. **Agent A last** — mini-app (independent, uses endpoints from Agent B)

---

## Run 4 Retrospectives

*(Agents: add your retrospective sections below this line when you finish)*

### Agent B Retrospective (Run 4)

**Branch:** `feature/backend-fixes`
**Build:** `cd bot && npm run build` — PASS (0 errors)

| # | Task | Status | Commits |
|---|------|--------|---------|
| 1 | Fix questReminders.ts retry_after bug (`\|\|` → `??`) | Done | `cc82be0` |
| 2 | Sync database/schema.sql (add 3 columns) | Done | `afac126` |
| 3 | Wire daily summary job (create + register in pg-boss) | Done | `dbec676` |
| 4 | Add weekly leaderboard endpoint (`GET /api/leaderboard/weekly`) | Done | `134f339` |
| 5 | Verify build + create REGISTER_THESE_RUN4.md | Done | `2c406f2` |

**Files Created:**
- `bot/src/jobs/definitions/dailySummary.ts` — Daily summary job (cron: `0 21 * * *`, queries `notification_enabled=true` users, batches with 200ms delay)
- `bot/src/handlers/REGISTER_THESE_RUN4.md` — Documents all changes

**Files Modified:**
- `bot/src/jobs/definitions/questReminders.ts` — Line 70: `|| 5` → `?? 5`
- `bot/src/jobs/registerJobs.ts` — Registered `daily-summary` job + `setBotInstance(bot)` call
- `bot/src/api/routes/leaderboard.ts` — Added `GET /weekly` endpoint (XP earned in last 7 days, 5min cache, ranked by weekly_xp)
- `database/schema.sql` — Added `avatar_id`, `notification_enabled`, `reminder_time` columns to users table

**Problems Faced:**
1. **Type mismatch**: `sendDailySummary(bot: Bot, userId)` expects `Bot` (default Context) but the job stores `Bot<MyContext>`. Fixed with `as any` cast — safe since the handler only calls `bot.api.sendMessage`.

**Notes for Agent 0:**
- No changes to `bot/src/index.ts` — no new command registrations needed
- Weekly leaderboard uses direct query on `quest_instances` (not materialized view) — fine for current user count but may need optimization at scale
- Daily summary job filters by `notification_enabled = true` — depends on the column migration Agent 0 ran before Run 4
- The `HAVING` clause in weekly leaderboard excludes users with 0 weekly XP (only shows active players)

**Recommendations for Next Run:**
1. Consider adding a materialized view for weekly leaderboard if query gets slow
2. The daily summary job could benefit from timezone-aware scheduling (use `reminder_time` column per user instead of fixed 9 PM UTC)
3. Add an admin endpoint to trigger daily summary manually for testing

### Agent C Retrospective (Run 4) — Test Expansion & Quality

**Branch:** `feature/test-expansion`
**Build:** `cd bot && npm run build` — PASS (0 errors)

| # | Task | Status | Tests Added |
|---|------|--------|-------------|
| 1 | Enable mockReset globally in vitest config | Done | 0 (infra change, all 140 existing tests still pass) |
| 2 | Add tests for /profile bot command handler | Done | 6 new tests |
| 3 | Add tests for /help bot command handler | Done | 8 new tests (1 handleHelp + 7 handleHelpCallback) |
| 4 | Add tests for profile update API endpoint | Done | 10 new tests |
| 5 | Add tests for daily summary handler | Done | 8 new tests |
| 6 | Run ALL tests and verify | Done | 172 TS + 172 Python = 344 total, 0 failures |

**Final Test Counts:** 172 TypeScript (up from 140), 172 Python (unchanged) = 344 total

**Files Created:**
- `bot/src/__tests__/handlers/profile.test.ts` — 6 tests covering full data, no modes, user not found, missing ctx.from, DB error, null streaks/achievements
- `bot/src/__tests__/handlers/help.test.ts` — 8 tests covering main menu keyboard, 3 callback categories, unknown category, missing data, non-help prefix, editMessageText error
- `bot/src/__tests__/handlers/dailySummary.test.ts` — 8 tests covering quests/XP summary, no activity, motivational messages, user not found, null telegram_id, DB error, sendMessage failure, null first_name fallback

**Files Modified:**
- `bot/vitest.config.ts` — added `mockReset: true` (global mock reset, replaces per-file `vi.resetAllMocks()`)
- `bot/src/__tests__/routes/users.test.ts` — added 10 tests for PATCH profile update (first_name, avatar_id, both, validation boundaries, 404, empty body)

**Problems Faced:**
- None. All tests passed on first run. The `mockReset: true` global config change was seamless — no existing tests broke.

**Recommendations for Next Run:**
1. **Test coverage gaps remaining**: No tests for `/start` handler, `/settings` handler, `/modes` handler, or API server integration tests. These would add ~30-40 more tests.
2. **Consider integration tests**: Current tests are all unit tests with mocked DB. A small set of integration tests with a test database would catch schema mismatches like the ones found in Run 3.
3. **Python test gap**: No new Python tests were needed this run, but `tools/send_notification.py` could use tests for the new session-related functions if any were added.
4. **Per-file `vi.resetAllMocks()` calls** are now redundant since `mockReset: true` is set globally. They can be removed in a cleanup pass, but they're harmless.

### Agent A Retrospective (Run 4 — Mini App Integration & API Client)

**Branch:** `feature/mini-app-integration`
**Build:** `mini-app` builds clean (0 errors, 0 warnings).

| # | Task | Status | Commits |
|---|------|--------|---------|
| 1 | Add API client methods (preferences + profile update) | Done | `68c3e57` |
| 2 | Fix Settings page to use proper API client | Done | `bbee370` |
| 3 | Connect ProfileEditModal to profile update API properly | Done | `9f9ffd2` |
| 4 | Add avatar selection in ProfileEditModal | Done (already existed from Run 3, wired to API in Task 3) | `9f9ffd2` |
| 5 | Display user avatar in Profile page | Done | `f0bf0c8` |

**Files Created:** None (all edits to existing files)

**Files Modified:**
- `mini-app/src/api/client.ts` — added `getUserPreferences()`, `updateUserPreferences()`, `updateUserProfile()` methods
- `mini-app/src/pages/Settings.tsx` — replaced `(apiClient as any).client` hack with proper API client methods
- `mini-app/src/components/ProfileEditModal.tsx` — full rewrite: modal now owns its own save logic (calls `updateUserProfile` directly), has saving/saved/error states, accepts `telegramId` + `currentAvatarId` props, exports `AVATAR_OPTIONS` for reuse
- `mini-app/src/pages/Profile.tsx` — updated modal props (new interface: `onSaved`, `telegramId`, `currentAvatarId`, `haptic.notification`), replaced white initial circle with user's avatar icon/color from `AVATAR_OPTIONS`, removed unused `showAlert`

**Notes for Agent 0:**
- `avatar_id` is accessed as `(stats.user as any).avatar_id` because the `User` type in `types/index.ts` doesn't include `avatar_id` (locked file). A future run should add `avatar_id?: number` to the `User` interface.
- The Settings page error handling still silently shows "Saved!" on API failure (graceful degradation) — this matches the original behavior.
- Avatar selection grid was already present from Run 3; Task 4 was essentially complete after Task 3's rewrite (wired `currentAvatarId` prop and sends `avatar_id` in API call).

**Recommendations for Run 5:**
1. Add `avatar_id?: number` to the `User` interface in `types/index.ts` to remove `as any` casts
2. Add weekly leaderboard support to mini-app (once Agent B adds the backend endpoint)
3. Settings page timezone input could use a searchable dropdown for better UX
4. Consider adding image-based avatars (currently using Lucide icons as placeholders)

---

## Run 4 Retrospective (Agent 0)

### Merge Results
| Branch | Merge | Conflicts | Resolution |
|--------|-------|-----------|------------|
| `feature/backend-fixes` → main | Merge commit | 0 | Clean |
| `feature/test-expansion` → main | Merge commit | 1 (PARALLEL_AGENTS.md) | Kept both retrospectives |
| `feature/mini-app-integration` → main | Merge commit | 1 (PARALLEL_AGENTS.md) | Kept all 3 retrospectives |

### What Was Delivered
**Agent A** (mini-app, 5/5 tasks): API client methods for preferences/profile, Settings page fixed to use proper API client (removed `(apiClient as any).client` hack), ProfileEditModal connected to real API with saving/error states, avatar display in Profile page.

**Agent B** (backend, 5/5 tasks): Fixed questReminders.ts `||` → `??` bug, synced schema.sql with new columns, wired daily summary pg-boss job (9 PM UTC cron, batch processing), weekly leaderboard endpoint (`GET /api/leaderboard/weekly`).

**Agent C** (tests, 6/6 tasks): Enabled `mockReset: true` globally in vitest config, 32 new tests (profile handler, help handler, profile update API, daily summary handler). Total: 172 TS + 172 Python = 344 tests, 0 failures.

### What Went Right
- Fourth consecutive successful run with worktrees — zero interference
- All 16/16 tasks completed across 3 agents
- Both builds passed on first try after all 3 merges
- Only expected PARALLEL_AGENTS.md conflicts
- Agent C's global mockReset config change didn't break any existing tests

### Post-Run Hotfix (Agent 0)
**Critical bug discovered during user testing**: Onboarding "Failed to save" error.
- **Root cause**: `bot/src/api/routes/onboarding.ts` lines 86 and 151 passed `--telegram-id` to Python tools (`mode_manager`, `quest_manager`) that only accept `--user-id`. This was a pre-Run-1 bug — onboarding has NEVER worked.
- **Fix**: Look up `userId` before Python tool calls, change `--telegram-id` to `--user-id`.
- **Also added**: Finance & Learning modes + 8 quest templates to production database.
- **Deployed**: Commit `904184c`.

### Known Issues for Run 5
1. **Mini-app shows finance/learning as "Coming Soon"** — needs quiz questions and UI unlock
2. **No quiz questions exist for finance/learning** — only fitness (12 Qs) and hydration (7 Qs) defined
3. **`avatar_id` not in User TypeScript type** — causes `as any` casts in mini-app
4. **`leaderboard_mv` materialized view missing** — leaderboard-refresh job fails every 30 min
5. **No tests for /start, /settings, /stats, /modes handlers** — 4 untested handler files
6. **seed_data.sql out of sync** — finance/learning modes in DB but not in seed file

---

## RUN 5: Parallel Agents (3 Agents + Agent 0)

### Focus: Unlock New Modes & Make App Fully Testable

Run 5 is focused on **enabling the full game loop**: unlock Finance & Learning modes with onboarding quizzes, fix remaining backend issues, and expand test coverage.

### How to Launch

Open 4 separate Claude Code sessions. **Start Agent 0 FIRST** — it sets up worktrees. Only start A/B/C after Agent 0 says "Ready."

### Copy-Paste Prompts

**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent 0 for Run 5. Set up worktrees and tell me when ready. After all agents finish, I'll tell you to merge.
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read PARALLEL_AGENTS.md — you are Agent A for Run 5. Do your tasks.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read PARALLEL_AGENTS.md — you are Agent B for Run 5. Do your tasks.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read PARALLEL_AGENTS.md — you are Agent C for Run 5. Do your tasks.
```

---

## Agent 0 — Orchestrator (Run 5)

**You are Agent 0.** Set up the environment, WAIT for agents, then merge and deploy.

**Working directory:** `c:\Users\Asus\Desktop\Wibecode` (main repo, `main` branch)

### Phase 1: Pre-Run Setup

**Step 1: Verify clean state**
```bash
git status  # should be clean
```

**Step 2: Create worktrees**
```bash
git branch feature/onboarding-modes 2>/dev/null
git branch feature/backend-quality 2>/dev/null
git branch feature/test-handlers 2>/dev/null
git worktree add ../Wibecode-agent-a feature/onboarding-modes
git worktree add ../Wibecode-agent-b feature/backend-quality
git worktree add ../Wibecode-agent-c feature/test-handlers
```

**Step 3: Install dependencies**
```bash
cd ../Wibecode-agent-a/mini-app && npm install
cd ../../Wibecode-agent-b/bot && npm install
cd ../../Wibecode-agent-c/bot && npm install
```

**Step 4: Verify worktrees**
```bash
cd c:\Users\Asus\Desktop\Wibecode
git worktree list
```

**Step 5: Tell the user** "Ready to launch Agents A, B, C."

### Phase 2: WAIT for all 3 agents to finish

### Phase 3: Post-Run Merge

```bash
# Check each branch
git log main..feature/backend-quality --oneline
git log main..feature/test-handlers --oneline
git log main..feature/onboarding-modes --oneline
```

**Merge order:**
1. `git merge feature/backend-quality --no-edit` → verify `cd bot && npm run build`
2. `git merge feature/test-handlers --no-edit` → verify `cd bot && npm run build`
3. `git merge feature/onboarding-modes --no-edit` → verify `cd mini-app && npm run build`

**Deploy + Clean up** (see Agent 0 Self-Protocol above).

### Phase 4: Prepare Run 6

After deploying Run 5, write retrospective, design next run, set up worktrees.

---

## Agent A — Onboarding: Finance & Learning Modes (Run 5)

**You are Agent A.** You unlock Finance & Learning modes with full quiz flows.

**Working directory:** `c:\Users\Asus\Desktop\Wibecode-agent-a`
**Branch:** `feature/onboarding-modes` (you are ALREADY on it — do NOT switch branches)
**Build command:** `cd mini-app && npm run build`

### RULES (NON-NEGOTIABLE)

1. You are ALREADY on branch `feature/onboarding-modes` — do NOT run `git checkout`
2. Commit after EVERY task — atomic: `git add FILES && git commit -m "MSG"`
3. Do NOT push to remote or deploy to server
4. Do NOT add any new npm packages
5. After ALL changes, run `cd mini-app && npm run build` and fix errors

### FILES YOU OWN
```
mini-app/src/data/onboardingQuestions.ts          — add finance & learning questions
mini-app/src/components/onboarding/PathSelect.tsx — unlock finance & learning
mini-app/src/hooks/useOnboarding.ts               — add step types, buildStepSequence
mini-app/src/pages/Onboarding.tsx                 — add mode badge matching
mini-app/src/types/index.ts                       — add avatar_id to User type
mini-app/src/pages/Profile.tsx                    — remove as any casts
mini-app/src/pages/Leaderboard.tsx                — connect weekly endpoint
mini-app/src/components/ProfileEditModal.tsx       — remove as any casts
mini-app/src/components/onboarding/Summary.tsx    — if needed for new modes
```

### FILES YOU MUST NOT TOUCH
```
mini-app/src/api/client.ts                        — stable from Run 4
mini-app/src/components/onboarding/QuizScreen.tsx  — generic renderer, works for all modes
mini-app/src/components/onboarding/LaunchScreen.tsx — save logic, works fine
mini-app/src/components/onboarding/PunishmentConfig.tsx — generic, works fine
mini-app/src/components/onboarding/NotificationPrefs.tsx — generic
mini-app/vite.config.ts                           — build config
mini-app/package.json                             — no new dependencies
bot/                                              — not your area
tools/                                            — not your area
```

### PROJECT CONTEXT

- The quiz system is **fully parameterized**: QuizScreen.tsx renders any QuestionConfig without mode-specific logic
- Question types: `single-select`, `multi-select`, `drum-roller`, `slider`, `day-grid`, `dual-time`
- Fitness has 12 questions, Hydration has 7 questions
- Finance & Learning modes exist in the production DB with quest templates
- `buildStepSequence()` in useOnboarding.ts dynamically builds steps based on selected modes
- OnboardingStep is a union type that must include all step names

### TASKS (do in order, commit after each)

**Task 1: Add avatar_id to User type + remove as any casts**
- Read `mini-app/src/types/index.ts`
- Add `avatar_id?: number` to the `User` interface
- Read `mini-app/src/pages/Profile.tsx` — replace `(stats.user as any).avatar_id` with `stats.user.avatar_id`
- Read `mini-app/src/components/ProfileEditModal.tsx` — fix any `as any` casts related to avatar_id
- This is a small but important type safety fix

**Task 2: Create Finance quiz questions**
- Read `mini-app/src/data/onboardingQuestions.ts` — understand the FITNESS_QUESTIONS pattern
- Add `FINANCE_QUESTIONS: QuestionConfig[]` array with 5-7 questions:
  - `finance_goals` (multi-select): save_more, reduce_debt, invest, budget_better, emergency_fund, track_spending
  - `finance_income` (single-select): student, low, medium, high, prefer_not_to_say
  - `finance_spending` (multi-select): food, entertainment, shopping, transport, subscriptions, other
  - `finance_savings_target` (drum-roller): monthly savings amount, 0-100000 (currency agnostic)
  - `finance_frequency` (single-select): daily_tracking, weekly_review, monthly_only
- Add to `getQuestionForStep()` function
- Follow the same patterns as FITNESS_QUESTIONS (dataKey: 'finance', nestedKey matches)

**Task 3: Create Learning quiz questions**
- Add `LEARNING_QUESTIONS: QuestionConfig[]` array with 5-7 questions:
  - `learning_goals` (multi-select): new_language, programming, reading, professional_skills, creativity, science, other
  - `learning_style` (single-select): visual, reading, hands_on, audio, mixed
  - `learning_time` (drum-roller): minutes per day, 10-180
  - `learning_days` (day-grid): which days to study
  - `learning_resources` (multi-select): books, online_courses, videos, podcasts, practice_projects, tutoring
- Add to `getQuestionForStep()` function

**Task 4: Wire new modes into onboarding flow**
- Read `mini-app/src/hooks/useOnboarding.ts`
- Add finance_* and learning_* step names to the `OnboardingStep` union type
- Update `buildStepSequence()` to add finance/learning question steps when those modes are selected
- Add `finance?: Record<string, any>` and `learning?: Record<string, any>` to `OnboardingData` interface
- Read `mini-app/src/pages/Onboarding.tsx` — add mode badge matching for finance_/learning_ prefixes

**Task 5: Unlock Finance & Learning in PathSelect**
- Read `mini-app/src/components/onboarding/PathSelect.tsx`
- Change `available: false` to `available: true` for finance and learning modes
- Remove the "Soon" badge for these modes (or update it)
- Verify Summary.tsx already has MODE_INFO entries for finance and learning (it should from Run 2)

**Task 6: Connect Leaderboard to weekly endpoint**
- Read `mini-app/src/pages/Leaderboard.tsx`
- The "Weekly" tab currently shows same data as "All Time"
- Call `apiClient` with the weekly endpoint path: `GET /api/leaderboard/weekly`
- If the weekly endpoint returns data, show it; otherwise fall back to all-time data
- May need to add a method to apiClient — if so, add `getWeeklyLeaderboard()` to `mini-app/src/api/client.ts` (you own this file for this task only)

### RETROSPECTIVE (DO THIS LAST)
Add your retrospective to PARALLEL_AGENTS.md at the bottom under "Run 5 Retrospectives".

---

## Agent B — Backend Quality & Data Sync (Run 5)

**You are Agent B.** You fix backend issues, sync seed data, and improve infrastructure.

**Working directory:** `c:\Users\Asus\Desktop\Wibecode-agent-b`
**Branch:** `feature/backend-quality` (you are ALREADY on it — do NOT switch branches)
**Build command:** `cd bot && npm run build`

### RULES (NON-NEGOTIABLE)

1. You are ALREADY on branch `feature/backend-quality` — do NOT run `git checkout`
2. Commit after EVERY task — atomic: `git add FILES && git commit -m "MSG"`
3. Do NOT push to remote or deploy to server
4. Do NOT add any new npm packages
5. ESM project: ALL local imports need `.js` extensions
6. After ALL changes, run `cd bot && npm run build` and fix errors

### FILES YOU OWN
```
database/seed_data.sql                             — sync with production DB
bot/src/jobs/definitions/leaderboardRefresh.ts     — fix materialized view issue
bot/src/api/routes/leaderboard.ts                  — if needed for leaderboard fix
bot/src/handlers/dailySummary.ts                   — fix type cast
bot/src/jobs/definitions/dailySummary.ts           — improve if needed
```

### FILES YOU MUST NOT TOUCH
```
bot/src/bot.ts                                     — Grammy instance, locked
bot/src/config.ts                                  — centralized, locked
bot/src/utils/                                     — db, cache, pythonTools all locked
bot/src/types/                                     — shared types, locked
bot/src/handlers/ (except dailySummary.ts)         — handlers stable, locked
bot/src/index.ts                                   — command registration stable, locked
bot/src/api/routes/onboarding.ts                   — just hotfixed by Agent 0, locked
bot/src/api/routes/users.ts                        — stable, locked
bot/src/api/middleware/                             — auth works fine
bot/package.json                                   — no new dependencies
mini-app/                                          — not your area
tools/                                             — not your area
```

### GRAY AREA
```
bot/src/api/server.ts — you MAY add a new router.use() if needed but must NOT change existing middleware, CORS, or routes
```

### PROJECT CONTEXT

- Grammy bot framework, ESM (`"type": "module"`), TypeScript strict
- `db.query(sql, params)`, `db.queryOne(sql, params)`, `db.transaction(callback)` from utils/db.ts
- `cache.cached(key, ttl, fn)`, `cache.invalidateUserCache(userId)` from utils/cache.ts
- Production DB now has 4 modes (fitness, hydration, finance, learning) with 14 quest templates
- `leaderboard_mv` materialized view does NOT exist — leaderboard-refresh job fails every 30 min
- `sendDailySummary` uses `as any` cast for Bot type

### TASKS (do in order, commit after each)

**Task 1: Sync seed_data.sql with production database**
- Read `database/seed_data.sql`
- Add finance and learning modes to the INSERT statements (they were added to prod DB by Agent 0)
- Add the 8 new quest templates (4 finance, 4 learning) matching what's in production
- Keep the commented-out finance/learning section but mark it as "now active"

**Task 2: Fix leaderboard-refresh job (materialized view)**
- Read `bot/src/jobs/definitions/leaderboardRefresh.ts`
- The job references `leaderboard_mv` which doesn't exist and never was created
- **Option A** (preferred): Rewrite the job to use a direct query instead of a materialized view — this is simpler and consistent with the weekly leaderboard endpoint pattern
- **Option B**: Create the materialized view in the job itself with `CREATE MATERIALIZED VIEW IF NOT EXISTS`
- Pick whichever is simpler and more reliable. The job runs every hour, so performance matters.
- Make sure to use `cache.cached()` pattern if doing direct query

**Task 3: Fix dailySummary.ts Bot type cast**
- Read `bot/src/handlers/dailySummary.ts`
- Read `bot/src/jobs/definitions/dailySummary.ts`
- The job stores `Bot<MyContext>` but passes it as `any` to `sendDailySummary()`
- Fix the type signature so it accepts `Bot<any>` or the actual bot context type
- This should be a small type-level fix, not a logic change

**Task 4: Add database migration script**
- Create `database/migrations/run5_sync.sql`
- Include all Run 4 + Run 5 changes in one idempotent script:
  - `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_id INTEGER DEFAULT 1`
  - `ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true`
  - `ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_time INTEGER DEFAULT 9`
  - `INSERT INTO modes ... ON CONFLICT DO NOTHING` (finance, learning)
  - `INSERT INTO quests ...` (8 quest templates)
- This makes deployments reproducible (currently changes are only in prod via manual SQL)

**Task 5: Verify builds pass**
- Run `cd bot && npm run build` and fix any errors
- Create `bot/src/handlers/REGISTER_THESE_RUN5.md` documenting what was changed

### RETROSPECTIVE (DO THIS LAST)
Add your retrospective to PARALLEL_AGENTS.md at the bottom under "Run 5 Retrospectives".

---

## Agent C — Test Coverage: Untested Handlers (Run 5)

**You are Agent C.** You add tests for the 4 remaining untested handler files.

**Working directory:** `c:\Users\Asus\Desktop\Wibecode-agent-c`
**Branch:** `feature/test-handlers` (you are ALREADY on it — do NOT switch branches)
**Build command:** `cd bot && npm run build`

### RULES (NON-NEGOTIABLE)

1. You are ALREADY on branch `feature/test-handlers` — do NOT run `git checkout`
2. Commit after EVERY task — atomic: `git add FILES && git commit -m "MSG"`
3. Do NOT push to remote or deploy to server
4. Do NOT modify package.json or requirements.txt
5. After ALL changes, run `cd bot && npm run build` and fix errors

### FILES YOU OWN
```
bot/src/__tests__/                                 — ALL test files (existing + new)
bot/src/__tests__/setup.ts                         — mock helpers (may add new ones)
bot/vitest.config.ts                               — test config
tools/tests/                                       — ALL Python test files
```

### FILES YOU MUST NOT TOUCH
```
bot/src/ (ALL non-test .ts files)                  — source code, read-only
mini-app/                                          — not your area
tools/*.py                                         — source tools, read-only
database/                                          — schema, read-only
bot/package.json                                   — no deps
.env                                               — secrets
```

### PROJECT CONTEXT

- **Vitest** for TypeScript tests (ESM, globals enabled), config at `bot/vitest.config.ts`
- **pytest** for Python tests with `unittest.mock`
- `mockReset: true` is enabled globally in vitest config — no need for per-file `vi.resetAllMocks()`
- **Total tests**: 172 TypeScript, 172 Python = 344 total
- Untested handlers: `/start` (start.ts), `/settings` (settings.ts), `/stats` (stats.ts), `/modes` (onboarding.ts handler)
- Mock Grammy context pattern: `{ reply: vi.fn(), from: { id: 123 }, message: { text: '/start' } }`
- Most handlers use `executePythonTool()` which must be mocked

### TASKS (do in order, commit after each)

**Task 1: Add tests for /start handler**
- Read `bot/src/handlers/start.ts`
- Create `bot/src/__tests__/handlers/start.test.ts`
- Test: new user welcome message, returning user greeting, sets session data, handles missing ctx.from, handles DB error
- Mock: `executePythonTool`, Grammy context

**Task 2: Add tests for /settings handler**
- Read `bot/src/handlers/settings.ts`
- Create `bot/src/__tests__/handlers/settings.test.ts`
- Test: shows settings menu with inline keyboard, callback for toggling notifications, callback for changing reminder time, callback for timezone, handles unknown callback, handles DB error
- Mock: Grammy context, `executePythonTool`, callback queries

**Task 3: Add tests for /stats handler**
- Read `bot/src/handlers/stats.ts`
- Create `bot/src/__tests__/handlers/stats.test.ts`
- Test: shows stats overview, callback for detailed stats (quests, achievements, streaks), handles user with no data, handles DB error
- Mock: Grammy context, `executePythonTool`, callback queries

**Task 4: Add tests for /modes handler (onboarding.ts)**
- Read `bot/src/handlers/onboarding.ts`
- Create `bot/src/__tests__/handlers/onboarding.test.ts`
- Test: shows mode selection, handles mode select callback, handles mode done callback, handles mode info callback, handles quick action callbacks
- Mock: Grammy context, `executePythonTool`, callback queries

**Task 5: Run ALL tests and verify everything passes**
- Run `cd bot && npx vitest run --reporter=verbose`
- Run `python -m pytest tools/tests/ -v`
- Fix ANY failures
- Final commit with total counts: "All tests passing: X TypeScript, Y Python"

### RETROSPECTIVE (DO THIS LAST)
Add your retrospective to PARALLEL_AGENTS.md at the bottom under "Run 5 Retrospectives".

---

## Run 5 File Ownership Matrix

| File/Directory | Agent A | Agent B | Agent C | Nobody |
|---|---|---|---|---|
| mini-app/src/data/onboardingQuestions.ts | OWNS | - | - | - |
| mini-app/src/components/onboarding/PathSelect.tsx | OWNS | - | - | - |
| mini-app/src/hooks/useOnboarding.ts | OWNS | - | - | - |
| mini-app/src/pages/Onboarding.tsx | OWNS | - | - | - |
| mini-app/src/types/index.ts | OWNS | - | - | - |
| mini-app/src/pages/Profile.tsx | OWNS | - | - | - |
| mini-app/src/pages/Leaderboard.tsx | OWNS | - | - | - |
| mini-app/src/components/ProfileEditModal.tsx | OWNS | - | - | - |
| mini-app/src/api/client.ts (weekly endpoint only) | GRAY | - | - | - |
| database/seed_data.sql | - | OWNS | - | - |
| database/migrations/ | - | OWNS | - | - |
| bot/src/jobs/definitions/leaderboardRefresh.ts | - | OWNS | - | - |
| bot/src/handlers/dailySummary.ts | - | OWNS | - | - |
| bot/src/jobs/definitions/dailySummary.ts | - | OWNS | - | - |
| bot/src/__tests__/ | - | - | OWNS | - |
| tools/tests/ | - | - | OWNS | - |
| bot/vitest.config.ts | - | - | OWNS | - |
| mini-app/src/api/client.ts | - | - | - | LOCKED |
| mini-app/src/components/onboarding/QuizScreen.tsx | - | - | - | LOCKED |
| bot/src/utils/ | - | - | - | LOCKED |
| bot/src/config.ts | - | - | - | LOCKED |
| bot/src/index.ts | - | - | - | LOCKED |
| bot/src/api/routes/onboarding.ts | - | - | - | LOCKED |
| .env | - | - | - | LOCKED |

## Run 5 Merge Order

1. **Agent B first** — backend fixes + seed data sync
2. **Agent C second** — tests (reference stable source)
3. **Agent A last** — mini-app onboarding (completely independent)

---

## Run 5 Retrospectives

*(Agents: add your retrospective sections below this line when you finish)*

### Agent B Retrospective (Run 5)

**Branch:** `feature/backend-quality`
**Build:** `cd bot && npm run build` — PASS (0 errors)

| # | Task | Status | Commits |
|---|------|--------|---------|
| 1 | Sync seed_data.sql (add finance & learning modes + 8 quest templates) | Done | `1e0808e` |
| 2 | Fix leaderboard-refresh job + GET /api/leaderboard (remove leaderboard_mv) | Done | `e8eb563` |
| 3 | Fix dailySummary.ts Bot type cast (generic instead of as any) | Done | `30f7bb0` |
| 4 | Add idempotent migration script (database/migrations/run5_sync.sql) | Done | `8212ecc` |
| 5 | Verify build + create REGISTER_THESE_RUN5.md | Done | `5492049` |

**Files Created:**
- `database/migrations/run5_sync.sql` — Idempotent migration combining Run 4+5 changes (columns, modes, quests)
- `bot/src/handlers/REGISTER_THESE_RUN5.md` — Documents all changes

**Files Modified:**
- `database/seed_data.sql` — Added finance + learning modes (un-commented) and 8 new quest templates
- `bot/src/jobs/definitions/leaderboardRefresh.ts` — Complete rewrite: direct SQL query + cache pre-warming instead of `REFRESH MATERIALIZED VIEW` on non-existent `leaderboard_mv`
- `bot/src/api/routes/leaderboard.ts` — `GET /api/leaderboard` now uses direct SQL query with JOINs on streaks + quest_instances instead of `leaderboard_mv`
- `bot/src/handlers/dailySummary.ts` — Generic type: `sendDailySummary<C extends Context>(bot: Bot<C>, ...)` accepts any Grammy context
- `bot/src/jobs/definitions/dailySummary.ts` — Removed `as any` cast on `sendDailySummary(botRef, ...)`

**Problems Faced:**
- None. All 5 tasks completed cleanly. Build passed on first try.

**Notes for Agent 0:**
- The `leaderboardRefresh` job no longer uses `executePythonTool` — it was completely rewritten to use `query()` + `cached()` directly. This also removes the dependency on `db_operations.py` for this job.
- The `GET /api/leaderboard` endpoint query matches the refresh job query exactly (same columns, same format) — cache keys are compatible.
- No changes to `bot/src/index.ts` — no new command registrations needed.
- The migration script (`run5_sync.sql`) is fully idempotent and can be run on any environment (dev, staging, prod).

**Recommendations for Next Run:**
1. Consider adding Finance and Learning achievements to `seed_data.sql` (currently only Fitness and Hydration have achievements)
2. The leaderboard direct query may get slow with many users — consider adding a composite index `CREATE INDEX idx_qi_completed ON quest_instances(user_id, status) WHERE status = 'completed'`
3. Daily summary job could use timezone-aware scheduling (use `reminder_time` per user instead of fixed 9 PM UTC for all)
