# LocalDB.js

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-brightgreen.svg)](https://www.javascript.com/)

> 標準的なSQL構文に対応した、軽量でシンプルなブラウザ用ローカルデータベースシステム。

**著作権 (c) UO Soft (uosoft@uosoft.net)**  
MITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

---

標準的なSQL構文に対応した、軽量でシンプルなブラウザ用ローカルデータベースシステムです。おなじみのSQLコマンドを使ってデータを保存・検索でき、すべてのデータはlocalStorageに自動的に保存されます。

## 機能

✨ **SQLサポート**
- `CREATE TABLE`、`INSERT`、`SELECT`、`UPDATE`、`DELETE`
- `WHERE`、`ORDER BY`、`GROUP BY`、`HAVING`
- `LIMIT`、`OFFSET`、`DISTINCT`
- `UNION`、`UNION ALL`
- `INNER JOIN`、`LEFT JOIN`、`RIGHT JOIN`、`CROSS JOIN`
- `EXISTS`、`NOT EXISTS`（相関サブクエリ）
- **サブクエリ**: IN、NOT IN、比較演算子、派生テーブル

🔍 **WHERE句の演算子**
- 比較: `=`、`!=`、`<>`、`>`、`<`、`>=`、`<=`
- パターン: `LIKE`（`%`と`_`ワイルドカード対応）
- 範囲: `BETWEEN`、`IN`、`NOT IN`
- NULL: `IS NULL`、`IS NOT NULL`
- 論理: `AND`、`OR`

📊 **関数**
- 集約: `COUNT()`、`SUM()`、`AVG()`、`MAX()`、`MIN()`
- 文字列: `UPPER()`、`LOWER()`、`LENGTH()`、`CONCAT()`

💾 **データ永続化**
- `localStorage`に自動的に保存
- ブラウザ互換（サーバー不要）
- シンプルなキー値スキーマ保存

## インストール

### スクリプトタグを使う方法
```html
<script src="localdb.js"></script>
<script>
  const db = new LocalDB('myapp');
</script>
```

### NPM（公開予定）
```bash
npm install localdb
```

```javascript
const LocalDB = require('localdb');
const db = new LocalDB('myapp');
```

## クイックスタート

### テーブルを作成する
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

### データを挿入する
```javascript
db.execute("INSERT INTO users (id, name, email, age) VALUES (1, 'John Doe', 'john@example.com', 30)");
db.execute("INSERT INTO users (id, name, email, age) VALUES (2, 'Jane Smith', 'jane@example.com', 28)");
```

### データをクエリする
```javascript
// 基本的なSELECT
const all = db.execute('SELECT * FROM users');

// WHERE句付き
const adults = db.execute('SELECT * FROM users WHERE age >= 18');

// ORDER BYとLIMIT付き
const top3 = db.execute('SELECT * FROM users ORDER BY age DESC LIMIT 3');

// DISTINCT付き
const ages = db.execute('SELECT DISTINCT age FROM users');
```

### データを更新する
```javascript
db.execute("UPDATE users SET age = 31 WHERE id = 1");
```

### データを削除する
```javascript
db.execute("DELETE FROM users WHERE id = 2");
```

## 高度な使用例

### WHERE条件
```javascript
// LIKE - テキスト検索
db.execute("SELECT * FROM users WHERE name LIKE 'J%'");

// IN - 複数の値
db.execute("SELECT * FROM users WHERE age IN (25, 30, 35)");

// BETWEEN - 範囲
db.execute("SELECT * FROM users WHERE age BETWEEN 25 AND 40");

// 複数条件
db.execute("SELECT * FROM users WHERE age > 25 AND name LIKE 'J%' OR age < 20");
```

### GROUP BYと集計
```javascript
// ordersテーブルを作成
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

// ユーザーごとの注文数をカウント
const orderCounts = db.execute(`
  SELECT user_id, COUNT(*) as order_count
  FROM orders
  GROUP BY user_id
  HAVING COUNT(*) > 1
`);
```

### JOINクエリ
```javascript
// INNER JOIN - ユーザーと注文情報を表示
const result = db.execute(`
  SELECT users.name, orders.amount
  FROM users
  INNER JOIN orders ON users.id = orders.user_id
`);

// LEFT JOIN - すべてのユーザーを表示（注文がない場合も含む）
const allUsers = db.execute(`
  SELECT users.name, orders.amount
  FROM users
  LEFT JOIN orders ON users.id = orders.user_id
`);
```

### EXISTSサブクエリ
```javascript
// 注文したユーザーを検索
const activeUsers = db.execute(`
  SELECT * FROM users
  WHERE EXISTS (
    SELECT 1 FROM orders
    WHERE orders.user_id = users.id
  )
`);

// 注文していないユーザーを検索
const inactiveUsers = db.execute(`
  SELECT * FROM users
  WHERE NOT EXISTS (
    SELECT 1 FROM orders
    WHERE orders.user_id = users.id
  )
`);
```

### UNIONクエリ
```javascript
// 複数のテーブルから結果を結合（重複を削除）
const combined = db.execute(`
  SELECT name, age FROM users
  UNION
  SELECT name, age FROM employees
`);

// 重複を保持して結果を結合
const combinedWithDuplicates = db.execute(`
  SELECT name FROM users
  UNION ALL
  SELECT name FROM employees
`);

// 複数のテーブルをフィルタリングして結合
const result = db.execute(`
  SELECT id, name FROM users WHERE age > 30
  UNION
  SELECT id, name FROM employees WHERE salary > 50000
`);
```

### サブクエリの例
```javascript
// IN付きサブクエリ - 注文したユーザーを検索
const activeUsers = db.execute(`
  SELECT * FROM users
  WHERE id IN (SELECT user_id FROM orders)
`);

// NOT IN付きサブクエリ - 注文していないユーザーを検索
const inactiveUsers = db.execute(`
  SELECT * FROM users
  WHERE id NOT IN (SELECT user_id FROM orders)
`);

// スカラーサブクエリ - 平均年齢より年上のユーザーを検索
const olderThanAverage = db.execute(`
  SELECT * FROM users
  WHERE age > (SELECT AVG(age) FROM users)
`);

// 比較サブクエリ
const result = db.execute(`
  SELECT * FROM orders
  WHERE amount > (SELECT AVG(amount) FROM orders)
`);

// 派生テーブル（FROM句のサブクエリ）
const youngUsers = db.execute(`
  SELECT * FROM (
    SELECT * FROM users WHERE age < 30
  ) AS young_users
  ORDER BY age DESC
`);

// 複数のサブクエリ
const complexQuery = db.execute(`
  SELECT name FROM users
  WHERE age > (SELECT AVG(age) FROM users)
  AND id IN (SELECT user_id FROM orders WHERE amount > 1000)
`);
```

## APIリファレンス

### コンストラクタ
```javascript
const db = new LocalDB(dbName);
```
- `dbName`（文字列、オプション）: データベースの名前。デフォルト: `'localDB'`

### メソッド

#### execute(query)
SQLクエリを実行します。
```javascript
const result = db.execute(query);
```
- **戻り値**: `SELECT`の場合は配列、他の操作の場合はオブジェクト
- **例外**: クエリが無効な場合エラーをスロー

#### getTables()
すべてのテーブル名を取得します。
```javascript
const tables = db.getTables();
// 戻り値: ['users', 'orders', 'products']
```

#### clear()
データベースからすべてのデータを削除します。
```javascript
db.clear();
```

## サポートしているSQL構文

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

### SELECT（すべての句対応）
```sql
SELECT DISTINCT name, age
FROM users
WHERE age > 25 AND status = 'active'
GROUP BY age
HAVING COUNT(*) > 2
ORDER BY age DESC
LIMIT 10 OFFSET 5
```

### UNION（複数のクエリから結果を結合）
```sql
SELECT name, age FROM users
UNION
SELECT name, age FROM employees

-- または UNION ALL（重複を保持）
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

## 制限事項

⚠️ **既知の制限事項:**
- ❌ トランザクションサポートなし
- ❌ インデックスなし（大規模なデータセットは遅い場合がある）
- ❌ SELECTでの複雑な計算なし
- ❌ ウィンドウ関数なし
- ❌ localStorageサイズ制限（ブラウザ依存で約5～10MB）
- ❌ プライベートブラウジングモードではデータが永続化されない場合がある

## ブラウザサポート

| ブラウザ | サポート |
|---------|---------|
| Chrome | ✅ |
| Firefox | ✅ |
| Safari | ✅ |
| Edge | ✅ |
| IE 11 | ⚠️ (ポリフィルが必要) |

## パフォーマンスのコツ

1. **LIMITを使う** - 結果セットを制限する
2. **WHERE句でフィルタリング** - ソートやグループ化の前に
3. **SELECT \*を避ける** - 大きなテーブルの場合は必要な列を指定
4. **適切なデータ型を使う** - CREATE TABLEで良いパフォーマンスを実現
5. **ページネーションを検討** - 大きな結果セットの場合

## 学習パス

最良の結果を得るため、以下の順序で機能を学ぶことを推奨します:

1. **基本的なSELECT** - `SELECT * FROM tableName`
2. **WHERE** - フィルタリング条件を追加
3. **ORDER BY / LIMIT** - 結果のソートと件数制限
4. **DISTINCT** - 重複を削除
5. **JOIN** - 複数のテーブルを結合
6. **GROUP BY** - データを集計
7. **UNION** - 複数のSELECT結果を結合
8. **サブクエリ** - ネストされたクエリを使用（IN、スカラー、派生テーブル）
9. **EXISTS** - 相関サブクエリを使用

## 例とデモ

インタラクティブなデモについては、`sample.html`ファイルをご覧ください。事前に作成されたクエリとシンプルなUIが含まれています。

## 貢献

貢献を歓迎します。プルリクエストを送信してください。

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 変更履歴

### v1.0.0
- 初期リリース
- SQL サポート（SELECT、INSERT、UPDATE、DELETE等）
- すべての主要SQL操作（CRUD）
- JOINとサブクエリのサポート
- UNIONとUNION ALLのサポート
- localStorage永続化

## クレジット

JavaScriptでSQLを学ぶための教育用ツールとして作成されました。

## サポート

問題や質問がある場合は、GitHubでissueを開いてください。

---

**SQLに情熱を持つ皆さんのために❤️で作成**
