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

## MANDATORY ROADMAP (Runs 75-82) — Agent 0 MUST Follow This

⚠️ **This roadmap is NON-NEGOTIABLE. Agent 0 must execute these runs IN ORDER.**
⚠️ **Do NOT skip, reorder, or replace runs with "more important" work.**
⚠️ **If you are Agent 0 and you are about to design a new run, the NEXT unexecuted run below is your ONLY option.**

### Background
Runs 65-74 delivered the core gamification stack: achievements (50+), avatars, trophies, shop, inventory, analytics, finance, notifications, DND, PWA, a11y, keyboard nav, and integration tests. The app is feature-complete for v1. This new roadmap focuses on two themes:

1. **Interactive Engagement** (Runs 75, 76, 79) — Activity Hub (sport logging), Knowledge Feed (articles + quizzes), daily challenges, streak multipliers, habit chains, social activity feed
2. **Spreadsheet/Admin Ecosystem** (Runs 77, 78, 80) — Full admin panel overhaul, live Google Sheets bidirectional sync, onboarding classification, funnel analytics, user segmentation, churn prediction

Plus two mixed runs (81, 82) for personalization engine, A/B testing, referrals, and final integration.

### Current State (after Run 74)
- 2000+ tests (1046 bot + 1052 mini-app)
- 80+ API endpoints across 33 route files
- 24 DB tables + 2 views
- 16 mini-app pages
- Full gamification: achievements, avatars, trophies, shop, inventory
- Social: friends, challenges, leaderboard
- Finance: budget tracker, savings goals
- Notifications: DND, timezone-aware, rich HTML templates
- PWA: service worker, install prompt, offline banner
- A11y: ARIA labels, keyboard nav, focus traps, skip links
- Google Sheets export (weekly scheduled)
- Prometheus metrics + health endpoint

### The Roadmap

| Run | Theme | Focus | Agents | Status |
|-----|-------|-------|--------|--------|
| **75** | Engagement | Activity Hub — Sport Logging System | 9 | ⬜ |
| **76** | Engagement | Knowledge Feed — Articles & Quizzes | 8 | ⬜ |
| **77** | Admin | Admin Panel Revolution + Player Management | 9 | ⬜ |
| **78** | Admin | Live Spreadsheet Ecosystem | 9 | ⬜ |
| **79** | Engagement | Daily Challenges + Gamification | 8 | ⬜ |
| **80** | Admin | Funnel Analytics + User Segmentation | 8 | ⬜ |
| **81** | Mixed | Personalization + Growth Engine | 8 | ⬜ |
| **82** | Mixed | Final Integration + QA | 7 | ⬜ |

---

#### Run 75: Activity Hub — Sport Logging System (9 Agents)

**Goal**: Build a complete sport/activity logging system — the "special button" that opens a window with sport activities users can tap to log workouts and complete daily quests.

**Agent A — Activity DB schema + seed data**
- OWNED: `database/migrations/run75_activities.sql`
- New tables: `activity_types` (id, name, category, icon_emoji, description, default_duration_min, calories_per_min, requires_timer, requires_gps), `activity_logs` (id, user_id, activity_type_id, started_at, ended_at, duration_min, distance_km, calories_burned, notes, gps_data JSONB)
- Seed 20+ activities across 6 categories: Cardio (running, cycling, swimming, jump rope, HIIT), Strength (gym, push-ups, pull-ups, squats, deadlifts), Flexibility (yoga, stretching, pilates), Sports (basketball, football, tennis, boxing), Outdoor (hiking, walking, climbing), Mind-Body (meditation, breathing exercises)

**Agent B — Activity logging API**
- OWNED: `bot/src/api/routes/activities.ts` (NEW)
- `POST /api/activities/start` (start timer), `POST /api/activities/stop` (end + save), `POST /api/activities/log` (quick log without timer)
- `GET /api/activities/types` (catalog with categories), `GET /api/activities/:userId/history` (paginated, filterable)
- `GET /api/activities/:userId/stats` (total time, calories, favorite activity, streaks), `DELETE /api/activities/:logId`

**Agent C — Activity Hub page UI**
- OWNED: `mini-app/src/pages/ActivityHub.tsx` (NEW), `mini-app/src/components/activity/ActivityCard.tsx` (NEW)
- Grid of sport cards grouped by category tabs, each card shows icon + name + last done + personal record
- One-tap "Quick Log" button per activity. "Start Workout" button for timer-based activities
- Search/filter by category. Add to Navigation (dumbbell icon in main nav)

**Agent D — Activity timer/stopwatch**
- OWNED: `mini-app/src/components/activity/WorkoutTimer.tsx` (NEW)
- Full-screen timer with start/pause/resume/stop, elapsed time display (HH:MM:SS)
- Calories counter (real-time estimate), heart rate zone indicator, lap/set counter for gym workouts
- GPS distance tracking toggle (optional). Celebration animation on complete

**Agent E — Activity history + statistics**
- OWNED: `mini-app/src/pages/ActivityHistory.tsx` (NEW), `mini-app/src/components/activity/ActivityCalendar.tsx` (NEW)
- Calendar view (day dots colored by category), weekly/monthly summary cards (total time, calories, activities count)
- Personal records section, streaks per activity type. Chart: activity frequency over time (recharts bar chart)

