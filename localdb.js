/**
 * LocalDB.js - A Local Database for JavaScript
 * 
 * A lightweight, in-browser database system that stores data in localStorage
 * with SQL syntax support.
 * 
 * @version 1.0.0
 * @license MIT
 * @author UO Soft
 * @email uosoft@uosoft.net
 * @repository https://github.com/yourusername/localdb
 * @homepage https://github.com/yourusername/localdb
 * 
 * MIT License
 * 
 * Copyright (c) UO Soft (uosoft@uosoft.net)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * =============================================================================
 * 
 * Features:
 * ✓ CREATE TABLE, INSERT, SELECT, UPDATE, DELETE
 * ✓ WHERE, ORDER BY, GROUP BY, HAVING
 * ✓ LIMIT, OFFSET, DISTINCT
 * ✓ INNER JOIN, LEFT JOIN, RIGHT JOIN, CROSS JOIN
 * ✓ WHERE conditions: =, !=, <>, >, <, >=, <=, LIKE, IN, BETWEEN, IS NULL
 * ✓ EXISTS, NOT EXISTS (with correlated subqueries)
 * ✓ Scalar functions: UPPER, LOWER, LENGTH, CONCAT
 * ✓ Data persistence in localStorage
 * 
 * Usage:
 * 
 *   const db = new LocalDB('myapp');
 *   
 *   // Create table
 *   db.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)');
 *   
 *   // Insert data
 *   db.execute("INSERT INTO users (id, name, age) VALUES (1, 'John', 30)");
 *   
 *   // Query data
 *   const results = db.execute('SELECT * FROM users WHERE age > 25 ORDER BY age DESC LIMIT 10');
 *   console.log(results);
 * 
 * =============================================================================
 */

class LocalDB {
  /**
   * Create a new LocalDB instance
   * @param {string} dbName - The name of the database (default: 'localDB')
   */
  constructor(dbName = 'localDB') {
    this.dbName = dbName;
    this.dbKey = `${dbName}_schema`;
    this.tables = this.loadSchema();
  }

  /**
   * Load schema from localStorage
   * @private
   * @returns {object} The schema object
   */
  loadSchema() {
    const schema = localStorage.getItem(this.dbKey);
    return schema ? JSON.parse(schema) : {};
  }

  /**
   * Save schema to localStorage
   * @private
   */
  saveSchema() {
    localStorage.setItem(this.dbKey, JSON.stringify(this.tables));
  }

  /**
   * Get the storage key for a table
   * @private
   * @param {string} tableName - The name of the table
   * @returns {string} The storage key
   */
  getTableKey(tableName) {
    return `${this.dbName}_${tableName}`;
  }

  /**
   * Get table data from localStorage
   * @private
   * @param {string} tableName - The name of the table
   * @returns {array} The table data
   */
  getTableData(tableName) {
    const data = localStorage.getItem(this.getTableKey(tableName));
    return data ? JSON.parse(data) : [];
  }

  /**
   * Save table data to localStorage
   * @private
   * @param {string} tableName - The name of the table
   * @param {array} data - The table data
   */
  saveTableData(tableName, data) {
    localStorage.setItem(this.getTableKey(tableName), JSON.stringify(data));
  }

  /**
   * Execute CREATE TABLE query
   * @private
   * @param {string} query - The SQL query
   * @returns {object} Result object
   */
  createTable(query) {
    const match = query.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\((.*)\)/i);
    if (!match) throw new Error('Invalid CREATE TABLE syntax');

    const tableName = match[1];
    const columnsStr = match[2];

    if (this.tables[tableName]) {
      throw new Error(`Table ${tableName} already exists`);
    }

    const columns = {};
    columnsStr.split(',').forEach(col => {
      const [name, ...typeParts] = col.trim().split(/\s+/);
      const type = typeParts.join(' ');
      columns[name] = type;
    });

    this.tables[tableName] = {
      columns: columns,
      primaryKey: this.extractPrimaryKey(columnsStr)
    };

    this.saveSchema();
    this.saveTableData(tableName, []);

