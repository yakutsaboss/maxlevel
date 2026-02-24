# Parallel Agents Protocol

This file is the single source of truth for running parallel Claude Code agents on the Wibecode RPG bot project. Each "Run" launches 2-6 agents (A, B, C, D, E, F) in separate git worktrees, plus Agent 0 (orchestrator) in the main repo.

For completed run history (Runs 2–89), see `PARALLEL_AGENTS_HISTORY.md`.

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
**Status**: Complete — all 4 files done, `tsc --noEmit` passes (exit 0).

**Created**:
- `bot/src/jobs/definitions/medicationReminder.ts` — every 15 min, queries `medications` table, matches `time_of_day` entries within ±7 min of user's local time, skips DND + already-logged meds, sends via `medicationReminderTemplate`, logs to `notification_log`.
- `bot/src/jobs/definitions/streakMilestone.ts` — daily at 1 AM UTC, queries `streaks` table for `current_streak` in [7,14,30,60,100], skips DND, sends via `streakMilestoneTemplate`, logs to `notification_log`.

**Modified**:
- `bot/src/utils/notificationTemplates.ts` — added `MedicationReminderInfo`/`StreakMilestoneInfo` interfaces + 2 template functions with InlineKeyboard buttons.
- `bot/src/jobs/registerJobs.ts` — imported both new jobs, added to `jobs` array + `setBotInstance` calls.

**Patterns followed**: Exact same structure as `questReminders.ts` — `sendWithRetry`, `isInDndWindow`, `BATCH_RATE=30`, `logger.child`, typed `query<>`, parameterized SQL.

**Dependencies**: Requires Agent A's `medications`, `medication_logs`, and `notification_log` tables to exist. SQL uses `unnest(m.time_of_day)` for the `TIME[]` column and `LEFT JOIN medication_logs` to skip already-logged entries.

**No issues encountered.**

#### Agent 0 Retrospective
*(To be filled by Agent 0)*
```

---

## MANDATORY ROADMAP — Feature Development + TG API Integration

⚠️ **This roadmap is NON-NEGOTIABLE. Agent 0 must execute these runs IN ORDER.**
⚠️ **Do NOT skip, reorder, or replace runs with "more important" work.**
⚠️ **If you are Agent 0 and you are about to design a new run, the NEXT unexecuted run below is your ONLY option.**

### Previous Roadmap (78-91) — COMPLETED
Runs 78-85: MVP recovery + feature re-enablement. Run 86: Animation polish + medication unlock. Run 87: Full medication system. Run 88: Medication integration fixes. Run 89: Test debt cleanup (24 failures → 0). Run 90: UX polish (error states, skeletons, transitions, a11y, toasts). Run 91: Bug fixes (language selection, quest celebration, payment handlers) + TG API research.

### Current State (post-Run 91)
- **18 pages**, 5+1 nav tabs (medication conditional), medication CRUD fully operational
- **Bot tests**: 1100/1100 pass. **Mini-app tests**: 942/942 pass.
- **Payments**: Handler exists, notification bot notifies owner, `/stars` command shows balance
- **TG API features doc**: `docs/TELEGRAM_API_FEATURES.md` — comprehensive reference for Bot API 9.4
- **Known bugs**: Quest modal auto-close (fixed pre-deploy), quest content not translated, /metrics wrong IP (fixed pre-deploy)
- **Missing**: Medication analytics UI, Stars shop UI, quest i18n, Google Sheets OAuth

### The Roadmap

| Run | Focus | Agents | Status |
|-----|-------|--------|--------|
| **78-91** | MVP Recovery → Medication → Bug Fixes + TG API Research | varies | ✅ |
| **92** | Bug Fixes + Quest i18n + Google Sheets OAuth + Medication Analytics | 9 | ⬜ |
| **93** | Stars Shop + Celebrations Upgrade | 8 | ⬜ |
| **94** | Cloud Storage + Home Screen + QR + Social Basics | 8 | ⬜ |
| **95** | Premium & Monetization — Subscriptions, Paid Content, Gifts | 8 | ⬜ |
| **96** | Advanced Features — Inline Mode, Referrals, Biometrics, Deep Links | 8 | ⬜ |
| **97** | Final Polish — Bundle, Performance, Tests, Accessibility | 7 | ⬜ |

### Run 92: Bug Fixes + Quest i18n + Sheets OAuth + Medication Analytics (9 agents)
- **Agent A**: Quest modal fixes — auto-close on completion, consistent width (remove layoutId), move AnimatePresence to parent
- **Agent B**: Quest i18n (DB) — add `title_ru`, `description_ru` columns to quests table, API returns correct language based on user preference
- **Agent C**: Quest i18n (frontend) — pass user language to API, fallback to English if no translation exists
- **Agent D**: /metrics fix + notification bot polish — fix server IP, improve error handling
- **Agent E**: Google Sheets OAuth — `/sheets_login` command with OAuth flow, refresh token storage, simplify /sheets command
- **Agent F**: Medication analytics API — `GET /api/medication-logs/:userId/analytics` (weekly/monthly adherence, per-med stats, streaks)
- **Agent G**: Medication history page — `MedicationHistory.tsx` with calendar view + daily log details
- **Agent H**: Adherence charts — weekly bar chart + monthly trend line using recharts
- **Agent I**: History tab integration — add tabs to Medications page, wire hooks, i18n strings

### Run 93: Stars Shop + Celebrations Upgrade (8 agents)
- **Agent A**: Stars shop UI — price display in Stars, purchase button, `openInvoice()` callback
- **Agent B**: Stars invoice API — catalog config, pre-checkout validation
- **Agent C**: Stars purchase e2e — invoice creation → open invoice → payment notification → item delivery
- **Agent D**: Animated sticker integration — bot sends .TGS stickers via `sendSticker` for celebrations
- **Agent E**: Celebration upgrades (quest) — Lottie player, animated stickers in QuestCompletionCelebration
- **Agent F**: Celebration upgrades (level/achievement) — upgrade LevelUpModal + achievement toasts
- **Agent G**: Sticker pack browser — selection UI in settings, persist celebration sticker choice
- **Agent H**: Translate seed quest data to Russian — populate `title_ru`/`description_ru` for all existing quests

### Run 94: Cloud Storage + Home Screen + QR + Social Basics (8 agents)
- **Agent A**: Cloud Storage — TG `CloudStorage` API to persist user preferences cross-device
- **Agent B**: Home screen shortcut — `addToHomeScreen()` prompt, dismissal tracking, settings toggle
- **Agent C**: QR code sharing — profile/referral QR generator, `showScanQrPopup()`, deep links
- **Agent D**: Share to story — `shareToStory()` for quest completion, level-up, achievements
- **Agent E**: Custom emoji in bot messages — quest notifications, summaries with emoji (requires TG Premium)
- **Agent F**: Challenge improvements — creation flow polish, notifications, challenge leaderboard
- **Agent G**: Notification preferences — per-category toggles, DND schedule, notification center
- **Agent H**: Deep linking — `?startapp=` params, shareable quest links, direct navigation from bot

### Run 95: Premium & Monetization (8 agents)
- **Agent A**: Star subscription backend — `editUserStarSubscription`, tiers table, recurring billing
- **Agent B**: Star subscription frontend — tier comparison, subscribe/unsubscribe flow
- **Agent C**: Paid content — `sendPaidMedia` integration, premium guides behind Star paywall
- **Agent D**: Premium features gate — middleware, free tier limits, upgrade prompts
- **Agent E**: Subscription management — manage page, cancel/change tier, billing history
- **Agent F**: Revenue dashboard (admin) — Stars revenue, transaction history, refunds
- **Agent G**: Gift system — `sendGift` between users, gift inventory
- **Agent H**: Premium avatars — animated avatars, premium-only collection via Stars

### Run 96: Advanced Features (8 agents)
- **Agent A**: Inline mode — `@botusername` responds with quest stats, profile cards
- **Agent B**: Referral system backend — referrals table, code generation, bonus XP on signup
- **Agent C**: Referral system frontend — referral page, share link, referral count
- **Agent D**: Biometric auth — `BiometricManager` for purchases, profile changes
- **Agent E**: Gamification upgrades — daily login rewards, streak bonuses, XP multiplier events
- **Agent F**: Location quests backend — new quest type, geofencing, `LocationManager` integration
- **Agent G**: Location quests frontend — map UI, distance tracking, permissions
- **Agent H**: Sensor mini-games — accelerometer/gyroscope interactions, shake-to-collect

### Run 97: Final Polish (7 agents)
- **Agent A**: Bundle optimization — lazy load recharts/lottie, tree-shake icons, code splitting
- **Agent B**: Performance audit — React.memo, re-renders, query dedup, lighthouse
- **Agent C**: Test coverage (mini-app) — target 90%+ on critical paths
- **Agent D**: Test coverage (bot) — target 90%+ on handlers, routes, jobs
- **Agent E**: E2E testing — full Telegram flow: onboarding → quests → payments
- **Agent F**: Accessibility audit — WCAG 2.1 AA, screen reader, keyboard-only
- **Agent G**: Documentation + i18n — API docs, README, missing i18n, Chinese translation

---

## RUN 90: UX Polish (5 Agents + Agent 0)

### Focus: Error handling, loading skeletons, page transitions, accessibility, toast/feedback polish

### Copy-Paste Prompts

**Agent 0** (open in: `c:\Users\Asus\Desktop\Wibecode`):
```
Read PARALLEL_AGENTS.md — you are Agent 0 for Run 90.
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read PARALLEL_AGENTS.md — you are Agent A of Run 90. Your task: Global error handling polish — error boundaries, retry patterns, offline UX.

