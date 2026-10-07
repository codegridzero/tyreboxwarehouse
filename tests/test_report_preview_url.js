/**
 * Test: Standalone Shift Report Preview New Tab & Shareable URL Verification
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TESTING STANDALONE SHIFT REPORT PREVIEW & UNIQUE SHAREABLE URLS ===\n');

// 1. Verify report-preview.html exists and has required elements
const previewHtmlPath = path.join(__dirname, '../report-preview.html');
if (!fs.existsSync(previewHtmlPath)) {
    throw new Error('report-preview.html does not exist!');
}
const previewHtml = fs.readFileSync(previewHtmlPath, 'utf8');

const requiredHtmlIds = [
    'top-action-bar',
    'top-shift-code',
    'btn-copy-link',
    'copy-btn-text',
    'btn-print-report',
    'loading-state',
    'error-state',
    'error-message',
    'report-paper',
    'shift-code-badge',
    'shift-status-badge',
    'shift-timestamp',
    'meta-shift-date',
    'meta-truck-name',
    'meta-driver-name',
    'meta-notes',
    'metric-items-count',
    'metric-dispatch-qty',
    'metric-sales-qty',
    'metric-returns-qty',
    'table-items-badge',
    'preview-table-body',
    'foot-dispatch-total',
    'foot-sales-total',
    'foot-returns-total',
    'sign-driver-name',
    'toast-container'
];

for (const id of requiredHtmlIds) {
    if (!previewHtml.includes(`id="${id}"`)) {
        throw new Error(`Missing required ID in report-preview.html: #${id}`);
    }
    console.log(`✓ HTML ID exists: #${id}`);
}

// 2. Verify js/preview.js exists and contains required controller methods
const previewJsPath = path.join(__dirname, '../js/preview.js');
if (!fs.existsSync(previewJsPath)) {
    throw new Error('js/preview.js does not exist!');
}
const previewJs = fs.readFileSync(previewJsPath, 'utf8');

const requiredJsSnippets = [
    'parseUrlParams()',
    'loadReportData()',
    'renderReport()',
    'copyShareableLink()',
    'showToast(',
    'SELECT * FROM daily_shifts WHERE id = ?',
    'SELECT * FROM shift_items WHERE shift_id = ?'
];

for (const snippet of requiredJsSnippets) {
    if (!previewJs.includes(snippet)) {
        throw new Error(`Missing snippet in js/preview.js: ${snippet}`);
    }
    console.log(`✓ JS Controller logic verified: ${snippet}`);
}

// 3. Verify app.js links to report-preview.html with target="_blank"
const appJsPath = path.join(__dirname, '../js/app.js');
const appJs = fs.readFileSync(appJsPath, 'utf8');

if (!appJs.includes('href="report-preview.html?id=${s.id}" target="_blank"')) {
    throw new Error('app.js does not link to report-preview.html with target="_blank"');
}
console.log('✓ app.js table action links to report-preview.html?id=... with target="_blank"');

if (!appJs.includes('window.open(`report-preview.html?id=${shiftId}`, \'_blank\');')) {
    throw new Error('openPreviewShiftModal does not open report-preview.html in new tab');
}
console.log('✓ openPreviewShiftModal opens report-preview.html in new window/tab');

// 4. Test SQLite database query simulation for preview report
const sqlWasmPath = path.join(__dirname, '../assets/lib/sql-wasm.js');
const sqlWasmBinaryPath = path.join(__dirname, '../assets/lib/sql-wasm.wasm');
const initSqlJs = (await import('file://' + sqlWasmPath)).default || globalThis.initSqlJs;
const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(sqlWasmBinaryPath) });

const db = new SQL.Database();
db.run(`
    CREATE TABLE daily_shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_code TEXT UNIQUE,
        shift_date TEXT NOT NULL,
        truck_title TEXT,
        truck_reg TEXT,
        truck_name TEXT,
        driver_name TEXT,
        status TEXT DEFAULT 'Open',
        total_dispatch INTEGER DEFAULT 0,
        total_sale INTEGER DEFAULT 0,
        total_return INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE shift_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        display_name TEXT NOT NULL,
        dispatch_qty INTEGER NOT NULL DEFAULT 0,
        sale_qty INTEGER DEFAULT NULL,
        return_qty INTEGER DEFAULT 0
    );

    CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_type TEXT NOT NULL,
        product_number TEXT NOT NULL,
        vehicle_name TEXT NOT NULL,
        images TEXT DEFAULT '[]'
    );
`);

// Insert test data
db.run(`
    INSERT INTO daily_shifts (shift_code, shift_date, truck_title, truck_reg, driver_name, status, total_dispatch, total_sale, total_return, notes)
    VALUES ('SH-20260921-01', '2026-09-21', 'Hino 500 Heavy', 'LES-24-1029', 'Muhammad Ali', 'Completed', 75, 55, 20, 'Route 4 - North Zone');
`);

db.run(`
    INSERT INTO products (product_type, product_number, vehicle_name, images)
    VALUES ('Chain', '428H-108L', 'Honda 70', '["data:image/png;base64,sample"]'),
           ('Oil', '20W-50 4T', 'Universal', '["data:image/png;base64,oil"]'),
           ('Tire', '2.50.17', 'Honda CD125', '[]');
`);

db.run(`
    INSERT INTO shift_items (shift_id, product_id, display_name, dispatch_qty, sale_qty, return_qty)
    VALUES (1, 1, '428H-108L Gold Chain (Honda 70)', 25, 20, 5),
           (1, 2, 'Havoline 20W-50 4T (Universal)', 30, 25, 5),
           (1, 3, 'ANT 2.50.17 6P Honda CD125 Servis', 20, 10, 10);
`);

function query(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const res = [];
    while (stmt.step()) res.push(stmt.getAsObject());
    stmt.free();
    return res;
}

// Query shift by ID (Simulate URL ?id=1)
const shiftResult = query('SELECT * FROM daily_shifts WHERE id = ?;', [1]);
if (shiftResult.length !== 1 || shiftResult[0].shift_code !== 'SH-20260921-01') {
    throw new Error('Failed to query shift by ID for preview');
}

const itemsResult = query('SELECT * FROM shift_items WHERE shift_id = ? ORDER BY id ASC;', [1]);
if (itemsResult.length !== 3) {
    throw new Error('Expected 3 items in preview shift');
}

const totalDispatch = itemsResult.reduce((sum, item) => sum + (item.dispatch_qty || 0), 0);
const totalSales = itemsResult.reduce((sum, item) => sum + (item.sale_qty || 0), 0);
const totalReturns = itemsResult.reduce((sum, item) => sum + (item.return_qty || 0), 0);

console.log('Preview Simulation Loaded Report:', {
    code: shiftResult[0].shift_code,
    truck: `${shiftResult[0].truck_title} (${shiftResult[0].truck_reg})`,
    driver: shiftResult[0].driver_name,
    itemsCount: itemsResult.length,
    dispatch: totalDispatch,
    sales: totalSales,
    returns: totalReturns
});

if (totalDispatch !== 75 || totalSales !== 55 || totalReturns !== 20) {
    throw new Error('Preview totals do not match expected sum');
}

console.log('\n🎉 ALL REPORT PREVIEW NEW TAB & SHAREABLE URL TESTS PASSED 100%!\n');
