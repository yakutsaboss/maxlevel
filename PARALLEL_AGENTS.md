# Parallel Agents Protocol

This file is the single source of truth for running parallel Claude Code agents on the Wibecode RPG bot project. Each "Run" launches 3 agents (A, B, C) in separate git worktrees, plus Agent 0 (orchestrator) in the main repo.

---

## Agent 0 Self-Protocol

**You are Agent 0.** When someone tells you "read PARALLEL_AGENTS.md — you are Agent 0", follow this checklist automatically:

### Checklist (do in order)

1. **Check git status** — is main clean? Any uncommitted changes?
2. **Check for leftover worktrees** — `git worktree list`. If worktrees exist from a previous run, it means agents finished but weren't merged yet.
3. **Read the latest Run section** at the bottom of this file — check the retrospectives of each agent.
4. **Check for unmerged work** — `git log main..feature/BRANCH --oneline` for each agent branch. If commits exist, merge them.
5. **Merge order**: Backend/data first → Tests second → Frontend last.
6. **Post-merge integration**: Read any `REGISTER_THESE_RUN*.md` files in `bot/src/handlers/` to see if new commands need wiring into `index.ts`.
7. **Build verification**: `cd bot && npm run build` and `cd mini-app && npm run build`.
8. **Deploy**: Push to GitHub → SSH to server → git pull → rebuild → PM2 restart.
9. **Clean up**: Remove worktrees, delete feature branches, clear stashes.
10. **Update this file**: Write Run retrospective, write next Run's agent tasks.
11. **Set up next run** (if requested): Create worktrees, install deps, tell user "Ready to launch."

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

Open 4 separate Claude Code sessions:

- **Session 1** (working dir: `c:\Users\Asus\Desktop\Wibecode`): `Read PARALLEL_AGENTS.md — you are Agent 0 for Run 3. Do your tasks.`
- **Session 2** (working dir: `c:\Users\Asus\Desktop\Wibecode-agent-a`): `Read PARALLEL_AGENTS.md — you are Agent A for Run 3. Do your tasks.`
- **Session 3** (working dir: `c:\Users\Asus\Desktop\Wibecode-agent-b`): `Read PARALLEL_AGENTS.md — you are Agent B for Run 3. Do your tasks.`
- **Session 4** (working dir: `c:\Users\Asus\Desktop\Wibecode-agent-c`): `Read PARALLEL_AGENTS.md — you are Agent C for Run 3. Do your tasks.`

**Start Agent 0 FIRST.** It sets up worktrees and dependencies. Only start Agents A/B/C after Agent 0 says "Ready to launch."

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
