/**
 * Automated Test Suite for Drivers & Trucks Module
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load sql.js
const sqlWasmPath = path.join(__dirname, '../assets/lib/sql-wasm.js');
const sqlWasmBinaryPath = path.join(__dirname, '../assets/lib/sql-wasm.wasm');

const initSqlJs = (await import('file://' + sqlWasmPath)).default || globalThis.initSqlJs;

const SQL = await initSqlJs({
    wasmBinary: fs.readFileSync(sqlWasmBinaryPath)
});

console.log('=== TESTING DRIVERS & TRUCKS MODULE ===\n');

const db = new SQL.Database();
db.run('PRAGMA foreign_keys = ON;');

// 1. Initialize schema
const schemaSQL = `
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_type TEXT NOT NULL,
        product_number TEXT NOT NULL,
        vehicle_name TEXT NOT NULL,
        position TEXT NOT NULL,
        strength TEXT NOT NULL,
        category TEXT NOT NULL,
        manufacturer TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        license_number TEXT,
        active INTEGER DEFAULT 1,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS trucks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        registration_number TEXT,
        driver_id INTEGER,
        active INTEGER DEFAULT 1,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
    );
`;
db.exec(schemaSQL);

// 2. Helper query function
function query(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

// 3. Insert Driver 1 with Truck
db.run(`
    INSERT INTO drivers (name, phone, license_number, active, notes)
    VALUES (?, ?, ?, ?, ?)
`, ['Muhammad Ali', '0300-1234567', 'LIC-98721', 1, 'Main north route']);

const d1Result = query('SELECT last_insert_rowid() AS id');
const d1Id = d1Result[0].id;

db.run(`
    INSERT INTO trucks (name, registration_number, driver_id, active, notes)
    VALUES (?, ?, ?, ?, ?)
`, ['Truck 1 (Hino 5T)', 'LES-24-1029', d1Id, 1, 'Primary truck']);

// 4. Insert Driver 2 without Truck
db.run(`
    INSERT INTO drivers (name, phone, license_number, active, notes)
    VALUES (?, ?, ?, ?, ?)
`, ['Tariq Mahmood', '0321-7654321', 'CNIC-35201-1234567-1', 1, 'Backup relief driver']);

// 5. Query Drivers & Trucks
const list = query(`
    SELECT 
        d.id,
        d.name,
        d.phone,
        d.license_number,
        d.active,
        d.notes,
        t.id AS truck_id,
        t.name AS truck_name,
        t.registration_number AS truck_registration
    FROM drivers d
    LEFT JOIN trucks t ON t.driver_id = d.id
    ORDER BY d.id DESC
`);

console.log('Drivers & Trucks list from DB:', list);

if (list.length !== 2) {
    throw new Error(`Expected 2 drivers, got ${list.length}`);
}

const driver1 = list.find(d => d.name === 'Muhammad Ali');
if (!driver1 || driver1.truck_name !== 'Truck 1 (Hino 5T)' || driver1.truck_registration !== 'LES-24-1029') {
    throw new Error('Driver 1 data mismatch: ' + JSON.stringify(driver1));
}

const driver2 = list.find(d => d.name === 'Tariq Mahmood');
if (!driver2 || driver2.truck_name !== null || driver2.license_number !== 'CNIC-35201-1234567-1') {
    throw new Error('Driver 2 data mismatch: ' + JSON.stringify(driver2));
}

// 6. Test Driver Update & Toggle
db.run(`
    UPDATE drivers SET
        name = ?,
        phone = ?,
        license_number = ?,
        active = 0,
        notes = ?
    WHERE id = ?
`, ['Muhammad Ali Khan', '0300-9999999', 'LIC-98721-REV', 'Updated route remarks', d1Id]);

const updatedD1 = query('SELECT * FROM drivers WHERE id = ?', [d1Id])[0];
if (updatedD1.name !== 'Muhammad Ali Khan' || updatedD1.active !== 0) {
    throw new Error('Driver update failed: ' + JSON.stringify(updatedD1));
}

// 7. Test Deletion
db.run('DELETE FROM trucks WHERE driver_id = ?', [d1Id]);
db.run('DELETE FROM drivers WHERE id = ?', [d1Id]);

const remaining = query('SELECT * FROM drivers');
if (remaining.length !== 1 || remaining[0].name !== 'Tariq Mahmood') {
    throw new Error('Driver delete failed: ' + JSON.stringify(remaining));
}

console.log('\n✓ PASS: All Drivers & Trucks database operations verified successfully!\n');
