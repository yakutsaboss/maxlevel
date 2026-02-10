# Parallel Agents Protocol

This file is the single source of truth for running parallel Claude Code agents on the Wibecode RPG bot project. Each "Run" launches 2-6 agents (A, B, C, D, E, F) in separate git worktrees, plus Agent 0 (orchestrator) in the main repo.

For completed run history (Runs 2–12), see `PARALLEL_AGENTS_HISTORY.md`.

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

### Runs 3–12 (retrospective conflicts — SOLVED)
- Every run had 2-3 merge conflicts in PARALLEL_AGENTS.md because all agents wrote to the same "bottom" location.
- **Fix**: Pre-allocate named retrospective sections per agent before branching. Each agent edits different lines → git auto-merges cleanly.
- Run 12 (6 agents) still had PARALLEL_AGENTS.md conflicts because Agent F committed to main instead of worktree — this shifted the merge base for all subsequent merges. The `git checkout --ours` + manual retrospective splice pattern resolved all 5 conflicts.

### Key Rules (proven across 12 runs)
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

## Known Issues (Updated after Run 12)

### MVP-Critical
1. **Achievement engine needs real-world testing** — `achievementEngine.ts` + batch check job exist (Run 11) but haven't been verified with real user data. `checkCriteriaMet()` is duplicated between `achievements.ts` and `achievementEngine.ts`.
2. **Daily quest assignment UNVERIFIED** — `dailyQuestReset.ts` job exists but no confirmation it fires and assigns quests on the live server.
3. **Notification delivery UNVERIFIED** — 10 scheduled pg-boss jobs exist but no confirmation they send Telegram messages to users.
4. **Backend check-in hardcoded target** — `checkins.ts` uses `1 AS target`, so every check-in auto-completes the quest. Multi-step check-ins need a backend fix to use `quest.target`.
5. **`GET /achievements/users/:userId` inconsistent** — Returns `{achievements, unlocked, total, progress}` not `{success, data}`. Inconsistent with `GET /users/:telegramId/achievements` which returns `{success, data}`.

### Non-Critical
6. **pg-boss Node.js mismatch** — Requires 22.12+, server has 20.20. Only triggers warnings, no functional impact yet.
7. **Mode configs unused** — `mode_configs` table stores quiz responses + personalized plans, but data is never consumed.
8. **`perModeStreaks` not in TypeScript interface** — Dashboard and Profile use `(stats as any).perModeStreaks` cast. Should add to `UserStats` type.
9. **Stat grid / Today's Progress overlap** — Both show XP Today on Dashboard. Consider consolidating.
10. **Monthly leaderboard** — No `GET /leaderboard/monthly` endpoint exists. Leaderboard only has Weekly and All Time tabs.
11. **Settings punishment auto-save** — Currently saves on global "Save Settings" button. Could auto-save independently per toggle.
12. **Achievement notifier dedup** — May send duplicate notifications if an achievement persists across the 20-minute lookback window. Consider adding `notified_at` column to `user_achievements`.

---

## Run 13 Retrospectives

#### Agent D Retrospective

**Completed tasks:**

| # | Task | Commit | Issues |
|---|------|--------|--------|
| 1 | Add `getPunishmentHistory` to API client | `9cad4b0` | None |
| 2 | Clean up perModeStreaks type handling | `d57e4de` | Kept `as any` cast with TODO — Agent C adding type hasn't merged yet |
| 3 | Add Settings navigation from Accountability | `e2e3ee6` | None |
| 4 | Add punishment history display | `5d4fea5` | None |
| 5 | Build verification | N/A (clean build) | No errors |

**Problems faced:**
- PARALLEL_AGENTS.md in worktree didn't have the Run 13 section (was committed to main after branch creation). Wrote retrospective at the end of the file; Agent 0 will resolve during merge.
- The `perModeStreaks` type cast couldn't be fully resolved since Agent C's type change hasn't merged. Added a TODO comment to track.

**What went well:**
- All 4 code tasks completed cleanly with zero build errors.
- GRAY AREA rule for `client.ts` was straightforward — added exactly one method, no existing code touched.
- Punishment history section loads non-blocking and only when accountability is active — no performance impact.

**Recommendations for next run:**
- Once Agent C's `perModeStreaks` type is merged, remove the `as any` cast in Profile.tsx (marked with TODO).
- Punishment history pagination is supported by the API (`page`/`limit` params) but the UI only shows last 5. Could add "Load more" later.
- The `Achievement` type's `rarity` and `category` fields (Profile line 235) still use `as any` — consider adding to the TypeScript `Achievement` interface.
