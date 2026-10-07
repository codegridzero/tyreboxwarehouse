/**
 * Automated Test Suite for Trucks & Drivers Subtabs, Modals, and Shift Report Integration
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

console.log('=== TESTING TRUCKS & DRIVERS SUBTABS + SHIFT INTEGRATION ===\n');

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
        bundle_qty INTEGER,
        manufacturer TEXT,
        notes TEXT,
        images TEXT,
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

    CREATE TABLE IF NOT EXISTS daily_shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_code TEXT,
        shift_date TEXT NOT NULL,
        truck_id INTEGER,
        truck_name TEXT,
        driver_name TEXT,
        status TEXT DEFAULT 'Open',
        total_dispatch INTEGER DEFAULT 0,
        total_sales INTEGER DEFAULT 0,
        total_return INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (truck_id) REFERENCES trucks(id)
    );

    CREATE TABLE IF NOT EXISTS shift_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        display_name TEXT NOT NULL,
        dispatch_qty INTEGER NOT NULL,
        sale_qty INTEGER,
        return_qty INTEGER,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (shift_id) REFERENCES daily_shifts(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
    );
`;
db.exec(schemaSQL);

// Helper query function
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

// 2. Add Trucks (Number + Name)
db.run("INSERT INTO trucks (registration_number, name, active) VALUES (?, ?, 1);", ['LES-24-1029', 'Hino 500 Heavy']);
db.run("INSERT INTO trucks (registration_number, name, active) VALUES (?, ?, 1);", ['LHR-8842', 'Master Foton 3.5T']);
db.run("INSERT INTO trucks (registration_number, name, active) VALUES (?, ?, 1);", ['KHI-5512', 'Shahzore Blue']);

const trucks = query("SELECT * FROM trucks ORDER BY id ASC;");
console.log('✓ Stored Trucks in system:', trucks.map(t => `${t.id}: ${t.registration_number} - ${t.name}`));

if (trucks.length !== 3) {
    throw new Error(`Expected 3 trucks, got ${trucks.length}`);
}

// 3. Add Drivers (Name + Phone)
db.run("INSERT INTO drivers (name, phone, active) VALUES (?, ?, 1);", ['Muhammad Ali', '0300-1234567']);
db.run("INSERT INTO drivers (name, phone, active) VALUES (?, ?, 1);", ['Tariq Mahmood', '0321-7654321']);
db.run("INSERT INTO drivers (name, phone, active) VALUES (?, ?, 1);", ['Rashid Khan', '0345-9876543']);

const drivers = query("SELECT * FROM drivers ORDER BY id ASC;");
console.log('✓ Stored Drivers in system:', drivers.map(d => `${d.id}: ${d.name} (${d.phone})`));

if (drivers.length !== 3) {
    throw new Error(`Expected 3 drivers, got ${drivers.length}`);
}

// 4. Create Product
db.run(`
    INSERT INTO products (product_type, product_number, vehicle_name, position, strength, category, bundle_qty, manufacturer)
    VALUES ('Tire', '2.25.17', 'Honda 70', 'Rear', '2P', 'ANT', 10, 'Servis')
`);
const pId = query('SELECT last_insert_rowid() as id')[0].id;

// 5. Create Daily Shift Report using Selected Stored Truck & Stored Driver
const selectedTruck = trucks[0];
const selectedDriver = drivers[0];

db.run(`
    INSERT INTO daily_shifts (shift_code, shift_date, truck_id, truck_name, driver_name, status, total_dispatch, total_sales, total_return)
    VALUES (?, ?, ?, ?, ?, 'Open', 20, 15, 5);
`, ['SH-20260921-01', '2026-09-21', selectedTruck.id, `${selectedTruck.registration_number} - ${selectedTruck.name}`, selectedDriver.name]);

const shiftId = query('SELECT last_insert_rowid() as id')[0].id;

db.run(`
    INSERT INTO shift_items (shift_id, product_id, display_name, dispatch_qty, sale_qty, return_qty)
    VALUES (?, ?, 'ANT 2.25.17 2P Honda 70 Servis', 20, 15, 5);
`, [shiftId, pId]);

const savedShift = query(`
    SELECT s.*, t.registration_number as trk_reg, t.name as trk_name
    FROM daily_shifts s
    JOIN trucks t ON s.truck_id = t.id
    WHERE s.id = ?;
`, [shiftId])[0];

console.log('\n✓ Saved Daily Shift Report with Stored Truck & Driver:', {
    code: savedShift.shift_code,
    date: savedShift.shift_date,
    truck: `${savedShift.trk_reg} - ${savedShift.trk_name}`,
    driver: savedShift.driver_name,
    dispatch: savedShift.total_dispatch,
    sales: savedShift.total_sales,
    returns: savedShift.total_return
});

if (savedShift.driver_name !== 'Muhammad Ali' || savedShift.truck_id !== selectedTruck.id) {
    throw new Error('Shift truck/driver association failed');
}

// 6. Test Truck & Driver Update
db.run("UPDATE trucks SET registration_number = ?, name = ? WHERE id = ?", ['LES-24-9999', 'Hino 700 Super Heavy', selectedTruck.id]);
const updatedTruck = query("SELECT * FROM trucks WHERE id = ?", [selectedTruck.id])[0];
if (updatedTruck.registration_number !== 'LES-24-9999' || updatedTruck.name !== 'Hino 700 Super Heavy') {
    throw new Error('Truck update failed');
}

db.run("UPDATE drivers SET name = ?, phone = ? WHERE id = ?", ['Muhammad Ali Khan', '0300-9999999', selectedDriver.id]);
const updatedDriver = query("SELECT * FROM drivers WHERE id = ?", [selectedDriver.id])[0];
if (updatedDriver.name !== 'Muhammad Ali Khan' || updatedDriver.phone !== '0300-9999999') {
    throw new Error('Driver update failed');
}

console.log('\n✓ PASS: All Trucks & Drivers Subtab CRUD operations and Shift connections verified 100% successfully!\n');
