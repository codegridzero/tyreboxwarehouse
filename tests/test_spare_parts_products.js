import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlWasmPath = path.join(__dirname, '../assets/lib/sql-wasm.js');
const sqlWasmBinaryPath = path.join(__dirname, '../assets/lib/sql-wasm.wasm');

const initSqlJs = (await import('file://' + sqlWasmPath)).default || globalThis.initSqlJs;
const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(sqlWasmBinaryPath) });

console.log("=== TESTING MULTI-PRODUCT SYSTEM (CHAIN, OIL, RIM, SPOKE, BATTERY, TIRE, TUBE) ===");

const db = new SQL.Database();

// 1. Create Schema
db.run(`
    CREATE TABLE products (
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

    CREATE TABLE daily_shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_code TEXT,
        shift_date TEXT NOT NULL,
        truck_name TEXT,
        driver_name TEXT,
        status TEXT DEFAULT 'Open',
        total_dispatch INTEGER DEFAULT 0,
        total_sales INTEGER DEFAULT 0,
        total_return INTEGER DEFAULT 0
    );

    CREATE TABLE shift_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        display_name TEXT NOT NULL,
        dispatch_qty INTEGER NOT NULL DEFAULT 0,
        sale_qty INTEGER NOT NULL DEFAULT 0,
        return_qty INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (shift_id) REFERENCES daily_shifts(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    );
`);

// 2. Helper to simulate getProductDisplayName
function getProductDisplayName(p) {
    if (p.product_type === 'Tire' || p.product_type === 'Tube') {
        const cat = (p.category && p.category !== 'Nill' && p.category !== 'None') ? p.category : '';
        const num = p.product_number || '';
        const strength = (p.strength && p.strength !== 'Nill' && p.strength !== 'None') ? p.strength : '';
        const pos = (p.position && p.position !== 'Nill' && p.position !== 'None') ? p.position : '';
        const veh = p.vehicle_name || '';
        const mfg = p.manufacturer || '';
        return [cat, num, strength, pos, veh, mfg].filter(Boolean).join(' ');
    } else {
        const num = p.product_number || '';
        const veh = p.vehicle_name ? `(${p.vehicle_name})` : '';
        return [num, veh].filter(Boolean).join(' ');
    }
}

