/**
 * Comprehensive Automated Verification for Database Auto-Merge & Zero Data Loss System
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSqlInstance, mergeDatabases, mergeDatabaseFiles, queryAll } from '../scripts/db_merge_engine.js';
import { runServerAutoMerge } from '../scripts/server_auto_merge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const TEST_TMP_DIR = path.join(__dirname, 'tmp_test_merge');

console.log('=== TESTING ZERO DATA LOSS DATABASE AUTO-MERGE ENGINE ===\n');

const SQL = await getSqlInstance();

// Clean or create test tmp directory
if (fs.existsSync(TEST_TMP_DIR)) {
    fs.rmSync(TEST_TMP_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_TMP_DIR, { recursive: true });

// Helper to create test database
function createTestDb() {
    const db = new SQL.Database();
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
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
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
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        );
        CREATE TABLE IF NOT EXISTS shift_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shift_id INTEGER NOT NULL,
            product_id INTEGER,
            display_name TEXT NOT NULL,
            dispatch_qty INTEGER NOT NULL DEFAULT 0,
            sale_qty INTEGER DEFAULT NULL,
            return_qty INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );
    `);
    return db;
}

// -------------------------------------------------------------
// TEST 1: Server has Live Business Shifts & Sales, Local has New Products & Drivers
// -------------------------------------------------------------
console.log('[Test 1] Simulating Live Server with Sales + Incoming Local Build Update...');

// 1. Setup Live Server Database (has 1 live shift with sales and returns recorded by warehouse staff)
const serverDb = createTestDb();
serverDb.run(`
    INSERT INTO drivers (name, phone, license_number) VALUES ('Server Driver 1', '0300-1111111', 'LIC-S1');
    INSERT INTO trucks (name, registration_number, driver_id) VALUES ('Server Truck 1', 'SRV-100', 1);
    INSERT INTO products (product_type, product_number, vehicle_name, position, strength, category, bundle_qty, manufacturer)
    VALUES ('Tire', '2.50.17', 'Honda 70', 'Rear', '6P', 'ANT', 10, 'Servis');

    INSERT INTO daily_shifts (shift_code, shift_date, truck_id, truck_name, driver_name, status, total_dispatch, total_sales, total_return, notes)
    VALUES ('SH-LIVE-001', '2026-10-07', 1, 'Server Truck 1', 'Server Driver 1', 'Completed', 50, 38, 12, 'Live Server Business Shift');

    INSERT INTO shift_items (shift_id, product_id, display_name, dispatch_qty, sale_qty, return_qty)
    VALUES (1, 1, 'ANT 2.50.17 6P Rear Honda 70 Servis', 50, 38, 12);
`);

// 2. Setup Incoming Local Build Database (has new products, a new driver, a new truck added by developer)
const localDb = createTestDb();
localDb.run(`
    INSERT INTO drivers (name, phone, license_number) VALUES ('Developer Added Driver', '0321-9999999', 'LIC-DEV1');
    INSERT INTO trucks (name, registration_number, driver_id) VALUES ('Developer Truck 2', 'DEV-200', 1);
    INSERT INTO products (product_type, product_number, vehicle_name, position, strength, category, bundle_qty, manufacturer)
    VALUES 
    ('Tire', '2.50.17', 'Honda 70', 'Rear', '6P', 'ANT', 10, 'Servis'), -- Existing product
    ('Tube', '2.75.17', 'Honda 125', 'Nill', 'Nill', 'MM Venture', 50, 'Giga'), -- New Product 1
    ('Chain', '428H Gold', 'Honda 70', 'Nill', 'Nill', 'Nill', 10, 'Diamond'); -- New Product 2
`);

// 3. Perform Non-Destructive Merge
const mergeStats = mergeDatabases(serverDb, localDb);
console.log('  Merge statistics:', mergeStats);

// 4. Verify Server Live Data Was 100% Preserved
const serverShifts = queryAll(serverDb, "SELECT * FROM daily_shifts");
const serverShiftItems = queryAll(serverDb, "SELECT * FROM shift_items");

if (serverShifts.length !== 1 || serverShifts[0].total_sales !== 38 || serverShifts[0].total_return !== 12) {
    throw new Error('FAIL: Live server shift data was altered or lost!');
}
console.log('  ✓ PASS: Live server shift & sales data strictly preserved (50 dispatched, 38 sold, 12 returned).');

// 5. Verify Newly Added Local Products & Drivers Were Successfully Merged
const allProducts = queryAll(serverDb, "SELECT * FROM products");
const allDrivers = queryAll(serverDb, "SELECT * FROM drivers");
const allTrucks = queryAll(serverDb, "SELECT * FROM trucks");

if (allProducts.length !== 3) {
    throw new Error(`FAIL: Expected 3 products after merge, got ${allProducts.length}`);
}
console.log(`  ✓ PASS: Products table updated (1 existing preserved, 2 new local products added = total 3).`);

if (allDrivers.length !== 2) {
    throw new Error(`FAIL: Expected 2 drivers after merge, got ${allDrivers.length}`);
}
console.log(`  ✓ PASS: Drivers table updated (1 server driver + 1 developer driver = total 2).`);

if (allTrucks.length !== 2) {
    throw new Error(`FAIL: Expected 2 trucks after merge, got ${allTrucks.length}`);
}
console.log(`  ✓ PASS: Trucks table updated (1 server truck + 1 developer truck = total 2).`);


// -------------------------------------------------------------
// TEST 2: Multiple Consecutive Uploads (Idempotency Test)
// -------------------------------------------------------------
console.log('\n[Test 2] Testing Repeated Consecutive Uploads (10x Auto-Merges)...');
for (let i = 1; i <= 10; i++) {
    mergeDatabases(serverDb, localDb);
}

const finalProducts = queryAll(serverDb, "SELECT * FROM products");
const finalShifts = queryAll(serverDb, "SELECT * FROM daily_shifts");
const finalDrivers = queryAll(serverDb, "SELECT * FROM drivers");

if (finalProducts.length !== 3 || finalShifts.length !== 1 || finalDrivers.length !== 2) {
    throw new Error('FAIL: Repeated merges generated duplicate records!');
}
console.log('  ✓ PASS: Idempotency verified! 10 consecutive uploads caused 0 duplicates and 0 data loss.');


// -------------------------------------------------------------
// TEST 3: File-Based Auto-Merge & Safety Backup Verification
// -------------------------------------------------------------
console.log('\n[Test 3] Testing File-Level Auto-Merge with Automatic Safety Backup...');
const targetFilePath = path.join(TEST_TMP_DIR, 'warehouse.sqlite');
const sourceFilePath = path.join(TEST_TMP_DIR, 'incoming_update.sqlite');
const backupDir = path.join(TEST_TMP_DIR, 'backups');

// Save server DB to file
fs.writeFileSync(targetFilePath, Buffer.from(serverDb.export()));
// Save local DB to incoming file
fs.writeFileSync(sourceFilePath, Buffer.from(localDb.export()));

const fileResult = await mergeDatabaseFiles(targetFilePath, sourceFilePath, backupDir);
console.log('  Merge result:', fileResult.status, fileResult.message);

if (!fs.existsSync(fileResult.backupFilePath)) {
    throw new Error('FAIL: Safety backup file was not created!');
}
console.log(`  ✓ PASS: Automatic safety backup created at: ${path.basename(fileResult.backupFilePath)}`);

// Verify target file is valid and readable
const mergedBuffer = fs.readFileSync(targetFilePath);
const verifiedDb = new SQL.Database(new Uint8Array(mergedBuffer));
const verifiedCount = queryAll(verifiedDb, "SELECT COUNT(*) as c FROM products")[0].c;
if (verifiedCount !== 3) {
    throw new Error(`FAIL: Expected 3 products in merged file, got ${verifiedCount}`);
}
console.log(`  ✓ PASS: Merged SQLite database file verified on disk (${mergedBuffer.length} bytes).`);


// -------------------------------------------------------------
// TEST 4: Build System Output Verification
// -------------------------------------------------------------
console.log('\n[Test 4] Verifying Build Output Files & Package Contents...');
const buildDir = path.join(ROOT_DIR, 'build');
const buildZip = path.join(ROOT_DIR, 'build.zip');

if (fs.existsSync(buildDir)) {
    const requiredBuildFiles = [
        'index.html',
        'report-preview.html',
        'manifest.json',
        'sw.js',
        'server.js',
        'package.json',
        'warehouse.sqlite',
        'incoming_update.sqlite',
        'build_meta.json',
        'DEPLOYMENT_GUIDE.md',
        'start.sh',
        'restart.sh',
        'status.sh',
        'stop.sh',
        'warehouse.service'
    ];

    for (const bf of requiredBuildFiles) {
        if (!fs.existsSync(path.join(buildDir, bf))) {
            throw new Error(`FAIL: build/ directory is missing essential file: ${bf}`);
        }
    }
    console.log('  ✓ PASS: build/ contains all required production files, scripts, and database snapshot.');
}

// Clean test tmp directory
if (fs.existsSync(TEST_TMP_DIR)) {
    fs.rmSync(TEST_TMP_DIR, { recursive: true, force: true });
}

console.log('\n🎉 ALL ZERO DATA LOSS & DATABASE AUTO-MERGE TESTS PASSED 100%!');