    return { success: true, message: `Table ${tableName} created` };
  }

  /**
   * Extract PRIMARY KEY from column definition
   * @private
   * @param {string} columnsStr - The columns string
   * @returns {string|null} The primary key column name
   */
  extractPrimaryKey(columnsStr) {
    const match = columnsStr.match(/(\w+)\s+\w+\s+PRIMARY\s+KEY/i);
    return match ? match[1] : null;
  }

  /**
   * Execute INSERT query
   * @private
   * @param {string} query - The SQL query
   * @returns {object} Result object
   */
  insert(query) {
    const match = query.match(/INSERT\s+INTO\s+(\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/i);
    if (!match) throw new Error('Invalid INSERT syntax');

    const tableName = match[1];
    const columns = match[2].split(',').map(c => c.trim());
    const values = this.parseValues(match[3]);

    if (!this.tables[tableName]) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    const row = {};
    columns.forEach((col, index) => {
      row[col] = values[index];
    });

    const data = this.getTableData(tableName);
    data.push(row);
    this.saveTableData(tableName, data);

    return { success: true, message: `1 row inserted into ${tableName}` };
  }

  /**
   * Execute SELECT query
   * @private
   * @param {string} query - The SQL query
   * @returns {array} Query result
   */
  select(query) {
    // UNION を含むかチェック
    if (/\s+UNION\s+/i.test(query)) {
      return this.selectWithUnion(query);
    }

    // JOIN を含むかチェック
    if (/\s+JOIN\s+/i.test(query)) {
      return this.selectWithJoin(query);
    }

    // 派生テーブル（FROM句内のサブクエリ）を処理
    const derivedTableRegex = /FROM\s+\(\s*(SELECT\s+.+?)\s*\)\s+AS\s+(\w+)/i;
    const derivedTableMatch = query.match(derivedTableRegex);
    
    if (derivedTableMatch) {
      // サブクエリを実行
      const subquery = derivedTableMatch[1];
      const derivedTableName = derivedTableMatch[2];
      
      try {
        const subqueryResult = this.select(subquery);
        
        // 派生テーブルをメモリに一時保存
        const originalTableData = this.getTableData(derivedTableName);
        this.saveTableData(derivedTableName, subqueryResult);
        
        // 派生テーブル用のスキーマを一時作成
        const originalSchema = this.tables[derivedTableName];
        if (!this.tables[derivedTableName]) {
          const columns = {};
          if (subqueryResult.length > 0) {
            Object.keys(subqueryResult[0]).forEach(col => {
              columns[col] = 'TEXT';
            });
          }
          this.tables[derivedTableName] = { columns: columns, primaryKey: null };
        }
        
        // FROM句を派生テーブル名に置き換えたクエリを実行
        const modifiedQuery = query.replace(derivedTableRegex, `FROM ${derivedTableName}`);
        const result = this.select(modifiedQuery);
        
        // 派生テーブルをクリア
        localStorage.removeItem(this.getTableKey(derivedTableName));
        if (!originalSchema) {
          delete this.tables[derivedTableName];
        } else {
          this.tables[derivedTableName] = originalSchema;
          this.saveTableData(derivedTableName, originalTableData);
        }
        
        return result;
      } catch (error) {
        throw new Error(`Derived table error: ${error.message}`);
      }
    }

    const selectRegex = /SELECT\s+(DISTINCT\s+)?(.*?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+GROUP\s+BY\s+(.+?))?(?:\s+HAVING\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(.+))?$/i;
    const match = query.match(selectRegex);
    
    if (!match) throw new Error('Invalid SELECT syntax');

    const [, distinct, columns, tableName, whereClause, groupByClause, havingClause, orderByClause, limitClause] = match;

    if (!this.tables[tableName]) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    let data = this.getTableData(tableName);

    // WHERE句の処理
    if (whereClause) {
      data = data.filter(row => this.evaluateWhere(row, whereClause, tableName));
    }

    // GROUP BY の処理
    if (groupByClause) {
      data = this.groupBy(data, groupByClause, havingClause, tableName);
    }

    // ORDER BY の処理
    if (orderByClause) {
      data = this.orderBy(data, orderByClause);
    }

    // LIMIT, OFFSET の処理
    if (limitClause) {
      data = this.applyLimit(data, limitClause);
    }

    // DISTINCT の処理
    if (distinct) {
      data = this.applyDistinct(data, columns);
    }

    // カラム選択の処理
    if (columns.trim() !== '*') {
      const selectedColumns = columns.split(',').map(c => c.trim());
      data = data.map(row => {
        const selected = {};
        selectedColumns.forEach(col => {
          const colName = col.includes('.') ? col.split('.')[1] : col;
          selected[col] = this.evaluateExpression(col, row);
        });
        return selected;
      });
    }

    return data;
  }

  /**
   * Execute SELECT query with UNION
   * @private
   * @param {string} query - The SQL query
   * @returns {array} Query result
   */
  selectWithUnion(query) {
    // UNION ALL と UNION を区別
    const isUnionAll = /\s+UNION\s+ALL\s+/i.test(query);
    
    // UNIONで複数のSELECT文を分割
    const unionRegex = isUnionAll 
      ? /\s+UNION\s+ALL\s+/i 
      : /\s+UNION\s+/i;
    
    const selectQueries = query.split(unionRegex);
    
    if (selectQueries.length < 2) {
      throw new Error('Invalid UNION syntax');
    }

    // 各SELECT文を実行して結果を結合
    let results = [];
    
    selectQueries.forEach(selectQuery => {
      const subResults = this.select(selectQuery.trim());
      results = results.concat(subResults);
    });

    // UNION（UNION ALLでない場合）は重複を除外
    if (!isUnionAll) {
      results = this.applyDistinct(results, '*');
    }

    return results;
  }

  /**
   * Process GROUP BY clause
   * @private
   * @param {array} data - The data to group
   * @param {string} groupByClause - The GROUP BY clause
   * @param {string} havingClause - The HAVING clause
   * @param {string} tableName - The table name
   * @returns {array} Grouped data
   */
  groupBy(data, groupByClause, havingClause, tableName) {
    const groupColumns = groupByClause.split(',').map(c => c.trim());
    const groups = {};

    // グループを作成
    data.forEach(row => {
      const groupKey = groupColumns.map(col => {
        const colName = col.includes('.') ? col.split('.')[1] : col;
        return row[colName];
      }).join('|');

      if (!groups[groupKey]) {
        groups[groupKey] = {
          rows: [],
          keys: {}
        };
        groupColumns.forEach(col => {
          const colName = col.includes('.') ? col.split('.')[1] : col;
          groups[groupKey].keys[col] = row[colName];
        });
      }
      groups[groupKey].rows.push(row);
    });

    // グループごとに集計関数を計算
    const result = [];
    Object.values(groups).forEach(group => {
      const aggregated = { ...group.keys };
      
      // 集計関数の計算
      group.rows[0] && Object.keys(group.rows[0]).forEach(col => {
        if (!groupColumns.includes(col)) {
          aggregated[col] = group.rows[0][col];
        }
      });

      result.push(aggregated);
    });

    // HAVING句を適用
    if (havingClause) {
      return result.filter(row => this.evaluateWhere(row, havingClause, tableName));
    }

    return result;
  }

  /**
   * Process ORDER BY clause
   * @private
   * @param {array} data - The data to sort
   * @param {string} orderByClause - The ORDER BY clause
   * @returns {array} Sorted data
   */
  orderBy(data, orderByClause) {
    const parts = orderByClause.split(',').map(p => {
      const [col, dir] = p.trim().split(/\s+/);
      return { col: col.includes('.') ? col.split('.')[1] : col, dir: (dir || 'ASC').toUpperCase() };
    });

    return data.sort((a, b) => {
      for (let part of parts) {
        const valA = a[part.col];
        const valB = b[part.col];
        let cmp = 0;

        if (valA < valB) cmp = -1;
        else if (valA > valB) cmp = 1;

        if (cmp !== 0) {
          return part.dir === 'DESC' ? -cmp : cmp;
        }
      }
      return 0;
    });
  }

  /**
   * Apply LIMIT and OFFSET clauses
   * @private
   * @param {array} data - The data to limit
   * @param {string} limitClause - The LIMIT clause
   * @returns {array} Limited data
   */
  applyLimit(data, limitClause) {
    const parts = limitClause.split(',').map(p => parseInt(p.trim()));
    
    if (parts.length === 2) {
      // LIMIT offset, count
      const [offset, count] = parts;
      return data.slice(offset, offset + count);
    } else {
      // LIMIT count [OFFSET offset]
      const match = limitClause.match(/(\d+)(?:\s+OFFSET\s+(\d+))?/i);
      if (match) {
        const count = parseInt(match[1]);
        const offset = match[2] ? parseInt(match[2]) : 0;
        return data.slice(offset, offset + count);
      }
    }
    return data;
  }

  /**
   * Apply DISTINCT clause
   * @private
   * @param {array} data - The data to apply DISTINCT
   * @param {string} columns - The columns to check for distinctness
   * @returns {array} Distinct data
   */
  applyDistinct(data, columns) {
    if (columns.trim() === '*') {
      // すべてのカラムで重複排除
      const seen = new Set();
      return data.filter(row => {
        const key = JSON.stringify(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } else {
      // 指定されたカラムで重複排除
      const cols = columns.split(',').map(c => c.trim());
      const seen = new Set();
      return data.filter(row => {
        const key = cols.map(col => row[col]).join('|');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  }

  /**
   * Evaluate expression (function calls, etc.)
   * @private
   * @param {string} expr - The expression to evaluate
   * @param {object} row - The data row
   * @returns {*} The evaluation result
   */
  evaluateExpression(expr, row) {
    expr = expr.trim();

    // 集計関数
    const countMatch = expr.match(/COUNT\s*\(\s*\*\s*\)/i);
    if (countMatch) return row['COUNT(*)'] !== undefined ? row['COUNT(*)'] : 1;

    const countColMatch = expr.match(/COUNT\s*\(\s*(\w+)\s*\)/i);
    if (countColMatch) return row[countColMatch[0]] !== undefined ? row[countColMatch[0]] : 0;

    // スカラー関数
    const upperMatch = expr.match(/UPPER\s*\(\s*(\w+)\s*\)/i);
    if (upperMatch) {
      const col = upperMatch[1];
      return row[col] ? String(row[col]).toUpperCase() : null;
    }

    const lowerMatch = expr.match(/LOWER\s*\(\s*(\w+)\s*\)/i);
    if (lowerMatch) {
      const col = lowerMatch[1];
      return row[col] ? String(row[col]).toLowerCase() : null;
    }

    const lengthMatch = expr.match(/LENGTH\s*\(\s*(\w+)\s*\)/i);
    if (lengthMatch) {
      const col = lengthMatch[1];
      return row[col] ? String(row[col]).length : 0;
    }

    const concatMatch = expr.match(/CONCAT\s*\((.*)\)/i);
    if (concatMatch) {
      const parts = concatMatch[1].split(',').map(p => {
        const trimmed = p.trim();
        const colMatch = trimmed.match(/^(\w+)$/);
        if (colMatch) {
          return row[trimmed] || '';
        }
        return this.parseValue(trimmed);
      });
      return parts.join('');
    }

    // テーブル名.カラム名 形式の場合、カラム名のみを抽出
    if (expr.includes('.')) {
      const colName = expr.split('.')[1];
      return row[colName];
    }

    return row[expr];
  }

  /**
   * Execute SELECT query with JOIN
   * @private
   * @param {string} query - The SQL query
   * @returns {array} Query result
   */
  selectWithJoin(query) {
    const fromJoinMatch = query.match(
      /FROM\s+(\w+)\s+(INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|CROSS\s+JOIN|JOIN)\s+(\w+)(?:\s+ON\s+(.+?))?(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(.+))?$/i
    );

    if (!fromJoinMatch) throw new Error('Invalid JOIN syntax');

    const table1Name = fromJoinMatch[1];
    const joinType = fromJoinMatch[2].toUpperCase();
    const table2Name = fromJoinMatch[3];
    const onClause = fromJoinMatch[4];
    const whereClause = fromJoinMatch[5];
    const orderByClause = fromJoinMatch[6];
    const limitClause = fromJoinMatch[7];

    // CROSS JOIN以外はON句が必須
    if (!onClause && !joinType.includes('CROSS')) {
      throw new Error('ON clause is required for this JOIN type');
    }

    // SELECT句を取得
    const selectMatch = query.match(/SELECT\s+(.*?)\s+FROM/i);
    if (!selectMatch) throw new Error('Invalid SELECT syntax');
    const columns = selectMatch[1].trim();

    if (!this.tables[table1Name]) {
      throw new Error(`Table ${table1Name} does not exist`);
    }
    if (!this.tables[table2Name]) {
      throw new Error(`Table ${table2Name} does not exist`);
    }

    let data1 = this.getTableData(table1Name);
    let data2 = this.getTableData(table2Name);

    let joinedData = this.performJoin(data1, data2, table1Name, table2Name, onClause, joinType);

    // WHERE句を適用
    if (whereClause) {
      joinedData = joinedData.filter(row => this.evaluateWhere(row, whereClause));
    }

    // ORDER BY を処理
    if (orderByClause) {
      joinedData = this.orderBy(joinedData, orderByClause);
    }

    // LIMIT を処理
    if (limitClause) {
      joinedData = this.applyLimit(joinedData, limitClause);
    }

    // カラム選択を適用
    if (columns !== '*') {
      const selectedColumns = columns.split(',').map(c => c.trim());
      joinedData = joinedData.map(row => {
        const selected = {};
        selectedColumns.forEach(col => {
          selected[col] = row[col];
        });
        return selected;
      });
    }

    return joinedData;
  }

  /**
   * Perform the actual JOIN operation
   * @private
   * @param {array} data1 - First table data
   * @param {array} data2 - Second table data
   * @param {string} table1Name - First table name
   * @param {string} table2Name - Second table name
   * @param {string} onClause - The ON condition
   * @param {string} joinType - The type of JOIN
   * @returns {array} Joined data
   */
  performJoin(data1, data2, table1Name, table2Name, onClause, joinType) {
    const result = [];

    if (joinType === 'CROSS JOIN') {
      for (let row1 of data1) {
        for (let row2 of data2) {
          result.push(this.mergeRows(row1, row2, table1Name, table2Name));
        }
      }
      return result;
    }

    const onMatch = onClause.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/);
    if (!onMatch) throw new Error('Invalid ON clause syntax');

    const [, t1, col1, t2, col2] = onMatch;
    const table1 = t1.toLowerCase() === table1Name.toLowerCase() ? table1Name : table2Name;
    const table2 = t2.toLowerCase() === table1Name.toLowerCase() ? table1Name : table2Name;
    const key1 = t1.toLowerCase() === table1Name.toLowerCase() ? col1 : col2;
    const key2 = t2.toLowerCase() === table1Name.toLowerCase() ? col2 : col1;

    const data1Actual = table1 === table1Name ? data1 : data2;
    const data2Actual = table2 === table1Name ? data1 : data2;

    if (joinType === 'INNER JOIN' || joinType === 'JOIN') {
      for (let row1 of data1Actual) {
        for (let row2 of data2Actual) {
          if (row1[key1] == row2[key2]) {
            result.push(this.mergeRows(row1, row2, table1, table2));
          }
        }
      }
    } else if (joinType === 'LEFT JOIN') {
      for (let row1 of data1Actual) {
        let matched = false;
        for (let row2 of data2Actual) {
          if (row1[key1] == row2[key2]) {
            result.push(this.mergeRows(row1, row2, table1, table2));
            matched = true;
          }
        }
        if (!matched) {
          const nullRow2 = {};
          Object.keys(data2Actual[0] || {}).forEach(key => {
            nullRow2[key] = null;
          });
          result.push(this.mergeRows(row1, nullRow2, table1, table2));
        }
      }
    } else if (joinType === 'RIGHT JOIN') {
      for (let row2 of data2Actual) {
        let matched = false;
        for (let row1 of data1Actual) {
          if (row1[key1] == row2[key2]) {
            result.push(this.mergeRows(row1, row2, table1, table2));
            matched = true;
          }
        }
        if (!matched) {
          const nullRow1 = {};
          Object.keys(data1Actual[0] || {}).forEach(key => {
            nullRow1[key] = null;
          });
          result.push(this.mergeRows(nullRow1, row2, table1, table2));
        }
      }
    }

    return result;
  }

  /**
   * Merge two rows from different tables
   * @private
   * @param {object} row1 - First row
   * @param {object} row2 - Second row
   * @param {string} table1Name - First table name
   * @param {string} table2Name - Second table name
   * @returns {object} Merged row
   */
  mergeRows(row1, row2, table1Name, table2Name) {
    const merged = {};

    Object.keys(row1).forEach(key => {
      merged[`${table1Name}.${key}`] = row1[key];
    });

    Object.keys(row2).forEach(key => {
      merged[`${table2Name}.${key}`] = row2[key];
    });

    return merged;
  }

  /**
   * Execute UPDATE query
   * @private
   * @param {string} query - The SQL query
   * @returns {object} Result object
   */
  update(query) {
    const match = query.match(/UPDATE\s+(\w+)\s+SET\s+(.*?)(?:\s+WHERE\s+(.+))?$/i);
    if (!match) throw new Error('Invalid UPDATE syntax');

    const tableName = match[1];
    const setClause = match[2];
    const whereClause = match[3];

    if (!this.tables[tableName]) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    const updates = {};
    setClause.split(',').forEach(part => {
      const [col, val] = part.split('=').map(s => s.trim());
      updates[col] = this.parseValue(val);
    });

    let data = this.getTableData(tableName);
    let updatedCount = 0;

    data = data.map(row => {
      if (!whereClause || this.evaluateWhere(row, whereClause, tableName)) {
        Object.assign(row, updates);
        updatedCount++;
      }
      return row;
    });

    this.saveTableData(tableName, data);

    return { success: true, message: `${updatedCount} rows updated in ${tableName}` };
  }

  /**
   * Execute DELETE query
   * @private
   * @param {string} query - The SQL query
   * @returns {object} Result object
   */
  delete(query) {
    const match = query.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/i);
    if (!match) throw new Error('Invalid DELETE syntax');

    const tableName = match[1];
    const whereClause = match[2];

    if (!this.tables[tableName]) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    let data = this.getTableData(tableName);
    const initialCount = data.length;

    if (whereClause) {
      data = data.filter(row => !this.evaluateWhere(row, whereClause, tableName));
    } else {
      data = [];
    }

    const deletedCount = initialCount - data.length;
    this.saveTableData(tableName, data);

    return { success: true, message: `${deletedCount} rows deleted from ${tableName}` };
  }

  /**
   * Evaluate WHERE clause
   * @private
   * @param {object} row - The data row
   * @param {string} whereClause - The WHERE clause
   * @param {string} tableName - The table name
   * @returns {boolean} Evaluation result
   */
  evaluateWhere(row, whereClause, tableName = null) {
    // EXISTS または NOT EXISTS を検出
    const existsRegex = /(NOT\s+)?EXISTS\s*\((SELECT\s+.+?)\)(?=\s*(AND|OR|$))/i;
    const existsMatch = whereClause.match(existsRegex);

    if (existsMatch) {
      return this.evaluateExistsCondition(row, whereClause, existsMatch, tableName);
    }

    // IN/NOT INを括弧のネストに対応して保護
    const protectedConditions = [];
    let protectedIndex = 0;
    let processedClause = '';
    let i = 0;

    while (i < whereClause.length) {
      // IN または NOT IN を検出
      const inMatch = whereClause.substr(i).match(/^(\w+\s+(?:NOT\s+)?IN\s*\()/i);
      
      if (inMatch) {
        // 括弧の開始位置を見つける
        const parenStart = i + inMatch[0].length - 1;
        let parenDepth = 1;
        let j = parenStart + 1;

        // マッチする閉じ括弧を見つける
        while (j < whereClause.length && parenDepth > 0) {
          if (whereClause[j] === '(') parenDepth++;
          else if (whereClause[j] === ')') parenDepth--;
          j++;
        }

        // IN条件全体を保護
        const inCondition = whereClause.substring(i, j);
        protectedConditions.push(inCondition);
        processedClause += `__PROTECTED_${protectedIndex++}__`;
        i = j;
      } else {
        // IN/NOT INが見つからない場合は通常の文字をコピー
        processedClause += whereClause[i];
        i++;
      }
    }

    // 基本的な条件をAND/ORで分割
    const conditions = processedClause.split(/\s+(AND|OR)\s+/i);
    let result = true;
    let operator = 'AND';

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];

      if (condition.toUpperCase() === 'AND' || condition.toUpperCase() === 'OR') {
        operator = condition.toUpperCase();
        continue;
      }

      if (/EXISTS/i.test(condition)) {
        continue;
      }

      // 保護されていた条件を復元
      let actualCondition = condition.trim();
      for (let j = 0; j < protectedConditions.length; j++) {
        actualCondition = actualCondition.replace(`__PROTECTED_${j}__`, protectedConditions[j]);
      }

      const conditionResult = this.evaluateCondition(row, actualCondition, tableName);

      if (operator === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
    }

    return result;
  }

  /**
   * Evaluate EXISTS/NOT EXISTS conditions
   * @private
   * @param {object} row - The data row
   * @param {string} whereClause - The WHERE clause
   * @param {array} existsMatch - The regex match result
   * @param {string} tableName - The table name
   * @returns {boolean} Evaluation result
   */
  evaluateExistsCondition(row, whereClause, existsMatch, tableName) {
    const [fullMatch, notKeyword, subquery] = existsMatch;
    const isNotExists = notKeyword && notKeyword.trim().toUpperCase() === 'NOT';

    const subqueryWithValues = this.correlateSubquery(subquery, row, tableName);
    
    try {
      const subqueryResult = this.execute(subqueryWithValues);
      const exists = Array.isArray(subqueryResult) && subqueryResult.length > 0;

      const conditionResult = isNotExists ? !exists : exists;

      const remainingWhere = whereClause.replace(fullMatch, '').trim();
      
      if (remainingWhere) {
        const remainingResult = this.evaluateWhere(row, remainingWhere, tableName);
        return conditionResult && remainingResult;
      }

      return conditionResult;
    } catch (error) {
      throw new Error(`Subquery error: ${error.message}`);
    }
  }

  /**
   * Correlate subquery with outer query values
   * @private
   * @param {string} subquery - The subquery
   * @param {object} row - The outer row
   * @param {string} tableName - The table name
   * @returns {string} Correlated subquery
   */
  correlateSubquery(subquery, row, tableName) {
    let correlatedQuery = subquery;

    if (tableName) {
      Object.keys(row).forEach(col => {
        const pattern = new RegExp(`${tableName}\\.${col}\\b`, 'gi');
        correlatedQuery = correlatedQuery.replace(pattern, this.formatValue(row[col]));
      });
    }

    return correlatedQuery;
  }

  /**
   * Format value as SQL string
   * @private
   * @param {*} value - The value to format
   * @returns {string} Formatted value
   */
  formatValue(value) {
    if (value === null || value === undefined) {
      return 'NULL';
    } else if (typeof value === 'string') {
      return `'${value}'`;
    }
    return String(value);
  }

  /**
   * Evaluate a single condition
   * @private
   * @param {object} row - The data row
   * @param {string} condition - The condition
   * @param {string} tableName - The table name
   * @returns {boolean} Evaluation result
   */
  evaluateCondition(row, condition, tableName = null) {
    condition = condition.trim();

    // LIKE演算子
    const likeMatch = condition.match(/(\w+)\s+LIKE\s+(.+)/i);
    if (likeMatch) {
      const col = likeMatch[1];
      const pattern = this.parseValue(likeMatch[2]);
      const regex = new RegExp('^' + pattern.replace(/%/g, '.*').replace(/_/g, '.') + '$');
      return regex.test(String(row[col] || ''));
    }

    // NOT IN演算子（サブクエリ対応）★ INより先にチェック！
    const notInMatch = condition.match(/(\w+)\s+NOT\s+IN\s*\((.*?)\)(?:\s|$)/i);
    if (notInMatch) {
      const col = notInMatch[1];
      const innerContent = notInMatch[2].trim();
      
      // サブクエリかどうかを判定
      if (innerContent.toUpperCase().startsWith('SELECT')) {
        // サブクエリの場合
        try {
          const subqueryResult = this.execute(innerContent);
          const values = Array.isArray(subqueryResult) ? subqueryResult.map(r => {
            return Object.values(r)[0];
          }) : [subqueryResult];
          return !values.includes(row[col]);
        } catch (error) {
          throw new Error(`Subquery error in NOT IN: ${error.message}`);
        }
      } else {
        // 通常の値リストの場合
        const values = innerContent.split(',').map(v => this.parseValue(v.trim()));
        return !values.includes(row[col]);
      }
    }

    // IN演算子（サブクエリ対応）
    const inMatch = condition.match(/(\w+)\s+IN\s*\((.*?)\)(?:\s|$)/i);
    if (inMatch) {
      const col = inMatch[1];
      const innerContent = inMatch[2].trim();
      
      // サブクエリかどうかを判定
      if (innerContent.toUpperCase().startsWith('SELECT')) {
        // サブクエリの場合
        try {
          const subqueryResult = this.execute(innerContent);
          const values = Array.isArray(subqueryResult) ? subqueryResult.map(r => {
            // 結果の最初のカラム値を取得
            return Object.values(r)[0];
          }) : [subqueryResult];
          return values.includes(row[col]);
        } catch (error) {
          throw new Error(`Subquery error in IN: ${error.message}`);
        }
      } else {
        // 通常の値リストの場合
        const values = innerContent.split(',').map(v => this.parseValue(v.trim()));
        return values.includes(row[col]);
      }
    }

    // BETWEEN演算子
    const betweenMatch = condition.match(/(\w+)\s+BETWEEN\s+(.+?)\s+AND\s+(.+?)(?=\s*$)/i);
    if (betweenMatch) {
      const col = betweenMatch[1];
      const min = this.parseValue(betweenMatch[2]);
      const max = this.parseValue(betweenMatch[3]);
      return row[col] >= min && row[col] <= max;
    }

    // IS NULL / IS NOT NULL
    const isNullMatch = condition.match(/(\w+)\s+IS\s+(NOT\s+)?NULL/i);
    if (isNullMatch) {
      const col = isNullMatch[1];
      const isNotNull = isNullMatch[2] && isNullMatch[2].trim().toUpperCase() === 'NOT';
      const isNull = row[col] === null || row[col] === undefined;
      return isNotNull ? !isNull : isNull;
    }

    // 標準的な比較演算子（サブクエリ対応）
    const operators = ['>=', '<=', '!=', '<>', '=', '>', '<'];
    let op, col, val;

    for (const operator of operators) {
      if (condition.includes(operator)) {
        [col, val] = condition.split(operator).map(s => s.trim());
        op = operator;
        break;
      }
    }

    if (!op) return false;

    if (col.includes('.')) {
      col = col.split('.')[1];
    }

    // 右側がサブクエリかどうかを判定
    if (val.toUpperCase().startsWith('SELECT')) {
      try {
        const subqueryResult = this.execute(val);
        // スカラーサブクエリ（単一値を返す）
        if (Array.isArray(subqueryResult) && subqueryResult.length > 0) {
          // 最初のカラムの最初の値を使用
          val = Object.values(subqueryResult[0])[0];
        } else if (typeof subqueryResult === 'number' || typeof subqueryResult === 'string') {
          val = subqueryResult;
        } else {
          return false;
        }
      } catch (error) {
        throw new Error(`Subquery error: ${error.message}`);
      }
    } else {
      val = this.parseValue(val);
    }

    const rowValue = row[col];

    switch (op) {
      case '=':
        return rowValue == val;
      case '!= ':
      case '<>':
        return rowValue != val;
      case '>':
        return rowValue > val;
      case '<':
        return rowValue < val;
      case '>=':
        return rowValue >= val;
      case '<=':
        return rowValue <= val;
      default:
        return false;
    }
  }

  /**
   * Parse a single value
   * @private
   * @param {string} val - The value string
   * @returns {*} The parsed value
   */
  parseValue(val) {
    val = val.trim();
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      return val.slice(1, -1);
    }
    if (!isNaN(val) && val !== '') {
      return Number(val);
    }
    return val;
  }

  /**
   * Parse multiple values from a VALUES clause
   * @private
   * @param {string} valuesStr - The values string
   * @returns {array} Array of parsed values
   */
  parseValues(valuesStr) {
    const values = [];
    let current = '';
    let inString = false;
    let stringChar = '';

    for (let char of valuesStr) {
      if ((char === "'" || char === '"') && !inString) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (char === stringChar && inString) {
        inString = false;
        current += char;
      } else if (char === ',' && !inString) {
        values.push(this.parseValue(current));
        current = '';
      } else {
        current += char;
      }
    }

    if (current) {
      values.push(this.parseValue(current));
    }

    return values;
  }

  /**
   * Main method to execute SQL queries
   * 
   * @param {string} query - The SQL query to execute
   * @returns {*} The query result (array for SELECT, object for other operations)
   * @throws {Error} If the query is invalid or table doesn't exist
   * 
   * @example
   * // Create table
   * db.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)');
   * 
   * // Insert data
   * db.execute("INSERT INTO users (id, name, age) VALUES (1, 'John', 30)");
   * 
   * // Select data
   * const users = db.execute('SELECT * FROM users WHERE age > 25 ORDER BY age DESC LIMIT 10');
   * 
   * // Update data
   * db.execute("UPDATE users SET age = 31 WHERE id = 1");
   * 
   * // Delete data
   * db.execute("DELETE FROM users WHERE id = 1");
   */
  /**
   * Execute an SQL query
   * @param {string} query - The SQL query to execute
   * @returns {*} Query result
   * @throws {Error} If query is invalid or execution fails
   */
  execute(query) {
    try {
      query = query.trim();

      if (!query) {
        throw new Error('Query cannot be empty');
      }

      if (query.toUpperCase().startsWith('CREATE TABLE')) {
        return this.createTable(query);
      } else if (query.toUpperCase().startsWith('INSERT INTO')) {
        return this.insert(query);
      } else if (query.toUpperCase().startsWith('SELECT')) {
        return this.select(query);
      } else if (query.toUpperCase().startsWith('UPDATE')) {
        return this.update(query);
      } else if (query.toUpperCase().startsWith('DELETE')) {
        return this.delete(query);
      } else {
        throw new Error('Unknown SQL command. Supported commands: CREATE TABLE, INSERT, SELECT, UPDATE, DELETE');
      }
    } catch (error) {
      // Re-throw the error so it can be caught by the caller
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Get all table names in the database
   * @returns {array} Array of table names
   */
  getTables() {
    return Object.keys(this.tables);
  }

  /**
   * Clear all data from the database
   */
  clear() {
    this.getTables().forEach(table => {
      localStorage.removeItem(this.getTableKey(table));
    });
    localStorage.removeItem(this.dbKey);
    this.tables = {};
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LocalDB;
}