// Order-independent tokenized search simulation
function matchesProductSearch(p, query) {
    if (!query) return true;
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;

    const disp = getProductDisplayName(p).toLowerCase();
    const num = (p.product_number || '').toLowerCase();
    const veh = (p.vehicle_name || '').toLowerCase();
    const mfg = (p.manufacturer || '').toLowerCase();
    const typ = (p.product_type || '').toLowerCase();
    const str = (p.strength || '').toLowerCase();
    const pos = (p.position || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    const nts = (p.notes || '').toLowerCase();
    const bdl = p.bundle_qty ? String(p.bundle_qty) : '';

    const numClean = num.replace(/[^a-z0-9]/g, '');
    const numNoDots = num.replace(/\./g, '');
    const dispClean = disp.replace(/[^a-z0-9]/g, '');

    const combined = `${disp} ${num} ${numClean} ${numNoDots} ${veh} ${mfg} ${typ} ${str} ${pos} ${cat} ${nts} ${bdl} ${bdl ? bdl + 'pcs' : ''}`.toLowerCase();
    const combinedClean = combined.replace(/[^a-z0-9\s]/g, '');

    return tokens.every(token => {
        const tokenClean = token.replace(/[^a-z0-9]/g, '');
        if (combined.includes(token)) return true;
        if (tokenClean && combinedClean.includes(tokenClean)) return true;
        if (num.includes(token) || (tokenClean && numClean.includes(tokenClean))) return true;
        if (disp.includes(token) || (tokenClean && dispClean.includes(tokenClean))) return true;
        return false;
    });
}

// 3. Insert Test Products for each category
const productsData = [
    {
        type: 'Tire',
        num: '2.50.17',
        veh: 'Honda 70',
        pos: 'Rear',
        str: '6P',
        cat: 'ANT',
        bundle: 10,
        mfg: 'Panther'
    },
    {
        type: 'Tube',
        num: '2.50.17',
        veh: 'Honda 70',
        pos: 'Nill',
        str: 'Nill',
        cat: 'MM Venture',
        bundle: 50,
        mfg: 'Giga'
    },
    {
        type: 'Chain',
        num: '428H-108L Gold Chain',
        veh: 'Honda 70',
        pos: 'Nill',
        str: 'Nill',
        cat: 'Nill',
        bundle: 10,
        mfg: ''
    },
    {
        type: 'Oil',
        num: 'Havoline 20W-50 4T 0.7L',
        veh: 'Honda 70 / 4T',
        pos: 'Nill',
        str: 'Nill',
        cat: 'Nill',
        bundle: 24,
        mfg: ''
    },
    {
        type: 'Rim',
        num: '17x1.40 Chrome Alloy Rim',
        veh: 'Honda CD125',
        pos: 'Nill',
        str: 'Nill',
        cat: 'Nill',
        bundle: 10,
        mfg: ''
    },
    {
        type: 'Spoke',
        num: '36H 10G Heavy Spokes Set',
        veh: 'Honda 70 Rear',
        pos: 'Nill',
        str: 'Nill',
        cat: 'Nill',
        bundle: 50,
        mfg: ''
    },
    {
        type: 'Battery',
        num: '12V 7Ah Dry Battery',
        veh: 'Honda 125',
        pos: 'Nill',
        str: 'Nill',
        cat: 'Nill',
        bundle: 10,
        mfg: ''
    }
];

for (const p of productsData) {
    db.run(`
        INSERT INTO products (product_type, product_number, vehicle_name, position, strength, category, bundle_qty, manufacturer, notes, images)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '[]');
    `, [p.type, p.num, p.veh, p.pos, p.str, p.cat, p.bundle, p.mfg]);
}

const stmt = db.prepare('SELECT * FROM products ORDER BY id ASC;');
const stored = [];
while (stmt.step()) stored.push(stmt.getAsObject());
stmt.free();

assert.strictEqual(stored.length, 7, "Should have 7 products in catalog");

// 4. Validate Display Names with Position
const tireDisp = getProductDisplayName(stored[0]);
assert.strictEqual(tireDisp, "ANT 2.50.17 6P Rear Honda 70 Panther");
console.log("✓ Tire Display Name with Position:", tireDisp);

// 5. Test Order-Independent Multi-Word Search
assert.strictEqual(matchesProductSearch(stored[0], "2.50.17 6p"), true, "Should match 2.50.17 6p");
assert.strictEqual(matchesProductSearch(stored[0], "6p 2.50.17"), true, "Should match 6p 2.50.17");
assert.strictEqual(matchesProductSearch(stored[0], "50.17 6p"), true, "Should match 50.17 6p");
assert.strictEqual(matchesProductSearch(stored[0], "rear 6p 2.50 panther"), true, "Should match rear 6p 2.50 panther");
assert.strictEqual(matchesProductSearch(stored[0], "panther ant 6p"), true, "Should match panther ant 6p");
console.log("✓ Order-independent search verified successfully for '2.50.17 6p', '6p 2.50.17', '50.17 6p', 'rear 6p 2.50 panther'!");

const tubeDisp = getProductDisplayName(stored[1]);
assert.strictEqual(tubeDisp, "MM Venture 2.50.17 Honda 70 Giga");
console.log("✓ Tube Display Name:", tubeDisp);

const chainDisp = getProductDisplayName(stored[2]);
assert.strictEqual(chainDisp, "428H-108L Gold Chain (Honda 70)");
console.log("✓ Chain Display Name:", chainDisp);

const oilDisp = getProductDisplayName(stored[3]);
assert.strictEqual(oilDisp, "Havoline 20W-50 4T 0.7L (Honda 70 / 4T)");
console.log("✓ Oil Display Name:", oilDisp);

const rimDisp = getProductDisplayName(stored[4]);
assert.strictEqual(rimDisp, "17x1.40 Chrome Alloy Rim (Honda CD125)");
console.log("✓ Rim Display Name:", rimDisp);

const spokeDisp = getProductDisplayName(stored[5]);
assert.strictEqual(spokeDisp, "36H 10G Heavy Spokes Set (Honda 70 Rear)");
console.log("✓ Spoke Display Name:", spokeDisp);

const battDisp = getProductDisplayName(stored[6]);
assert.strictEqual(battDisp, "12V 7Ah Dry Battery (Honda 125)");
console.log("✓ Battery Display Name:", battDisp);

// 5. Test Adding Multi-Product Daily Shift Report
db.run(`
    INSERT INTO daily_shifts (shift_code, shift_date, truck_name, driver_name, status, total_dispatch, total_sales, total_return)
    VALUES ('SH-20260921-01', '2026-09-21', 'Hino 500 Heavy', 'Muhammad Ali', 'Open', 100, 75, 25);
`);

for (let i = 0; i < stored.length; i++) {
    const prod = stored[i];
    const disp = getProductDisplayName(prod);
    db.run(`
        INSERT INTO shift_items (shift_id, product_id, display_name, dispatch_qty, sale_qty, return_qty)
        VALUES (1, ?, ?, 20, 15, 5);
    `, [prod.id, disp]);
}

const shiftItemsStmt = db.prepare("SELECT * FROM shift_items WHERE shift_id = 1");
const shiftItems = [];
while (shiftItemsStmt.step()) shiftItems.push(shiftItemsStmt.getAsObject());
shiftItemsStmt.free();

assert.strictEqual(shiftItems.length, 7, "All 7 product types should be recorded in daily shift report");
console.log("✓ Recorded Shift Items count:", shiftItems.length);

console.log("\n🎉 ALL MULTI-PRODUCT SPARE PARTS (CHAIN, OIL, RIM, SPOKE, BATTERY, TIRE, TUBE) TESTS PASSED 100%!");