**Agent F — Activity → Quest integration**
- OWNED: `bot/src/utils/activityQuestMatcher.ts` (NEW)
- Link activities to existing quest system: when user logs an activity matching a fitness quest, auto-progress that quest
- New quest type `activity_based` in quests table. Auto-complete quests when activity logged. XP bonus for exceeding targets

**Agent G — Activity achievements (15 new)**
- OWNED: `database/seed_data.sql` (activity achievements section)
- Seed 15 activity achievements: First Workout, 10/50/100 Workouts, Cardio King, Iron Pumper, Zen Master, Sports Star, Outdoor Explorer, Marathon (42km running), Century (100 activities), Calorie Crusher (10,000 cal), Early Bird Athlete, Night Owl Athlete, Variety Pack (all 6 categories)
- Wire into achievement checker

**Agent H — Activity i18n + navigation**
- OWNED: i18n files, `mini-app/src/App.tsx` (route), `mini-app/src/components/Navigation.tsx` (nav item)
- All i18n keys for activity hub (en/ru/zh — 40+ keys each)
- Add ActivityHub + ActivityHistory routes, Navigation dumbbell icon, deep links (/activity, /activity/:typeId)
- Add activity stats to Profile page

**Agent I — Tests**
- Activity API tests (HTTP integration), ActivityHub component tests, WorkoutTimer tests
- ActivityHistory tests, activity-quest matcher unit tests, achievement checker tests for new achievements

---

#### Run 76: Knowledge Feed + Content Platform (8 Agents)

**Goal**: Content delivery system — articles about personal finance, savings, health tips, productivity. Users read short articles, take quizzes, earn XP.

**Agent A — Content DB schema + seed data**
- OWNED: `database/migrations/run76_content.sql`
- New tables: `content_articles` (id, title, summary, body_html, category, read_time_min, xp_reward, cover_emoji, difficulty, tags JSONB, is_published, created_at), `content_quiz` (id, article_id, question, options JSONB, correct_index, xp_reward), `user_content_progress` (user_id, article_id, read_at, quiz_score, xp_earned), `user_bookmarks` (user_id, article_id, bookmarked_at)
- Seed 30+ articles: Personal Finance (10), Health (10), Productivity (10) — each with 2-3 quiz questions

**Agent B — Content API**
- OWNED: `bot/src/api/routes/content.ts` (NEW)
- `GET /api/content/feed` (paginated, category filter, unread first), `GET /api/content/:articleId`, `POST /api/content/:articleId/read` (mark read + award XP)
- `GET /api/content/:articleId/quiz`, `POST /api/content/:articleId/quiz` (submit answers + award XP)
- `POST /api/content/:articleId/bookmark` (toggle), `GET /api/content/bookmarks/:userId`, `GET /api/content/progress/:userId`

**Agent C — Content Feed page**
- OWNED: `mini-app/src/pages/ContentFeed.tsx` (NEW), `mini-app/src/components/content/ContentCard.tsx` (NEW)
- Swipeable horizontal card carousel (cover emoji, title, category badge, read time, XP reward)
- Category filter tabs (All, Finance, Health, Productivity). "New" badge for unread. Pull-to-refresh

**Agent D — Article detail + reader**
- OWNED: `mini-app/src/pages/ArticleReader.tsx` (NEW)
- Full-screen article view with scroll progress indicator, rich text rendering (HTML)
- Estimated read time, related articles at bottom, bookmark button, "Take Quiz" CTA at end
- Track reading completion (must scroll to 80%+ to earn read XP)

**Agent E — Quiz system UI**
- OWNED: `mini-app/src/components/content/ContentQuiz.tsx` (NEW)
- Post-article quiz modal: multiple choice with animated feedback (correct=green+confetti, wrong=red+shake)
- Score summary at end, XP earned display, share score button, "Read Again" if failed

**Agent F — Bookmarks + reading history**
- OWNED: `mini-app/src/pages/ReadingHistory.tsx` (NEW)
- Tabs: History / Bookmarks / Stats. Chronological read list with quiz scores
- Stats: total articles read, average quiz score, XP from content, reading streak, favorite category

**Agent G — Content recommendation + daily tip**
- OWNED: Dashboard widget, daily summary integration
- Recommend articles based on active modes, reading history, quiz performance
- Dashboard widget: "Today's Read" card. Include daily tip in daily summary notification

**Agent H — Tests**
- Content API tests, feed component tests, quiz flow tests, bookmark tests, recommendation logic tests

---

#### Run 77: Admin Panel Revolution + Player Management (9 Agents)

**Goal**: Completely redesign the admin panel into a full-featured player management system. Admin can search players, view full profiles, award XP, unlock achievements, change tiers.

**Agent A — Admin layout + dashboard redesign**
- OWNED: `mini-app/src/components/admin/AdminLayout.tsx` (NEW), `mini-app/src/components/admin/AdminSidebar.tsx` (NEW), `mini-app/src/pages/admin/AdminDashboard.tsx` (NEW)
- Full sidebar-nav admin layout: sidebar (Dashboard, Players, Quests, Achievements, Content, Analytics, Settings)
- Dashboard: 6 stat cards (Total Users, Active Today, New This Week, Revenue, Avg Session, Retention Rate), mini charts
- Quick actions panel (broadcast, trigger job, export data)

