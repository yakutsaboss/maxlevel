/**
 * Shared SQL builder utilities for dynamic UPDATE queries.
 * Eliminates duplicated SET clause construction across route files.
 */

/**
 * Build a parameterized dynamic UPDATE SET clause.
 *
 * @param table - Table name (must be a known literal, NOT user input)
 * @param fields - Key-value pairs to SET (column → value)
 * @param whereClause - WHERE clause with $N placeholders (e.g. "id = $N")
 *                      The placeholder index is auto-calculated.
 * @param whereParams - Values for the WHERE clause placeholders
 * @returns { text: full UPDATE SQL, values: all parameter values }
 * @throws Error if fields is empty
 */
export function buildDynamicUpdate(
  table: string,
  fields: Record<string, unknown>,
  whereClause: string,
  whereParams: unknown[],
): { text: string; values: unknown[] } {
  const entries = Object.entries(fields);
  if (entries.length === 0) {
    throw new Error('No fields provided for update');
  }

  const values: unknown[] = [];
  const setClauses: string[] = [];
  let paramIndex = 1;

  for (const [key, value] of entries) {
    setClauses.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  }

  // Replace $N placeholders in whereClause with correct indices
  let resolvedWhere = whereClause;
  for (const wp of whereParams) {
    resolvedWhere = resolvedWhere.replace('$N', `$${paramIndex}`);
    values.push(wp);
    paramIndex++;
  }

  const text = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${resolvedWhere}`;

  return { text, values };
}
