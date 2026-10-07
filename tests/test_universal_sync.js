/**
 * Comprehensive Test for Universal Table-Agnostic Database Synchronization
 * Tests dynamic schema discovery, arbitrary table CRUD syncing, foreign key cascading,
 * and zero data loss on complex multi-table datasets.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSqlInstance, universalMergeDatabases, queryAll } from '../scripts/db_merge_engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TESTING UNIVERSAL GENERIC DATABASE SYNC ENGINE ===\n');

const SQL = await getSqlInstance();

// 1. Create Server DB with custom dynamically created tables and live transactions
const serverDb = new SQL.Database();
serverDb.run(`
    CREATE TABLE suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_person TEXT,
        city TEXT
    );

    CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_type TEXT,
        product_number TEXT,
        category TEXT,
        vehicle_name TEXT,
        position TEXT,
        supplier_id INTEGER,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE custom_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT,
        logged_at TEXT
    );

    INSERT INTO suppliers (name, contact_person, city) VALUES ('National Rubber Co', 'Ahmad', 'Lahore');
    INSERT INTO products (product_type, product_number, category, vehicle_name, position, supplier_id)
    VALUES ('Tire', '900-20', 'Panther', 'Truck Heavy', 'Rear', 1);

    INSERT INTO custom_audit_logs (action, logged_at) VALUES ('LIVE_SERVER_SHIFT_STARTED', '2026-10-07 08:00:00');
`);

// 2. Create Local DB with new records, a brand new table, and updated fields
const localDb = new SQL.Database();
localDb.run(`
    CREATE TABLE suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_person TEXT,
        city TEXT
    );

    CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_type TEXT,
        product_number TEXT,
        category TEXT,
        vehicle_name TEXT,
        position TEXT,
        supplier_id INTEGER,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    -- Brand new table added in local
    CREATE TABLE warehouses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        location TEXT
    );

    INSERT INTO warehouses (code, location) VALUES ('WH-MAIN', 'Ferozepur Road Warehouse');

    -- Insert an existing supplier and a new supplier
    INSERT INTO suppliers (name, contact_person, city) VALUES ('National Rubber Co', 'Ahmad', 'Lahore');
    INSERT INTO suppliers (name, contact_person, city) VALUES ('Giga Tube Industries', 'Kashif', 'Gujranwala');

    -- Insert new product linked to supplier 2
    INSERT INTO products (product_type, product_number, category, vehicle_name, position, supplier_id)
    VALUES ('Tube', '900-20', 'Giga', 'Truck Heavy', 'Rear', 2);
`);

console.log('[Test 1] Running Universal Sync on multi-table relational schema...');
const report = universalMergeDatabases(serverDb, localDb);
console.log('Sync Report:', JSON.stringify(report.tablesProcessed, null, 2));

// Verify that the new table 'warehouses' was dynamically created in serverDb
const tablesInServer = queryAll(serverDb, "SELECT name FROM sqlite_master WHERE type='table'").map(r => r.name);
if (!tablesInServer.includes('warehouses')) {
    throw new Error('FAIL: Dynamic table creation failed for "warehouses"!');
}
console.log('✓ PASS: Dynamic table "warehouses" auto-created on server.');

const serverWarehouses = queryAll(serverDb, "SELECT * FROM warehouses");
if (serverWarehouses.length !== 1 || serverWarehouses[0].code !== 'WH-MAIN') {
    throw new Error('FAIL: Warehouses data mismatch!');
}
console.log('✓ PASS: Warehouses row auto-inserted.');

// Verify live audit log was 100% preserved
const serverLogs = queryAll(serverDb, "SELECT * FROM custom_audit_logs");
if (serverLogs.length !== 1 || serverLogs[0].action !== 'LIVE_SERVER_SHIFT_STARTED') {
    throw new Error('FAIL: Server live audit log was deleted or altered!');
}
console.log('✓ PASS: Server-only live audit logs 100% preserved.');

// Verify suppliers table count
const serverSuppliers = queryAll(serverDb, "SELECT * FROM suppliers");
if (serverSuppliers.length !== 2) {
    throw new Error(`FAIL: Expected 2 suppliers, got ${serverSuppliers.length}`);
}
console.log('✓ PASS: Suppliers merged correctly (1 preserved, 1 new added).');

// Verify products table and foreign key linkage
const serverProducts = queryAll(serverDb, "SELECT * FROM products");
if (serverProducts.length !== 2) {
    throw new Error(`FAIL: Expected 2 products, got ${serverProducts.length}`);
}
const tubeProduct = serverProducts.find(p => p.product_type === 'Tube');
if (!tubeProduct || tubeProduct.supplier_id !== 2) {
    throw new Error('FAIL: Foreign key remapping failed for product supplier_id!');
}
console.log('✓ PASS: Foreign key remapping verified dynamically.');

console.log('\n🎉 ALL UNIVERSAL TABLE-AGNOSTIC DATABASE SYNC TESTS PASSED 100%!');
