/**
 * Test: Products Management Tab Verification (Categories: ANT, DTL, MM Venture, Nill & Bundle Quantity)
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

console.log('=== TESTING PRODUCTS MODULE (CATEGORIES & BUNDLE QUANTITY) ===\n');

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
`);

// 1. Insert product with category ANT (General) and tire bundle_qty = 5
db.run(`
    INSERT INTO products (product_type, product_number, vehicle_name, position, strength, category, bundle_qty, manufacturer, notes, images)
    VALUES ('Tire', '2.25.17', 'Honda 70', 'Front', '2P', 'ANT', 5, 'Servis', 'ANT General tire (5 pcs/bundle)', '[]');
`);

// 2. Insert product with category DTL (Diamond) and null bundle_qty
db.run(`
    INSERT INTO products (product_type, product_number, vehicle_name, position, strength, category, bundle_qty, manufacturer, notes, images)
    VALUES ('Tire', '2.50.17', 'Honda 70', 'Rear', '6P', 'DTL', NULL, 'Panther', 'DTL Diamond pattern', '[]');
`);

// 3. Insert product with category MM Venture and tube bundle_qty = 50
db.run(`
    INSERT INTO products (product_type, product_number, vehicle_name, position, strength, category, bundle_qty, manufacturer, notes, images)
    VALUES ('Tube', '2.50.17', 'Honda 70', 'Nill', 'Nill', 'MM Venture', 50, 'Giga', 'MM Venture tube (50 pcs/packing)', '[]');
`);

// 4. Insert product with category General (legacy) to test migration
db.run(`
    INSERT INTO products (product_type, product_number, vehicle_name, position, strength, category, bundle_qty, manufacturer, notes, images)
    VALUES ('Chain', '428H-108L', 'Honda 70', 'Nill', 'Nill', 'General', NULL, 'Diamond', 'Legacy category', '[]');
`);

// 5. Test automatic migrations (Categories + Default 10 pcs for empty Tire products)
db.run("UPDATE products SET category = 'ANT' WHERE category = 'General' OR category = 'general';");
db.run("UPDATE products SET category = 'DTL' WHERE category = 'Diamond' OR category = 'diamond';");
db.run("UPDATE products SET bundle_qty = 10 WHERE (bundle_qty IS NULL OR bundle_qty = 0 OR bundle_qty = '') AND (LOWER(product_type) = 'tire');");

function query(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
    return results;
}

const allProducts = query('SELECT * FROM products ORDER BY id DESC');
console.log('Products in DB after category & bundle_qty migration:', allProducts.map(p => ({
    id: p.id,
    type: p.product_type,
    number: p.product_number,
    category: p.category,
    bundle_qty: p.bundle_qty
})));

if (allProducts.length !== 4) throw new Error('Expected 4 products');

const migrated = allProducts.find(p => p.product_number === '428H-108L');
if (!migrated || migrated.category !== 'ANT') {
    throw new Error('Migration from General to ANT failed: ' + JSON.stringify(migrated));
}

const mmProduct = allProducts.find(p => p.category === 'MM Venture');
if (!mmProduct || mmProduct.bundle_qty !== 50) {
    throw new Error('MM Venture tube with bundle_qty 50 failed: ' + JSON.stringify(mmProduct));
}

const tireProduct = allProducts.find(p => p.product_number === '2.25.17');
if (!tireProduct || tireProduct.bundle_qty !== 5) {
    throw new Error('Tire product with custom bundle_qty 5 should remain 5: ' + JSON.stringify(tireProduct));
}

const autoFilledTire = allProducts.find(p => p.product_type === 'Tire' && p.product_number === '2.50.17');
if (!autoFilledTire || autoFilledTire.bundle_qty !== 10) {
    throw new Error('Empty tire was not auto-filled with 10: ' + JSON.stringify(autoFilledTire));
}

// 6. Test getProductDisplayName function logic with position
function getProductDisplayName(p) {
    const cat = (p.category && p.category !== 'Nill' && p.category !== 'None') ? p.category : '';
    const num = p.product_number || '';
    const ply = (p.strength && p.strength !== 'Nill' && p.strength !== 'None') ? p.strength : '';
    const pos = (p.position && p.position !== 'Nill' && p.position !== 'None') ? p.position : '';
    const veh = p.vehicle_name || '';
    const mfg = p.manufacturer || '';

    return [cat, num, ply, pos, veh, mfg].filter(Boolean).join(' ');
}

const disp1 = getProductDisplayName(tireProduct);
console.log('Tire Display Name:', disp1);
if (disp1 !== 'ANT 2.25.17 2P Front Honda 70 Servis') {
    throw new Error('Unexpected Display Name for tire: ' + disp1);
}

const disp2 = getProductDisplayName(autoFilledTire);
console.log('Auto-filled Tire Display Name:', disp2);
if (disp2 !== 'DTL 2.50.17 6P Rear Honda 70 Panther') {
    throw new Error('Unexpected Display Name for DTL tire: ' + disp2);
}

const disp3 = getProductDisplayName(mmProduct);
console.log('MM Venture Display Name:', disp3);
if (disp3 !== 'MM Venture 2.50.17 Honda 70 Giga') {
    throw new Error('Unexpected Display Name for MM Venture tube: ' + disp3);
}

console.log('\n✓ PASS: All categories, bundle quantities, and Display Name formulas verified successfully!\n');
