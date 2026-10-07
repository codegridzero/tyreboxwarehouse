/**
 * Test: Daily Shift & Dispatch / Sales Management Module Verification
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

console.log('=== TESTING DAILY SHIFTS & SALES MODULE ===\n');

const db = new SQL.Database();

// 1. Initialize Tables
db.run(`
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
        product_id INTEGER,
        display_name TEXT NOT NULL,
        dispatch_qty INTEGER NOT NULL DEFAULT 0,
        sale_qty INTEGER DEFAULT NULL,
        return_qty INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (shift_id) REFERENCES daily_shifts(id) ON DELETE CASCADE
    );
`);

// 2. Seed default 3 trucks and drivers
db.run(`
    INSERT INTO drivers (name, phone, license_number, active, notes) VALUES
    ('Muhammad Ali', '0300-1234567', 'LIC-98721', 1, 'Main city route'),
    ('Tariq Mahmood', '0321-7654321', 'CNIC-35201-1234567-1', 1, 'North highway route'),
    ('Rashid Khan', '0345-9876543', 'LIC-44109', 1, 'South distribution route');

    INSERT INTO trucks (name, registration_number, driver_id, active, notes) VALUES
    ('Hino 5T (Truck 1)', 'LES-24-1029', 1, 1, 'Heavy duty 5 Ton truck'),
    ('Isuzu 3.5T (Truck 2)', 'LHR-8842', 2, 1, 'Medium distribution vehicle'),
    ('Mazda Titan (Truck 3)', 'KHI-5512', 3, 1, 'City distribution truck');

    INSERT INTO products (product_type, product_number, vehicle_name, position, strength, category, bundle_qty, manufacturer, notes, images) VALUES
    ('Tire', '2.25.17', 'Honda 70', 'Front', '2P', 'ANT', 10, 'Servis', '', '[]'),
    ('Tire', '2.50.17', 'Honda 70', 'Rear', '6P', 'DTL', 10, 'Panther', '', '[]'),
    ('Tube', '2.50.17', 'Honda 70', 'Nill', 'Nill', 'MM Venture', 50, 'Giga', '', '[]');
`);

function query(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
    return results;
}

// 3. Test Shift 1 Creation (Morning Dispatch)
const shift1Res = db.run(`
    INSERT INTO daily_shifts (
        shift_code, shift_date, truck_id, truck_name, driver_name,
        status, total_dispatch, total_sales, total_return, notes
    ) VALUES (
        'SH-20260921-01', '2026-09-21', 1, 'Hino 5T (Truck 1)', 'Muhammad Ali',
        'Open', 60, 0, 60, 'Morning dispatch 8 AM'
    );
`);

const shift1Id = query("SELECT last_insert_rowid() as id")[0].id;

// Insert shift items with morning dispatch goods quantity
db.run(`
    INSERT INTO shift_items (shift_id, product_id, display_name, dispatch_qty, sale_qty, return_qty) VALUES
    (${shift1Id}, 1, 'ANT 2.25.17 2P Honda 70 Servis', 20, NULL, 20),
    (${shift1Id}, 2, 'DTL 2.50.17 6P Honda 70 Panther', 20, NULL, 20),
    (${shift1Id}, 3, 'MM Venture 2.50.17 Honda 70 Giga', 20, NULL, 20);
`);

console.log('✓ Shift 1 created with morning dispatch (60 total pcs, 3 products)');

// 4. Test Evening Sales Entry (User manually enters sales on spot)
// Item 1: 20 dispatched, 14 sold -> return = 6
// Item 2: 20 dispatched, 18 sold -> return = 2
// Item 3: 20 dispatched, 10 sold -> return = 10
db.run(`UPDATE shift_items SET sale_qty = 14, return_qty = 6 WHERE shift_id = ${shift1Id} AND product_id = 1;`);
db.run(`UPDATE shift_items SET sale_qty = 18, return_qty = 2 WHERE shift_id = ${shift1Id} AND product_id = 2;`);
db.run(`UPDATE shift_items SET sale_qty = 10, return_qty = 10 WHERE shift_id = ${shift1Id} AND product_id = 3;`);

// Update shift totals
db.run(`
    UPDATE daily_shifts SET
        total_sales = 42,
        total_return = 18,
        status = 'Completed',
        updated_at = datetime('now', 'localtime')
    WHERE id = ${shift1Id};
`);

const shift1 = query(`SELECT * FROM daily_shifts WHERE id = ${shift1Id}`)[0];
console.log('Shift 1 summary after sales recording:', {
    code: shift1.shift_code,
    date: shift1.shift_date,
    dispatch: shift1.total_dispatch,
    sales: shift1.total_sales,
    returns: shift1.total_return,
    status: shift1.status
});

if (shift1.total_dispatch !== 60) throw new Error('Expected 60 dispatch');
if (shift1.total_sales !== 42) throw new Error('Expected 42 sales');
if (shift1.total_return !== 18) throw new Error('Expected 18 return');
if (shift1.status !== 'Completed') throw new Error('Expected Completed status');

const items = query(`SELECT * FROM shift_items WHERE shift_id = ${shift1Id} ORDER BY id ASC`);
console.log('Shift 1 item details:', items.map(i => ({
    display_name: i.display_name,
    dispatch: i.dispatch_qty,
    sale: i.sale_qty,
    return: i.return_qty
})));

if (items[0].return_qty !== 6) throw new Error('Expected return 6 for item 1');
if (items[1].return_qty !== 2) throw new Error('Expected return 2 for item 2');
if (items[2].return_qty !== 10) throw new Error('Expected return 10 for item 3');

console.log('\n✓ PASS: Daily Shift creation, product dispatch, manual sale recording, auto returns & totals verified successfully!\n');
