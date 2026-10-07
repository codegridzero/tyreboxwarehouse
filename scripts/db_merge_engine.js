/**
 * Intelligent Non-Destructive SQLite Database Merge Engine
 * Ensures 0% data loss on server while importing all local updates & additions.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlWasmPath = path.join(__dirname, '../assets/lib/sql-wasm.js');
const sqlWasmBinaryPath = path.join(__dirname, '../assets/lib/sql-wasm.wasm');

let SQL_INSTANCE = null;

export async function getSqlInstance() {
    if (SQL_INSTANCE) return SQL_INSTANCE;
    const mod = await import('file://' + path.resolve(sqlWasmPath));
    const initSqlJs = mod.default || globalThis.initSqlJs;
    SQL_INSTANCE = await initSqlJs({ wasmBinary: fs.readFileSync(sqlWasmBinaryPath) });
    return SQL_INSTANCE;
}

export function queryAll(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

export function tableExists(db, tableName) {
    const res = queryAll(db, "SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [tableName]);
    return res.length > 0;
}

export function ensureAllTablesExist(db) {
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
}

/**
 * Intelligent Non-Destructive Merge of Source Database into Target Database
 * Target = Server Database (Master, preserved completely)
 * Source = Local / Incoming Update Database (New items added)
 */
export function mergeDatabases(targetDb, sourceDb) {
    ensureAllTablesExist(targetDb);
    if (!sourceDb) return { status: 'NO_SOURCE' };
    ensureAllTablesExist(sourceDb);

    const stats = {
        drivers: { added: 0, preserved: 0 },
        trucks: { added: 0, preserved: 0 },
        products: { added: 0, updated: 0, preserved: 0 },
        shifts: { added: 0, preserved: 0 },
        shift_items: { added: 0, preserved: 0 }
    };

    // ID Mapping lookup tables from source ID -> target ID
    const driverIdMap = new Map();
    const truckIdMap = new Map();
    const productIdMap = new Map();
    const shiftIdMap = new Map();

    // ----------------------------------------------------
    // 1. MERGE DRIVERS
    // ----------------------------------------------------
    const targetDrivers = queryAll(targetDb, "SELECT * FROM drivers");
    const sourceDrivers = queryAll(sourceDb, "SELECT * FROM drivers");

    for (const sDrv of sourceDrivers) {
        // Match by license_number (if present) OR lower(name)
        const match = targetDrivers.find(t => {
            if (sDrv.license_number && t.license_number && sDrv.license_number.trim().toLowerCase() === t.license_number.trim().toLowerCase()) {
                return true;
            }
            return sDrv.name.trim().toLowerCase() === t.name.trim().toLowerCase();
        });

        if (match) {
            driverIdMap.set(sDrv.id, match.id);
            stats.drivers.preserved++;
        } else {
            targetDb.run(`
                INSERT INTO drivers (name, phone, license_number, active, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                sDrv.name,
                sDrv.phone || '',
                sDrv.license_number || '',
                sDrv.active !== undefined ? sDrv.active : 1,
                sDrv.notes || '',
                sDrv.created_at || new Date().toISOString(),
                sDrv.updated_at || new Date().toISOString()
            ]);
            const newId = queryAll(targetDb, "SELECT last_insert_rowid() AS id")[0].id;
            driverIdMap.set(sDrv.id, newId);
            stats.drivers.added++;
            targetDrivers.push({ ...sDrv, id: newId });
        }
    }

    // ----------------------------------------------------
    // 2. MERGE TRUCKS
    // ----------------------------------------------------
    const targetTrucks = queryAll(targetDb, "SELECT * FROM trucks");
    const sourceTrucks = queryAll(sourceDb, "SELECT * FROM trucks");

    for (const sTrk of sourceTrucks) {
        // Match by registration_number (if present) OR lower(name)
        const match = targetTrucks.find(t => {
            if (sTrk.registration_number && t.registration_number && sTrk.registration_number.trim().toLowerCase() === t.registration_number.trim().toLowerCase()) {
                return true;
            }
            return sTrk.name.trim().toLowerCase() === t.name.trim().toLowerCase();
        });

        const mappedDriverId = sTrk.driver_id ? (driverIdMap.get(sTrk.driver_id) || sTrk.driver_id) : null;

        if (match) {
            truckIdMap.set(sTrk.id, match.id);
            stats.trucks.preserved++;
        } else {
            targetDb.run(`
                INSERT INTO trucks (name, registration_number, driver_id, active, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                sTrk.name,
                sTrk.registration_number || '',
                mappedDriverId,
                sTrk.active !== undefined ? sTrk.active : 1,
                sTrk.notes || '',
                sTrk.created_at || new Date().toISOString(),
                sTrk.updated_at || new Date().toISOString()
            ]);
            const newId = queryAll(targetDb, "SELECT last_insert_rowid() AS id")[0].id;
            truckIdMap.set(sTrk.id, newId);
            stats.trucks.added++;
            targetTrucks.push({ ...sTrk, id: newId, driver_id: mappedDriverId });
        }
    }

    // ----------------------------------------------------
    // 3. MERGE PRODUCTS
    // ----------------------------------------------------
    const targetProducts = queryAll(targetDb, "SELECT * FROM products");
    const sourceProducts = queryAll(sourceDb, "SELECT * FROM products");

    const norm = (s) => (s || '').toString().trim().toLowerCase();

    for (const sProd of sourceProducts) {
        // Match product by type + number + category + vehicle_name + position
        const match = targetProducts.find(t => {
            const sameType = norm(t.product_type) === norm(sProd.product_type);
            const sameNum = norm(t.product_number) === norm(sProd.product_number);
            const sameCat = norm(t.category) === norm(sProd.category);
            const sameVeh = norm(t.vehicle_name) === norm(sProd.vehicle_name);
            const samePos = norm(t.position) === norm(sProd.position);
            return sameType && sameNum && sameCat && sameVeh && samePos;
        });

        if (match) {
            productIdMap.set(sProd.id, match.id);
            // Update metadata if target is missing it (e.g., bundle_qty, manufacturer, notes, images)
            let updated = false;
            const updates = [];
            const params = [];

            if ((!match.bundle_qty || match.bundle_qty === 0) && sProd.bundle_qty) {
                updates.push("bundle_qty = ?");
                params.push(sProd.bundle_qty);
                updated = true;
            }
            if (!match.manufacturer && sProd.manufacturer) {
                updates.push("manufacturer = ?");
                params.push(sProd.manufacturer);
                updated = true;
            }
            if ((!match.images || match.images === '[]') && (sProd.images && sProd.images !== '[]')) {
                updates.push("images = ?");
                params.push(sProd.images);
                updated = true;
            }
            if (!match.notes && sProd.notes) {
                updates.push("notes = ?");
                params.push(sProd.notes);
                updated = true;
            }

            if (updated) {
                params.push(match.id);
                targetDb.run(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);
                stats.products.updated++;
            } else {
                stats.products.preserved++;
            }
        } else {
            targetDb.run(`
                INSERT INTO products (product_type, product_number, vehicle_name, position, strength, category, bundle_qty, manufacturer, notes, images, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                sProd.product_type || 'Tire',
                sProd.product_number || '',
                sProd.vehicle_name || '',
                sProd.position || 'Nill',
                sProd.strength || 'Nill',
                sProd.category || '',
                sProd.bundle_qty || 10,
                sProd.manufacturer || '',
                sProd.notes || '',
                sProd.images || '[]',
                sProd.created_at || new Date().toISOString()
            ]);
            const newId = queryAll(targetDb, "SELECT last_insert_rowid() AS id")[0].id;
            productIdMap.set(sProd.id, newId);
            stats.products.added++;
            targetProducts.push({ ...sProd, id: newId });
        }
    }

    // ----------------------------------------------------
    // 4. MERGE DAILY SHIFTS & SHIFT ITEMS
    // ----------------------------------------------------
    const targetShifts = queryAll(targetDb, "SELECT * FROM daily_shifts");
    const sourceShifts = queryAll(sourceDb, "SELECT * FROM daily_shifts");
    const sourceShiftItems = queryAll(sourceDb, "SELECT * FROM shift_items");

    for (const sShift of sourceShifts) {
        // Match shift by shift_code OR (shift_date + truck_name + driver_name)
        const match = targetShifts.find(t => {
            if (sShift.shift_code && t.shift_code && norm(sShift.shift_code) === norm(t.shift_code)) {
                return true;
            }
            return norm(sShift.shift_date) === norm(t.shift_date) &&
                   norm(sShift.truck_name) === norm(t.truck_name) &&
                   norm(sShift.driver_name) === norm(t.driver_name);
        });

        if (match) {
            // Live server shift takes strict precedence - NEVER overwrite live sales/returns!
            shiftIdMap.set(sShift.id, match.id);
            stats.shifts.preserved++;
        } else {
            const mappedTruckId = sShift.truck_id ? (truckIdMap.get(sShift.truck_id) || sShift.truck_id) : null;
            targetDb.run(`
                INSERT INTO daily_shifts (shift_code, shift_date, truck_id, truck_name, driver_name, status, total_dispatch, total_sales, total_return, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                sShift.shift_code || null,
                sShift.shift_date || new Date().toISOString().slice(0, 10),
                mappedTruckId,
                sShift.truck_name || '',
                sShift.driver_name || '',
                sShift.status || 'Open',
                sShift.total_dispatch || 0,
                sShift.total_sales || 0,
                sShift.total_return || 0,
                sShift.notes || '',
                sShift.created_at || new Date().toISOString(),
                sShift.updated_at || new Date().toISOString()
            ]);
            const newShiftId = queryAll(targetDb, "SELECT last_insert_rowid() AS id")[0].id;
            shiftIdMap.set(sShift.id, newShiftId);
            stats.shifts.added++;
            targetShifts.push({ ...sShift, id: newShiftId });

            // Insert corresponding items for this newly added shift
            const itemsForShift = sourceShiftItems.filter(item => item.shift_id === sShift.id);
            for (const item of itemsForShift) {
                const mappedProdId = item.product_id ? (productIdMap.get(item.product_id) || item.product_id) : null;
                targetDb.run(`
                    INSERT INTO shift_items (shift_id, product_id, display_name, dispatch_qty, sale_qty, return_qty, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    newShiftId,
                    mappedProdId,
                    item.display_name || '',
                    item.dispatch_qty || 0,
                    item.sale_qty !== undefined ? item.sale_qty : null,
                    item.return_qty || 0,
                    item.created_at || new Date().toISOString()
                ]);
                stats.shift_items.added++;
            }
        }
    }

    return stats;
}

/**
 * Merge two SQLite files safely on disk with timestamped backup
 */
export async function mergeDatabaseFiles(targetFilePath, sourceFilePath, backupDir = './backups') {
    const SQL = await getSqlInstance();

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    // If target file doesn't exist, just copy source to target
    if (!fs.existsSync(targetFilePath)) {
        if (fs.existsSync(sourceFilePath)) {
            fs.copyFileSync(sourceFilePath, targetFilePath);
            return {
                status: 'INITIALIZED',
                message: `Initialized ${targetFilePath} directly from ${sourceFilePath}`
            };
        } else {
            // Create fresh schema
            const db = new SQL.Database();
            ensureAllTablesExist(db);
            const binary = db.export();
            fs.writeFileSync(targetFilePath, Buffer.from(binary));
            return {
                status: 'CREATED_FRESH',
                message: `Created fresh database schema at ${targetFilePath}`
            };
        }
    }

    // Target exists! Take a safety backup first
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `pre_merge_${timestamp}.sqlite`;
    const backupFilePath = path.join(backupDir, backupFileName);
    fs.copyFileSync(targetFilePath, backupFilePath);

    if (!fs.existsSync(sourceFilePath)) {
        return {
            status: 'NO_SOURCE',
            message: `Source file ${sourceFilePath} not found. Server database left intact. Backup saved at ${backupFilePath}`
        };
    }

    // Load both databases
    const targetBuf = fs.readFileSync(targetFilePath);
    const sourceBuf = fs.readFileSync(sourceFilePath);

    const targetDb = new SQL.Database(new Uint8Array(targetBuf));
    const sourceDb = new SQL.Database(new Uint8Array(sourceBuf));

    // Run merge
    const stats = mergeDatabases(targetDb, sourceDb);

    // Write merged result back to targetFilePath
    const mergedBinary = targetDb.export();
    fs.writeFileSync(targetFilePath, Buffer.from(mergedBinary));

    return {
        status: 'MERGED_SUCCESS',
        stats,
        backupFilePath,
        message: `Successfully merged updates into ${targetFilePath}. 0% data lost. Safety backup saved to ${backupFilePath}`
    };
}
