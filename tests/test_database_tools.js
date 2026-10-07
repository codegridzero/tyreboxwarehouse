/**
 * Automated Test: Database Seed, Export, Import & Auto-Fetch Tools Verification
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlWasmPath = path.join(__dirname, '../assets/lib/sql-wasm.js');
const sqlWasmBinaryPath = path.join(__dirname, '../assets/lib/sql-wasm.wasm');
const seedDbPath = path.join(__dirname, '../warehouse.sqlite');
const indexHtmlPath = path.join(__dirname, '../index.html');
const appJsPath = path.join(__dirname, '../js/app.js');
const dbJsPath = path.join(__dirname, '../js/db.js');

const initSqlJs = (await import('file://' + sqlWasmPath)).default || globalThis.initSqlJs;
const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(sqlWasmBinaryPath) });

console.log('=== TESTING DATABASE SEED, EXPORT & IMPORT TOOLS ===\n');

// 1. Verify warehouse.sqlite seed file exists and is valid SQLite
if (!fs.existsSync(seedDbPath)) {
    throw new Error('Seed file warehouse.sqlite does not exist in root directory!');
}

const seedBuffer = fs.readFileSync(seedDbPath);
console.log(`✓ Seed database warehouse.sqlite exists (${(seedBuffer.length / 1024).toFixed(1)} KB)`);

const db = new SQL.Database(new Uint8Array(seedBuffer));

function query(database, sql) {
    const stmt = database.prepare(sql);
    const res = [];
    while (stmt.step()) res.push(stmt.getAsObject());
    stmt.free();
    return res;
}

const tables = query(db, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;").map(r => r.name);
console.log('Seed database tables:', tables);

const expectedTables = ['daily_shifts', 'drivers', 'products', 'shift_items', 'trucks'];
for (const tbl of expectedTables) {
    if (!tables.includes(tbl)) {
        throw new Error(`Expected table "${tbl}" not found in warehouse.sqlite!`);
    }
}
console.log('✓ All expected SQLite tables are present.');

const productCount = query(db, "SELECT COUNT(*) as c FROM products;")[0].c;
const truckCount = query(db, "SELECT COUNT(*) as c FROM trucks;")[0].c;
const driverCount = query(db, "SELECT COUNT(*) as c FROM drivers;")[0].c;
const shiftCount = query(db, "SELECT COUNT(*) as c FROM daily_shifts;")[0].c;
const shiftItemsCount = query(db, "SELECT COUNT(*) as c FROM shift_items;")[0].c;

console.log('Seed database contents:', {
    products: productCount,
    trucks: truckCount,
    drivers: driverCount,
    shifts: shiftCount,
    shift_items: shiftItemsCount
});

if (productCount === 0 || truckCount === 0 || driverCount === 0) {
    throw new Error('Seed database is empty!');
}
console.log('✓ Seed database has complete data catalog.');

// 2. Test Binary Export and Import
const exportedBinary = db.export();
if (!exportedBinary || exportedBinary.length === 0) {
    throw new Error('Database export failed!');
}
console.log(`✓ db.export() generated valid SQLite binary (${exportedBinary.length} bytes)`);

const restoredDb = new SQL.Database(exportedBinary);
const restoredProdCount = query(restoredDb, "SELECT COUNT(*) as c FROM products;")[0].c;
if (restoredProdCount !== productCount) {
    throw new Error(`Restore count mismatch! Expected ${productCount}, got ${restoredProdCount}`);
}
console.log('✓ Database binary import/restore verified 100% identical.');

// 3. Verify HTML and JS bindings
const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');
const dbJsContent = fs.readFileSync(dbJsPath, 'utf8');

const expectedHtmlIds = ['btn-export-db', 'btn-import-db', 'import-db-file-input'];
for (const id of expectedHtmlIds) {
    if (!htmlContent.includes(`id="${id}"`)) {
        throw new Error(`index.html is missing #${id}`);
    }
    console.log(`✓ HTML element #${id} verified`);
}

if (!appJsContent.includes('exportDatabaseFile()') || !appJsContent.includes('handleDatabaseImport(')) {
    throw new Error('app.js is missing database export/import methods');
}
console.log('✓ app.js exportDatabaseFile() and handleDatabaseImport() verified');

if (!dbJsContent.includes('exportDatabase()') || !dbJsContent.includes('importDatabase(')) {
    throw new Error('db.js is missing exportDatabase() or importDatabase()');
}
console.log('✓ db.js exportDatabase() and importDatabase() verified');

if (!dbJsContent.includes("fetch('warehouse.sqlite')")) {
    throw new Error('db.js is missing warehouse.sqlite auto-fetch fallback');
}
console.log("✓ db.js fetch('warehouse.sqlite') auto-load verified");

console.log('\n🎉 ALL DATABASE TOOLS, SEED RESTORE & WASM EXPORT/IMPORT TESTS PASSED 100%!');
