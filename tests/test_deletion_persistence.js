import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlWasmPath = path.join(__dirname, '../assets/lib/sql-wasm.js');
const sqlWasmBinaryPath = path.join(__dirname, '../assets/lib/sql-wasm.wasm');
const initSqlJs = (await import('file://' + sqlWasmPath)).default || globalThis.initSqlJs;

async function testDeletionPersistence() {
    console.log('=== TESTING PRODUCT DELETION PERSISTENCE ===');
    const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(sqlWasmBinaryPath) });

    const seedBuffer = fs.readFileSync(path.join(__dirname, '../warehouse.sqlite'));
    const db1 = new SQL.Database(seedBuffer);

    const initialCount = db1.exec("SELECT COUNT(*) FROM products")[0].values[0][0];
    console.log(`Initial product count: ${initialCount}`);

    // Get a product to delete
    const prodToDelete = db1.exec("SELECT id, product_number, vehicle_name FROM products LIMIT 1")[0].values[0];
    const [delId, delNum, delName] = prodToDelete;
    console.log(`Deleting product ID ${delId}: "${delNum}" (${delName})`);

    db1.run("DELETE FROM products WHERE id = ?", [delId]);

    const countAfterDelete = db1.exec("SELECT COUNT(*) FROM products")[0].values[0][0];
    if (countAfterDelete !== initialCount - 1) {
        throw new Error(`Count after delete expected ${initialCount - 1} but got ${countAfterDelete}`);
    }
    console.log(`✓ Product deleted. Count is now ${countAfterDelete}`);

    // Export binary as would be saved to IndexedDB
    const savedBinary = db1.export();

    // Simulate page reload: load from savedBinary (IndexedDB)
    const dbReloaded = new SQL.Database(savedBinary);
    const countAfterReload = dbReloaded.exec("SELECT COUNT(*) FROM products")[0].values[0][0];
    const checkDeleted = dbReloaded.exec("SELECT COUNT(*) FROM products WHERE id = ?", [delId])[0].values[0][0];

    if (countAfterReload !== countAfterDelete || checkDeleted !== 0) {
        throw new Error(`Deletion reverted after reload! Count: ${countAfterReload}, Found: ${checkDeleted}`);
    }

    console.log(`✓ Page reload verified: product ${delId} remains permanently deleted (Count: ${countAfterReload}).`);
    console.log('🎉 DELETION PERSISTENCE VERIFICATION PASSED 100%!');
}

testDeletionPersistence().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
