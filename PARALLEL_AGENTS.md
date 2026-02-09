# Parallel Agents Protocol

This file is the single source of truth for running parallel Claude Code agents on the Wibecode RPG bot project. Each "Run" launches 2-4 agents (A, B, C, optionally D) in separate git worktrees, plus Agent 0 (orchestrator) in the main repo.

For completed run history (Runs 2–10), see `PARALLEL_AGENTS_HISTORY.md`.

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
9. **Clean up**: Remove worktrees, delete feature branches, clear stashes.

**Phase B — Prepare the NEXT run:**
10. **Write retrospective** for the current run (merge results, what went right, issues carried forward).
11. **Design next run's tasks** — analyze the codebase, read "Known Issues" and agent recommendations, and write the next Run section with full agent prompts.
12. **Pre-allocate retrospective sections** — create a named placeholder for each agent (see Run Template below). This prevents merge conflicts.
13. **Write copy-paste prompts** — at the top of the next Run section, include a "Copy-Paste Prompts" block with the exact text the user should paste into each Claude Code session.
14. **Set up worktrees** for the next run: create branches, `git worktree add`, install deps.
15. **Commit & push** the updated PARALLEL_AGENTS.md.
16. **Tell the user**: "Ready to launch Run N. Here are your copy-paste prompts."

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

### Runs 3–10 (retrospective conflicts — SOLVED)
- Every run had 2-3 merge conflicts in PARALLEL_AGENTS.md because all agents wrote to the same "bottom" location.
- **Fix**: Pre-allocate named retrospective sections per agent before branching. Each agent edits different lines → git auto-merges cleanly.

### Key Rules (proven across 10 runs)
1. **Worktrees are mandatory** — never share a working directory between agents.
2. **Commit after every single task** — uncommitted work gets lost.
3. **Atomic git ops** — `git add && git commit` in one Bash call.
4. **Pre-install deps** in each worktree before agents start.
5. **3-6 tasks per agent** is the sweet spot (7+ risks context exhaustion).
6. **Agent A (mini-app) is the most independent** — zero overlap with bot/tools.
7. **Pre-allocate retrospective sections** — prevents merge conflicts.

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

## Known Issues (Carried Forward from Run 10)

### MVP-Critical
1. **Achievement unlock logic NOT IMPLEMENTED** — DB has achievement definitions + criteria in JSONB, but no trigger/job evaluates them. Users can see achievements but never earn them.
2. **Daily quest assignment UNVERIFIED** — `dailyQuestReset.ts` job exists but needs verification that it actually fires and assigns quests.
3. **Notification delivery UNVERIFIED** — 6 scheduled pg-boss jobs exist but no confirmation they send Telegram messages to users.
4. **Quest template variety LOW** — Only ~12 templates across 4 modes. Gets repetitive fast.

### Non-Critical
5. **Punishment backend NOT WIRED** — Tables + onboarding UI exist (redesigned in Run 10), but no backend applies penalties for failed quests.
6. **pg-boss Node.js mismatch** — Requires 22.12+, server has 20.20. Only triggers warnings, no functional impact yet.
7. **Streak visibility** — Streaks are tracked in DB but not prominently shown in mini-app dashboard.
8. **Mode configs unused** — `mode_configs` table stores quiz responses + personalized plans, but data is never consumed.

---

## RUN 11: Parallel Agents (3 Agents + Agent 0)

### Focus: Complete the MVP Game Loop — Achievement Engine, Streak Wiring, Quest Content

The game UI is polished but the loop is broken: achievements never unlock, streaks aren't updated on quest completion, and quest variety is too low. This run wires everything together so the core RPG mechanics actually work.

### Copy-Paste Prompts

