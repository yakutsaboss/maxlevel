# Parallel Agents Protocol

This file is the single source of truth for running parallel Claude Code agents on the Wibecode RPG bot project. Each "Run" launches 2-6 agents (A, B, C, D, E, F) in separate git worktrees, plus Agent 0 (orchestrator) in the main repo.

For completed run history (Runs 2–70), see `PARALLEL_AGENTS_HISTORY.md`.

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

## MANDATORY ROADMAP (Runs 65-74) — Agent 0 MUST Follow This

⚠️ **This roadmap is NON-NEGOTIABLE. Agent 0 must execute these runs IN ORDER.**
⚠️ **Do NOT skip, reorder, or replace runs with "more important" work.**
⚠️ **If you are Agent 0 and you are about to design a new run, the NEXT unexecuted run below is your ONLY option.**

### Background
Runs 56-64 were supposed to deliver avatars, trophies, shop, and 30+ achievements. Instead, Agent 0 improvised social features, challenge discovery, and test hardening. This roadmap corrects course.

### Current State (after Run 64)
- 1817+ tests (954 bot + 863 mini-app)
- Tier system: free/subscriber/premium with channel verification + mode gating
- Payment: Telegram Stars end-to-end (createInvoiceLink → pre_checkout → successful_payment)
- Celebrations: Confetti, LevelUpModal, XpFloat wired into Dashboard
- Social: friends (request/accept/reject/unfriend), challenges (create/discover/join/progress/leave/detail), user search
- Achievements: basic system exists, ~15 achievements seeded, achievement checking on quest completion
- Avatars: shared avatar data file exists, leaderboard shows avatar_id, but NO visual avatar system
- Shop: nothing exists (no shop page, no purchasable items, no inventory)

### The Roadmap

| Run | Focus | Agents | Status |
|-----|-------|--------|--------|
| **65** | Achievement Expansion — 30+ New Achievements | 5 | ✅ |
| **66** | Pixel Art Avatar System | 5 | ✅ |
| **67** | Animated Avatars + Trophy System | 5 | ✅ |
| **68** | Purchasable Achievements + Stars Punishment | 5 | ✅ |
| **69** | Shop Page + Content Polish | 5 | ✅ |
| **70** | Final QA + Performance Optimization | 4 | ✅ |
| **71** | Accessibility + PWA + Dark Mode | 4 | ✅ |
| **72** | Advanced Analytics + Data Export | 4 | ⬜ |
| **73** | Notification System + Smart Reminders | 4 | ⬜ |
| **74** | Integration Testing + Launch Prep | 3 | ⬜ |

---

#### Run 65: Achievement Expansion — 30+ New Achievements (5 Agents)

**Goal**: Expand the achievement system from ~15 to 45+ achievements across all categories.

**Agent A — Achievement Seed Data**
- OWNED: `database/seed_data.sql`
- Add 30+ new achievements across categories:
  - Social achievements (5): First Friend, Social Butterfly (10 friends), Challenge Creator, Challenge Champion, Helping Hand
  - Streak achievements (5): 7-day, 14-day, 30-day, 60-day, 100-day streaks
  - Mode mastery (6): Master of each mode (fitness, hydration, finance, medication, habits, learning)
  - Quest achievements (5): First Quest, 10 Quests, 50 Quests, 100 Quests, Quest Perfectionist (all daily)
  - XP milestones (5): Level 5, 10, 25, 50, 100
  - Special achievements (4): Early Adopter, Premium Member, Night Owl (complete after 10pm), Weekend Warrior
- Each achievement: name, description, icon_emoji, criteria JSONB, xp_reward, rarity (common/rare/epic/legendary)

**Agent B — Achievement Checking Service Refactor**
- OWNED: `bot/src/api/routes/achievements.ts`, `bot/src/utils/achievementChecker.ts` (NEW)
- Extract achievement checking logic into a dedicated service
- Add check functions for each new category: checkSocialAchievements, checkStreakAchievements, checkModeAchievements, checkQuestAchievements, checkXpAchievements
- Wire into existing quest completion and user update flows

