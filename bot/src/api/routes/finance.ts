import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../../utils/db.js';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { mutationLimiter, readLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler, successResponse, BadRequestError, NotFoundError } from '../utils/errors.js';

const router = Router();

/** Default expense categories for budget tracking */
const DEFAULT_CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Entertainment',
  'Health', 'Education', 'Shopping', 'Bills', 'Other',
];

/** Valid budget entry types */
const VALID_BUDGET_TYPES = ['income', 'expense'] as const;

// GET /budget/:userId — get budget summary for the current month
router.get('/budget/:userId', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  const entries = await query<{
    id: number;
    category: string;
    amount: number;
    type: string;
    created_at: string;
  }>(
    `SELECT id, category, amount, type, created_at
     FROM finance_budget_entries
     WHERE user_id = $1
       AND created_at >= date_trunc('month', CURRENT_DATE)
     ORDER BY created_at DESC`,
    [userId]
  );

  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory: Record<string, number> = {};

  for (const entry of entries) {
    if (entry.type === 'income') {
      totalIncome += Number(entry.amount);
    } else {
      totalExpense += Number(entry.amount);
      byCategory[entry.category] = (byCategory[entry.category] ?? 0) + Number(entry.amount);
    }
  }

  res.json(successResponse({
    total_income: totalIncome,
    total_expense: totalExpense,
    balance: totalIncome - totalExpense,
    entries,
    by_category: byCategory,
  }));
}));

// POST /budget — create a new budget entry (income or expense)
router.post('/budget', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { userId, category, amount, type } = req.body;

  if (!userId || !category || !amount || !type) {
    throw new BadRequestError('Missing required fields: userId, category, amount, type');
  }

  const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    throw new BadRequestError('userId must be a positive integer');
  }

  if (typeof category !== 'string' || category.length === 0 || category.length > 100) {
    throw new BadRequestError('category must be a string with max 100 characters');
  }

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (typeof numericAmount !== 'number' || isNaN(numericAmount) || numericAmount <= 0) {
    throw new BadRequestError('amount must be a positive number');
  }

  if (!VALID_BUDGET_TYPES.includes(type as typeof VALID_BUDGET_TYPES[number])) {
    throw new BadRequestError('type must be "income" or "expense"');
  }

  await execute(
    `INSERT INTO finance_budget_entries (user_id, category, amount, type)
     VALUES ($1, $2, $3, $4)`,
    [numericUserId, category.trim(), numericAmount, type]
  );

  res.json(successResponse({ message: 'Budget entry created' }));
}));

// GET /savings/:userId — get all savings goals for a user
router.get('/savings/:userId', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  const goals = await query<{
    id: number;
    name: string;
    target_amount: number;
    current_amount: number;
    created_at: string;
  }>(
    `SELECT id, name, target_amount, current_amount, created_at
     FROM finance_savings_goals
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  // Fetch deposit history for each goal
  const goalsWithDeposits = await Promise.all(
    goals.map(async (goal) => {
      const deposits = await query<{
        id: number;
        amount: number;
        created_at: string;
      }>(
        `SELECT id, amount, created_at
         FROM finance_savings_deposits
         WHERE goal_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [goal.id]
      );
      return { ...goal, deposits };
    })
  );

  res.json(successResponse({ goals: goalsWithDeposits }));
}));

// POST /savings — create a new savings goal
router.post('/savings', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { userId, name, targetAmount } = req.body;

  if (!userId || !name || !targetAmount) {
    throw new BadRequestError('Missing required fields: userId, name, targetAmount');
  }

  const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    throw new BadRequestError('userId must be a positive integer');
  }

  if (typeof name !== 'string' || name.length === 0 || name.length > 200) {
    throw new BadRequestError('name must be a string with max 200 characters');
  }

  const numericTarget = typeof targetAmount === 'string' ? parseFloat(targetAmount) : targetAmount;
  if (typeof numericTarget !== 'number' || isNaN(numericTarget) || numericTarget <= 0) {
    throw new BadRequestError('targetAmount must be a positive number');
  }

  const goal = await queryOne<{ id: number }>(
    `INSERT INTO finance_savings_goals (user_id, name, target_amount, current_amount)
     VALUES ($1, $2, $3, 0)
     RETURNING id`,
    [numericUserId, name.trim(), numericTarget]
  );

  res.json(successResponse({ id: goal?.id, message: 'Savings goal created' }));
}));

// PATCH /savings/:id — add a deposit to update savings progress
router.patch('/savings/:id', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const goalId = parseInt(req.params.id);
  if (isNaN(goalId) || goalId <= 0) {
    throw new BadRequestError('Invalid savings goal ID');
  }

  const { amount } = req.body;

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (typeof numericAmount !== 'number' || isNaN(numericAmount) || numericAmount <= 0) {
    throw new BadRequestError('amount must be a positive number');
  }

  // Verify goal exists
  const goal = await queryOne<{ id: number; current_amount: number }>(
    `SELECT id, current_amount FROM finance_savings_goals WHERE id = $1`,
    [goalId]
  );

  if (!goal) {
    throw new NotFoundError('Savings goal not found');
  }

  // Record deposit and update current amount
  await execute(
    `INSERT INTO finance_savings_deposits (goal_id, amount) VALUES ($1, $2)`,
    [goalId, numericAmount]
  );

  await execute(
    `UPDATE finance_savings_goals SET current_amount = current_amount + $1 WHERE id = $2`,
    [numericAmount, goalId]
  );

  res.json(successResponse({
    new_amount: Number(goal.current_amount) + numericAmount,
    message: 'Deposit recorded',
  }));
}));

// GET /categories — list available expense categories
router.get('/categories', authenticateTelegram, readLimiter, asyncHandler(async (_req: Request, res: Response) => {
  res.json(successResponse({ categories: DEFAULT_CATEGORIES }));
}));

export { router as financeRouter };