IMPORTANT: Before doing anything, verify your working directory: run `pwd` and confirm it ends with `Wibecode-agent-a`, NOT `Wibecode`. If wrong, STOP and tell the user.

## Context

The app has basic error handling:
- `ErrorBoundary.tsx` — class component wrapping entire app, shows red error card with retry
- `ErrorSection.tsx` — reusable error display with `role="alert"`, retry button, haptic feedback
- `OfflineBanner.tsx` — shows banner when offline via `useServiceWorker()` hook
- Most pages use `ErrorSection` in their error states already

## What to do

### 1. Create `mini-app/src/components/PageErrorBoundary.tsx`
A lighter, page-level error boundary that:
- Catches errors only within a single page (not the whole app)
- Shows a friendly error message with the page name
- Has "Retry" button that resets error state AND calls React Query `queryClient.invalidateQueries()`
- Uses `motion.div` for smooth appearance (fade-in)
- Includes an error icon (AlertTriangle from lucide-react)
- Uses i18n keys for all text: `error.pageTitle`, `error.pageMessage`, `error.retry`
- Props: `pageName: string, children: ReactNode`

### 2. Wrap page routes in App.tsx with PageErrorBoundary
In `mini-app/src/App.tsx`, wrap each `<Route>` element's component with `PageErrorBoundary`:
```tsx
<Route path="/dashboard" element={
  <ProtectedRoute needsOnboarding={effectiveNeedsOnboarding} lazy>
    <PageErrorBoundary pageName="Dashboard"><Dashboard /></PageErrorBoundary>
  </ProtectedRoute>
} />
```
Do this for ALL page routes (Dashboard, Quests, Profile, Settings, Leaderboard, Achievements, Shop, TrophyCase, Inventory, Social, Analytics, ActivityHub, ActivityHistory, NotificationHistory, Medications, Admin).

### 3. Enhance ErrorSection.tsx with retry count and exponential backoff
Update `ErrorSection.tsx`:
- Add optional `maxRetries` prop (default: 3)
- Track retry count internally
- After `maxRetries`, disable the retry button and show "Please try again later"
- Show which retry attempt: "Retry (2/3)"
- Keep existing `role="alert"` and haptic feedback

### 4. Enhance OfflineBanner.tsx
- Add a "back online" animation: when connection restores, show green "Back online!" banner for 2 seconds before hiding
- Add retry action: button to manually check connection
- Use spring animation matching the existing entry animation

### 5. Build verify
`cd mini-app && npx tsc --noEmit`