**Agent C — Achievement Gallery UI**
- OWNED: `mini-app/src/pages/Achievements.tsx`, `mini-app/src/components/achievements/` (NEW dir)
- Redesign achievements page: grid gallery with category tabs (All/Social/Streak/Mode/Quest/XP/Special)
- Each achievement card: icon, name, description, rarity badge (color-coded), progress bar (e.g., "7/10 friends"), locked/unlocked state
- Filter by: earned/unearned, rarity, category

**Agent D — Achievement Notification + Celebration Integration**
- OWNED: `bot/src/utils/achievementChecker.ts` (GRAY — add notification calls), celebration hooks
- When achievement unlocked: trigger confetti + achievement toast in mini-app
- Add Telegram bot notification for rare/epic/legendary achievements
- Wire into the useCelebration hook

**Agent E — Tests**
- Test achievement checker service (unit tests for each check function)
- Test achievement gallery UI (component tests)
- Update existing achievement tests for new structure

---

#### Run 66: Pixel Art Avatar System (5 Agents)

**Goal**: Build a pixel art avatar system where users can customize their character.

**Agent A — Avatar Data Model + API**
- OWNED: `database/schema.sql` (ADD tables), `bot/src/api/routes/avatars.ts` (NEW)
- New tables: `avatar_items` (id, category, name, sprite_key, rarity, unlock_type, unlock_criteria), `user_avatar` (user_id, equipped_items JSONB)
- Seed default avatar items: 5 hairstyles, 5 outfits, 5 accessories, 3 backgrounds
- API: GET /avatar/:userId, PATCH /avatar/:userId/equip, GET /avatar/items (catalog)

**Agent B — Avatar Sprite Rendering**
- OWNED: `mini-app/src/components/avatar/` (NEW dir)
- AvatarRenderer component: takes equipped items, renders layered pixel art (CSS layers or canvas)
- Sprite sheet system: each item category has a sprite sheet PNG
- Create placeholder sprite data (colored squares/simple shapes for now)

**Agent C — Avatar Selection UI**
- OWNED: `mini-app/src/pages/AvatarCustomizer.tsx` (NEW), `mini-app/src/hooks/useAvatar.ts` (NEW)
- Full-screen avatar customizer: preview on top, item category tabs below
- Tap item to preview, "Equip" button to save
- Show locked items grayed out with unlock hint
- useAvatar hook: load current avatar, save changes via API

**Agent D — Avatar Integration**
- OWNED: Dashboard, Profile, Leaderboard avatar rendering
- Replace generic avatar circles with AvatarRenderer component
- Show user's custom avatar in: Dashboard header, Profile page, Leaderboard rows, Social friend cards

**Agent E — Tests**
- Avatar API tests (HTTP), AvatarRenderer tests, AvatarCustomizer tests

---

#### Run 67: Animated Avatars + Trophy System (5 Agents)

**Goal**: Add avatar animations and a trophy case for showcasing achievements.

**Agent A — Avatar Animation States**
- OWNED: `mini-app/src/components/avatar/AvatarAnimator.tsx` (NEW)
- Animation states: idle (breathing), celebrate (jump + particles), level-up (glow + scale), walk
- Use CSS keyframes or Framer Motion for smooth pixel-perfect animations
- Trigger animations on events (quest complete, level up, achievement unlock)

**Agent B — Trophy System Backend**
- OWNED: `database/schema.sql` (ADD tables), `bot/src/api/routes/trophies.ts` (NEW)
- New table: `trophies` (id, name, description, icon, rarity, criteria), `user_trophies` (user_id, trophy_id, earned_at)
- Seed 15-20 trophies: "First Steps", "Social Star", "Challenge Conqueror", "Streak Master", etc.
- API: GET /trophies/:userId (earned), GET /trophies (all available)
- Trophy unlock logic tied to achievement milestones