**Agent B — Player list — spreadsheet-style table**
- OWNED: `mini-app/src/pages/admin/AdminPlayerList.tsx` (NEW), `mini-app/src/hooks/useAdminPlayers.ts` (NEW)
- Full-width data table: Avatar, Name, Telegram ID, Level, XP, Tier, Active Modes, Last Active, Joined, Status
- Column sorting, text search, filters (tier, level range, mode, active/inactive, date range), pagination (50/page)
- Row selection (checkboxes for bulk ops), CSV export button, inline quick actions per row

**Agent C — Player detail view**
- OWNED: `mini-app/src/pages/admin/AdminPlayerDetail.tsx` (NEW)
- Full player profile: Overview, Activity Timeline, Mode Progress, Quest History, Achievements, Financial Summary, Social, Settings/Preferences, Punishment History
- Breadcrumb navigation back to player list

**Agent D — Admin actions — XP, achievements, tier**
- OWNED: `mini-app/src/components/admin/AdminPlayerActions.tsx` (NEW)
- "Award XP" modal, "Unlock Achievement" dropdown + confirm, "Change Tier" select + confirm
- "Send Message" (via Telegram), "Deactivate Account" confirm modal. All actions logged to audit log

**Agent E — Admin actions API backend**
- OWNED: `bot/src/api/routes/admin-players.ts` (enhanced), `database/migrations/run77_admin.sql`
- New endpoints: `POST /admin/players/:userId/award-xp`, `POST /admin/players/:userId/unlock-achievement`, `PATCH /admin/players/:userId/tier`, `POST /admin/players/:userId/message`
- New table: `admin_audit_log` (admin_id, action, target_user_id, details JSONB, created_at)
- Enhanced `GET /admin/players` with pagination, search, sort, filter params

**Agent F — Bulk operations**
- OWNED: `mini-app/src/components/admin/AdminBulkActions.tsx` (NEW)
- Toolbar on row selection: bulk award XP, bulk change tier, bulk send message, bulk export
- Confirmation modal (count + action), progress bar for large ops, all actions logged

**Agent G — Admin notification center**
- OWNED: `mini-app/src/components/admin/AdminNotifications.tsx` (NEW), `bot/src/api/routes/admin-notifications.ts` (NEW)
- Bell icon → dropdown: new registrations, achievement unlocks, payments, system alerts
- Mark as read, filter by type, link to player detail. Backend: `admin_notifications` table + API

**Agent H — Admin i18n + routing**
- OWNED: i18n files, `mini-app/src/App.tsx` (admin routes)
- All admin i18n keys (en/ru/zh — 60+ keys)
- Routing: `/admin/dashboard`, `/admin/players`, `/admin/players/:id`, etc.
- Sidebar active state. Mobile-responsive admin layout

**Agent I — Tests**
- Admin API tests (CRUD, bulk, audit log), player list tests, player detail tests, action modal tests, bulk ops tests

---

#### Run 78: Live Spreadsheet Ecosystem (9 Agents)

**Goal**: Bidirectional Google Sheets sync — admin edits spreadsheet, app reflects changes. Auto-populated player roster, onboarding classification, point system configuration.

**Agent A — Sheets sync engine backend**
- OWNED: `tools/sheets_sync_engine.py` (NEW)
- Core functions: `push_to_sheet()`, `pull_from_sheet()`, `diff_and_merge()`. Conflict resolution: remote wins for admin-editable fields
- Batch operations (100+ rows efficiently), retry with exponential backoff

**Agent B — Player roster sheet**
- OWNED: `tools/sheets_player_roster.py` (NEW)
- Auto-populated sheet: Telegram ID, Username, Level, XP, Tier, Modes, Last Active, Join Date, Streaks, Quests, Achievements
- Sync every 30 min. Admin-editable: Tier (syncs back to app), Notes. Conditional formatting by tier

**Agent C — Onboarding classification sheet**
- OWNED: `tools/sheets_onboarding_classification.py` (NEW)
- Sheet: User ID, Username, Modes Selected, Quiz Responses, Pain Points, Punishment Consent, Referral Source, Auto-Classification
- Auto-classify: "Casual", "Committed", "Hardcore", "Finance-focused", "Fitness-focused". Admin can override

**Agent D — Point system config sheet**
- OWNED: `tools/config_from_sheets.py` (NEW)
- Admin-editable config: XP per quest difficulty, streak bonus multipliers, activity XP rates, content XP, level thresholds
- Pull config → cache in memory → API reads from cache. Config change detection + hot reload

**Agent E — Activity tracking sheet**
- OWNED: `tools/sheets_activity_tracking.py` (NEW)
- Daily activity log: Date, User, Activity Type, Duration, Calories, Quest Linked, XP Earned
- Aggregation rows: daily/weekly totals. Charts: frequency histogram, popular activities

**Agent F — Sheets sync API + admin UI**
- OWNED: `bot/src/api/routes/admin-sheets.ts` (NEW), `mini-app/src/pages/admin/AdminSheets.tsx` (NEW)
- API: `POST /admin/sheets/sync`, `GET /admin/sheets/status`, `GET /admin/sheets/config`
- Admin UI: sync status, last sync time, manual sync button, sheet links, config preview table

