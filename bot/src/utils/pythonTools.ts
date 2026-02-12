/**
 * Python Tools Executor
 * Provides functions to execute Python tools via subprocess
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const log = logger.child({ component: 'pythonTools' });

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || 'python';
// Resolve tools path relative to this file's location (bot/src/utils/ -> tools/)
// This works regardless of CWD (project root, bot/, or PM2)
const TOOLS_PATH = process.env.PYTHON_TOOLS_PATH || path.resolve(__dirname, '..', '..', '..', 'tools');

// Whitelist pattern for tool names (lowercase alphanumeric + underscores only)
const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

export interface PythonToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  stderr?: string;
}

/**
 * Execute a Python tool and return parsed JSON result.
 * Uses execFile (no shell) to prevent command injection.
 */
export async function executePythonTool<T = unknown>(
  toolName: string,
  args: string[]
): Promise<PythonToolResult<T>> {
  try {
    if (!TOOL_NAME_PATTERN.test(toolName)) {
      throw new Error(`Invalid tool name: ${toolName}`);
    }

    const toolPath = path.join(TOOLS_PATH, `${toolName}.py`);

    log.info(`Executing: ${toolName} ${args.join(' ').substring(0, 100)}...`);

    const { stdout, stderr } = await execFileAsync(
      PYTHON_EXECUTABLE,
      [toolPath, ...args],
      { maxBuffer: 1024 * 1024 * 5 }
    );

    if (stderr && stderr.trim().length > 0) {
      log.warn(`stderr: ${stderr}`);
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
        data: stdout as unknown as T,
        stderr: stderr.trim() || undefined,
      };
    }
  } catch (error: unknown) {
    log.error(`Error executing ${toolName}`, error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stderr: error instanceof Error && 'stderr' in error ? (error as { stderr: string }).stderr : undefined,
    };
  }
}
