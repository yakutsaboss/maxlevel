# Database Operations Workflow

## Objective
Perform database operations safely and efficiently using connection pooling, transaction management, and query helpers. This workflow covers testing connections, executing queries, and managing database transactions.

## Required Inputs
- **DATABASE_URL**: PostgreSQL connection string (from `.env`)
- **Query/Operation Type**: What database operation needs to be performed
- **Query Parameters**: Any parameters needed for parameterized queries (optional)

## Tools Used
- `tools/db_operations.py`

## Process

### 1. Test Database Connection
Before performing any operations, verify the database is accessible:

```bash
python tools/db_operations.py --test-connection
```

**Expected Output:**
- Connection status (success/failure)
- PostgreSQL version
- Number of tables in database

**When to use:**
- After environment setup
- When troubleshooting connection issues
- Before running complex operations
- As part of health checks

### 2. Execute SELECT Queries
To retrieve data from the database:

```bash
# Simple query
python tools/db_operations.py --query "SELECT * FROM users LIMIT 5"

# Parameterized query (safer for user input)
python tools/db_operations.py --query "SELECT * FROM users WHERE telegram_id = %s" --params '[123456]'
```

**When to use:**
- Inspecting database contents
- Debugging data issues
- Generating reports
- Testing query performance

### 3. Use in Other Python Tools
The primary use case is importing this module in other tools:

```python
from tools.db_operations import execute_query, execute_insert, execute_update, get_cursor

# Simple query
users = execute_query("SELECT * FROM users WHERE telegram_id = %s", (telegram_id,))

# Insert with returning
new_user = execute_insert(
    "INSERT INTO users (telegram_id, first_name) VALUES (%s, %s) RETURNING *",
    (telegram_id, first_name)
)

# Update
rows_affected = execute_update(
    "UPDATE users SET total_xp = total_xp + %s WHERE id = %s",
    (xp_amount, user_id)
)

# Complex transactions
from tools.db_operations import transaction
with transaction() as conn:
    with conn.cursor() as cur:
        cur.execute("INSERT INTO users ...")
        cur.execute("INSERT INTO user_modes ...")
    # Auto-commits if successful, rolls back on error
```

## Expected Output
- **Test Connection**: Success/failure status with database info
- **Query Execution**: JSON output of query results
- **In Python Tools**: Python data structures (dicts, lists, counts)

## Edge Cases

### 1. Connection Failures
**Symptoms:**
- "could not connect to server" errors
- Connection timeout

**Solutions:**
- Verify PostgreSQL is running
- Check DATABASE_URL format in `.env`
- Ensure database exists
- Check firewall/network settings
- Run `python tools/db_operations.py --test-connection` to diagnose

### 2. SQL Syntax Errors
**Symptoms:**
- "syntax error at or near" messages
- Query execution fails

**Solutions:**
- Test query in psql or pgAdmin first
- Check table/column names exist
- Verify SQL syntax for PostgreSQL (not MySQL/SQLite)
- Use parameterized queries with %s placeholders

### 3. Connection Pool Exhausted
**Symptoms:**
- "connection pool exhausted" errors
- Timeouts when getting connections

**Solutions:**
- Increase pool size (edit `maxconn` in get_connection_pool())
- Ensure connections are properly closed (use context managers)
- Check for connection leaks in other tools
- Call `close_pool()` when shutting down

### 4. Transaction Deadlocks
**Symptoms:**
- "deadlock detected" errors
- Operations hanging indefinitely

**Solutions:**
- Use explicit transactions with the `transaction()` context manager
- Keep transactions short and focused
- Access tables in consistent order
- Add appropriate indexes
- Use FOR UPDATE SKIP LOCKED for queue-like patterns

### 5. Parameterized Queries with Lists
**Problem:** Passing lists/arrays as parameters requires special handling

**Solution:**
```python
# For IN clauses
ids = [1, 2, 3, 4, 5]
placeholders = ','.join(['%s'] * len(ids))
query = f"SELECT * FROM users WHERE id IN ({placeholders})"
results = execute_query(query, tuple(ids))
```

### 6. Large Result Sets
**Problem:** Memory issues when fetching many rows

**Solution:**
- Use LIMIT and OFFSET for pagination
- Use cursors with `itersize` for streaming results
- Filter data at database level, not in Python

### 7. Special Data Types
**Problem:** JSON, arrays, timestamps need special handling

**Solution:**
```python
import json
from datetime import datetime

# JSON columns
data = execute_query("SELECT metadata FROM users WHERE id = %s", (user_id,), fetch='one')
metadata = json.loads(data['metadata']) if data else {}

# Array columns (PostgreSQL arrays)
from psycopg2.extras import Json
execute_insert(
    "INSERT INTO quest_log (user_id, data) VALUES (%s, %s)",
    (user_id, Json({'key': 'value'}))
)
```

## Performance Tips

1. **Use Connection Pooling**: Already built-in, no action needed
2. **Parameterized Queries**: Always use %s placeholders, never string formatting
3. **Batch Operations**: Use executemany() for bulk inserts
4. **Indexes**: Ensure indexes exist on frequently queried columns
5. **RETURNING Clause**: Use for inserts/updates when you need the modified rows
6. **Transaction Scope**: Keep transactions focused and short

## Security Best Practices

1. **Never Concatenate User Input**: Always use parameterized queries
2. **Least Privilege**: Database user should have minimal required permissions
3. **Environment Variables**: Store DATABASE_URL in .env, never in code
4. **Connection Pooling**: Prevents connection exhaustion attacks
5. **Query Logging**: Avoid logging sensitive data in production

## Maintenance

### Regular Tasks
- Monitor connection pool usage
- Check for slow queries in PostgreSQL logs
- Review and optimize indexes
- Clean up old data (if applicable)

### When to Update This Tool
- Add new helper functions for common patterns
- Optimize connection pool settings based on load
- Add query result caching if needed
- Implement read replicas if scaling required

## Related Workflows
- `user_manager.md` - Uses this tool for user operations
- `mode_manager.md` - Uses this tool for mode operations
- Database schema migrations (future workflow)
- Database backup/restore (future workflow)

## Learning Notes
- PostgreSQL uses `%s` for all parameter types (not %d, %i, etc.)
- RealDictCursor returns rows as dicts, not tuples
- Connection pooling is thread-safe but not process-safe
- Transactions auto-rollback on exceptions with context managers
- Always close cursors and return connections to pool (handled by context managers)