OWNED: `mini-app/src/components/PageErrorBoundary.tsx` (new), `mini-app/src/components/ErrorBoundary.tsx`, `mini-app/src/components/ErrorSection.tsx`, `mini-app/src/components/OfflineBanner.tsx`, `mini-app/src/App.tsx` (GRAY: only add PageErrorBoundary wrappers around route elements)
FORBIDDEN: bot/src/*, skeleton components, PageTransition.tsx, Toast.tsx, FocusTrap.tsx, SkipLink.tsx, Navigation.tsx, modal components, test files
Write retrospective when done.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read PARALLEL_AGENTS.md — you are Agent B of Run 90. Your task: Loading state audit — skeleton loaders for all pages, shimmer effects.

IMPORTANT: Before doing anything, verify your working directory: run `pwd` and confirm it ends with `Wibecode-agent-b`, NOT `Wibecode`. If wrong, STOP and tell the user.

## Context

Most pages already have dedicated skeleton components:
- DashboardSkeleton, QuestsSkeleton, ProfileSkeleton, SettingsSkeleton, LeaderboardSkeleton, AchievementsSkeleton, TrophyCaseSkeleton — all in `components/<feature>/` dirs
- MedicationsSkeleton is inline in Medications.tsx
- ShopSkeleton, SocialSkeleton, ActivityHubSkeleton are inline in their pages

Pages MISSING proper skeletons:
- `Analytics.tsx` — shows spinner + loading text, no skeleton
- `NotificationHistory.tsx` — no skeleton
- `Inventory.tsx` — no skeleton visible
- `ActivityHistory.tsx` — unknown, needs checking

Existing skeletons use `animate-pulse` from Tailwind but no shimmer gradient effect.

## What to do

### 1. Create `mini-app/src/components/analytics/AnalyticsSkeleton.tsx`
Skeleton matching the Analytics page layout:
- Chart placeholder (rounded rect, full width, h-48)
- Stats row (3 metric cards)
- Trend section (2 rows with labels and values)
- Use `animate-pulse` + new shimmer effect
- Add `role="status"` and `aria-label="Loading analytics"`

### 2. Create `mini-app/src/components/notifications/NotificationHistorySkeleton.tsx`
Skeleton matching the NotificationHistory page:
- Filter tabs placeholder (row of 4-5 rounded pills)
- Notification list (5 items with icon circle + 2 text lines each)
- Use consistent skeleton pattern
- Add `role="status"` and `aria-label="Loading notifications"`

### 3. Create `mini-app/src/components/inventory/InventorySkeleton.tsx`
Skeleton matching the Inventory page:
- Tab bar placeholder
- Grid of 6 item cards (icon + title + description placeholders)
- Add `role="status"` and `aria-label="Loading inventory"`

### 4. Add shimmer CSS effect
Create or update `mini-app/src/styles/shimmer.css`:
```css
.skeleton-shimmer {
  position: relative;
  overflow: hidden;
}
.skeleton-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```
Import this in `mini-app/src/main.tsx` or the global CSS file.

### 5. Apply shimmer to existing skeletons
Update the existing skeleton components to add `skeleton-shimmer` class to their main containers (alongside `animate-pulse`):
- `DashboardSkeleton.tsx`
- `ProfileSkeleton.tsx`
- `LeaderboardSkeleton.tsx`
(Just add the class — don't restructure the components)

### 6. Wire new skeletons into their pages
- `Analytics.tsx` — replace spinner with `<AnalyticsSkeleton />`
- `NotificationHistory.tsx` — add loading state with `<NotificationHistorySkeleton />`
- `Inventory.tsx` — add loading state with `<InventorySkeleton />`

### 7. Build verify
`cd mini-app && npx tsc --noEmit`

OWNED: `mini-app/src/components/analytics/AnalyticsSkeleton.tsx` (new), `mini-app/src/components/notifications/NotificationHistorySkeleton.tsx` (new), `mini-app/src/components/inventory/InventorySkeleton.tsx` (new), `mini-app/src/styles/shimmer.css` (new), existing skeleton components (add shimmer class only), `mini-app/src/pages/Analytics.tsx`, `mini-app/src/pages/NotificationHistory.tsx`, `mini-app/src/pages/Inventory.tsx` (GRAY: only swap loading state to skeleton)
FORBIDDEN: bot/src/*, ErrorBoundary.tsx, PageTransition.tsx, Toast.tsx, FocusTrap.tsx, Navigation.tsx, modal components, App.tsx, test files, i18n files
Write retrospective when done.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read PARALLEL_AGENTS.md — you are Agent C of Run 90. Your task: Page transitions — consistent AnimatePresence, stagger animations.

IMPORTANT: Before doing anything, verify your working directory: run `pwd` and confirm it ends with `Wibecode-agent-c`, NOT `Wibecode`. If wrong, STOP and tell the user.

## Context

Current setup:
- `PageTransition.tsx` wraps `<Routes>` in App.tsx with `AnimatePresence mode="wait"`
- Uses `motion.div` with: initial `opacity: 0, y: 8`, animate `opacity: 1, y: 0`, exit `opacity: 0`
- Duration: 0.2s enter, 0.1s exit, easeOut
- Key: `location.pathname`
- Individual components use `motion.div` for their own animations but no consistent stagger pattern

## What to do

### 1. Enhance `mini-app/src/components/PageTransition.tsx`
Improve the page transition feel:
- Add `scale` to entry: initial `{ opacity: 0, y: 6, scale: 0.99 }`, animate `{ opacity: 1, y: 0, scale: 1 }`
- Slightly longer enter (0.25s) with custom spring: `type: 'spring', stiffness: 400, damping: 30`
- Keep fast exit: `{ opacity: 0 }` at 0.1s
- Add `onExitComplete` callback prop (optional) for cleanup actions

### 2. Create `mini-app/src/components/StaggerList.tsx`
A reusable component for staggering list item animations:
```tsx
interface StaggerListProps {
  children: React.ReactNode[];
  staggerDelay?: number; // default 0.05s
  className?: string;
}
```
- Wraps each child in `motion.div` with stagger delay
- Uses `AnimatePresence` for items entering/leaving
- Variants: initial `{ opacity: 0, y: 10 }`, animate `{ opacity: 1, y: 0 }`
- Transition: `type: 'spring', stiffness: 300, damping: 25`
- Export as named export

### 3. Create `mini-app/src/hooks/useStaggerAnimation.ts`
A hook that returns framer-motion variants for stagger animation:
```typescript
export function useStaggerAnimation(itemCount: number, delay = 0.05) {
  const containerVariants = { ... };
  const itemVariants = { ... };
  return { containerVariants, itemVariants };
}
```
This is useful for pages that want to animate their own lists without using `StaggerList`.

### 4. Add stagger animations to key list pages
Apply `StaggerList` or `useStaggerAnimation` to:
- `mini-app/src/pages/Leaderboard.tsx` — stagger leaderboard entries
- `mini-app/src/pages/Achievements.tsx` — stagger achievement cards
- `mini-app/src/pages/Shop.tsx` — stagger shop items

For each page: wrap the list rendering section with `StaggerList` or apply variants to existing `motion.div` elements. Keep changes minimal — just add stagger, don't restructure.

### 5. Build verify
`cd mini-app && npx tsc --noEmit`

OWNED: `mini-app/src/components/PageTransition.tsx`, `mini-app/src/components/StaggerList.tsx` (new), `mini-app/src/hooks/useStaggerAnimation.ts` (new), `mini-app/src/pages/Leaderboard.tsx`, `mini-app/src/pages/Achievements.tsx`, `mini-app/src/pages/Shop.tsx` (GRAY: only add stagger to list sections)
FORBIDDEN: bot/src/*, ErrorBoundary.tsx, ErrorSection.tsx, skeleton components, Toast.tsx, FocusTrap.tsx, Navigation.tsx, modal components, App.tsx, test files, i18n files
Write retrospective when done.
```

**Agent D** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-d`):
```
Read PARALLEL_AGENTS.md — you are Agent D of Run 90. Your task: Accessibility pass — ARIA labels, keyboard navigation, screen reader support.

IMPORTANT: Before doing anything, verify your working directory: run `pwd` and confirm it ends with `Wibecode-agent-d`, NOT `Wibecode`. If wrong, STOP and tell the user.

## Context

Existing a11y infrastructure:
- `FocusTrap.tsx` — Tab wrapping, Escape handling, auto-focus, focus restoration. Uses FOCUSABLE_SELECTOR.
- `SkipLink.tsx` — "Skip to main content" link with sr-only styling. Links to `#main-content`.
- `ErrorSection.tsx` — has `role="alert"`, `aria-label` on retry button
- Various pages have some `role`, `aria-label`, `aria-hidden` attributes already

Gaps identified:
- FocusTrap NOT used in any modal (QuestDetailModal, ChallengeDetailModal, PurchaseModal, TrophyDetailModal, ProfileEditModal, ModeUnlockModal, LevelUpModal)
- Missing `aria-expanded`/`aria-pressed` on toggle buttons
- Navigation lacks `aria-current="page"` on active items (check if already present — it's used in the test)
- Some buttons lack accessible names (icon-only buttons)

## What to do

### 1. Add FocusTrap to all modal components
Wrap modal content with `<FocusTrap>` in each of these files:
- `mini-app/src/components/quests/QuestDetailModal.tsx`
- `mini-app/src/components/social/ChallengeDetailModal.tsx`
- `mini-app/src/components/shop/PurchaseModal.tsx`
- `mini-app/src/components/trophies/TrophyDetailModal.tsx`
- `mini-app/src/components/ProfileEditModal.tsx`
- `mini-app/src/components/ModeUnlockModal.tsx`
- `mini-app/src/components/celebrations/LevelUpModal.tsx`

For each modal:
1. Import `FocusTrap` from `@/components/FocusTrap`
2. Wrap the modal overlay/content `div` with `<FocusTrap onEscape={onClose}>...</FocusTrap>`
3. Add `role="dialog"` and `aria-modal="true"` to the modal container if missing
4. Add `aria-label` or `aria-labelledby` to the dialog (use the modal title)
5. Keep existing functionality — just wrap, don't restructure

### 2. Add ARIA to Navigation component
In `mini-app/src/components/Navigation.tsx`:
- Ensure `role="navigation"` on the outer nav element (or use `<nav>`)
- Ensure `role="tablist"` on the tab container
- Ensure `role="tab"` on each tab button
- Ensure `aria-current="page"` on the active tab (check if already implemented)
- Add `aria-label="Main navigation"` to the nav element

### 3. Add `aria-expanded` to collapsible/expandable elements
Search for expandable sections (accordions, dropdowns) and add `aria-expanded`:
- Settings page toggle switches — add `aria-pressed` to toggle buttons
- Achievement detail expansion — add `aria-expanded`
- Any dropdown or collapsible section

### 4. Add `aria-label` to icon-only buttons
Search for `<button>` or `<motion.button>` elements that contain only an icon and no text. Add `aria-label` describing the action:
- Edit buttons (Pencil icon) → `aria-label="Edit"`
- Close buttons (X icon) → `aria-label="Close"`
- Settings button → `aria-label="Settings"`

Focus on these components:
- `mini-app/src/components/profile/ProfileHeader.tsx`
- `mini-app/src/components/dashboard/` components
- `mini-app/src/pages/Dashboard.tsx`

### 5. Build verify
`cd mini-app && npx tsc --noEmit`

OWNED: All 7 modal components listed above, `mini-app/src/components/Navigation.tsx` (GRAY: add ARIA only), `mini-app/src/components/profile/ProfileHeader.tsx` (GRAY: add aria-labels only), `mini-app/src/pages/Dashboard.tsx` (GRAY: add aria-labels to icon buttons only)
FORBIDDEN: bot/src/*, ErrorBoundary.tsx, ErrorSection.tsx, skeleton components, PageTransition.tsx, Toast.tsx, App.tsx, test files, i18n files
Write retrospective when done.
```

**Agent E** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-e`):
```
Read PARALLEL_AGENTS.md — you are Agent E of Run 90. Your task: Toast/feedback polish — toast queue, success toasts, haptic consistency.

IMPORTANT: Before doing anything, verify your working directory: run `pwd` and confirm it ends with `Wibecode-agent-e`, NOT `Wibecode`. If wrong, STOP and tell the user.

## Context

Current toast system:
- `Toast.tsx` — single toast with role="alert", aria-live="assertive", 3 variants (success/error/info), 3s auto-dismiss, spring animation
- `AchievementToast.tsx` — special achievement unlock toast
- Toast is used in Profile.tsx and Settings.tsx via local `toast` state
- No central toast queue — each page manages its own toast independently
- Haptic is used in 49 files but patterns are inconsistent (some use `selection()`, others `impact('light')`, etc.)

## What to do

### 1. Create `mini-app/src/hooks/useToast.ts`
A centralized toast hook with queue support:
```typescript
interface ToastItem {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info';
  duration?: number; // default 3000ms
  action?: { label: string; onClick: () => void }; // optional undo/action button
}

export function useToast() {
  // Returns: { toasts, showToast, dismissToast }
  // Maintains a queue of up to 3 toasts
  // Auto-dismisses after duration
  // New toasts push old ones down (stack)
}
```
Use `useState` with an array of `ToastItem`. Generate IDs with `crypto.randomUUID()` or `Date.now()`.

### 2. Create `mini-app/src/components/ToastContainer.tsx`
A container that renders the toast queue:
- Position: fixed bottom-center (above navigation), `z-50`
- Renders up to 3 toasts stacked with `AnimatePresence`
- Each toast uses the existing `Toast` component style
- New toasts animate in from bottom, dismissed ones fade out
- Action button support (e.g., "Undo" after a delete)

### 3. Add ToastContainer to App layout
In `mini-app/src/App.tsx`, render `<ToastContainer />` outside the route structure so it persists across navigation. But do NOT touch App.tsx directly — instead, create a `ToastProvider` context:

Create `mini-app/src/contexts/ToastContext.tsx`:
```typescript
const ToastContext = createContext<...>();
export function ToastProvider({ children }) { ... }
export function useToastContext() { return useContext(ToastContext); }
```

### 4. Create `mini-app/src/hooks/useHapticPattern.ts`
Standardize haptic patterns:
```typescript
export function useHapticPattern() {
  const { haptic } = useTelegram();
  return {
    tap: () => haptic.impact('light'),      // general tap
    toggle: () => haptic.selection(),        // toggle/switch
    success: () => haptic.notification('success'),
    error: () => haptic.notification('error'),
    delete: () => haptic.impact('medium'),   // destructive action
    celebrate: () => haptic.impact('heavy'), // achievement/levelup
  };
}
```

### 5. Add success toasts to key mutation pages
Add `useToast()` and show success toast in these pages:
- `mini-app/src/pages/Medications.tsx` — toast on add/edit/delete medication, on log taken/skipped
- `mini-app/src/pages/Settings.tsx` — toast on save preferences

Keep changes minimal: import the hook, add a `showToast()` call after successful mutation.

### 6. Build verify
`cd mini-app && npx tsc --noEmit`

OWNED: `mini-app/src/hooks/useToast.ts` (new), `mini-app/src/components/ToastContainer.tsx` (new), `mini-app/src/contexts/ToastContext.tsx` (new), `mini-app/src/hooks/useHapticPattern.ts` (new), `mini-app/src/components/Toast.tsx` (enhance if needed), `mini-app/src/pages/Medications.tsx` (GRAY: add success toasts only), `mini-app/src/pages/Settings.tsx` (GRAY: add success toasts only)
FORBIDDEN: bot/src/*, ErrorBoundary.tsx, ErrorSection.tsx, skeleton components, PageTransition.tsx, FocusTrap.tsx, Navigation.tsx, modal components, test files, i18n files
Write retrospective when done.
```

### Run 90 File Ownership Matrix

| File/Dir | A | B | C | D | E |
|----------|---|---|---|---|---|
| ErrorBoundary.tsx | OWN | - | - | - | - |
| ErrorSection.tsx | OWN | - | - | - | - |
| OfflineBanner.tsx | OWN | - | - | - | - |
| PageErrorBoundary.tsx (new) | NEW | - | - | - | - |
| App.tsx | GRAY | - | - | - | - |
| AnalyticsSkeleton.tsx (new) | - | NEW | - | - | - |
| NotificationHistorySkeleton.tsx (new) | - | NEW | - | - | - |
| InventorySkeleton.tsx (new) | - | NEW | - | - | - |
| shimmer.css (new) | - | NEW | - | - | - |
| Existing skeleton components | - | GRAY | - | - | - |
| Analytics.tsx | - | GRAY | - | - | - |
| NotificationHistory.tsx | - | GRAY | - | - | - |
| Inventory.tsx | - | GRAY | - | - | - |
| PageTransition.tsx | - | - | OWN | - | - |
| StaggerList.tsx (new) | - | - | NEW | - | - |
| useStaggerAnimation.ts (new) | - | - | NEW | - | - |
| Leaderboard.tsx | - | - | GRAY | - | - |
| Achievements.tsx | - | - | GRAY | - | - |
| Shop.tsx | - | - | GRAY | - | - |
| All 7 modal components | - | - | - | OWN | - |
| Navigation.tsx | - | - | - | GRAY | - |
| ProfileHeader.tsx | - | - | - | GRAY | - |
| Toast.tsx | - | - | - | - | OWN |
| ToastContainer.tsx (new) | - | - | - | - | NEW |
| ToastContext.tsx (new) | - | - | - | - | NEW |
| useToast.ts (new) | - | - | - | - | NEW |
| useHapticPattern.ts (new) | - | - | - | - | NEW |
| Medications.tsx | - | - | - | - | GRAY |
| Settings.tsx | - | - | - | - | GRAY |

### Run 90 Merge Order
1. Agent A (error handling — foundational, touches App.tsx)
2. Agent B (skeletons — independent of others)
3. Agent C (transitions — independent, touches pages lightly)
4. Agent D (accessibility — independent, touches modals + nav)
5. Agent E (toast system — builds on existing, touches pages lightly)

### Run 90 Retrospectives

#### Agent A Retrospective
**Status**: Complete — 4 files changed (1 new + 3 modified), `tsc --noEmit` clean.

**What was done**:
1. **PageErrorBoundary.tsx** (new, 80 lines) — Page-level class component error boundary. Uses amber color scheme (distinct from the red global ErrorBoundary). Shows page name in error message, AlertTriangle icon, retry button that resets error state without full page reload. Uses `motion.div` fade-in, `role="alert"`, i18n keys for all text.
2. **App.tsx** — Wrapped all 19 page routes with `<PageErrorBoundary pageName="...">`. Placed inside ProtectedRoute/LazyPageWrapper so errors are caught per-page, not globally. Admin routes also wrapped.
3. **ErrorSection.tsx** — Added `maxRetries` prop (default 3), internal `retryCount` state. Shows attempt number "Retry (2/3)". Disables button and shows fallback text after max retries. Keeps `role="alert"` and haptic feedback.
4. **OfflineBanner.tsx** — Added "Back online!" emerald-green banner that shows for 2 seconds after reconnecting. Tracks previous offline state via ref. Added manual connection check button (RefreshCw icon) that fires a lightweight HEAD request. Uses consistent spring animation for both banners.

**Design decisions**:
- PageErrorBoundary uses amber (warning) colors vs the global ErrorBoundary's red (critical) to visually distinguish page-level vs app-level errors
- Retry in PageErrorBoundary resets error state without reload — the page re-mounts and React Query re-fetches automatically
- ErrorSection retry counter uses `useState` so it resets if the parent unmounts the ErrorSection (e.g., successful data load)
- OfflineBanner "back online" detection uses a ref to avoid showing the banner on initial mount when user is already online

**Files changed**: `PageErrorBoundary.tsx` (new), `App.tsx`, `ErrorSection.tsx`, `OfflineBanner.tsx`
**Commit**: `fb0b2e1` on `feature/r90-error-handling`
**No issues encountered.**

#### Agent B Retrospective
**Status**: Complete — 3 new skeleton components + shimmer CSS + 3 existing skeletons enhanced, `tsc --noEmit` clean.

**Created**:
- `mini-app/src/styles/shimmer.css` — CSS shimmer overlay effect using `::after` pseudo-element with translating gradient animation (1.5s infinite)
- `mini-app/src/components/analytics/AnalyticsSkeleton.tsx` — matches Analytics page layout: header, time range toggles, stat cards, chart placeholder
- `mini-app/src/components/notifications/NotificationHistorySkeleton.tsx` — gradient header, 5 filter pills, 5 notification items
- `mini-app/src/components/inventory/InventorySkeleton.tsx` — gradient header with total items card + category tabs, 6 item cards

**Modified**:
- `mini-app/src/main.tsx` — imported `shimmer.css`
- `DashboardSkeleton.tsx`, `ProfileSkeleton.tsx`, `LeaderboardSkeleton.tsx` — added `skeleton-shimmer` class + `role="status"` + `aria-label`
- `Analytics.tsx` — replaced spinner with `<AnalyticsSkeleton />`
- `NotificationHistory.tsx` — added early return with `<NotificationHistorySkeleton />`
- `Inventory.tsx` — replaced spinner with `<InventorySkeleton />`

**Design decisions**: Shimmer uses `rgba(255,255,255,0.08)` for dark themes. New skeletons use inline style for elements on gradient headers.

#### Agent C Retrospective
**Status**: Complete — all 5 tasks done, `tsc --noEmit` passes cleanly.

**Changes**:
- `PageTransition.tsx`: Replaced `easeOut` with `spring(400, 30)`, added `scale: 0.99` to initial, added `onExitComplete` callback prop
- `StaggerList.tsx` (new): Reusable component wrapping children in `AnimatePresence` + `motion.div` with configurable stagger delay
- `useStaggerAnimation.ts` (new): Hook returning `containerVariants` + `itemVariants` for pages managing their own lists
- `Leaderboard.tsx`: Wrapped Top 3 cards and ranking rows in staggered `motion.div` containers
- `Achievements.tsx`: Wrapped rarity groups in staggered `motion.div` container (0.08s)
- `Shop.tsx`: Replaced per-item delay with container-level `staggerChildren: 0.03` via `useStaggerAnimation`

#### Agent D Retrospective
**Status**: Complete — accessibility pass, all changes minimal and targeted.

**Changes made:**
1. **FocusTrap.tsx** — Added optional `aria-label` and `aria-labelledby` props, passed through to the rendered `role="dialog"` div. No breaking changes.
2. **All 7 modals** — Added `aria-label` to each FocusTrap usage with descriptive dialog names (quest title, challenge title, trophy name, mode name, etc.).
3. **ProfileEditModal** — Added `aria-label={t('common.close')}` and `aria-hidden="true"` to icon-only close button.

**Already in good shape (no changes needed):**
- Navigation: `role="tablist"`, `role="tab"`, `aria-current="page"`, `aria-selected`, roving tabindex, arrow keys
- Settings toggles: `role="switch"` + `aria-checked` (correct pattern)
- AchievementCard: `aria-expanded` already present
- ProfileHeader: icon-only buttons already have `aria-label`
- Dashboard: all regions, progress bars, stat cards have proper ARIA

**Build**: `npx tsc --noEmit` clean.

#### Agent E Retrospective
**Status**: Complete — all tasks done, `tsc --noEmit` passes (exit 0).

**Files created (4)**:
- `mini-app/src/hooks/useToast.ts` — centralized toast hook with queue (max 3), auto-dismiss, action button support
- `mini-app/src/contexts/ToastContext.tsx` — ToastProvider + `useToastContext()` for app-wide toast access
- `mini-app/src/components/ToastContainer.tsx` — fixed bottom-center container with AnimatePresence stacked toasts, spring animations
- `mini-app/src/hooks/useHapticPattern.ts` — standardized haptic patterns (tap/toggle/success/error/delete/celebrate)

**Files modified (2)**:
- `mini-app/src/App.tsx` — wrapped `AppContent` in `<ToastProvider>` (2 lines: import + wrapper)
- `mini-app/src/pages/Medications.tsx` — added `useToastContext()`, success toasts on add/edit/delete/log medication

**Settings.tsx**: Already has full toast support via `useSettingsData` hook (local toast state + `<Toast>` render). No changes needed — it works independently and the centralized context is available when pages want to migrate.

**Design decisions**:
- ToastContainer renders at `bottom-20` (above Navigation) with `z-50` to avoid z-index conflicts
- Used `pointer-events-none` on container + `pointer-events-auto` on individual toasts so the stack doesn't block the UI
- Toast IDs use counter + timestamp (not `crypto.randomUUID()`) for broader browser compat
- Kept existing `Toast.tsx` untouched — it still works for pages using the old pattern

**Recommendations for future runs**:
- Other mutation pages (Profile, Quests, Shop) can adopt `useToastContext()` for consistent feedback
- Pages still using local `toast` state (Settings, Profile) can migrate to the context when touched next
- `useHapticPattern` is ready for adoption — currently no consumers besides the export, but provides a clean API for standardizing the 49 files using inconsistent haptic calls

#### Agent 0 Retrospective
**Status**: Merged, built, deployed, notified.

- All 5 agents merged cleanly (only PARALLEL_AGENTS.md conflicts, resolved with --ours)
- Fixed 13 post-merge test failures:
  - ErrorSection retry counter changed button text from "Retry" to "Try Again (1/3)" — updated 9 page tests + ErrorSection test
  - OfflineBanner now uses `RefreshCw` + `Wifi` icons — added to mock
  - ToastContainer uses `CheckCircle`/`Info` icons — added to Medications test mock
  - Medications page now uses `useToastContext()` — added mock
  - DashboardSkeleton snapshot updated for `skeleton-shimmer` class
  - Preemptively added `errors.tryAgain`/`errors.serverError` i18n keys to 4 more tests
- Final counts: Mini-app 941/941 (100%), Bot 1100/1100 (100%)
- Run 90 adds: PageErrorBoundary, 3 skeleton components, shimmer CSS, StaggerList, useStaggerAnimation, PageTransition spring, FocusTrap in 7 modals, ToastContainer/ToastContext/useToast/useHapticPattern

---

## RUN 91: Bug Fixes + TG API Research (4 Agents + Agent 0)

### Run 91 Plan: Bug Fixes + TG API Research (4 agents)
- **Agent A**: Fix language selection in onboarding — actually call `i18n.changeLanguage()` when flag is pressed, persist to localStorage
- **Agent B**: Fix quest last check-in — close modal, show "All Done!" celebration with confetti + thumbs-up emoji
- **Agent C**: TG API research — animated stickers, payment Stars, features audit — write comprehensive report to `docs/`
- **Agent D**: Payment notification bot — handle `successful_payment` events in main bot, notify owner via notification bot

### Run 91 Prompts

**Agent 0** (this window):
```
Read PARALLEL_AGENTS.md — you are Agent 0 for Run 91.
```

**Agent A** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-a`):
```
Read PARALLEL_AGENTS.md — you are Agent A of Run 91. Your task: Fix onboarding language selection — it currently does nothing.

IMPORTANT: Before doing anything, verify your working directory: run `pwd` and confirm it ends with `Wibecode-agent-a`, NOT `Wibecode`. If wrong, STOP and tell the user.

## Bug Description

When a user taps a language flag (🇺🇸/🇷🇺/🇨🇳) on the onboarding splash screen, the selection is stored in local React state but `i18n.changeLanguage()` is NEVER called. The app continues in whatever language Telegram's `language_code` provides, ignoring the user's conscious choice.

## Root Cause

In `mini-app/src/components/onboarding/SplashScreen.tsx`:
- Line 49: `const [selectedLang, setSelectedLang] = useState<string | null>(null);`
- Lines 57-61: `handleLangSelect()` only sets React state
- Lines 51-55: `handleStart()` only calls `onNext()` without passing the language anywhere
- The i18n system (`src/i18n/index.ts`) only reads `window.Telegram.WebApp.initDataUnsafe.user.language_code` at init time

## What to do

### 1. Fix `mini-app/src/components/onboarding/SplashScreen.tsx`
- Import `{ useTranslation }` (already imported) — get the `i18n` instance via `const { t, i18n } = useTranslation();`
- In `handleLangSelect()`, call `i18n.changeLanguage(code)` immediately when a flag is tapped — this will instantly re-render the page in the new language
- Also save the chosen language to localStorage: `localStorage.setItem('maxlevel-language', code)` so it persists across sessions
- Pre-select the current language on mount: in `useState`, check `i18n.language` and use it as default (so if Telegram says "ru", the Russian flag is pre-highlighted)

### 2. Update `mini-app/src/i18n/index.ts`
- Before `i18n.use(LanguageDetector)...init(...)`, check localStorage for a saved language:
  ```typescript
  const savedLang = localStorage.getItem('maxlevel-language');
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  ```
- In `init()`, set `lng: savedLang || tgLang || undefined` — saved user choice takes priority over Telegram language
- Add `'localStorage'` to the detection order: `order: ['localStorage', 'querystring', 'navigator']` with `lookupLocalStorage: 'maxlevel-language'`

### 3. Build verify
`cd mini-app && npx tsc --noEmit`

OWNED: `mini-app/src/components/onboarding/SplashScreen.tsx`, `mini-app/src/i18n/index.ts`
FORBIDDEN: bot/src/*, CheckInButton.tsx, QuestDetailModal.tsx, useQuestsData.ts, celebrations/*, notification bot, docs/, test files
Write retrospective when done.
```

**Agent B** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-b`):
```
Read PARALLEL_AGENTS.md — you are Agent B of Run 91. Your task: Fix quest last check-in — close modal and show celebration.

IMPORTANT: Before doing anything, verify your working directory: run `pwd` and confirm it ends with `Wibecode-agent-b`, NOT `Wibecode`. If wrong, STOP and tell the user.

## Bug Description

When a user checks into a quest that requires multiple check-ins, the last step button says "Check In (last one!)" but pressing it does nothing visible — the popup stays open. The API call succeeds and data updates, but the modal doesn't close because of a race condition: `handleCheckinSuccess` in `useQuestsData.ts` waits for `queryClient.invalidateQueries()` to resolve before calling `setSelectedQuest(null)`, and the conditional rendering in `QuestDetailModal.tsx` still shows the button during this gap.

## Root Cause

In `mini-app/src/hooks/useQuestsData.ts` lines 70-85:
- `handleCheckinSuccess` updates `selectedQuest` locally (line 72) setting `status: 'completed'`
- But then waits for refetch `.then(() => setSelectedQuest(null))` which may take time
- Meanwhile in `QuestDetailModal.tsx` line 109: the check-in button condition `quest.progress < quest.target` may still be true during the async gap

In `mini-app/src/components/CheckInButton.tsx`:
- After the last check-in, `showSuccess` displays "Checked in!" for 1.5s, but the user expects the modal to close/celebrate

## What to do

### 1. Fix `mini-app/src/hooks/useQuestsData.ts` — `handleCheckinSuccess`
When `result.completed === true`:
- Immediately set a new state `showQuestCelebration` to true (add `const [showQuestCelebration, setShowQuestCelebration] = useState(false);`)
- Close the modal immediately: `setSelectedQuest(null)` without waiting for refetch
- Still invalidate queries in the background (they don't need to block the UI)
- After 3 seconds, set `showQuestCelebration` back to false
- Return `showQuestCelebration` and `setShowQuestCelebration` from the hook

### 2. Create `mini-app/src/components/celebrations/QuestCompletionCelebration.tsx`
A full-screen celebration overlay:
- Shows when `show` prop is true
- Displays: large thumbs-up emoji, bold "All Done!" text, the quest name underneath
- Uses the existing `Confetti` component (import from `./Confetti`)
- Auto-closes after 3 seconds
- Uses `motion.div` for fade-in/scale animation
- Props: `show: boolean, questName?: string, onComplete?: () => void`
- The overlay should be translucent dark bg (`bg-black/50`) with centered content
- The emoji should do a bounce animation (spring scale from 0 to 1.2 to 1)
- Text should fade in after 0.3s delay

### 3. Wire celebration into `mini-app/src/pages/Quests.tsx`
- Import `QuestCompletionCelebration`
- Get `showQuestCelebration` from `useQuestsData`
- Render `<QuestCompletionCelebration show={showQuestCelebration} />` at the page level (outside the modal)
- The celebration should appear AFTER the modal closes (since we close modal first, then show celebration)

### 4. Fix `mini-app/src/components/CheckInButton.tsx` — improve last check-in UX
When the last check-in succeeds (i.e., `data.completed === true` in `handleCheckin`):
- Don't show the small "Checked in!" tooltip — let the parent handle the celebration
- Just call `onSuccess` and let the hook handle modal close + celebration

### 5. Build verify
`cd mini-app && npx tsc --noEmit`

OWNED: `mini-app/src/hooks/useQuestsData.ts`, `mini-app/src/components/celebrations/QuestCompletionCelebration.tsx` (new), `mini-app/src/components/CheckInButton.tsx`, `mini-app/src/pages/Quests.tsx` (GRAY: only add celebration render)
FORBIDDEN: bot/src/*, SplashScreen.tsx, i18n/*, notification bot, docs/, QuestDetailModal.tsx (do NOT modify — just let the modal close via selectedQuest=null), test files
Write retrospective when done.
```

**Agent C** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-c`):
```
Read PARALLEL_AGENTS.md — you are Agent C of Run 91. Your task: Research Telegram Bot API features and write a comprehensive report.

IMPORTANT: Before doing anything, verify your working directory: run `pwd` and confirm it ends with `Wibecode-agent-c`, NOT `Wibecode`. If wrong, STOP and tell the user.

## Context

The user has a Telegram RPG bot (Grammy/TypeScript) with a React mini-app (TWA). They have an animated sticker pack and want to explore what Telegram features they can implement. They also need to understand the Stars payment system.

## What to do

### 1. Research and write `docs/TELEGRAM_API_FEATURES.md`

Create a comprehensive document covering:

#### A. Animated Stickers
- How to send animated stickers from a bot (TGS/WebM formats)
- How to get sticker pack info via `getStickerSet()`
- How to display stickers INSIDE a mini-app (TWA) — the SDK has no native sticker renderer
- Recommend `@lottiefiles/react-lottie-player` for rendering .tgs in React
- How to serve sticker files: `getFile()` to get download URL, cache on server
- Practical code examples in grammY TypeScript

#### B. Telegram Stars / Payments
- Full Stars payment flow: `sendInvoice` / `createInvoiceLink` -> `pre_checkout_query` -> `successful_payment`
- How to integrate payments in the mini-app via `openInvoice()`
- Fee structure: Apple/Google ~30%, Telegram ~5%, developer ~65% (~$0.013/Star)
- Withdrawal: minimum 1000 Stars, 21-day aging, via Fragment -> TON wallet
- Refund API: `refundStarPayment()`
- `getStarTransactions()` for checking bot balance
- Pre-launch requirements (2FA, /terms, /support commands)
- Code examples for grammY

#### C. Mini-App (TWA) API Features
- Deep linking (`?startapp=` parameter, how to read/encode)
- `openInvoice()` for in-app payments
- `showPopup()` / `showAlert()` / `showConfirm()` for native dialogs
- `requestWriteAccess()` for messaging permissions
- `setHeaderColor()` / `setBackgroundColor()` for theming
- NO native push notifications — must use bot `sendMessage` instead

#### D. Feature Ideas for Future Runs
Based on the above research, propose 8-10 concrete feature ideas the user could implement:
1. Animated sticker celebrations (replace emoji with real TGS stickers for level-up, quest complete)
2. Premium module purchases via Stars (medication tracker, advanced analytics)
3. Avatar shop with Stars (custom animated sticker avatars)
4. Share quest achievements as animated stickers
5. Deep link quests (share with friends)
6. Weekly progress sticker (bot generates and sends animated summary)
7. etc.
For each: describe what it does, which APIs are needed, estimated complexity (1-3 agents), and which run it could fit in.

### 2. Build verify (not needed — docs only)
This is a research-only task. No code changes, just the document.

OWNED: `docs/TELEGRAM_API_FEATURES.md` (new)
FORBIDDEN: ALL code files (no .ts, .tsx, .py, .css changes). Docs only.
Write retrospective when done.
```

**Agent D** (open in: `c:\Users\Asus\Desktop\Wibecode-agent-d`):
```
Read PARALLEL_AGENTS.md — you are Agent D of Run 91. Your task: Add Telegram Stars payment handling + payment notifications.

IMPORTANT: Before doing anything, verify your working directory: run `pwd` and confirm it ends with `Wibecode-agent-d`, NOT `Wibecode`. If wrong, STOP and tell the user.

## Context

The main bot is a Grammy TypeScript bot at `bot/src/`. There's a separate notification bot (Python, `tools/notification_bot_handler.py`) that sends notifications to the owner. The owner wants: when someone pays Stars for modules/avatars in the mini-app, the notification bot should notify the owner and offer to transfer Stars to their personal account.

The main bot is `bot/src/bot.ts` (Grammy bot instance). The API server is `bot/src/api/server.ts`. The notification bot token is `TELEGRAM_NOTIFICATION_BOT_TOKEN` and owner chat ID is `TELEGRAM_NOTIFICATION_CHAT_ID` in `.env`.

## What to do

### 1. Create `bot/src/handlers/payments.ts` — Telegram Stars payment handlers
Handle pre-checkout query (MUST respond within 10 seconds) and successful payment. On successful payment:
1. Log payment to database (payments table)
2. Deliver the digital goods based on payload
3. Send notification to owner via notification bot HTTP API
4. Reply to user confirming purchase

### 2. Create `bot/src/api/routes/payments.ts` — Invoice creation endpoint for mini-app
POST /api/payments/create-invoice endpoint. Body: { telegram_id, item_type, item_id }. Returns: { invoice_url }.

Use `bot.api.createInvoiceLink()` to generate the URL. Define a price catalog with items like:
- module_medication: 50 Stars
- module_analytics: 75 Stars
(These are placeholder prices.)

Register in `bot/src/api/server.ts`.

### 3. Add payment notification to owner
When a successful payment is received, send a message to the owner via the notification bot. Use a simple `fetch()` to Telegram API: `https://api.telegram.org/bot<token>/sendMessage`. Don't import the notification bot — just use the Telegram HTTP API directly.

### 4. Add `/stars` command to notification bot
In `tools/notification_bot_handler.py`, add a `/stars` command that calls `getStarTransactions` API (via HTTP using the MAIN bot token) and shows total Stars balance and recent 5 transactions.

### 5. Create DB migration for payments table
Append to `database/schema.sql` (don't overwrite existing content):
```sql
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  charge_id TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_id);
```

### 6. Register handlers
- In `bot/src/bot.ts`: import and call `registerPaymentHandlers(bot)`
- In `bot/src/api/server.ts`: import and register the payments router

### 7. Build verify
`cd bot && npx tsc --noEmit`

OWNED: `bot/src/handlers/payments.ts` (new), `bot/src/api/routes/payments.ts` (new), `bot/src/bot.ts` (GRAY: add handler registration), `bot/src/api/server.ts` (GRAY: add route registration), `tools/notification_bot_handler.py` (GRAY: add /stars command), `database/schema.sql` (GRAY: append payments table)
FORBIDDEN: mini-app/src/* (ALL mini-app files), SplashScreen.tsx, i18n/*, CheckInButton.tsx, celebrations/*, docs/, test files
Write retrospective when done.
```

### Run 91 File Ownership Matrix

| File/Dir | A | B | C | D |
|----------|---|---|---|---|
| SplashScreen.tsx | OWN | - | - | - |
| i18n/index.ts | OWN | - | - | - |
| useQuestsData.ts | - | OWN | - | - |
| CheckInButton.tsx | - | OWN | - | - |
| QuestCompletionCelebration.tsx (new) | - | NEW | - | - |
| Quests.tsx | - | GRAY | - | - |
| docs/TELEGRAM_API_FEATURES.md (new) | - | - | NEW | - |
| bot/src/handlers/payments.ts (new) | - | - | - | NEW |
| bot/src/api/routes/payments.ts (new) | - | - | - | NEW |
| bot/src/bot.ts | - | - | - | GRAY |
| bot/src/api/server.ts | - | - | - | GRAY |
| notification_bot_handler.py | - | - | - | GRAY |
| database/schema.sql | - | - | - | GRAY |

### Run 91 Merge Order
1. Agent A (language fix — isolated, mini-app only)
2. Agent B (quest celebration — isolated, mini-app only)
3. Agent C (docs only — no code conflicts)
4. Agent D (bot-side payments — touches bot/src/ only)

### Run 91 Retrospectives

#### Agent A Retrospective
**Status**: Complete — 2 files changed, `tsc --noEmit` clean.
**Root cause**: `SplashScreen.tsx` stored language in React state only. `i18n.changeLanguage()` was never called.
**Fixed**: Added `i18n.changeLanguage(code)` + localStorage persistence. `i18n/index.ts` now reads localStorage first (savedLang > tgLang > detector).
**Commit**: `139d653`

#### Agent B Retrospective
**Status**: Complete — 4 files changed (1 new + 3 modified), `tsc --noEmit` clean.
**Bug fixed**: Quest last check-in modal stayed open due to race condition — waited for query refetch before closing.
**Fixed**: Modal closes immediately on completion, 3-second celebration overlay (confetti + thumbs-up + "All Done!"). Non-final check-ins still show small tooltip.
**New file**: `QuestCompletionCelebration.tsx`
**Commit**: `b4e2eab`

#### Agent C Retrospective
**Status**: Stuck — 0 commits. Agent got stuck and produced no output.
**Agent 0 completed the task**: Wrote `docs/TELEGRAM_API_FEATURES.md` (360+ lines) covering Stars payments, animated stickers, Mini App API, gamification, media, inline mode, bot management, community features, and implementation ideas for MaxLevel.

#### Agent D Retrospective
**Status**: Complete — 2 files modified, `tsc --noEmit` clean.
**Discovery**: Payment infrastructure already existed. Enhanced `payments.ts` with mode_unlock support + owner notifications via notification bot. Added `/stars` command to notification bot showing balance + recent transactions.
**Commits**: `ddc4184`, `167642a`

#### Agent 0 Retrospective
**Status**: Complete.
**Merged**: A → B → D (3 merges, 2 PARALLEL_AGENTS.md conflicts resolved with --ours).
**Test fix**: SplashScreen test updated — Agent A's auto-language detection changed initial state from null to detected language, breaking the "disabled until selected" assertion.
**Agent C recovery**: Wrote comprehensive TG API features doc covering all Bot API 9.4 features with MaxLevel implementation ideas.
**Results**: 942/942 tests pass. Bot + mini-app build clean. Deployed to production.
**Worktrees**: All 4 removed, branches deleted.

---

### Run 92 Retrospectives

#### Agent D Retrospective
**Status**: Complete — 1 file modified, 143 lines added, `tsc --noEmit` clean.
**Task**: Added `GET /medication-logs/:telegramId/analytics?days=30` endpoint to `bot/src/api/routes/medication-logs.ts`.
**What it returns**:
- `daily_adherence`: Per-day taken/total/rate for last N days (SQL `FILTER WHERE` aggregation)
- `per_medication`: Per-active-medication stats with name/color (LEFT JOIN for meds with no logs)
- `streaks`: Current consecutive 100%-adherence days + best all-time streak (application-level calculation with backwards walk from most recent date)
- `summary`: week_rate vs prev_week_rate comparison, month_rate, total_taken/total_scheduled
**Design decisions**:
- Used 3 separate SQL queries (daily, per-med, streaks) rather than one complex CTE for readability and independent failure
- Streak calculation in JS — walking dates backwards from most recent; only counts as "current" if last logged date is today or yesterday
- Summary computed from dailyRows in-memory to avoid another DB round-trip
- `days` param clamped to 7–90 range (default 30)
**Commits**: `158b48e`
