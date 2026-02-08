/**
 * Python Tools Executor
 * Provides functions to execute Python tools via subprocess
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

// Configuration
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || 'python';
const TOOLS_PATH = process.env.PYTHON_TOOLS_PATH || path.join('..', 'tools');

// Whitelist pattern for tool names (lowercase alphanumeric + underscores only)
const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

export interface PythonToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  stderr?: string;
}

/**
 * Execute a Python tool and return parsed JSON result.
 * Uses execFile (no shell) to prevent command injection.
 */
export async function executePythonTool<T = any>(
  toolName: string,
  args: string[]
): Promise<PythonToolResult<T>> {
  try {
    if (!TOOL_NAME_PATTERN.test(toolName)) {
      throw new Error(`Invalid tool name: ${toolName}`);
    }

    const toolPath = path.join(TOOLS_PATH, `${toolName}.py`);

    console.log(`[Python] Executing: ${toolName} ${args.join(' ').substring(0, 100)}...`);

    const { stdout, stderr } = await execFileAsync(
      PYTHON_EXECUTABLE,
      [toolPath, ...args],
      { maxBuffer: 1024 * 1024 * 5 }
    );

    if (stderr && stderr.trim().length > 0) {
      console.warn(`[Python] stderr: ${stderr}`);
    }

    // Try to parse JSON output
    try {
      const data = JSON.parse(stdout);
      return {
        success: true,
        data,
        stderr: stderr.trim() || undefined,
      };
    } catch (parseError) {
      // If not JSON, return raw stdout
      return {
        success: true,
        data: stdout as any,
        stderr: stderr.trim() || undefined,
      };
    }
  } catch (error: any) {
    console.error(`[Python] Error executing ${toolName}:`, error);
    return {
      success: false,
      error: error.message,
      stderr: error.stderr || undefined,
    };
  }
}

/**
 * Execute a parameterized SELECT query (or INSERT/UPDATE with RETURNING).
 * Uses %s placeholders with separate params to prevent SQL injection.
 */
export async function executeSafeQuery<T = any>(
  query: string,
  params: any[] = []
): Promise<PythonToolResult<T>> {
  const args = ['--query', query];
  if (params.length > 0) {
    args.push('--params', JSON.stringify(params));
  }
  return executePythonTool('db_operations', args);
}

/**
 * Execute a parameterized INSERT/UPDATE/DELETE statement (no result rows).
 * Uses %s placeholders with separate params to prevent SQL injection.
 */
export async function executeSafeStatement(
  statement: string,
  params: any[] = []
): Promise<PythonToolResult> {
  const args = ['--execute', statement];
  if (params.length > 0) {
    args.push('--params', JSON.stringify(params));
  }
  return executePythonTool('db_operations', args);
}

/**
 * User Manager Functions
 */
export async function createUser(
  telegramId: number,
  username?: string,
  firstName?: string,
  timezone: string = 'UTC'
) {
  const args = [
    '--create-user',
    '--telegram-id',
    telegramId.toString(),
  ];

  if (username) {
    args.push('--username', username);
  }
  if (firstName) {
    args.push('--first-name', firstName);
  }
  if (timezone !== 'UTC') {
    args.push('--timezone', timezone);
  }

  return executePythonTool('user_manager', args);
}

export async function getUserByTelegramId(telegramId: number) {
  return executePythonTool('user_manager', [
    '--get-user',
    '--telegram-id',
    telegramId.toString(),
  ]);
}

export async function getUserById(userId: number) {
  return executePythonTool('user_manager', [
    '--get-user',
    '--user-id',
    userId.toString(),
  ]);
}

export async function getUserStats(userId: number) {
  return executePythonTool('user_manager', [
    '--get-stats',
    '--user-id',
    userId.toString(),
  ]);
}

export async function updateUserTimezone(userId: number, timezone: string) {
  return executePythonTool('user_manager', [
    '--update-timezone',
    '--user-id',
    userId.toString(),
    '--timezone',
    timezone,
  ]);
}

/**
 * Mode Manager Functions
 */
export async function listAllModes() {
  return executePythonTool('mode_manager', ['--list-modes']);
}

export async function getUserActiveModes(userId: number) {
  return executePythonTool('mode_manager', [
    '--get-active-modes',
    '--user-id',
    userId.toString(),
  ]);
}

export async function addModesToUser(userId: number, modes: string[]) {
  return executePythonTool('mode_manager', [
    '--add-modes',
    '--user-id',
    userId.toString(),
    '--modes',
    modes.join(','),
  ]);
}

export async function removeMode(userId: number, mode: string) {
  return executePythonTool('mode_manager', [
    '--remove-mode',
    '--user-id',
    userId.toString(),
    '--mode',
    mode,
  ]);
}

export async function getModeSummary(userId: number) {
  return executePythonTool('mode_manager', [
    '--get-mode-summary',
    '--user-id',
    userId.toString(),
  ]);
}

/**
 * Streak Manager Functions
 */
export async function checkAllStreaks() {
  return executePythonTool('streak_manager', ['--check-all-streaks']);
}

export async function updateStreak(userId: number, modeId: number) {
  return executePythonTool('streak_manager', [
    '--update-streak',
    '--user-id',
    userId.toString(),
    '--mode-id',
    modeId.toString(),
  ]);
}

export async function getUserStreaks(userId: number) {
  return executePythonTool('streak_manager', [
    '--get-streak',
    '--user-id',
    userId.toString(),
  ]);
}

/**
 * Analytics Export Functions
 */
export async function exportAnalyticsToSheets() {
  return executePythonTool('sheets_analytics_export', ['--export-all']);
}

/**
 * Database Operations Functions
 */
export async function testDatabaseConnection() {
  return executePythonTool('db_operations', ['--test-connection']);
}

export async function executeStatement(statement: string) {
  return executePythonTool('db_operations', ['--execute', statement]);
}