**Agent G — Sync scheduler + monitoring**
- OWNED: `bot/src/jobs/definitions/sheetSync.ts` (NEW), `database/migrations/run78_sheets.sql`
- pg-boss job: `sheetSync` every 30 min. Sync order: config → roster → onboarding → activities
- `sheets_sync_log` table: sync_time, sheet_name, rows_pushed, rows_pulled, errors, duration_ms

**Agent H — Financial aggregation sheet**
- OWNED: `tools/sheets_financial_summary.py` (NEW)
- Per-user budget/savings overview: Monthly Income/Expenses, Savings Rate, Goal Progress
- Privacy: only finance-mode users. Update weekly

**Agent I — Tests**
- Sheets sync tests (mock Google Sheets API), config reader tests, scheduler tests, API tests, sync log tests

---

#### Run 79: Enhanced Daily Engagement + Gamification (8 Agents)

**Goal**: Daily rotating challenges, streak multipliers, calendar heatmap, habit chains, social activity feed.

**Agent A — Daily challenge engine backend**
- OWNED: `bot/src/api/routes/daily-challenges.ts` (NEW), `bot/src/jobs/definitions/dailyChallengeGenerator.ts` (NEW), `database/migrations/run79_engagement.sql`
- Tables: `daily_challenges`, `daily_challenge_progress`
- Types: "Complete 3 quests", "Log 2 activities", "Read 1 article", "Beat your PR", "Help a friend"
- API: `GET /api/challenges/daily`, `POST /api/challenges/daily/:id/progress`. Midnight generator job

**Agent B — Dashboard quick-action widgets**
- OWNED: `mini-app/src/components/dashboard/QuickActionWidgets.tsx` (NEW)
- "Quick Activity" one-tap button, "Daily Challenge" card with progress, "Today's Read" card
- "Streak Status" animated flame with multiplier badge, "Friend Activity" ticker

**Agent C — Calendar heatmap**
- OWNED: `mini-app/src/components/activity/ActivityHeatmap.tsx` (NEW)
- GitHub-style contribution calendar. Day cells colored by intensity. Tooltip: date, activities, XP, quests
- Current streak highlight. Year/month toggle. Integrate into ActivityHistory + Profile

**Agent D — Habit chain tracker**
- OWNED: `mini-app/src/components/habits/HabitChainTracker.tsx` (NEW)
- Visual chain per mode: completed = solid link, missed = broken. Current/longest chain length
- Grace mechanic: miss 1 day + double next day = chain continues. "Don't break the chain!" message

**Agent E — Streak multiplier system**
- OWNED: `bot/src/utils/streakMultiplier.ts` (NEW)
- `getStreakMultiplier(streakDays)`: 1.0x (0-6d), 1.2x (7-13d), 1.5x (14-29d), 2.0x (30-59d), 2.5x (60-99d), 3.0x (100d+)
- Apply to quest + activity XP. Combo: all daily quests + daily challenge = bonus XP
- Pull multiplier values from config sheet (Run 78)

**Agent F — Social activity feed**
- OWNED: `mini-app/src/components/social/SocialFeed.tsx` (NEW)
- Friends' recent activities: "Alex completed Morning Run", "Maria unlocked Gold Trophy"
- Reactions (fire, clap, thumbs up) stored in `activity_reactions` table. "Nudge" inactive friends

**Agent G — Engagement i18n + animations**
- OWNED: i18n files, animation CSS/Framer Motion
- All i18n keys (en/ru/zh — 50+ keys). Micro-animations: chain forming, fire growing, multiplier bounce
- Haptic feedback on all interactions

**Agent H — Tests**
- Daily challenge engine tests, widget tests, heatmap tests, habit chain tests, multiplier tests, feed tests

---

#### Run 80: Funnel Analytics + User Segmentation (8 Agents)

**Goal**: Event-driven analytics — track user actions, visualize funnels, retention cohorts, auto-classify players.

**Agent A — Event tracking system**
- OWNED: `bot/src/utils/eventTracker.ts` (NEW), `database/migrations/run80_analytics.sql`
- Table: `analytics_events` (id, user_id, event_type, event_data JSONB, session_id, created_at)
- Events: onboarding_step, quest_started/completed, activity_logged, article_read, shop_purchase, page_viewed, session_start/end
- `trackEvent(type, data)` callable from any route. Middleware for auto-tracking

**Agent B — Onboarding funnel visualization**
- OWNED: `mini-app/src/pages/admin/AdminOnboardingFunnel.tsx` (NEW)
- Step-by-step funnel chart: Splash → Mode Selection → Quiz → Avatar → Punishment → Notifications → Complete
- Drop-off % between steps, median time per step. Filter by date range, referral source
- Drill down to specific users who dropped at each step

**Agent C — Feature adoption tracking**
- OWNED: `mini-app/src/pages/admin/AdminFeatureAdoption.tsx` (NEW)
- Table + charts: % of users using each feature. Segmented by tier/join date
- "Feature stickiness" metric: % who returned within 7 days. Trend over time

**Agent D — Player classification engine**
- OWNED: `tools/player_classifier.py` (NEW), `bot/src/jobs/definitions/playerClassification.ts` (NEW)
- Segments: Power Users, Regular, Casual, At-Risk, Churned
- Score based on: login frequency, quest completion, streaks, feature breadth, social engagement
- `user_segments` table. Daily job. Push to Google Sheet

