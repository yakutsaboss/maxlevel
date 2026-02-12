import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../../utils/db.js';
import { asyncHandler, successResponse } from '../utils/errors.js';

const router = Router();

/** Default expense categories for budget tracking */
const DEFAULT_CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Entertainment',
  'Health', 'Education', 'Shopping', 'Bills', 'Other',
];

// GET /budget/:userId — get budget summary for the current month
router.get('/budget/:userId', asyncHandler(async (req: Request, res: Response) => {
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
router.post('/budget', asyncHandler(async (req: Request, res: Response) => {
  const { userId, category, amount, type } = req.body as {
    userId: number;
    category: string;
    amount: number;
    type: 'income' | 'expense';
  };

  if (!userId || !category || !amount || !type) {
    res.status(400).json({ success: false, message: 'Missing required fields: userId, category, amount, type' });
    return;
  }

  if (type !== 'income' && type !== 'expense') {
    res.status(400).json({ success: false, message: 'Type must be "income" or "expense"' });
    return;
  }

  await execute(
    `INSERT INTO finance_budget_entries (user_id, category, amount, type)
     VALUES ($1, $2, $3, $4)`,
    [userId, category, amount, type]
  );

  res.json(successResponse({ message: 'Budget entry created' }));
}));

// GET /savings/:userId — get all savings goals for a user
router.get('/savings/:userId', asyncHandler(async (req: Request, res: Response) => {
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
router.post('/savings', asyncHandler(async (req: Request, res: Response) => {
  const { userId, name, targetAmount } = req.body as {
    userId: number;
    name: string;
    targetAmount: number;
  };

  if (!userId || !name || !targetAmount) {
    res.status(400).json({ success: false, message: 'Missing required fields: userId, name, targetAmount' });
    return;
  }

  const goal = await queryOne<{ id: number }>(
    `INSERT INTO finance_savings_goals (user_id, name, target_amount, current_amount)
     VALUES ($1, $2, $3, 0)
     RETURNING id`,
    [userId, name, targetAmount]
  );

  res.json(successResponse({ id: goal?.id, message: 'Savings goal created' }));
}));

// PATCH /savings/:id — add a deposit to update savings progress
router.patch('/savings/:id', asyncHandler(async (req: Request, res: Response) => {
  const goalId = parseInt(req.params.id);
  const { amount } = req.body as { amount: number };

  if (!amount || amount <= 0) {
    res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    return;
  }

  // Verify goal exists
  const goal = await queryOne<{ id: number; current_amount: number }>(
    `SELECT id, current_amount FROM finance_savings_goals WHERE id = $1`,
    [goalId]
  );

  if (!goal) {
    res.status(404).json({ success: false, message: 'Savings goal not found' });
    return;
  }

  // Record deposit and update current amount
  await execute(
    `INSERT INTO finance_savings_deposits (goal_id, amount) VALUES ($1, $2)`,
    [goalId, amount]
  );

  await execute(
    `UPDATE finance_savings_goals SET current_amount = current_amount + $1 WHERE id = $2`,
    [amount, goalId]
  );

  res.json(successResponse({
    new_amount: Number(goal.current_amount) + amount,
    message: 'Deposit recorded',
  }));
}));

// GET /categories — list available expense categories
router.get('/categories', asyncHandler(async (_req: Request, res: Response) => {
  res.json(successResponse({ categories: DEFAULT_CATEGORIES }));
}));

export { router as financeRouter };