**Agent C — Trophy Case UI**
- OWNED: `mini-app/src/pages/TrophyCase.tsx` (NEW), `mini-app/src/components/trophies/` (NEW)
- Trophy display case: 3D-ish shelf layout with trophy icons
- Earned trophies are shiny/animated, unearned are silhouettes
- Tap to see details + how to earn
- Add Trophy Case link to Profile page

**Agent D — i18n + Integration**
- OWNED: i18n files, navigation, routes
- Add all trophy/animation i18n keys (en, ru, zh)
- Add Trophy Case to navigation/router
- Wire avatar animations into existing celebration system

**Agent E — Tests**
- Trophy API tests, Trophy Case component tests, avatar animation tests

---

#### Run 68: Purchasable Achievements + Stars Punishment (5 Agents)

**Goal**: Add monetization through purchasable achievements and a punishment system.

**Agent A — Shop Backend**
- OWNED: `database/schema.sql` (ADD tables), `bot/src/api/routes/shop.ts` (NEW)
- New tables: `shop_items` (id, type, item_id, price_stars, price_xp, is_featured), `user_purchases` (user_id, item_id, purchased_at)
- Seed shop items: premium achievements, rare avatar items, trophy boosters
- API: GET /shop/items, POST /shop/purchase (Stars or XP payment)

**Agent B — Stars Punishment System**
- OWNED: `bot/src/api/routes/punishment.ts` (modify), `bot/src/jobs/definitions/` (modify)
- When user misses daily goals: deduct Stars (configurable per punishment config)
- Add `punishment_history` tracking
- Integration with existing punishment configuration UI
- Telegram notification before deduction ("You missed your goal! X Stars will be deducted in 1 hour")

**Agent C — Purchase Flow UI**
- OWNED: `mini-app/src/hooks/usePurchase.ts` (NEW), `mini-app/src/components/shop/` (NEW)
- Purchase confirmation modal (show item, price in Stars or XP, balance)
- Stars payment via existing Telegram Stars flow
- XP payment (deduct from user balance)
- Purchase success animation

**Agent D — Premium Achievement Badges**
- OWNED: achievement display components
- Purchased achievements get special visual treatment: gold border, sparkle animation, "Premium" tag
- Show purchase status in achievement gallery
- Add "Buy" button on locked purchasable achievements

**Agent E — Tests**
- Shop API tests, punishment logic tests, purchase flow tests

---

#### Run 69: Shop Page + Content Polish (5 Agents)

**Goal**: Build the full shop page UI and polish all content.

**Agent A — Shop Page UI**
- OWNED: `mini-app/src/pages/Shop.tsx` (NEW), `mini-app/src/hooks/useShop.ts` (NEW)
- Full shop page: featured items carousel, category tabs (Avatars/Achievements/Trophies/Boosters)
- Item cards: preview, price, rarity badge, "Buy" button
- User balance display (Stars + XP)
- Search/filter functionality

**Agent B — Inventory System**
- OWNED: `mini-app/src/pages/Inventory.tsx` (NEW), `bot/src/api/routes/inventory.ts` (NEW)
- User inventory page: owned items by category
- Equip/unequip avatar items from inventory
- Show purchase history

**Agent C — Content Audit + Polish**
- OWNED: seed data, i18n files
- Review all seeded achievements (text quality, balanced XP rewards, correct criteria)
- Review all trophy descriptions
- Review all shop item descriptions and prices
- Ensure all 3 languages are complete and consistent

**Agent D — Navigation + Routing**
- OWNED: routing, navigation, i18n keys
- Add Shop page to main navigation (with cart icon)
- Add Inventory to Profile sub-navigation
- Add all shop/inventory i18n keys (en, ru, zh)
- Deep link support: /shop/:itemId

