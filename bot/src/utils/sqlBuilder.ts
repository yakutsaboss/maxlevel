/**
 * Shared SQL builder utilities for dynamic UPDATE queries.
 * Eliminates duplicated SET clause construction across route files.
 */

export interface BuildDynamicUpdateOptions {
  /** Raw SQL SET clauses appended after parameterized ones (e.g. ["updated_at = NOW()"]) */
  extraSetClauses?: string[];
  /** PostgreSQL type casts for specific columns (e.g. { custom_punishments: "jsonb" }) */
  casts?: Record<string, string>;
}

/**
 * Build a parameterized dynamic UPDATE SET clause.
 *
 * @param table - Table name (must be a known literal, NOT user input)
 * @param fields - Key-value pairs to SET (column → value)
 * @param whereClause - WHERE clause with $N placeholders (e.g. "id = $N")
 *                      The placeholder index is auto-calculated.
 * @param whereParams - Values for the WHERE clause placeholders
 * @param options - Optional extra SET clauses and type casts
 * @returns { text: full UPDATE SQL, values: all parameter values }
 * @throws Error if fields is empty and no extraSetClauses provided
 */
export function buildDynamicUpdate(
  table: string,
  fields: Record<string, unknown>,
  whereClause: string,
  whereParams: unknown[],
  options: BuildDynamicUpdateOptions = {},
): { text: string; values: unknown[] } {
  const { extraSetClauses = [], casts = {} } = options;
  const entries = Object.entries(fields);
  if (entries.length === 0 && extraSetClauses.length === 0) {
    throw new Error('No fields provided for update');
  }

  const values: unknown[] = [];
  const setClauses: string[] = [];
  let paramIndex = 1;

  for (const [key, value] of entries) {
    const cast = casts[key] ? `::${casts[key]}` : '';
    setClauses.push(`${key} = $${paramIndex}${cast}`);
    values.push(value);
    paramIndex++;
  }

  // Append any raw SET clauses (e.g. "updated_at = NOW()")
  setClauses.push(...extraSetClauses);

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
