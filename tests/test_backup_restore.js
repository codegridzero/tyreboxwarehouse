/**
 * Automated Test: Backup & Restore Verification
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlWasmPath = path.join(__dirname, '../assets/lib/sql-wasm.js');
const sqlWasmBinaryPath = path.join(__dirname, '../assets/lib/sql-wasm.wasm');

const initSqlJs = (await import('file://' + sqlWasmPath)).default || globalThis.initSqlJs;
const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(sqlWasmBinaryPath) });

console.log('=== TESTING JSON BACKUP & RESTORE INTEGRITY ===\n');

const db = new SQL.Database();
db.run('PRAGMA foreign_keys = ON;');

// Create sample tables
db.run("CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT);");
db.run("CREATE TABLE products (id INTEGER PRIMARY KEY, sku TEXT, name TEXT);");
db.run("CREATE TABLE inventory_transactions (id INTEGER PRIMARY KEY, product_id INTEGER, quantity INTEGER);");

db.run("INSERT INTO categories VALUES (1, 'Tires'), (2, 'Tubes');");
db.run("INSERT INTO products VALUES (1, 'TIR-900-20', '900-20 Tire'), (2, 'TUB-900-20', '900-20 Tube');");
db.run("INSERT INTO inventory_transactions VALUES (1, 1, 100), (2, 1, -20), (3, 1, 6);");

// Export JSON
const backupObj = {
    metadata: { app: 'Warehouse', version: '1.0.0', schemaVersion: 1 },
    data: {
        categories: query(db, "SELECT * FROM categories"),
        products: query(db, "SELECT * FROM products"),
        inventory_transactions: query(db, "SELECT * FROM inventory_transactions")
    }
};

function query(database, sql) {
    const stmt = database.prepare(sql);
    const res = [];
    while (stmt.step()) res.push(stmt.getAsObject());
    stmt.free();
    return res;
}

// Check exported data
console.log('Exported record counts:', {
    categories: backupObj.data.categories.length,
    products: backupObj.data.products.length,
    transactions: backupObj.data.inventory_transactions.length
});

if (backupObj.data.products.length !== 2) throw new Error('Export mismatch');

// Corrupt / Reset DB
db.run("DELETE FROM inventory_transactions;");
db.run("DELETE FROM products;");
db.run("DELETE FROM categories;");

if (query(db, "SELECT COUNT(*) AS c FROM products")[0].c !== 0) throw new Error('Reset failed');

// Restore from JSON
db.exec('BEGIN TRANSACTION;');
for (const cat of backupObj.data.categories) {
    db.run("INSERT INTO categories VALUES (?, ?);", [cat.id, cat.name]);
}
for (const prod of backupObj.data.products) {
    db.run("INSERT INTO products VALUES (?, ?, ?);", [prod.id, prod.sku, prod.name]);
}
for (const tx of backupObj.data.inventory_transactions) {
    db.run("INSERT INTO inventory_transactions VALUES (?, ?, ?);", [tx.id, tx.product_id, tx.quantity]);
}
db.exec('COMMIT;');

const restoredStock = query(db, "SELECT SUM(quantity) AS stock FROM inventory_transactions WHERE product_id = 1")[0].stock;
console.log('Restored stock sum:', restoredStock);

if (restoredStock !== 86) throw new Error('Restored stock does not match 86!');

console.log('✓ PASS: JSON Backup & Restore integrity verified successfully!\n');