**Agent E — Tests**
- Shop page tests, inventory tests, content validation tests

---

#### Run 70: Final QA + Performance Optimization (4 Agents)

**Goal**: Full regression testing, performance optimization, bundle analysis.

**Agent A — Performance Audit + Fixes**
- Bundle analysis (vite-bundle-visualizer), identify top 5 largest chunks
- Code splitting: lazy load Shop, TrophyCase, AvatarCustomizer, Inventory pages
- Memo optimization for heavy components (AvatarRenderer, achievement gallery)
- Target: -40% main bundle size

**Agent B — Database Performance**
- Add missing indexes for new tables (shop_items, user_purchases, trophies, user_trophies, avatar_items, user_avatar)
- Review and optimize slow queries (EXPLAIN ANALYZE on critical paths)
- Add connection pool tuning if needed

**Agent C — Full Regression Test Suite**
- Run ALL tests, fix any failures
- Manual flow testing: onboarding → quest → achievement → shop → purchase → equip
- Cross-feature integration tests
- Payment end-to-end verification

**Agent D — Service Worker + PWA**
- Fix SW cache version (dynamic, not hardcoded)
- Add PWA manifest with proper icons
- Offline support for cached pages
- App install prompt

---

#### Run 71: Accessibility + PWA + Dark Mode (4 Agents)

**Agent A**: ARIA labels, keyboard nav, screen reader support across all pages
**Agent B**: Dark mode theme system (CSS variables, theme toggle in settings, persist preference)
**Agent C**: PWA enhancements (offline pages, cache strategies, background sync)
**Agent D**: Tests for a11y, dark mode, PWA

---

#### Run 72: Advanced Analytics + Data Export (4 Agents)

**Agent A**: Analytics dashboard improvements (charts, trends, comparisons)
**Agent B**: Google Sheets auto-export (weekly Q&A data, progress summaries)
**Agent C**: Data export feature (PDF/CSV personal data export, GDPR compliance)
**Agent D**: Tests

---

#### Run 73: Notification System + Smart Reminders (4 Agents)

**Agent A**: Smart reminder engine (optimal time detection, adaptive frequency)
**Agent B**: Notification preferences UI (per-mode, per-type toggles)
**Agent C**: Telegram notification templates (rich media, inline buttons)
**Agent D**: Tests

---

#### Run 74: Integration Testing + Launch Prep (3 Agents)

**Agent A**: Full end-to-end testing (all user flows)
**Agent B**: Load testing + monitoring setup
**Agent C**: Documentation + launch checklist

### Expected Metrics After Run 74
- Tests: 2500+
- Achievement count: 45+
- Avatar items: 20+
- Trophies: 15-20
- Shop items: 30+
- Bundle size: -40% from current
- All 3 languages complete

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

<!-- Runs 60-70 archived to PARALLEL_AGENTS_HISTORY.md -->

## RUN 71

**Theme**: Accessibility + PWA Completion (4 Agents)
**From Roadmap**: Run 71: Accessibility + PWA + Dark Mode
**Note**: Dark mode is already fully implemented (ThemeSettings component with auto/light/dark, Telegram CSS variables, localStorage persistence). Agent B reassigned from dark mode to keyboard navigation + focus management.

### Run 71 Agents

| Agent | Focus | Worktree |
|-------|-------|----------|
| A | ARIA audit + screen reader fixes across all pages | Wibecode-agent-a |
| B | Keyboard navigation + focus management | Wibecode-agent-b |
| C | PWA completion — wire components + offline enhancements | Wibecode-agent-c |
| D | Tests for a11y + PWA | Wibecode-agent-d |

### Run 71 File Ownership

