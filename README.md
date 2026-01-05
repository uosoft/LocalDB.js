# LocalDB.js

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-brightgreen.svg)](https://www.javascript.com/)

> A lightweight, in-browser local database system with standard SQL syntax support.

**Copyright (c) 2024 UO Soft (uosoft@uosoft.net)**  
Licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

A lightweight, in-browser local database system with standard SQL syntax support. Store and query your data using familiar SQL commands, with data automatically persisted in localStorage.

## Features

✨ **SQL Support**
- `CREATE TABLE`, `INSERT`, `SELECT`, `UPDATE`, `DELETE`
- `WHERE`, `ORDER BY`, `GROUP BY`, `HAVING`
- `LIMIT`, `OFFSET`, `DISTINCT`
- `UNION`, `UNION ALL`
- `INNER JOIN`, `LEFT JOIN`, `RIGHT JOIN`, `CROSS JOIN`
- `EXISTS`, `NOT EXISTS` (correlated subqueries)
- **Subqueries**: IN, NOT IN, comparison operators, derived tables

🔍 **WHERE Operators**
- Comparison: `=`, `!=`, `<>`, `>`, `<`, `>=`, `<=`
- Pattern: `LIKE` (with `%` and `_` wildcards)
- Range: `BETWEEN`, `IN`, `NOT IN`
- Null: `IS NULL`, `IS NOT NULL`
- Logic: `AND`, `OR`

📊 **Functions**
- Aggregate: `COUNT()`, `SUM()`, `AVG()`, `MAX()`, `MIN()`
- String: `UPPER()`, `LOWER()`, `LENGTH()`, `CONCAT()`

💾 **Data Persistence**
- Automatic storage in `localStorage`
- Browser-compatible (no server required)
- Simple key-value schema storage

## Installation

### Direct Script Tag
```html
<script src="localdb.js"></script>
<script>
  const db = new LocalDB('myapp');
</script>
```

### NPM (if published)
```bash
npm install localdb
```

```javascript
const LocalDB = require('localdb');
const db = new LocalDB('myapp');
```

## Quick Start

### Create a Table
```javascript
const db = new LocalDB('myapp');

db.execute(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT,
    email TEXT,
    age INTEGER
  )
`);
```

### Insert Data
```javascript
db.execute("INSERT INTO users (id, name, email, age) VALUES (1, 'John Doe', 'john@example.com', 30)");
db.execute("INSERT INTO users (id, name, email, age) VALUES (2, 'Jane Smith', 'jane@example.com', 28)");
```

### Query Data
```javascript
// Basic SELECT
const all = db.execute('SELECT * FROM users');

// WITH WHERE
const adults = db.execute('SELECT * FROM users WHERE age >= 18');

// WITH ORDER BY and LIMIT
const top3 = db.execute('SELECT * FROM users ORDER BY age DESC LIMIT 3');

// WITH DISTINCT
const ages = db.execute('SELECT DISTINCT age FROM users');
```

### Update Data
```javascript
db.execute("UPDATE users SET age = 31 WHERE id = 1");
```

### Delete Data
```javascript
db.execute("DELETE FROM users WHERE id = 2");
```

## Advanced Examples

### WHERE Conditions
```javascript
// LIKE - text search
db.execute("SELECT * FROM users WHERE name LIKE 'J%'");

// IN - multiple values
db.execute("SELECT * FROM users WHERE age IN (25, 30, 35)");

// BETWEEN - range
db.execute("SELECT * FROM users WHERE age BETWEEN 25 AND 40");

// Multiple conditions
db.execute("SELECT * FROM users WHERE age > 25 AND name LIKE 'J%' OR age < 20");
```

### GROUP BY and Aggregation
```javascript
// Create orders table
db.execute(`
  CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    amount INTEGER
  )
`);

db.execute("INSERT INTO orders (id, user_id, amount) VALUES (1, 1, 100)");
db.execute("INSERT INTO orders (id, user_id, amount) VALUES (2, 1, 200)");
db.execute("INSERT INTO orders (id, user_id, amount) VALUES (3, 2, 150)");

// Count orders per user
const orderCounts = db.execute(`
  SELECT user_id, COUNT(*) as order_count
  FROM orders
  GROUP BY user_id
  HAVING COUNT(*) > 1
`);
```

### JOIN Queries
```javascript
// INNER JOIN - show users with their orders
const result = db.execute(`
  SELECT users.name, orders.amount
  FROM users
  INNER JOIN orders ON users.id = orders.user_id
`);

// LEFT JOIN - all users, even without orders
const allUsers = db.execute(`
  SELECT users.name, orders.amount
  FROM users
  LEFT JOIN orders ON users.id = orders.user_id
`);
```

### EXISTS Subquery
```javascript
// Find users who have made orders
const activeUsers = db.execute(`
  SELECT * FROM users
  WHERE EXISTS (
    SELECT 1 FROM orders
    WHERE orders.user_id = users.id
  )
`);

// Find users who have NOT made orders
const inactiveUsers = db.execute(`
  SELECT * FROM users
  WHERE NOT EXISTS (
    SELECT 1 FROM orders
    WHERE orders.user_id = users.id
  )
`);
```

### UNION Queries
```javascript
// Combine results from multiple tables (removes duplicates)
const combined = db.execute(`
  SELECT name, age FROM users
  UNION
  SELECT name, age FROM employees
`);