**Agent E — Cohort retention analysis**
- OWNED: `mini-app/src/pages/admin/AdminRetention.tsx` (NEW)
- Retention matrix: rows = join week, columns = weeks 1-12. Color-coded heatmap
- D1, D7, D30, D90 rates. Filter by segment, mode, tier. Export to spreadsheet

**Agent F — Admin analytics dashboard revamp**
- OWNED: `mini-app/src/pages/admin/AdminDashboard.tsx` (enhanced)
- Interactive recharts: DAU/MAU, User Growth, Revenue, Top Features, Segment Distribution, Retention Trend
- Date range picker. Period comparison (this week vs last)

**Agent G — Churn prediction + re-engagement**
- OWNED: `bot/src/jobs/definitions/churnDetection.ts` (NEW)
- Churn risk score (0-100): days inactive, declining completion, broken streaks
- Auto-send re-engagement notification when score > 70. Admin: at-risk users sorted by score
- Push churn scores to spreadsheet

**Agent H — Tests**
- Event tracking tests, funnel tests, adoption tests, classifier tests, retention tests, churn score tests

---

#### Run 81: Personalization + Growth Engine (8 Agents)

**Goal**: Smart personalization — difficulty auto-adjusts, recommendations, A/B testing, referrals, surveys.

**Agent A — Difficulty adjustment algorithm**
- OWNED: `bot/src/utils/difficultyAdjuster.ts` (NEW), `bot/src/jobs/definitions/difficultyAdjustment.ts` (NEW)
- Auto-scale quest difficulty: >90% completion 7 days → increase, <50% → decrease
- `user_difficulty_profile` table (current_difficulty, adjustment_history JSONB)
- Pull base parameters from config sheet. API: GET/PATCH difficulty

**Agent B — Personalized recommendations**
- OWNED: `bot/src/utils/recommendationEngine.ts` (NEW), `bot/src/api/routes/recommendations.ts` (NEW)
- Recommend: quests, activities, articles, friends — based on history, modes, time of day, performance
- API: `GET /api/recommendations/:userId`. Dashboard: "Recommended For You" section

**Agent C — A/B testing framework**
- OWNED: `bot/src/api/routes/experiments.ts` (NEW), `database/migrations/run81_personalization.sql`
- Tables: `experiments`, `experiment_assignments`, `experiment_events`
- API: assignment, event tracking. Admin UI: create experiments, view results with confidence intervals
- SDK: `getVariant(experimentName, userId)`

**Agent D — In-app survey system**
- OWNED: `bot/src/api/routes/surveys.ts` (NEW), `mini-app/src/components/SurveyModal.tsx` (NEW)
- Tables: `surveys`, `survey_responses`. Types: NPS, feature feedback, free text
- Trigger conditions: after N days/quests, on specific page. XP reward for completion

**Agent E — Referral system**
- OWNED: `bot/src/api/routes/referrals.ts` (NEW), `mini-app/src/pages/ReferralPage.tsx` (NEW)
- Tables: `referral_codes`, `referral_completions`. Unique codes per user
- Referred: bonus XP. Referrer: XP + "Recruiter" badge. Dashboard: code, share buttons, count, rewards

**Agent F — Engagement scoring system**
- OWNED: `bot/src/utils/engagementScorer.ts` (NEW), `bot/src/jobs/definitions/engagementScoring.ts` (NEW)
- Composite score (0-100): login (30%), quests (25%), features (15%), social (15%), content (15%)
- `user_engagement_scores` table (daily snapshots). Admin player detail display. Trend chart

**Agent G — Growth metrics dashboard**
- OWNED: `mini-app/src/pages/admin/AdminGrowthMetrics.tsx` (NEW)
- AARRR funnel: Acquisition, Activation, Retention, Revenue, Referral
- LTV estimation based on tier + engagement. Month-over-month comparison

**Agent H — Tests**
- Difficulty tests, recommendation tests, A/B tests, survey tests, referral tests, engagement score tests

---

#### Run 82: Final Integration + Quality Assurance (7 Agents)

**Goal**: Connect all new features, ensure everything works, optimize performance, update documentation.

**Agent A — Cross-feature integration**
- Wire: Activity → quest → achievement → streak multiplier → daily challenge → engagement score → segment
- Content → quiz → XP → level → difficulty adjustment. Verify all event tracking fires correctly

**Agent B — Performance optimization**
- Bundle analysis, lazy-load all new pages. DB indexes on new tables
- Query optimization (EXPLAIN ANALYZE top 10 slowest). Target: <200ms p95 user-facing APIs

**Agent C — Onboarding v2 integration**
- Showcase new features in onboarding: Activity Hub preview, Content Feed preview
- Add referral code input step. Track all steps as analytics events

**Agent D — Spreadsheet integration testing**
- E2E: create user → classify → verify roster sheet → admin edits tier → sync → verify app → activity → verify sheet
- Fix sync issues. Document full data flow

**Agent E — Full regression test suite**
- Run ALL tests, fix failures. 10+ new integration test scenarios
- Verify all API endpoints. Test admin flows E2E

**Agent F — Documentation update**
- Update ARCHITECTURE.md, API_REFERENCE.md. New: ADMIN_GUIDE.md, SPREADSHEET_GUIDE.md

**Agent G — Load testing + monitoring**
- Test new endpoints under load (100 concurrent users). Target: <500ms p99
- Prometheus alert rules. Verify pg-boss jobs under load