| File/Dir | Owner | Access |
|----------|-------|--------|
| mini-app/src/pages/** | A | MODIFY (ARIA only) |
| mini-app/src/components/** (existing) | A, B | A=ARIA attrs, B=keyboard handlers |
| mini-app/src/components/SkipLink.tsx | B | NEW |
| mini-app/src/components/FocusTrap.tsx | B | NEW |
| mini-app/src/App.tsx | C | MODIFY (wire PWA components) |
| mini-app/public/sw.js | C | MODIFY |
| mini-app/src/hooks/useServiceWorker.ts | C | MODIFY |
| mini-app/src/components/InstallPrompt.tsx | C | MODIFY |
| mini-app/src/components/OfflineBanner.tsx | C | MODIFY |
| mini-app/public/manifest.json | C | MODIFY |
| mini-app/src/__tests__/** | D | NEW test files |
| bot/src/__tests__/** | D | NEW test files |

### Run 71 Merge Order

1. **B** (keyboard nav + focus — foundational utilities)
2. **A** (ARIA audit — modifies many files but minimal conflict risk)
3. **C** (PWA wiring — touches App.tsx)
4. **D** (tests — always last)

### Run 71 Retrospectives

#### Agent A Retrospective
**ARIA audit + screen reader fixes across all mini-app pages and components**

Changes made (27 files modified):

**Pages (14 files):**
1. **Dashboard.tsx** — `aria-hidden` on Sparkles, Compass, Scroll, ArrowRight icons
2. **Profile.tsx** — `aria-hidden` on Palette, Trophy, Package icons
3. **Quests.tsx** — `aria-hidden` on Target, CheckCircle, Trophy icons; `role="tablist"`/`role="tab"`/`aria-selected` on tab container; `role="progressbar"` with value attrs on progress bar; `role="img"` on emoji
4. **Leaderboard.tsx** — `aria-hidden` on Trophy (header + empty state), Share2 icons
5. **Shop.tsx** — `aria-hidden` on ShoppingBag, Search, Star, Sparkles, Check icons; `aria-label` on search button, search input, featured items, item cards; `role="tablist"`/`role="tab"`/`aria-selected` on categories; `role="status"` on skeleton
6. **Inventory.tsx** — `aria-hidden` on category icons, Package icons; `role="status"` on loading; `aria-label` on equip buttons; `role="tablist"`/`role="tab"`/`aria-selected`; `role="img"` on item emoji
7. **Social.tsx** — `aria-hidden` on Users, UserMinus, Check, X icons; `role="img"` + `aria-label` on online/offline dot; `aria-label` on confirm/cancel buttons
8. **Achievements.tsx** — `aria-hidden` on Trophy, RefreshCw, SlidersHorizontal icons; `aria-label` on filter toggle
9. **Finance.tsx** — `role="status"` on loading; `aria-hidden` on DollarSign, Wallet, PiggyBank icons; `role="tablist"`/`role="tab"`/`aria-selected` on tabs
10. **Admin.tsx** — `aria-hidden` on all 5 tab icons + Shield, LogOut; `role="tablist"`/`role="tab"`/`aria-selected`; `aria-label` on logout button
11. **Onboarding.tsx** — `role="status"` + `aria-live="polite"` on save indicator
12. **AvatarCustomizer.tsx** — `role="img"` on avatar preview; `aria-hidden` on User icons; `role="status"` on skeleton; `role="tablist"`/`role="tab"`/`aria-selected`; `aria-label` on item buttons with name/rarity/status
13. **TrophyCase.tsx** — `aria-hidden` on TrophyIcon, RefreshCw; `role="progressbar"` with value attrs; `role="tablist"`/`role="tab"`/`aria-selected`
14. **Settings.tsx** — already had good ARIA, no changes needed

**Components (21 files):**
1. **Toast.tsx** — `aria-hidden` on variant icons; `role="alert"` + `aria-live="assertive"`; `aria-label` on dismiss
2. **ErrorBoundary.tsx** — `role="alert"`; `aria-hidden` on icons; `aria-label` on retry
3. **LazyPageWrapper.tsx** — `role="status"` + `aria-label` on loading fallback
4. **CheckInButton.tsx** — `aria-hidden` on icons; `role="status"` + `aria-live="polite"` on success
5. **DashboardSkeleton.tsx** — `role="status"` + `aria-label`
6. **TabButton.tsx** (quests) — `role="tab"` + `aria-selected`; `aria-label` on count
7. **QuestCard.tsx** — `aria-hidden` on Zap, CheckCircle; `role="progressbar"` with value attrs
8. **QuestDetailModal.tsx** — `aria-hidden` on Zap, Calendar, Loader2, CheckCircle; `role="progressbar"`
9. **QuestFilters.tsx** — `aria-hidden` on ArrowUpDown
10. **TodaysProgress.tsx** — `aria-hidden` on Target, Zap, Clock icons
11. **StreakSection.tsx** — `aria-hidden` on Award, Calendar; `role="progressbar"` on streak bar
12. **ThemeSettings.tsx** — `aria-hidden` on Palette + theme icons; `aria-label` on theme buttons
13. **TrophyCaseSkeleton.tsx** — `role="status"` + `aria-label`
14. **AchievementsSkeleton.tsx** — `role="status"` + `aria-label`
15. **AchievementCard.tsx** — `aria-hidden` on ChevronDown
16. **TrophyCard.tsx** — `aria-hidden` on Lock; `aria-label` on button with name/rarity/status
17. **TrophyDetailModal.tsx** — `aria-hidden` on X, Calendar, Target icons
18. **BudgetTracker.tsx** — `role="status"` on loading; `aria-hidden` on Loader2
19. **BudgetSummary.tsx** — `aria-hidden` on TrendingUp, TrendingDown, DollarSign, PieChart; `role="progressbar"` on spending bar
20. **BudgetForm.tsx** — `aria-hidden` on PlusCircle
21. **GoalCard.tsx** — `aria-hidden` on Target, Wallet, Calendar, TrendingUp; `aria-label` on deposit button; `role="progressbar"` on savings bar

Build: passed (0 TypeScript errors, 0 warnings)

#### Agent B Retrospective
**Keyboard navigation + focus management**

Changes made:
1. **SkipLink.tsx** (NEW): "Skip to main content" link, visually hidden until focused. Uses `sr-only` + `focus:not-sr-only` pattern. Jumps to `#main-content` anchor.
2. **FocusTrap.tsx** (NEW): Generic focus trap component for modals. Traps Tab/Shift+Tab cycling, Escape to close, auto-focuses first focusable element on mount, restores focus on unmount. Uses `role="dialog"` + `aria-modal="true"`.
3. **App.tsx**: Added `<SkipLink />` at top of app container, wrapped Routes in `<main id="main-content">` for skip-link target.
4. **Navigation.tsx**: Full keyboard navigation:
   - Arrow Left/Right moves focus between nav items (wraps around)
   - `role="tablist"` on container, `role="tab"` + `aria-selected` on items
   - Roving tabindex pattern (active tab=0, others=-1)
   - "More" button: `aria-haspopup="menu"`, Escape closes popup
   - Popup menu: `role="menu"` + `role="menuitem"`, Arrow Up/Down/Left/Right navigation, Escape returns focus to trigger
5. **Modal FocusTrap wrapping** — added FocusTrap to 6 modals:
   - PurchaseModal (Escape disabled during processing)
   - LevelUpModal (autoFocus=false, auto-dismisses)
   - QuestDetailModal
   - TrophyDetailModal
   - ProfileEditModal
   - ChallengeDetailModal
6. **index.css**: Extended focus-visible indicators to `[role="tab"]`, `[role="menuitem"]`, `[tabindex]`, `input`, `select`, `textarea`.

No issues encountered. Build passes cleanly.

#### Agent C Retrospective
**PWA completion — wired components + offline enhancements**

Changes made:
1. **App.tsx**: Imported and mounted `OfflineBanner` (top of app, before Routes) and `InstallPrompt` (after Routes, before Navigation). Both render conditionally via their internal state.
2. **sw.js caching improvements**:
   - Added pre-caching of 4 top SPA routes (`/dashboard`, `/quests`, `/profile`, `/achievements`) during install using `Promise.allSettled` so a single failure doesn't break SW installation.
   - Added stale-while-revalidate strategy for API GET requests matching `/api/user/*` and `/api/achievements` — returns cached response immediately while fetching fresh data in background.
   - Other API calls (POST, non-SWR paths) remain network-first.
3. **index.css**: Added `@media (display-mode: standalone)` block with dark-themed CSS variable fallbacks for when the app runs as a standalone PWA without Telegram's theme injection.
4. **manifest.json**: Added `id`, `scope`, `orientation: portrait`, and a `maskable` icon entry. Removed empty `screenshots` array.
5. **Icons**: Generated placeholder 192x192 and 512x512 solid-color PNG icons (`#6366f1` indigo) for PWA installability. These should be replaced with proper branded icons later.

Files modified: `mini-app/src/App.tsx`, `mini-app/public/sw.js`, `mini-app/src/index.css`, `mini-app/public/manifest.json`
Files created: `mini-app/public/icon-192.png`, `mini-app/public/icon-512.png`
Build: passed

#### Agent D Retrospective
**Task**: Tests for accessibility and PWA components

**What was done**:
1. Ran existing tests — bot: 84 files/1046 tests, mini-app: 162 files/1022 tests (all green)
2. Created `mini-app/src/__tests__/components/OfflineBanner.test.tsx` (4 tests) — renders when offline, hides when online, shows warning text, transitions between states
3. Created `mini-app/src/__tests__/components/InstallPrompt.test.tsx` (6 tests) — shows prompt on `beforeinstallprompt`, dismiss persists 7 days to localStorage, doesn't show if recently dismissed, shows after 7-day expiry, install triggers haptic + native prompt
4. Created `mini-app/src/__tests__/hooks/useServiceWorker.test.ts` (8 tests) — online/offline tracking, SW registration, update detection, SKIP_WAITING message, event listener cleanup
5. Created `mini-app/src/__tests__/a11y/aria-audit.test.tsx` (12 tests) — renders Dashboard, Profile, Settings, Leaderboard and validates: no missing alt text on images, all buttons have accessible names, headings in order
6. Fixed 3 pre-existing test failures caused by Agent B's a11y changes: `TabButton.test.tsx` (role button→tab), `Navigation.test.tsx` (role button→tab), `DashboardSkeleton.test.tsx` (updated snapshot for new role/aria-label)

**Results**: 166 test files / 1052 tests passing (mini-app), 84 files / 1046 tests passing (bot)

**A11y findings documented in tests**:
- Settings page: h1 → h3 heading gap (h2 skipped — child components use h3 directly)
- Profile page: h1 → h3 heading gap (same pattern — ProfileHeader uses h3 for sub-sections)

**Challenges**:
- `useServiceWorker` cleanup effect called `navigator.serviceWorker.removeEventListener` after test teardown restored the original (undefined in jsdom). Fixed by calling `cleanup()` before restoring mocks in `afterEach`.
- Profile a11y test needed `AVATAR_OPTIONS` export in the `ProfileEditModal` mock (used by `ProfileHeader`).

**Files created**: 4 new test files (30 new tests total)
**Files modified**: 3 existing test files (cross-agent fix), 1 snapshot updated

#### Agent 0 Retrospective
**Status**: All 4 agents delivered, deployed to production. No merge conflicts, no post-merge fixes.

**Notes**: All agents committed directly to main (same pattern as Run 70 — agents don't use worktree branches). Dark mode was already complete from previous runs, so Agent B was reassigned to keyboard navigation — excellent outcome with FocusTrap, SkipLink, and roving tabindex in Navigation.

**Key outcomes**:
- Agent A: 27 files modified with comprehensive ARIA (role/aria-label/aria-live/aria-hidden across all 14 pages + 21 components)
- Agent B: SkipLink, FocusTrap (used in 6 modals), full keyboard nav in Navigation, focus-visible indicators
- Agent C: Wired InstallPrompt + OfflineBanner into App.tsx, SWR caching for API, CSS fallbacks for standalone PWA, placeholder icons
- Agent D: 30 new tests (4 test files), fixed 3 cross-agent breakages, documented 2 heading hierarchy issues
- Tests: 2098 total (1046 bot + 1052 mini-app)

---

## ROADMAP STATUS CHECK

Runs 65-71 complete. Remaining: 72, 73, 74.

---

## RUN 72

**Theme**: Advanced Analytics + Data Export (4 Agents)
**From Roadmap**: Run 72

**Context**: Analytics API already exists (3 endpoints in bot/src/api/routes/analytics.ts), Google Sheets export tool exists (tools/sheets_analytics_export.py), but no chart library and no analytics page in mini-app. Finance page exists with basic budget/savings tabs.

### Run 72 Agents

| Agent | Focus | Worktree |
|-------|-------|----------|
| A | Analytics page + charts (install recharts, build page) | Wibecode-agent-a |
| B | Data export API + CSV/JSON export endpoint | Wibecode-agent-b |
| C | Finance analytics charts + time range filters | Wibecode-agent-c |
| D | Tests | Wibecode-agent-d |

### Run 72 File Ownership

| File/Dir | Owner | Access |
|----------|-------|--------|
| mini-app/src/pages/Analytics.tsx | A | NEW |
| mini-app/src/components/analytics/ | A | NEW dir |
| mini-app/src/hooks/useAnalytics.ts | A | NEW |
| mini-app/package.json | A | MODIFY (add recharts) |
| mini-app/src/App.tsx | A | MODIFY (add route) |
| mini-app/src/components/Navigation.tsx | A | MODIFY (add nav item) |
| bot/src/api/routes/export.ts | B | NEW |
| bot/src/api/routes/analytics.ts | B | MODIFY (add time range params) |
| mini-app/src/pages/Finance.tsx | C | MODIFY |
| mini-app/src/components/finance/ | C | MODIFY existing + NEW chart components |
| mini-app/src/hooks/useFinanceAnalytics.ts | C | NEW |
| mini-app/src/__tests__/** | D | NEW |
| bot/src/__tests__/** | D | NEW |

### Run 72 Merge Order

1. **B** (backend export API + analytics params)
2. **A** (analytics page — depends on B's time range params)
3. **C** (finance charts — independent)
4. **D** (tests — last)

### Run 72 Retrospectives

#### Agent A Retrospective
*(To be filled by Agent A)*

#### Agent B Retrospective
**Data export API + analytics time range support — completed.**

Changes:
- **analytics.ts**: Added `parseRange()` helper and optional `?range=7d|30d|all` query param to `GET /analytics/:userId/summary` and `GET /analytics/:userId/modes`. Filters `quest_instances` by `instance_date`. Default: 7d. Cache keys include range suffix to avoid stale cross-range data.
- **export.ts** (new): Two endpoints — `GET /export/:userId/csv` and `GET /export/:userId/json`. Both export user info, full quest history, achievements earned, and current streaks. CSV uses RFC 4180 escaping with section headers. JSON returns a clean structured payload. Both set `Content-Disposition: attachment` for file download.
- **server.ts**: Registered `exportRouter` at `/api/export`.

Build: clean, zero errors. No mini-app or test files touched.

#### Agent C Retrospective
*(To be filled by Agent C)*

#### Agent D Retrospective
*(To be filled by Agent D)*

#### Agent 0 Retrospective
*(To be filled by Agent 0 after merge)*