**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent 0 for Run 11. Set up worktrees and tell me when ready. After all agents finish, I'll tell you to merge.
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read PARALLEL_AGENTS.md — you are Agent A for Run 11. Your job: wire achievement checks and streak updates into the quest completion flow, and create an achievement batch-check background job. Do your tasks in order, commit after each, and write your retrospective when done.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read PARALLEL_AGENTS.md — you are Agent B for Run 11. Your job: add more quest templates to the database, add weekly quest assignment to the daily reset job, and add an achievement unlock notification system. Do your tasks in order, commit after each, and write your retrospective when done.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read PARALLEL_AGENTS.md — you are Agent C for Run 11. Your job: add streak display to the Dashboard, add a checkAchievements API method, and show an achievement unlock toast. Do your tasks in order, commit after each, and write your retrospective when done.
```

---

### Agent A — Achievement Engine & Streak Wiring (Backend)

**Branch:** `feature/achievement-engine`

**CONTEXT:**
- The `POST /api/users/:userId/achievements/check` endpoint ALREADY EXISTS in `bot/src/api/routes/achievements.ts` (line 335). It evaluates ALL criteria types (level, streak, quest_complete, multi_mode_active, etc.), batch-unlocks qualifying achievements in a single transaction, and awards XP bonus. It just needs to be CALLED.
- `executePythonTool('streak_manager', ['--update-streak', '--user-id', ID, '--mode-id', MODE_ID])` updates the streak for a user+mode. It exists but is NEVER CALLED after quest completion.
- Quest completion happens in two places in `quests.ts`:
  1. `POST /:questId/complete` (line 84) — calls Python `quest_manager --complete-quest`
  2. `PATCH /:questId/progress` (line 203) — auto-completes when progress >= target (native SQL)
- Both paths award XP but neither updates streaks nor checks achievements.

**FILES YOU OWN:**
- `bot/src/api/routes/quests.ts` — modify quest completion to trigger streak + achievement check
- `bot/src/utils/achievementEngine.ts` — NEW: shared function to check achievements for a user
- `bot/src/jobs/definitions/achievementBatchCheck.ts` — NEW: periodic batch job
- `bot/src/jobs/registerJobs.ts` — register the new job

**FILES YOU MUST NOT TOUCH:**
- `bot/src/api/routes/achievements.ts` (Agent A reads it for reference but does NOT edit)
- `mini-app/` (all)
- `tools/` (all Python files)
- `.env`, `bot/src/config.ts`, `bot/src/bot.ts`

**RULES (NON-NEGOTIABLE):**
- You are ALREADY on branch `feature/achievement-engine` — do NOT run `git checkout`
- Commit after EVERY task — atomic: `git add FILES && git commit -m "MSG"` in one Bash call
- Do NOT push to remote or deploy to server
- Do NOT add any new npm packages

**Task 1: Create achievementEngine.ts utility**
- Read `bot/src/api/routes/achievements.ts` lines 216-413 to understand the existing `checkCriteriaMet()` and `filterQualifyingAchievements()` functions, and the `POST /check` endpoint logic.
- Create `bot/src/utils/achievementEngine.ts` that exports an `async function checkAndUnlockAchievements(userId: number): Promise<any[]>` function.
- This function should contain the core logic from the `POST /check` endpoint:
  1. Fetch user stats (level, total_xp, current_streak, quests_completed)
  2. Fetch available (not yet unlocked) achievements
  3. Evaluate each achievement's criteria using the same `checkCriteriaMet()` logic
  4. Batch-unlock qualifying achievements in a transaction (INSERT ON CONFLICT DO NOTHING)
  5. Award XP bonus for newly unlocked achievements
  6. Return array of newly unlocked achievements (empty array if none)
- Import `query`, `queryOne`, `transaction` from `../../utils/db.js`
- Import `invalidateUserCache` from `../../utils/cache.js`
- This utility can be called from both API routes AND background jobs without HTTP overhead.
- Commit: "Add achievementEngine utility for checking and unlocking achievements"

**Task 2: Wire streak update + achievement check into quest completion**
- Edit `bot/src/api/routes/quests.ts`
- Import `executePythonTool` is already imported. Import `checkAndUnlockAchievements` from your new utility.
- In `POST /:questId/complete` (line 84-120):
  - After the successful `executePythonTool('quest_manager', ...)` call and before the response
  - Get the quest's `mode_id` — you'll need to query it: `SELECT q.mode_id, qi.user_id FROM quest_instances qi JOIN quests q ON q.id = qi.quest_id WHERE qi.id = $1`
  - Call `executePythonTool('streak_manager', ['--update-streak', '--user-id', String(userId), '--mode-id', String(modeId)])` — fire-and-forget, don't block the response on this
  - Call `checkAndUnlockAchievements(userId)` — also fire-and-forget (use `.catch(console.error)`)
  - Include any newly unlocked achievements in the response (optional, nice-to-have)
- In `PATCH /:questId/progress` (line 203-295):
  - In the auto-complete branch (line 241, `clampedProgress >= target`), after the transaction:
  - Get `mode_id` from the quest query (add `q.mode_id` to the existing SELECT on line 220)
  - Same streak update + achievement check calls as above
- Both streak and achievement calls should be non-blocking (don't delay the API response). Use `Promise.allSettled([streakPromise, achievementPromise]).catch(console.error)` pattern.
- Commit: "Wire streak update and achievement check into quest completion"

**Task 3: Create achievement batch check job**
- Create `bot/src/jobs/definitions/achievementBatchCheck.ts`
- Follow the same pattern as other job files (export `JOB_NAME`, `CRON_SCHEDULE`, `handler`)
- `JOB_NAME = 'achievement-batch-check'`
- `CRON_SCHEDULE = '0 */6 * * *'` (every 6 hours — safety net, not primary trigger)
- Handler: Query all active users, call `checkAndUnlockAchievements(userId)` for each, log results
- Process in batches of 50 users with small delays between batches to avoid DB pressure
- Log: total users checked, total new achievements unlocked
- Commit: "Add achievement batch check job (every 6 hours)"

**Task 4: Register the new job**
- Edit `bot/src/jobs/registerJobs.ts`
- Add import: `import * as achievementBatchCheck from './definitions/achievementBatchCheck.js';`
- Add to the `jobs` array: `{ name: achievementBatchCheck.JOB_NAME, cron: achievementBatchCheck.CRON_SCHEDULE, handler: achievementBatchCheck.handler }`
- Commit: "Register achievement batch check job in registerJobs"

**Task 5: Build verification**
- Run `cd bot && npm run build`
- Fix any TypeScript errors
- Commit only if fixes were needed: "Fix TypeScript errors from achievement engine"

### RETROSPECTIVE (DO THIS LAST)
Find your section under "Run 11 Retrospectives" below and replace the placeholder with your retrospective.

---

### Agent B — Quest Content & Weekly Assignment (Backend + DB)

**Branch:** `feature/quest-content`

**CONTEXT:**
- Currently only 14 quest templates exist in `database/seed_data.sql` (3-4 per mode). This is too few for variety.
- `dailyQuestReset.ts` assigns 3 daily quests at midnight UTC but does NOT handle weekly quests. The `quest_manager.py` supports `--assign-weekly` but no job calls it.
- When achievements unlock (via Agent A's work), users should get a Telegram message. The notification jobs (`questReminders.ts`, `dailySummary.ts`) use `bot.api.sendMessage()` and receive the bot instance via `setBotInstance(bot)`.

**FILES YOU OWN:**
- `bot/src/jobs/definitions/dailyQuestReset.ts` — add weekly quest assignment
- `database/migrations/run11_quest_templates.sql` — NEW: additional quest templates
- `bot/src/jobs/definitions/achievementNotifier.ts` — NEW: sends Telegram messages for new achievements

**FILES YOU MUST NOT TOUCH:**
- `bot/src/api/routes/` (all route files)
- `bot/src/utils/` (all utility files)
- `mini-app/` (all)
- `tools/` (all Python files)
- `.env`, `bot/src/config.ts`, `bot/src/bot.ts`

**GRAY AREA:**
- `bot/src/jobs/registerJobs.ts` — you may ONLY add your new job import + array entry (Agent A also modifies this file, so keep changes minimal and clearly separated)

**RULES (NON-NEGOTIABLE):**
- You are ALREADY on branch `feature/quest-content` — do NOT run `git checkout`
- Commit after EVERY task — atomic: `git add FILES && git commit -m "MSG"` in one Bash call
- Do NOT push to remote or deploy to server

**Task 1: Add more quest templates**
- Create `database/migrations/run11_quest_templates.sql`
- Add at least 20 new quest templates (5+ per mode), mix of daily and weekly
- Follow the exact column format from `seed_data.sql`: `(mode_id, title, description, quest_type, xp_reward, difficulty, requires_timer, timer_window_start, timer_window_end, readiness_check_enabled, readiness_check_time, is_mandatory)`
- Use subqueries for mode_id: `(SELECT id FROM modes WHERE name = 'fitness')`
- Use `INSERT ... ON CONFLICT DO NOTHING` or check `WHERE NOT EXISTS` to make the script idempotent (safe to run multiple times)
- **Fitness ideas:** Stretching routine, Walk 10k steps, Plank challenge, Yoga session, Hydration + workout combo
- **Hydration ideas:** Herbal tea break, Water before each meal, Evening hydration, Track water intake, Lemon water morning
- **Finance ideas:** No-spend day, Review subscriptions, Compare prices, Set savings goal, Track impulse purchases
- **Learning ideas:** Watch educational video, Write summary of chapter, Teach someone what you learned, Code challenge, Language practice
- Vary XP rewards: easy=20-30, medium=40-60, hard=80-100, weekly=100-200
- Commit: "Add 20+ quest templates across all modes"

**Task 2: Add weekly quest assignment to daily reset job**
- Edit `bot/src/jobs/definitions/dailyQuestReset.ts`
- After the daily quest assignment loop, add a check: if today is Monday (`new Date().getUTCDay() === 1`), also assign weekly quests
- Call `executePythonTool('quest_manager', ['--assign-weekly', '--user-id', String(userId), '--count', '2'])` for each user
- Log separately: "Assigned {N} weekly quests to {M} users"
- Commit: "Add weekly quest assignment on Mondays"

**Task 3: Create achievement notification job**
- Create `bot/src/jobs/definitions/achievementNotifier.ts`
- This job checks for recently unlocked achievements (last 1 hour) and sends Telegram notifications
- Follow the pattern from `questReminders.ts`: export `JOB_NAME`, `CRON_SCHEDULE`, `handler`, `setBotInstance()`
- `JOB_NAME = 'achievement-notifier'`
- `CRON_SCHEDULE = '*/15 * * * *'` (every 15 minutes)
- Handler:
  1. Query: `SELECT ua.user_id, u.telegram_id, a.name, a.badge_icon, a.xp_bonus FROM user_achievements ua JOIN users u ON u.id = ua.user_id JOIN achievements a ON a.id = ua.achievement_id WHERE ua.unlocked_at > NOW() - INTERVAL '20 minutes'`
  2. For each result, send Telegram message: `"🏆 Achievement Unlocked!\n\n{badge_icon} {name}\n+{xp_bonus} XP bonus"`
  3. Use `bot.api.sendMessage(telegramId, message)` with try/catch per user
  4. Rate limit: 200ms delay between sends (same as dailySummary)
  5. Log: "Sent {N} achievement notifications"
- Commit: "Add achievement notifier job (every 15 minutes)"

**Task 4: Register the new job**
- Edit `bot/src/jobs/registerJobs.ts`
- Add import: `import * as achievementNotifier from './definitions/achievementNotifier.js';`
- Add `achievementNotifier.setBotInstance(bot);` in `registerAllJobs` (after the existing setBotInstance calls)
- Add to the `jobs` array: `{ name: achievementNotifier.JOB_NAME, cron: achievementNotifier.CRON_SCHEDULE, handler: achievementNotifier.handler }`
- Commit: "Register achievement notifier job in registerJobs"

**Task 5: Build verification**
- Run `cd bot && npm run build`
- Fix any TypeScript errors
- Commit only if fixes were needed: "Fix TypeScript errors from quest content additions"

### RETROSPECTIVE (DO THIS LAST)
Find your section under "Run 11 Retrospectives" below and replace the placeholder with your retrospective.

---

### Agent C — Mini-App: Streak Display & Achievement UX (Frontend)

**Branch:** `feature/miniapp-streaks`

**CONTEXT:**
- The `UserStats` type already has `streakData: { current, longest, daysActive }` but Dashboard doesn't prominently display streaks.
- The `apiClient` has `getAchievements()` and `getUserAchievements()` but NO method to call `POST /users/:userId/achievements/check`.
- The Achievement type in `types/index.ts` has fields like `category`, `requirement_type`, `requirement_value`, `is_hidden` — but the API returns `rarity`, `icon` (mapped from `badge_icon`), `xp_reward` (mapped from `xp_bonus`), and `criteria` (JSONB). There's a field mismatch that may cause display issues.
- Dashboard.tsx already has `StatCard` components for XP, Level, Quests, Streak — but streak is just one number among many. A mode-specific streak breakdown would be more useful.

**FILES YOU OWN:**
- `mini-app/src/pages/Dashboard.tsx` — add streak section
- `mini-app/src/pages/Achievements.tsx` — improve achievement display
- `mini-app/src/api/client.ts` — add `checkAchievements()` method
- `mini-app/src/types/index.ts` — fix Achievement type to match API
- `mini-app/src/components/AchievementToast.tsx` — NEW: unlock celebration

**FILES YOU MUST NOT TOUCH:**
- `bot/` (all backend files)
- `tools/` (all Python files)
- `mini-app/src/App.tsx` (locked — already set up routes)
- `mini-app/src/hooks/useOnboarding.ts`
- `.env`

**RULES (NON-NEGOTIABLE):**
- You are ALREADY on branch `feature/miniapp-streaks` — do NOT run `git checkout`
- Commit after EVERY task — atomic: `git add FILES && git commit -m "MSG"` in one Bash call
- Do NOT push to remote or deploy to server
- Do NOT add any new npm packages

**Task 1: Fix Achievement type to match API**
- Read `mini-app/src/types/index.ts` — the `Achievement` interface has `category`, `requirement_type`, `requirement_value`, `is_hidden`
- The API actually returns: `id`, `name`, `description`, `icon` (from badge_icon), `xp_reward` (from xp_bonus), `rarity` (string: common/rare/epic/legendary), `category` (from criteria mode), `criteria` (JSONB object)
- Update the `Achievement` interface to match what the API sends:
  ```typescript
  export interface Achievement {
    id: number;
    name: string;
    description: string;
    icon: string;
    xp_reward: number;
    rarity: string;
    category: string;
    criteria?: Record<string, any>;
  }
  ```
- Commit: "Fix Achievement type to match API response fields"

**Task 2: Add checkAchievements to API client**
- Edit `mini-app/src/api/client.ts`
- Add method:
  ```typescript
  async checkAchievements(userId: number): Promise<ApiResponse<{ newAchievements: any[]; count: number }>> {
    const response = await this.client.post(`/users/${userId}/achievements/check`);
    return { success: true, data: response.data };
  }
  ```
- This calls the existing backend endpoint that Agent A is wiring into the quest flow
- Commit: "Add checkAchievements method to API client"

**Task 3: Add streak section to Dashboard**
- Edit `mini-app/src/pages/Dashboard.tsx`
- After the existing modes section, add a "Streaks" section that shows per-mode streak data
- The `stats.streakData` object has `current`, `longest`, `daysActive` — but this is aggregate, not per-mode
- The `stats.modes` array has mode info. Check if the users API returns per-mode streak data
- Read `bot/src/api/routes/users.ts` to understand what `streakData` contains
- If per-mode data isn't available: show the aggregate streak prominently with a flame icon, current vs longest, and days active
- Design: horizontal scrollable cards per mode (like the existing mode cards), each showing mode icon + current streak number + flame emoji for active streaks
- Use the existing `StatCard` or `ModeCard` pattern
- Commit: "Add streak display section to Dashboard"

**Task 4: Create AchievementToast component**
- Create `mini-app/src/components/AchievementToast.tsx`
- A small toast/popup that appears when a new achievement is detected
- Props: `achievement: Achievement`, `onClose: () => void`
- Design: slide-up from bottom, achievement icon + name + XP bonus, auto-dismiss after 4 seconds
- Use Framer Motion for animation: `initial={{ y: 100, opacity: 0 }}` → `animate={{ y: 0, opacity: 1 }}`
- Gold/amber color scheme for celebration feel
- Commit: "Add AchievementToast component for unlock celebration"

**Task 5: Integrate achievement checking in Quests page**
- Edit `mini-app/src/pages/Quests.tsx` (if you need to) OR `Dashboard.tsx`
- After a quest is completed (the user taps "Complete"), call `apiClient.checkAchievements(userId)` in the background
- If `newAchievements.length > 0`, show the `AchievementToast` for the first one
- This is a nice-to-have — if it's complex due to how quests page works, you can skip and just add the toast trigger to Dashboard's pull-to-refresh instead
- Commit: "Show achievement toast on quest completion"

**Task 6: Build verification**
- Run `cd mini-app && npm run build`
- Fix any TypeScript errors
- Commit only if fixes were needed: "Fix TypeScript errors from streak and achievement UI"

### RETROSPECTIVE (DO THIS LAST)
Find your section under "Run 11 Retrospectives" below and replace the placeholder with your retrospective.

---

### Run 11 File Ownership Matrix

| File/Directory | Agent A | Agent B | Agent C | Nobody |
|---|---|---|---|---|
| bot/src/api/routes/quests.ts | OWNS | - | - | - |
| bot/src/utils/achievementEngine.ts (NEW) | OWNS | - | - | - |
| bot/src/jobs/definitions/achievementBatchCheck.ts (NEW) | OWNS | - | - | - |
| bot/src/jobs/definitions/dailyQuestReset.ts | - | OWNS | - | - |
| database/migrations/run11_quest_templates.sql (NEW) | - | OWNS | - | - |
| bot/src/jobs/definitions/achievementNotifier.ts (NEW) | - | OWNS | - | - |
| bot/src/jobs/registerJobs.ts | OWNS (add job) | OWNS (add job) | - | - |
| mini-app/src/pages/Dashboard.tsx | - | - | OWNS | - |
| mini-app/src/pages/Achievements.tsx | - | - | OWNS | - |
| mini-app/src/api/client.ts | - | - | OWNS (add method) | - |
| mini-app/src/types/index.ts | - | - | OWNS (fix type) | - |
| mini-app/src/components/AchievementToast.tsx (NEW) | - | - | OWNS | - |
| mini-app/src/App.tsx | - | - | - | LOCKED |
| bot/src/api/routes/achievements.ts | - | - | - | LOCKED |
| bot/src/bot.ts | - | - | - | LOCKED |
| bot/src/config.ts | - | - | - | LOCKED |
| .env | - | - | - | LOCKED |

### Run 11 Merge Order

1. **Agent A first** — Achievement engine + quest completion wiring (touches quests.ts + registerJobs.ts)
2. **Agent B second** — Quest content + weekly assignment + notifier (touches dailyQuestReset.ts + registerJobs.ts, may conflict on registerJobs)
3. **Agent C last** — Mini-app changes (fully independent frontend, zero backend overlap)

---

### Run 11 Retrospectives

#### Agent A Retrospective
*(To be filled by Agent A)*

#### Agent B Retrospective

**Status:** All 5 tasks completed. Build passes with zero errors.

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Add 24 quest templates (SQL migration) | `a64dd57` | Done |
| 2 | Add weekly quest assignment on Mondays | `4401db7` | Done |
| 3 | Create achievement notifier job | `881f4ae` | Done |
| 4 | Register achievement notifier in registerJobs | `0cf34b7` | Done |
| 5 | Build verification | (clean build, no fix needed) | Done |

**Problems faced:** None. All files were straightforward, no conflicts with other agents' owned files.

**Notes:**
- Quest templates: 24 new (6 per mode), using `WHERE NOT EXISTS` for idempotency. SQL migration file ready to run on server.
- Weekly assignment: Added to `dailyQuestReset.ts` handler — checks `getUTCDay() === 1` (Monday) then calls `quest_manager --assign-weekly` for 2 quests per user.
- Achievement notifier: Follows `questReminders.ts` pattern — queries `user_achievements` from last 20 minutes, sends Telegram messages with rate limiting. 15-minute cron with 20-minute lookback gives overlap to avoid missed notifications.
- `registerJobs.ts` is a GRAY AREA file (Agent A also modifies it). My changes are on separate lines (import at bottom of imports, array entry at end of array, setBotInstance after existing calls), so merge should be clean.

**Recommendations for next run:**
- Run the `run11_quest_templates.sql` migration on the production database after merge.
- Achievement notifier may send duplicate notifications if a user unlocks an achievement that persists across the 20-minute window — consider adding a `notified_at` column to `user_achievements` in a future run to track sent notifications.

#### Agent C Retrospective
*(To be filled by Agent C)*