### Expected Metrics After Run 82
- Tests: 3000+
- Activity types: 20+
- Content articles: 30+
- Admin features: full player management, bulk ops, audit log
- Google Sheets: 5 live-synced sheets (roster, onboarding, config, activities, financial)
- Analytics: event tracking, funnel viz, retention cohorts, churn prediction
- Personalization: A/B testing, referrals, difficulty adjustment, recommendations
- All 3 languages complete for all new features

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

<!-- Runs 2-74 archived to PARALLEL_AGENTS_HISTORY.md -->

## RUN 75: Activity Hub — Sport Logging System (9 Agents + Agent 0)

### Focus: Build a complete sport/activity logging system — users can open the Activity Hub, browse 20+ activities across 6 categories, start a timer workout or quick-log, track history with calendar view, and auto-complete fitness quests.

### Copy-Paste Prompts

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read PARALLEL_AGENTS.md — you are Agent A of Run 75. Your task: Activity DB schema + seed data. Create `database/migrations/run75_activities.sql` with two tables: `activity_types` (id SERIAL PRIMARY KEY, name VARCHAR NOT NULL, category VARCHAR NOT NULL, icon_emoji VARCHAR, description TEXT, default_duration_min INTEGER, calories_per_min NUMERIC, requires_timer BOOLEAN DEFAULT false, requires_gps BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW()) and `activity_logs` (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), activity_type_id INTEGER NOT NULL REFERENCES activity_types(id), started_at TIMESTAMPTZ NOT NULL, ended_at TIMESTAMPTZ, duration_min INTEGER, distance_km NUMERIC, calories_burned INTEGER, notes TEXT, gps_data JSONB, created_at TIMESTAMPTZ DEFAULT NOW()). Add indexes on activity_logs(user_id, started_at) and activity_logs(activity_type_id). Seed 20+ activities across 6 categories: Cardio (running, cycling, swimming, jump rope, HIIT), Strength (gym workout, push-ups, pull-ups, squats, deadlifts), Flexibility (yoga, stretching, pilates), Sports (basketball, football, tennis, boxing), Outdoor (hiking, walking, climbing), Mind-Body (meditation, breathing exercises). Each with realistic default_duration_min and calories_per_min. OWNED files: database/migrations/run75_activities.sql. FORBIDDEN: everything else. After done, write your retrospective in PARALLEL_AGENTS.md under Run 75 Retrospectives → Agent A.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read PARALLEL_AGENTS.md — you are Agent B of Run 75. Your task: Activity logging API. Create `bot/src/api/routes/activities.ts` with these endpoints: POST /api/activities/start (start timer — create log with started_at, no ended_at), POST /api/activities/stop (end timer — set ended_at, calculate duration_min and calories_burned from activity_type calories_per_min × duration), POST /api/activities/log (quick log — create complete log with duration_min provided), GET /api/activities/types (list all activity_types grouped by category, cached), GET /api/activities/:userId/history (paginated with ?page=&limit=&category=&from=&to= filters, ordered by started_at DESC), GET /api/activities/:userId/stats (total activities, total time, total calories, favorite activity, current streak, longest streak), DELETE /api/activities/:logId (soft delete or hard delete). Register the router in server.ts at /api/activities. Use existing patterns from other route files (asyncHandler, authenticateTelegram, authorizeUser, successResponse). OWNED: bot/src/api/routes/activities.ts, bot/src/api/server.ts (add router import). FORBIDDEN: mini-app/*, database/*. After done, verify build with `cd bot && npx tsc --noEmit`. Write retrospective in PARALLEL_AGENTS.md.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read PARALLEL_AGENTS.md — you are Agent C of Run 75. Your task: Activity Hub page UI. Create `mini-app/src/pages/ActivityHub.tsx` — the main activity page. Layout: header with title "Activity Hub" and total stats (activities this week, calories burned). Category tabs (All, Cardio, Strength, Flexibility, Sports, Outdoor, Mind-Body) with horizontal scroll. Grid of ActivityCard components (2 columns). Each card shows: icon_emoji, activity name, category badge, "last done: X days ago" or "Never", personal record (longest duration or most calories). Two action buttons per card: "Quick Log" (logs instantly with default duration) and "Start Timer" (navigates to timer). Search bar at top. Create `mini-app/src/components/activity/ActivityCard.tsx`. Create `mini-app/src/hooks/useActivities.ts` — hook that fetches GET /api/activities/types and GET /api/activities/:userId/stats. Use existing patterns (usePullToRefresh, skeleton loading, ErrorSection). OWNED: mini-app/src/pages/ActivityHub.tsx, mini-app/src/components/activity/ActivityCard.tsx, mini-app/src/hooks/useActivities.ts. FORBIDDEN: bot/*, database/*, mini-app/src/App.tsx, mini-app/src/components/Navigation.tsx. After done, verify: cd mini-app && npx tsc --noEmit. Write retrospective.
```

**Agent D** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-d`):
```
Read PARALLEL_AGENTS.md — you are Agent D of Run 75. Your task: Workout timer/stopwatch component. Create `mini-app/src/components/activity/WorkoutTimer.tsx` — a full-screen timer overlay. Props: activityType (name, icon_emoji, calories_per_min), onComplete(duration, calories), onCancel(). Features: large HH:MM:SS display (centered), animated pulsing ring around time, Start/Pause/Resume button (toggle), Stop button (shows confirmation "End workout?"), real-time calories counter (calories_per_min × elapsed minutes), lap/set counter (+ button to increment, shows list of lap times). On complete: celebration animation (confetti or checkmark), show summary (duration, calories, laps), "Save" button that calls onComplete. Use Telegram theme CSS vars for colors. Add haptic feedback on button presses (window.Telegram?.WebApp?.HapticFeedback). Create `mini-app/src/hooks/useWorkoutTimer.ts` — timer logic hook (start, pause, resume, stop, elapsed, isRunning). Use setInterval with useRef for accurate timing. OWNED: mini-app/src/components/activity/WorkoutTimer.tsx, mini-app/src/hooks/useWorkoutTimer.ts. FORBIDDEN: bot/*, database/*, pages/*. After done, verify build. Write retrospective.
```

**Agent E** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-e`):
```
Read PARALLEL_AGENTS.md — you are Agent E of Run 75. Your task: Activity history + statistics page. Create `mini-app/src/pages/ActivityHistory.tsx` — activity history with calendar and stats. Sections: (1) Calendar heatmap at top — show last 3 months, each day cell colored by activity count (0=gray, 1-2=light, 3-4=medium, 5+=dark), tap day to see activities. (2) Weekly summary card: total activities, total time, total calories, comparison to last week (↑/↓ with %). (3) Personal records: longest run, most calories in a session, longest streak. (4) Activity log list: chronological list with activity icon, name, duration, calories, date. Paginated with "Load more". Create `mini-app/src/components/activity/ActivityCalendar.tsx` for the calendar heatmap. Use recharts for any charts (already installed). Fetch data from GET /api/activities/:userId/history and /stats. OWNED: mini-app/src/pages/ActivityHistory.tsx, mini-app/src/components/activity/ActivityCalendar.tsx. FORBIDDEN: bot/*, database/*. After done, verify build. Write retrospective.
```

**Agent F** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-f`):
```
Read PARALLEL_AGENTS.md — you are Agent F of Run 75. Your task: Activity → Quest integration. Create `bot/src/utils/activityQuestMatcher.ts` — service that links activities to quests. When a user logs an activity, check if any of their active quests can be progressed. Logic: match activity_type.category to quest mode (e.g., category "Cardio"/"Strength"/"Flexibility" → fitness mode). If a fitness quest is active and in "ready" or "in_progress" status, increment its check_in_count. If check_in_count >= target, auto-complete the quest and award XP. Export function `matchActivityToQuests(userId, activityLog)` that: (1) queries user's active quest_instances with JOIN on quests table, (2) filters to fitness mode quests, (3) updates check_in_count via SQL, (4) if quest completed, calls existing awardXp and checkAndUnlockAchievements utilities. Import and call this function from the activities route POST /api/activities/log and POST /api/activities/stop. OWNED: bot/src/utils/activityQuestMatcher.ts. GRAY AREA: bot/src/api/routes/activities.ts (add import + call to matchActivityToQuests after successful log — coordinate with Agent B). FORBIDDEN: mini-app/*, database/*. After done, verify build. Write retrospective.
```

**Agent G** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-g`):
```
Read PARALLEL_AGENTS.md — you are Agent G of Run 75. Your task: Activity achievements (15 new). Add 15 new achievements to database/seed_data.sql in a clearly marked "-- Activity Achievements (Run 75)" section. Achievements: (1) First Workout — complete 1 activity {type:"activity_count",value:1} — common, 25 XP, (2) Getting Started — 10 activities {type:"activity_count",value:10} — common, 50 XP, (3) Dedicated Athlete — 50 activities {type:"activity_count",value:50} — rare, 150 XP, (4) Century Club — 100 activities {type:"activity_count",value:100} — epic, 300 XP, (5) Cardio King — 20 cardio activities {type:"activity_category_count",category:"Cardio",value:20} — rare, 100 XP, (6) Iron Pumper — 20 strength {type:"activity_category_count",category:"Strength",value:20} — rare, 100 XP, (7) Zen Master — 20 flexibility {type:"activity_category_count",category:"Flexibility",value:20} — rare, 100 XP, (8) Sports Star — 20 sports {type:"activity_category_count",category:"Sports",value:20} — rare, 100 XP, (9) Outdoor Explorer — 10 outdoor {type:"activity_category_count",category:"Outdoor",value:10} — rare, 100 XP, (10) Marathon Runner — total 42km running distance {type:"total_distance_km",activity:"running",value:42} — epic, 250 XP, (11) Calorie Crusher — burn 10000 total cal {type:"total_calories",value:10000} — epic, 200 XP, (12) Early Bird Athlete — workout before 7am {type:"activity_time",before:"07:00"} — rare, 75 XP, (13) Night Owl Athlete — workout after 22:00 {type:"activity_time",after:"22:00"} — rare, 75 XP, (14) Variety Pack — log all 6 categories {type:"activity_all_categories",value:6} — epic, 200 XP, (15) Workout Streak 7 — 7 consecutive days with activity {type:"activity_streak",value:7} — rare, 100 XP. Also update bot/src/utils/achievementChecker.ts (or achievementEngine.ts — check which exists) to add checking logic for the new activity-based criteria types. OWNED: database/seed_data.sql (activity achievements section only), bot/src/utils/achievementChecker.ts or achievementEngine.ts. FORBIDDEN: mini-app/*. After done, verify bot build. Write retrospective.
```

**Agent H** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-h`):
```
Read PARALLEL_AGENTS.md — you are Agent H of Run 75. Your task: Activity i18n + navigation wiring. (1) Add all i18n keys for the Activity Hub in mini-app/src/i18n/en.ts, ru.ts, zh.ts. Keys needed: nav.activities, activityHub.title, activityHub.searchPlaceholder, activityHub.categories.* (all, cardio, strength, flexibility, sports, outdoor, mindBody), activityHub.quickLog, activityHub.startTimer, activityHub.lastDone, activityHub.never, activityHub.personalRecord, activityHub.thisWeek, activityHub.caloriesBurned, activityTimer.title, activityTimer.start, activityTimer.pause, activityTimer.resume, activityTimer.stop, activityTimer.endWorkout, activityTimer.summary, activityTimer.save, activityTimer.laps, activityHistory.title, activityHistory.weeklyStats, activityHistory.personalRecords, activityHistory.longestRun, activityHistory.mostCalories, activityHistory.longestStreak, activityHistory.loadMore, activityHistory.noActivities — at least 40 keys in each language. (2) Add routes to mini-app/src/App.tsx: lazy-load ActivityHub at /activity and ActivityHistory at /activity/history. (3) Add to mini-app/src/components/Navigation.tsx: add Dumbbell icon (from lucide-react) as a main nav item (5th position, replacing something in the "More" menu or adding to main bar). OWNED: mini-app/src/i18n/en.ts, ru.ts, zh.ts (activity keys only), mini-app/src/App.tsx (add routes), mini-app/src/components/Navigation.tsx (add nav item). FORBIDDEN: bot/*, database/*. After done, verify build. Write retrospective.
```

**Agent I** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-i`):
```
Read PARALLEL_AGENTS.md — you are Agent I of Run 75. Your task: Tests for the Activity Hub system. Create tests for: (1) Activity API — bot/src/__tests__/routes/activities.test.ts: test all 7 endpoints (start, stop, log, types, history, stats, delete). Use existing test patterns (buildApp, supertest, mock pool.query). Test: successful responses, missing params, auth required, pagination, filters. (2) ActivityHub UI — mini-app/src/__tests__/pages/ActivityHub.test.tsx: test rendering, category filtering, search, card display. Mock useActivities hook. (3) WorkoutTimer — mini-app/src/__tests__/components/WorkoutTimer.test.tsx: test start/pause/resume/stop, elapsed time display, calories calculation, onComplete callback. Use vi.useFakeTimers(). (4) ActivityHistory — mini-app/src/__tests__/pages/ActivityHistory.test.tsx: test calendar rendering, stats display, load more, empty state. (5) activityQuestMatcher — bot/src/__tests__/utils/activityQuestMatcher.test.ts: test matching logic, quest auto-completion, XP award. Run existing tests first: cd bot && npx vitest --run, cd mini-app && npx vitest --run — fix any pre-existing failures before adding new tests. OWNED: all test files listed above. FORBIDDEN: source files (no modifications to non-test files). After done, write retrospective.
```

### Run 75 File Ownership Matrix

| File/Dir | Owner | Access |
|----------|-------|--------|
| database/migrations/run75_activities.sql | A | NEW |
| database/seed_data.sql (activity achievements) | G | MODIFY (append only) |
| bot/src/api/routes/activities.ts | B | NEW |
| bot/src/api/server.ts | B | MODIFY (register router) |
| bot/src/utils/activityQuestMatcher.ts | F | NEW |
| bot/src/utils/achievementChecker.ts | G | MODIFY (add activity criteria) |
| mini-app/src/pages/ActivityHub.tsx | C | NEW |
| mini-app/src/pages/ActivityHistory.tsx | E | NEW |
| mini-app/src/components/activity/ActivityCard.tsx | C | NEW |
| mini-app/src/components/activity/WorkoutTimer.tsx | D | NEW |
| mini-app/src/components/activity/ActivityCalendar.tsx | E | NEW |
| mini-app/src/hooks/useActivities.ts | C | NEW |
| mini-app/src/hooks/useWorkoutTimer.ts | D | NEW |
| mini-app/src/App.tsx | H | MODIFY (add routes) |
| mini-app/src/components/Navigation.tsx | H | MODIFY (add nav item) |
| mini-app/src/i18n/en.ts, ru.ts, zh.ts | H | MODIFY (add activity keys) |
| bot/src/__tests__/** | I | NEW test files |
| mini-app/src/__tests__/** | I | NEW test files |
| PARALLEL_AGENTS.md | ALL | Retrospective section only |

### Run 75 Merge Order

1. **A** (DB schema — foundational, no code deps)
2. **B** (API routes — depends on schema)
3. **F** (Quest matcher — depends on B's routes)
4. **G** (Achievements — depends on schema + achievement checker)
5. **C** (Activity Hub UI — depends on B's API)
6. **D** (Timer component — independent UI)
7. **E** (History page — depends on B's API)
8. **H** (i18n + navigation — touches App.tsx, merge late)
9. **I** (Tests — always last)

### Run 75 Retrospectives

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

#### Agent I Retrospective
*(To be filled by Agent I)*

#### Agent 0 Retrospective
*(To be filled by Agent 0 after merge)*
