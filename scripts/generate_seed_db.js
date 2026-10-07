/**
 * Generate seed SQLite database file: warehouse.sqlite
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlWasmPath = path.join(__dirname, '../assets/lib/sql-wasm.js');
const sqlWasmBinaryPath = path.join(__dirname, '../assets/lib/sql-wasm.wasm');

const initSqlJs = (await import('file://' + sqlWasmPath)).default;
const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(sqlWasmBinaryPath) });

console.log('Creating seed warehouse.sqlite database...');

const db = new SQL.Database();

// 1. Products Schema
db.run(`
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
        product_id INTEGER,
        display_name TEXT NOT NULL,
        dispatch_qty INTEGER NOT NULL DEFAULT 0,
        sale_qty INTEGER DEFAULT NULL,
        return_qty INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (shift_id) REFERENCES daily_shifts(id) ON DELETE CASCADE
    );
`);

// 2. Insert Seed Drivers & Trucks
db.run(`
    INSERT INTO drivers (name, phone, license_number, active, notes) VALUES
    ('Muhammad Ali', '0300-1234567', 'LIC-98721', 1, 'Main city route'),
    ('Tariq Mahmood', '0321-7654321', 'CNIC-35201-1234567-1', 1, 'North highway route'),
    ('Rashid Khan', '0345-9876543', 'LIC-44109', 1, 'South distribution route');

    INSERT INTO trucks (name, registration_number, driver_id, active, notes) VALUES
    ('Hino 500 Heavy', 'LES-24-1029', 1, 1, 'Heavy duty 5 Ton truck'),
    ('Master Foton 3.5T', 'LHR-8842', 2, 1, 'Medium distribution vehicle'),
    ('Shahzore Blue', 'KHI-5512', 3, 1, 'City distribution truck');
`);

// 3. Insert Seed Products across all categories
db.run(`
    INSERT INTO products (product_type, product_number, vehicle_name, position, strength, category, bundle_qty, manufacturer, notes, images) VALUES
    ('Tire', '2.25.17', 'Honda 70', 'Front', '2P', 'ANT', 10, 'Servis', 'Standard front motorcycle tire', '[]'),
    ('Tire', '2.50.17', 'Honda 70', 'Rear', '6P', 'DTL', 10, 'Panther', 'Heavy duty rear tire', '[]'),
    ('Tube', '2.50.17', 'Honda 70', 'Nill', 'Nill', 'MM Venture', 50, 'Giga', 'Premium butyl tube', '[]'),
    ('Chain', '428H-108L Gold Chain', 'Honda 70', 'Nill', 'Nill', 'Nill', 10, 'Diamond', 'High strength roller chain', '[]'),
    ('Oil', 'Havoline 20W-50 4T 0.7L', 'Honda 70 / 4T', 'Nill', 'Nill', 'Nill', 24, 'Caltex', 'Premium 4-Stroke Engine Oil', '[]'),
    ('Rim', '17x1.40 Chrome Alloy Rim', 'Honda CD125', 'Nill', 'Nill', 'Nill', 10, 'Union', 'Chrome plated alloy rim', '[]'),
    ('Spoke', '36H 10G Heavy Spokes Set', 'Honda 70 Rear', 'Nill', 'Nill', 'Nill', 50, 'Crown', 'Heavy gauge zinc coated spokes', '[]'),
    ('Battery', '12V 7Ah Dry Battery', 'Honda 125', 'Nill', 'Nill', 'Nill', 10, 'Osaka', 'Maintenance free motorcycle battery', '[]');
`);

// 4. Insert Seed Daily Shift
db.run(`
    INSERT INTO daily_shifts (shift_code, shift_date, truck_id, truck_name, driver_name, status, total_dispatch, total_sales, total_return, notes) VALUES
    ('SH-20260921-01', '2026-09-21', 1, 'Hino 500 Heavy', 'Muhammad Ali', 'Open', 100, 0, 100, 'Morning dispatch 8:00 AM');

    INSERT INTO shift_items (shift_id, product_id, display_name, dispatch_qty, sale_qty, return_qty) VALUES
    (1, 1, 'ANT 2.25.17 2P Front Honda 70 Servis', 20, NULL, 20),
    (1, 2, 'DTL 2.50.17 6P Rear Honda 70 Panther', 20, NULL, 20),
    (1, 3, 'MM Venture 2.50.17 Honda 70 Giga', 30, NULL, 30),
    (1, 4, '428H-108L Gold Chain (Honda 70)', 15, NULL, 15),
    (1, 5, 'Havoline 20W-50 4T 0.7L (Honda 70 / 4T)', 15, NULL, 15);
`);

// Export binary to warehouse.sqlite
const binary = db.export();
const outputPath = path.join(__dirname, '../warehouse.sqlite');
fs.writeFileSync(outputPath, Buffer.from(binary));

console.log(`✓ Successfully created ${outputPath} (${binary.length} bytes) with seed products, trucks, and shifts!`);
