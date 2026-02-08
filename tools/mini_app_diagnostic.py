#!/usr/bin/env python3
"""
Mini App Diagnostic Tool for Wibecode
======================================
Run this BEFORE working on the mini app to understand its current state.
Outputs a structured report that the AI agent can read to self-assess
what's working, what's broken, and what needs fixing.

Checks:
  1. Configuration (.env vars)
  2. Build status (mini-app/dist freshness)
  3. TypeScript compilation (frontend errors)
  4. Frontend-Backend API contract alignment
  5. Production server health & API responses
  6. Database state (data availability)
  7. Known issues detection

Usage:
  python tools/mini_app_diagnostic.py [project_root] [--server URL] [--skip-remote] [--skip-tsc]
"""

import os
import sys
import json
import re
import codecs
import subprocess
import time
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple

# Optional: requests for remote checks
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


class MiniAppDiagnostic:
    def __init__(self, project_root: str, server_url: str = "https://yakutsa.ru",
                 skip_remote: bool = False, skip_tsc: bool = False):
        self.root = Path(project_root)
        self.server_url = server_url.rstrip("/")
        self.skip_remote = skip_remote
        self.skip_tsc = skip_tsc
        self.results: Dict[str, Dict] = {}
        self.issues: List[Dict[str, str]] = []  # {severity, area, message}

    # =========================================================================
    # Helpers
    # =========================================================================
    def _file_exists(self, rel: str) -> bool:
        return (self.root / rel).is_file()

    def _dir_exists(self, rel: str) -> bool:
        return (self.root / rel).is_dir()

    def _read_file(self, rel: str) -> Optional[str]:
        p = self.root / rel
        if not p.is_file():
            return None
        try:
            return p.read_text(encoding="utf-8")
        except Exception:
            return None

    def _file_mtime(self, rel: str) -> Optional[datetime]:
        p = self.root / rel
        if not p.is_file():
            return None
        return datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc)

    def _add_issue(self, severity: str, area: str, message: str):
        self.issues.append({"severity": severity, "area": area, "message": message})

    def _run_cmd(self, cmd: List[str], cwd: Optional[str] = None, timeout: int = 30) -> Tuple[int, str, str]:
        """Run a command and return (returncode, stdout, stderr)."""
        try:
            result = subprocess.run(
                cmd, cwd=cwd or str(self.root),
                capture_output=True, text=True, timeout=timeout,
                shell=(sys.platform == "win32")
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return -1, "", "Command timed out"
        except FileNotFoundError:
            return -1, "", f"Command not found: {cmd[0]}"

    # =========================================================================
    # 1. Configuration Check
    # =========================================================================
    def check_config(self):
        section = {"status": "unknown", "details": {}}

        # Check .env exists
        env_file = self.root / ".env"
        if not env_file.is_file():
            section["status"] = "FAIL"
            self._add_issue("critical", "config", "Root .env file missing")
            self.results["config"] = section
            return

        env_content = env_file.read_text(encoding="utf-8")
        env_vars = {}
        for line in env_content.splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                env_vars[key.strip()] = val.strip()

        # Required vars
        required = {
            "TELEGRAM_BOT_TOKEN": "Bot won't start without it",
            "DATABASE_URL": "No database connection",
            "MINI_APP_URL": "Mini app buttons in bot won't work",
        }

        missing = []
        placeholder = []
        for var, reason in required.items():
            val = env_vars.get(var, "")
            if not val:
                missing.append(var)
                self._add_issue("critical", "config", f"Missing {var}: {reason}")
            elif val in ("your_bot_token_here", "your_jwt_secret_here", "postgresql://username:password@localhost:5432/telegram_rpg"):
                placeholder.append(var)
                self._add_issue("critical", "config", f"{var} still has placeholder value")

        section["details"]["env_vars_found"] = len(env_vars)
        section["details"]["missing"] = missing
        section["details"]["placeholder"] = placeholder
        section["details"]["MINI_APP_URL"] = env_vars.get("MINI_APP_URL", "(not set)")
        section["details"]["NODE_ENV"] = env_vars.get("NODE_ENV", "(not set)")

        # Check mini-app .env
        mini_env = self.root / "mini-app" / ".env"
        if mini_env.is_file():
            mini_content = mini_env.read_text(encoding="utf-8")
            section["details"]["mini_app_env"] = "exists"
            if "VITE_API_URL" in mini_content:
                for line in mini_content.splitlines():
                    if line.startswith("VITE_API_URL"):
                        section["details"]["VITE_API_URL"] = line.split("=", 1)[1].strip()
        else:
            section["details"]["mini_app_env"] = "missing (will use default localhost:3000)"

        section["status"] = "FAIL" if missing or placeholder else "OK"
        self.results["config"] = section

    # =========================================================================
    # 2. Build Status Check
    # =========================================================================
    def check_build(self):
        section = {"status": "unknown", "details": {}}
        dist = self.root / "mini-app" / "dist"

        if not dist.is_dir():
            section["status"] = "FAIL"
            section["details"]["built"] = False
            self._add_issue("critical", "build", "mini-app/dist/ does not exist - frontend not built")
            self.results["build"] = section
            return

        # Check key files
        index_html = dist / "index.html"
        assets_dir = dist / "assets"

        section["details"]["built"] = True
        section["details"]["has_index_html"] = index_html.is_file()
        section["details"]["has_assets"] = assets_dir.is_dir()

        if not index_html.is_file():
            self._add_issue("critical", "build", "mini-app/dist/index.html missing")

        # Count built assets
        if assets_dir.is_dir():
            js_files = list(assets_dir.glob("*.js"))
            css_files = list(assets_dir.glob("*.css"))
            section["details"]["js_bundles"] = len(js_files)
            section["details"]["css_bundles"] = len(css_files)

            if not js_files:
                self._add_issue("critical", "build", "No JS bundles in dist/assets/")

            # Check bundle sizes
            for f in js_files:
                size_kb = f.stat().st_size / 1024
                section["details"][f"bundle_{f.name}_size_kb"] = round(size_kb, 1)
                if size_kb > 500:
                    self._add_issue("warning", "build", f"Large bundle: {f.name} ({size_kb:.0f} KB)")

        # Build freshness
        if index_html.is_file():
            build_time = datetime.fromtimestamp(index_html.stat().st_mtime, tz=timezone.utc)
            section["details"]["build_time"] = build_time.isoformat()
            age_hours = (datetime.now(timezone.utc) - build_time).total_seconds() / 3600
            section["details"]["build_age_hours"] = round(age_hours, 1)

            if age_hours > 24:
                self._add_issue("warning", "build", f"Build is {age_hours:.0f}h old - may be stale")

        # Compare source vs build freshness
        src_dir = self.root / "mini-app" / "src"
        if src_dir.is_dir():
            latest_src = max(
                (f.stat().st_mtime for f in src_dir.rglob("*") if f.is_file()),
                default=0
            )
            if latest_src > 0 and index_html.is_file():
                src_time = datetime.fromtimestamp(latest_src, tz=timezone.utc)
                build_time = datetime.fromtimestamp(index_html.stat().st_mtime, tz=timezone.utc)
                if src_time > build_time:
                    self._add_issue("warning", "build",
                        f"Source files modified AFTER last build ({src_time.isoformat()} > {build_time.isoformat()}) - rebuild needed")
                    section["details"]["needs_rebuild"] = True
                else:
                    section["details"]["needs_rebuild"] = False

        section["status"] = "OK" if section["details"].get("has_index_html") else "FAIL"
        self.results["build"] = section

    # =========================================================================
    # 3. TypeScript Compilation Check
    # =========================================================================
    def check_typescript(self):
        section = {"status": "unknown", "details": {}}

        if self.skip_tsc:
            section["status"] = "SKIPPED"
            section["details"]["reason"] = "--skip-tsc flag used"
            self.results["typescript"] = section
            return

        mini_app_dir = str(self.root / "mini-app")

        # Check if node_modules exists
        if not (self.root / "mini-app" / "node_modules").is_dir():
            section["status"] = "FAIL"
            section["details"]["error"] = "node_modules missing - run 'npm install' in mini-app/"
            self._add_issue("critical", "typescript", "mini-app/node_modules missing")
            self.results["typescript"] = section
            return

        # Run tsc --noEmit
        code, stdout, stderr = self._run_cmd(
            ["npx", "tsc", "--noEmit"], cwd=mini_app_dir, timeout=60
        )

        if code == 0:
            section["status"] = "OK"
            section["details"]["errors"] = 0
        else:
            output = stdout + stderr
            # Parse TS errors
            error_lines = [l for l in output.splitlines() if re.match(r"^.+\.\w+\(\d+,\d+\):", l)]
            section["status"] = "FAIL"
            section["details"]["errors"] = len(error_lines)
            section["details"]["error_summary"] = error_lines[:10]  # First 10

            for err in error_lines[:5]:
                self._add_issue("error", "typescript", err.strip())

            if len(error_lines) > 10:
                section["details"]["truncated"] = f"...and {len(error_lines) - 10} more errors"

        self.results["typescript"] = section

    # =========================================================================
    # 4. Frontend-Backend API Contract Check
    # =========================================================================
    def check_api_contract(self):
        """Compare what the frontend expects vs what the backend provides."""
        section = {"status": "unknown", "details": {}}
        mismatches = []

        # Read frontend API client to see what endpoints it calls
        client_src = self._read_file("mini-app/src/api/client.ts")
        types_src = self._read_file("mini-app/src/types/index.ts")
        users_route = self._read_file("bot/src/api/routes/users.ts")
        quests_route = self._read_file("bot/src/api/routes/quests.ts")
        achievements_route = self._read_file("bot/src/api/routes/achievements.ts")
        modes_route = self._read_file("bot/src/api/routes/modes.ts")
        leaderboard_route = self._read_file("bot/src/api/routes/leaderboard.ts")
        server_src = self._read_file("bot/src/api/server.ts")

        # Check 1: All frontend API methods have corresponding backend routes
        if client_src:
            frontend_endpoints = []
            # Extract API calls from client.ts
            for match in re.finditer(r"this\.client\.(get|post|patch|delete|put)\(['\"`]([^'\"`]+)", client_src):
                method, path = match.groups()
                frontend_endpoints.append({"method": method.upper(), "path": f"/api{path}"})
            section["details"]["frontend_endpoints"] = len(frontend_endpoints)

            # Check each frontend endpoint pattern exists in backend
            for ep in frontend_endpoints:
                path_pattern = ep["path"]
                # Normalize: replace ${...} with :param
                path_pattern = re.sub(r"\$\{[^}]+\}", ":param", path_pattern)
                found = False

                # Check in server.ts route mounts and individual route files
                all_backend = (users_route or "") + (quests_route or "") + (achievements_route or "") + (modes_route or "") + (leaderboard_route or "") + (server_src or "")
                if all_backend:
                    # Simple heuristic: check if the route pattern keywords exist
                    path_parts = [p for p in path_pattern.split("/") if p and not p.startswith(":")]
                    if all(part in all_backend for part in path_parts if part not in ("api",)):
                        found = True

                if not found:
                    mismatches.append(f"Frontend calls {ep['method']} {ep['path']} but no matching backend route found")

        # Check 2: Frontend UserStats type fields vs backend /stats response
        if types_src and users_route:
            # Check UserStats expected fields
            user_stats_match = re.search(r"interface UserStats \{([^}]+)\}", types_src, re.DOTALL)
            if user_stats_match:
                expected_fields = re.findall(r"(\w+):", user_stats_match.group(1))
                section["details"]["UserStats_expected_fields"] = expected_fields

                # Check backend response includes these fields
                stats_response_match = re.search(r"res\.json\(\{[^}]*success:\s*true[^}]*data:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}", users_route, re.DOTALL)
                if stats_response_match:
                    response_fields = re.findall(r"(\w+)(?:,|\:)", stats_response_match.group(1))
                    section["details"]["backend_stats_fields"] = response_fields

                    missing_in_backend = [f for f in expected_fields if f not in response_fields]
                    if missing_in_backend:
                        for field in missing_in_backend:
                            mismatches.append(f"UserStats expects '{field}' but backend /stats response may not include it")

        # Check 3: Frontend Quest type fields vs backend quest response mapping
        if types_src and users_route:
            quest_match = re.search(r"interface Quest \{([^}]+)\}", types_src, re.DOTALL)
            if quest_match:
                quest_fields = re.findall(r"(\w+)\??:", quest_match.group(1))
                section["details"]["Quest_expected_fields"] = quest_fields

        # Check 4: API base URL alignment
        if client_src:
            api_url_match = re.search(r"VITE_API_URL\s*\|\|\s*['\"]([^'\"]+)", client_src)
            if api_url_match:
                fallback_url = api_url_match.group(1)
                section["details"]["api_fallback_url"] = fallback_url

        # Check 5: Quests page uses user.id (telegram_id) but API routes expect different params
        if client_src:
            # getActiveQuests takes userId, but does it mean telegram_id or internal id?
            if "getActiveQuests(userId" in client_src or "getActiveQuests(user.id" in client_src:
                # Check what the Quests page actually passes
                quests_page = self._read_file("mini-app/src/pages/Quests.tsx")
                if quests_page and "user.id" in quests_page:
                    # user.id from Telegram is telegram_id, but API route param name matters
                    section["details"]["quest_id_source"] = "Telegram user.id (telegram_id)"

                    # Check if backend expects telegramId or userId
                    if users_route and "/:telegramId/quests" in users_route:
                        section["details"]["backend_quest_param"] = "telegramId"
                    elif quests_route:
                        section["details"]["backend_quest_param"] = "check quests.ts"

        if mismatches:
            section["details"]["mismatches"] = mismatches
            for m in mismatches:
                self._add_issue("warning", "api_contract", m)
            section["status"] = "WARNING"
        else:
            section["status"] = "OK"

        self.results["api_contract"] = section

    # =========================================================================
    # 5. Production Server Check
    # =========================================================================
    def check_server(self):
        section = {"status": "unknown", "details": {}}

        if self.skip_remote or not HAS_REQUESTS:
            reason = "--skip-remote flag used" if self.skip_remote else "requests library not installed"
            section["status"] = "SKIPPED"
            section["details"]["reason"] = reason
            if not HAS_REQUESTS:
                self._add_issue("info", "server", "Install 'requests' to enable remote checks: pip install requests")
            self.results["server"] = section
            return

        # Health check
        try:
            start = time.time()
            resp = requests.get(f"{self.server_url}/health", timeout=10)
            latency = round((time.time() - start) * 1000)
            section["details"]["health_status"] = resp.status_code
            section["details"]["health_latency_ms"] = latency
            if resp.status_code == 200:
                data = resp.json()
                section["details"]["uptime_seconds"] = data.get("uptime")
                section["details"]["server_time"] = data.get("timestamp")
            else:
                self._add_issue("critical", "server", f"Health check returned {resp.status_code}")
        except requests.exceptions.ConnectionError:
            section["status"] = "FAIL"
            section["details"]["health_status"] = "connection_refused"
            self._add_issue("critical", "server", f"Cannot connect to {self.server_url} - server may be down")
            self.results["server"] = section
            return
        except Exception as e:
            section["status"] = "FAIL"
            section["details"]["health_error"] = str(e)
            self._add_issue("critical", "server", f"Health check error: {e}")
            self.results["server"] = section
            return

        # Check mini-app is being served
        try:
            resp = requests.get(f"{self.server_url}/dashboard", timeout=10)
            section["details"]["mini_app_served"] = resp.status_code == 200
            if resp.status_code == 200:
                html = resp.text
                section["details"]["has_react_root"] = 'id="root"' in html
                section["details"]["has_telegram_sdk"] = "telegram-web-app.js" in html
                section["details"]["html_size_bytes"] = len(html)

                if 'id="root"' not in html:
                    self._add_issue("error", "server", "Mini app HTML missing React root div")
                if "telegram-web-app.js" not in html:
                    self._add_issue("warning", "server", "Mini app HTML missing Telegram WebApp SDK script")
            else:
                self._add_issue("error", "server", f"Mini app not served at /dashboard (status {resp.status_code})")
        except Exception as e:
            self._add_issue("error", "server", f"Failed to fetch mini app: {e}")

        # Test API endpoints (without auth - expect 401 for protected routes)
        api_checks = [
            ("GET", "/api/users/123456/stats", 401),      # Should require auth
            ("GET", "/api/achievements", None),            # May or may not require auth
            ("GET", "/api/modes", None),                   # May or may not require auth
        ]

        endpoint_results = []
        for method, path, expected_status in api_checks:
            try:
                url = f"{self.server_url}{path}"
                resp = requests.request(method, url, timeout=10)
                result = {
                    "endpoint": f"{method} {path}",
                    "status": resp.status_code,
                    "expected": expected_status,
                }
                try:
                    body = resp.json()
                    result["response_keys"] = list(body.keys()) if isinstance(body, dict) else "array"
                    result["has_success_field"] = "success" in body if isinstance(body, dict) else False
                except Exception:
                    result["response_type"] = "non-json"

                endpoint_results.append(result)

                if expected_status and resp.status_code != expected_status:
                    if resp.status_code == 500:
                        self._add_issue("error", "server", f"{method} {path} returned 500 (server error)")
                    elif expected_status == 401 and resp.status_code == 200:
                        self._add_issue("warning", "server", f"{method} {path} returned 200 without auth (should require auth)")
            except Exception as e:
                endpoint_results.append({"endpoint": f"{method} {path}", "error": str(e)})

        section["details"]["api_endpoint_checks"] = endpoint_results

        # Check SSL
        try:
            resp = requests.get(f"{self.server_url}/health", timeout=5, verify=True)
            section["details"]["ssl_valid"] = True
        except requests.exceptions.SSLError:
            section["details"]["ssl_valid"] = False
            self._add_issue("critical", "server", "SSL certificate is invalid or expired")
        except Exception:
            pass

        has_critical = any(
            i["severity"] == "critical" and i["area"] == "server" for i in self.issues
        )
        section["status"] = "FAIL" if has_critical else "OK"
        self.results["server"] = section

    # =========================================================================
    # 6. Database State Check
    # =========================================================================
    def check_database(self):
        section = {"status": "unknown", "details": {}}

        # Try to use db_operations tool to check data
        db_tool = self.root / "tools" / "db_operations.py"
        if not db_tool.is_file():
            section["status"] = "FAIL"
            section["details"]["error"] = "tools/db_operations.py not found"
            self.results["database"] = section
            return

        # Check user count
        queries = {
            "user_count": "SELECT COUNT(*) as count FROM users",
            "active_user_count": "SELECT COUNT(*) as count FROM users WHERE is_active = true",
            "mode_count": "SELECT COUNT(*) as count FROM modes",
            "quest_template_count": "SELECT COUNT(*) as count FROM quests",
            "active_quest_count": "SELECT COUNT(*) as count FROM quest_instances WHERE status IN ('pending', 'ready', 'in_progress')",
            "achievement_count": "SELECT COUNT(*) as count FROM achievements",
        }

        python_exe = os.environ.get("PYTHON_EXECUTABLE", "python")

        for key, query in queries.items():
            code, stdout, stderr = self._run_cmd(
                [python_exe, str(db_tool), "--query", query],
                timeout=15
            )
            if code == 0 and stdout.strip():
                try:
                    # db_operations.py may print text before JSON - find the JSON array/object
                    raw = stdout.strip()
                    json_start = -1
                    for i, ch in enumerate(raw):
                        if ch in ("[", "{"):
                            json_start = i
                            break
                    if json_start >= 0:
                        data = json.loads(raw[json_start:])
                    else:
                        data = json.loads(raw)

                    if isinstance(data, list) and data:
                        section["details"][key] = int(data[0].get("count", 0))
                    elif isinstance(data, dict) and "data" in data:
                        section["details"][key] = int(data["data"][0].get("count", 0))
                    else:
                        section["details"][key] = f"unexpected format: {raw[:100]}"
                except (json.JSONDecodeError, IndexError, TypeError) as e:
                    section["details"][key] = f"parse error: {e}"
            else:
                section["details"][key] = f"query failed: {stderr[:100]}"
                if "connection" in stderr.lower():
                    self._add_issue("critical", "database", "Cannot connect to database")
                    break  # Skip remaining queries

        # Warnings for empty data
        for key, label in [
            ("user_count", "users"),
            ("mode_count", "modes"),
            ("quest_template_count", "quest templates"),
            ("achievement_count", "achievements"),
        ]:
            val = section["details"].get(key)
            if isinstance(val, int) and val == 0:
                self._add_issue("warning", "database", f"No {label} in database - seed data may be needed")

        has_critical = any(i["severity"] == "critical" and i["area"] == "database" for i in self.issues)
        section["status"] = "FAIL" if has_critical else "OK"
        self.results["database"] = section

    # =========================================================================
    # 7. Known Issues Detection
    # =========================================================================
    def check_known_issues(self):
        section = {"status": "unknown", "details": []}

        # Issue 1: ESM import extensions
        mini_src = self.root / "mini-app" / "src"
        if mini_src.is_dir():
            for ts_file in mini_src.rglob("*.ts"):
                content = self._read_file(str(ts_file.relative_to(self.root)))
                if content:
                    # Check for imports without extensions (in non-node_modules)
                    for match in re.finditer(r"from\s+['\"](\.[^'\"]+)['\"]", content):
                        import_path = match.group(1)
                        if not import_path.endswith((".js", ".ts", ".tsx", ".json", ".css")):
                            # This is fine for Vite bundler (uses @ alias or relative)
                            pass

            for tsx_file in mini_src.rglob("*.tsx"):
                content = self._read_file(str(tsx_file.relative_to(self.root)))
                if content:
                    # Check for @ alias usage (should be configured in vite.config.ts)
                    if "@/" in content:
                        vite_config = self._read_file("mini-app/vite.config.ts")
                        if vite_config and "@" not in vite_config:
                            self._add_issue("error", "known_issues", "Frontend uses @/ imports but vite.config.ts may not have alias configured")
                            section["details"].append("Missing @ alias in vite.config.ts")

        # Issue 2: Check bot ESM imports have .js extensions
        bot_src = self.root / "bot" / "src"
        if bot_src.is_dir():
            missing_ext = []
            for ts_file in bot_src.rglob("*.ts"):
                content = self._read_file(str(ts_file.relative_to(self.root)))
                if content:
                    for match in re.finditer(r"from\s+['\"](\.\./[^'\"]+|\.\/[^'\"]+)['\"]", content):
                        import_path = match.group(1)
                        if not import_path.endswith((".js", ".json", ".mjs")):
                            missing_ext.append(f"{ts_file.relative_to(self.root)}: {import_path}")

            if missing_ext:
                section["details"].append(f"Bot imports missing .js extension: {len(missing_ext)} occurrences")
                self._add_issue("error", "known_issues",
                    f"{len(missing_ext)} bot imports missing .js extension (ESM requirement)")

        # Issue 3: Check if Telegram SDK is in index.html
        index_html = self._read_file("mini-app/index.html")
        if index_html and "telegram-web-app.js" not in index_html:
            self._add_issue("critical", "known_issues",
                "mini-app/index.html missing <script src='https://telegram.org/js/telegram-web-app.js'>")
            section["details"].append("Telegram WebApp SDK not loaded in index.html")

        # Issue 4: Check CORS configuration
        server_src = self._read_file("bot/src/api/server.ts")
        if server_src:
            if "x-telegram-init-data" not in server_src.lower():
                self._add_issue("critical", "known_issues", "CORS doesn't allow x-telegram-init-data header")
                section["details"].append("Missing x-telegram-init-data in CORS allowedHeaders")

        # Issue 5: Check API client uses correct Telegram header
        client_src = self._read_file("mini-app/src/api/client.ts")
        if client_src:
            if "X-Telegram-Init-Data" not in client_src and "x-telegram-init-data" not in client_src:
                self._add_issue("critical", "known_issues", "API client doesn't send Telegram auth header")
                section["details"].append("API client missing Telegram init data header")

        # Issue 6: Check frontend uses correct Telegram user id
        dashboard = self._read_file("mini-app/src/pages/Dashboard.tsx")
        if dashboard:
            if "user?.id" in dashboard or "user.id" in dashboard:
                # This is the Telegram user id - check if API expects telegram_id
                if users_route := self._read_file("bot/src/api/routes/users.ts"):
                    if "telegramId" in users_route:
                        section["details"].append("Frontend correctly passes Telegram user.id as telegramId to API")

        section["status"] = "OK" if not any(
            i["severity"] in ("critical", "error") and i["area"] == "known_issues"
            for i in self.issues
        ) else "FAIL"
        self.results["known_issues"] = section

    # =========================================================================
    # 8. Deployment Sync Check
    # =========================================================================
    def check_deployment_sync(self):
        """Check if local code matches what's deployed."""
        section = {"status": "unknown", "details": {}}

        # Check git status
        code, stdout, stderr = self._run_cmd(["git", "status", "--porcelain"])
        if code == 0:
            changes = [l for l in stdout.strip().splitlines() if l.strip()]
            section["details"]["uncommitted_changes"] = len(changes)
            if changes:
                section["details"]["changed_files"] = changes[:10]
                self._add_issue("info", "deployment", f"{len(changes)} uncommitted changes")

        # Check if local is ahead of remote
        code, stdout, stderr = self._run_cmd(["git", "log", "origin/main..HEAD", "--oneline"])
        if code == 0:
            unpushed = [l for l in stdout.strip().splitlines() if l.strip()]
            section["details"]["unpushed_commits"] = len(unpushed)
            if unpushed:
                section["details"]["unpushed_details"] = unpushed[:5]
                self._add_issue("warning", "deployment", f"{len(unpushed)} commits not pushed to remote")

        section["status"] = "OK" if not section["details"].get("unpushed_commits") else "WARNING"
        self.results["deployment_sync"] = section

    # =========================================================================
    # Run All Checks
    # =========================================================================
    def run_all(self):
        checks = [
            ("config", self.check_config),
            ("build", self.check_build),
            ("typescript", self.check_typescript),
            ("api_contract", self.check_api_contract),
            ("server", self.check_server),
            ("database", self.check_database),
            ("known_issues", self.check_known_issues),
            ("deployment_sync", self.check_deployment_sync),
        ]

        for name, check_fn in checks:
            try:
                check_fn()
            except Exception as e:
                self.results[name] = {"status": "ERROR", "details": {"exception": str(e)}}

    # =========================================================================
    # Format Report
    # =========================================================================
    def format_report(self) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("  MINI APP DIAGNOSTIC REPORT")
        lines.append(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"  Server: {self.server_url}")
        lines.append("=" * 60)

        # Overall status
        statuses = [v["status"] for v in self.results.values()]
        has_fail = "FAIL" in statuses
        has_warn = "WARNING" in statuses or any(i["severity"] == "warning" for i in self.issues)
        overall = "FAIL" if has_fail else ("WARNING" if has_warn else "OK")
        lines.append(f"\n  OVERALL STATUS: {overall}")

        # Section summaries
        status_icons = {"OK": "[OK]", "FAIL": "[FAIL]", "WARNING": "[WARN]", "SKIPPED": "[SKIP]", "ERROR": "[ERR]", "unknown": "[???]"}

        lines.append("\n--- Section Summary ---")
        for name, result in self.results.items():
            icon = status_icons.get(result["status"], "[???]")
            lines.append(f"  {icon} {name}")
        lines.append("")

        # Detailed results
        for name, result in self.results.items():
            icon = status_icons.get(result["status"], "[???]")
            lines.append(f"--- {icon} {name.upper()} ---")
            if "details" in result:
                details = result["details"]
                if isinstance(details, dict):
                    for k, v in details.items():
                        if isinstance(v, list):
                            lines.append(f"  {k}:")
                            for item in v[:15]:
                                lines.append(f"    - {item}")
                            if len(v) > 15:
                                lines.append(f"    ... ({len(v) - 15} more)")
                        else:
                            lines.append(f"  {k}: {v}")
                elif isinstance(details, list):
                    for item in details:
                        lines.append(f"  - {item}")
            lines.append("")

        # Issues summary
        if self.issues:
            lines.append("--- ISSUES FOUND ---")
            severity_order = {"critical": 0, "error": 1, "warning": 2, "info": 3}
            sorted_issues = sorted(self.issues, key=lambda i: severity_order.get(i["severity"], 99))

            for issue in sorted_issues:
                sev = issue["severity"].upper()
                lines.append(f"  [{sev}] ({issue['area']}) {issue['message']}")
            lines.append("")

        # Action items
        critical = [i for i in self.issues if i["severity"] == "critical"]
        errors = [i for i in self.issues if i["severity"] == "error"]
        warnings = [i for i in self.issues if i["severity"] == "warning"]

        if critical or errors:
            lines.append("--- RECOMMENDED ACTIONS ---")
            for i, issue in enumerate(critical + errors, 1):
                lines.append(f"  {i}. [{issue['severity'].upper()}] {issue['message']}")
            lines.append("")

        lines.append("=" * 60)
        lines.append("  END OF DIAGNOSTIC REPORT")
        lines.append("=" * 60)

        return "\n".join(lines)

    def to_json(self) -> str:
        return json.dumps({
            "timestamp": datetime.now().isoformat(),
            "server_url": self.server_url,
            "results": self.results,
            "issues": self.issues,
            "overall_status": "FAIL" if any(v["status"] == "FAIL" for v in self.results.values()) else "OK",
        }, indent=2, default=str)


def main():
    if sys.platform == "win32":
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer, "strict")

    import argparse
    parser = argparse.ArgumentParser(description="Mini App Diagnostic Tool")
    parser.add_argument("project_root", nargs="?", default=os.getcwd(), help="Project root directory")
    parser.add_argument("--server", default="https://yakutsa.ru", help="Production server URL")
    parser.add_argument("--skip-remote", action="store_true", help="Skip remote server checks")
    parser.add_argument("--skip-tsc", action="store_true", help="Skip TypeScript compilation check")
    parser.add_argument("--json", action="store_true", help="Output as JSON instead of text report")
    args = parser.parse_args()

    diag = MiniAppDiagnostic(
        project_root=args.project_root,
        server_url=args.server,
        skip_remote=args.skip_remote,
        skip_tsc=args.skip_tsc,
    )

    diag.run_all()

    if args.json:
        print(diag.to_json())
    else:
        print(diag.format_report())


if __name__ == "__main__":
    main()