// Combine results with duplicates
const combinedWithDuplicates = db.execute(`
  SELECT name FROM users
  UNION ALL
  SELECT name FROM employees
`);

// Multiple tables with filtering
const result = db.execute(`
  SELECT id, name FROM users WHERE age > 30
  UNION
  SELECT id, name FROM employees WHERE salary > 50000
`);
```

### Subquery Examples
```javascript
// IN with subquery - find users who have made orders
const activeUsers = db.execute(`
  SELECT * FROM users
  WHERE id IN (SELECT user_id FROM orders)
`);

// NOT IN with subquery - find users who have NOT made orders
const inactiveUsers = db.execute(`
  SELECT * FROM users
  WHERE id NOT IN (SELECT user_id FROM orders)
`);

// Scalar subquery - find users older than average
const olderThanAverage = db.execute(`
  SELECT * FROM users
  WHERE age > (SELECT AVG(age) FROM users)
`);

// Comparison subquery
const result = db.execute(`
  SELECT * FROM orders
  WHERE amount > (SELECT AVG(amount) FROM orders)
`);

// Derived table (subquery in FROM clause)
const youngUsers = db.execute(`
  SELECT * FROM (
    SELECT * FROM users WHERE age < 30
  ) AS young_users
  ORDER BY age DESC
`);

// Multiple subqueries
const complexQuery = db.execute(`
  SELECT name FROM users
  WHERE age > (SELECT AVG(age) FROM users)
  AND id IN (SELECT user_id FROM orders WHERE amount > 1000)
`);
```

## API Reference

### Constructor
```javascript
const db = new LocalDB(dbName);
```
- `dbName` (string, optional): Name of the database. Default: `'localDB'`

### Methods

#### execute(query)
Execute a SQL query.
```javascript
const result = db.execute(query);
```
- **Returns**: Array for `SELECT`, Object for other operations
- **Throws**: Error if query is invalid

#### getTables()
Get all table names.
```javascript
const tables = db.getTables();
// Returns: ['users', 'orders', 'products']
```

#### clear()
Delete all data from the database.
```javascript
db.clear();
```

## Supported SQL Syntax

### CREATE TABLE
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT,
  age INTEGER
)
```

### INSERT
```sql
INSERT INTO users (id, name, age) VALUES (1, 'John', 30)
```

### SELECT (with all clauses)
```sql
SELECT DISTINCT name, age
FROM users
WHERE age > 25 AND status = 'active'
GROUP BY age
HAVING COUNT(*) > 2
ORDER BY age DESC
LIMIT 10 OFFSET 5
```

### UNION (combine results from multiple queries)
```sql
SELECT name, age FROM users
UNION
SELECT name, age FROM employees

-- or with UNION ALL (keeps duplicates)
SELECT name FROM users
UNION ALL
SELECT name FROM employees
```

### UPDATE
```sql
UPDATE users SET age = 31, status = 'updated' WHERE id = 1
```

### DELETE
```sql
DELETE FROM users WHERE id = 1
```

### JOIN
```sql
SELECT *
FROM users
INNER JOIN orders ON users.id = orders.user_id
WHERE orders.amount > 100
ORDER BY orders.date DESC
LIMIT 20
```

## Limitations

⚠️ **Known Limitations:**
- ❌ No transaction support
- ❌ No indexes (can be slow with large datasets)
- ❌ No complex calculations in SELECT
- ❌ No window functions
- ❌ localStorage size limit (~5-10MB depending on browser)
- ❌ Private browsing mode may not persist data

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ |
| Firefox | ✅ |
| Safari | ✅ |
| Edge | ✅ |
| IE 11 | ⚠️ (requires polyfills) |

## Performance Tips

1. **Use LIMIT** to restrict result sets
2. **Filter with WHERE** before sorting or grouping
3. **Avoid SELECT \*** for large tables - specify needed columns
4. **Use proper data types** in CREATE TABLE for better performance
5. **Consider pagination** for large result sets

## Learning Path

For best results, learn features in this order:

1. **Basic SELECT** - `SELECT * FROM tableName`
2. **WHERE** - Add filtering conditions
3. **ORDER BY / LIMIT** - Sort and limit results
4. **DISTINCT** - Remove duplicates
5. **JOIN** - Combine multiple tables
6. **GROUP BY** - Aggregate data
7. **UNION** - Combine multiple SELECT results
8. **Subqueries** - Use nested queries (IN, scalar, derived tables)
9. **EXISTS** - Use correlated subqueries

## Examples & Demo

Check out the `sample.html` file for an interactive demo with pre-built queries and a simple UI.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.0
- Initial release
- SQL support (SELECT, INSERT, UPDATE, DELETE, etc.)
- All major SQL operations (CRUD)
- JOIN and subquery support
- UNION and UNION ALL support
- localStorage persistence

## Credits

Created as an educational tool for learning SQL in JavaScript environments.

## Support

For issues and questions, please open an issue on GitHub.

---

**Made with ❤️ for SQL enthusiasts**
