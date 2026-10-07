/**
 * Lightweight Local SQLite Database Manager using sql.js (WASM)
 * Automatically persists to IndexedDB, syncs with server in real-time,
 * and handles schema migrations.
 */

const DB_NAME = 'WarehouseTireDB';
const DB_STORE = 'sqlite_store';
const DB_KEY = 'sqlite_binary';
const SYNC_HASH_KEY = 'warehouse_db_synced_hash';

class DatabaseManager {
    constructor() {
        this.db = null;
        this.SQL = null;
        this.initialized = false;
        this._saveTimeout = null;
        this._syncTimeout = null;
        this._listeners = new Set();
    }

    on(event, callback) {
        this._listeners.add({ event, callback });
    }

    notifyChange(event, data) {
        this._listeners.forEach(l => {
            if (l.event === event || l.event === '*') {
                try { l.callback(data); } catch (e) { console.error('Listener error:', e); }
            }
        });
    }

    async init() {
        if (this.initialized) return this.db;

        let sqlLoader = typeof initSqlJs !== 'undefined' 
            ? initSqlJs 
            : (typeof window !== 'undefined' && window.initSqlJs 
                ? window.initSqlJs 
                : (typeof globalThis !== 'undefined' && globalThis.initSqlJs ? globalThis.initSqlJs : null));

        if (!sqlLoader) {
            if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                await new Promise((resolve, reject) => {
                    const existing = window.initSqlJs || globalThis.initSqlJs;
                    if (existing) {
                        sqlLoader = existing;
                        resolve();
                        return;
                    }
                    const script = document.createElement('script');
                    script.src = 'assets/lib/sql-wasm.js';
                    script.onload = () => {
                        sqlLoader = window.initSqlJs || globalThis.initSqlJs;
                        resolve();
                    };
                    script.onerror = () => reject(new Error('Failed to load assets/lib/sql-wasm.js'));
                    document.head.appendChild(script);
                });
            } else {
                throw new Error('sql.js is not loaded.');
            }
        }

        if (!sqlLoader) {
            sqlLoader = typeof initSqlJs !== 'undefined' 
                ? initSqlJs 
                : (typeof window !== 'undefined' ? window.initSqlJs : (typeof globalThis !== 'undefined' ? globalThis.initSqlJs : null));
        }

        if (!sqlLoader) {
            throw new Error('sql.js is not loaded.');
        }

        this.SQL = await sqlLoader({
            locateFile: file => `assets/lib/${file}`
        });

        let savedBinary = await this.loadFromIndexedDB();
        let loadedFromServer = false;

        // Check server version and auto-fetch if newer or local is empty
        if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
            try {
                const versionResp = await fetch('/api/db-version', { cache: 'no-store' });
                if (versionResp.ok) {
                    const meta = await versionResp.json();
                    const lastHash = localStorage.getItem(SYNC_HASH_KEY);

                    // If IndexedDB is empty OR server has a newer database that we haven't synced
                    if (!savedBinary || savedBinary.byteLength === 0 || (meta.hash && meta.hash !== lastHash && !localStorage.getItem('local_has_unsaved_changes'))) {
                        const resp = await fetch(`warehouse.sqlite?t=${Date.now()}`, { cache: 'no-store' });
                        if (resp.ok) {
                            const ab = await resp.arrayBuffer();
                            if (ab && ab.byteLength > 0) {
                                savedBinary = ab;
                                loadedFromServer = true;
                                if (meta.hash) localStorage.setItem(SYNC_HASH_KEY, meta.hash);
                                console.log('✓ Auto-loaded updated warehouse.sqlite from server successfully!');
                            }
                        }
                    }
                }
            } catch (e) {
                // Fallback: try fetching warehouse.sqlite directly if IndexedDB is empty
                if (!savedBinary || savedBinary.byteLength === 0) {
                    try {
                        const resp = await fetch(`warehouse.sqlite?t=${Date.now()}`);
                        if (resp.ok) {
                            const ab = await resp.arrayBuffer();
                            if (ab && ab.byteLength > 0) {
                                savedBinary = ab;
                                loadedFromServer = true;
                                console.log('✓ Loaded bundled warehouse.sqlite from static route.');
                            }
                        }
                    } catch (err) {
                        console.log('No bundled warehouse.sqlite found on server, starting fresh.');
                    }
                }
            }
        }

        if (savedBinary && savedBinary.byteLength > 0) {
            try {
                this.db = new this.SQL.Database(new Uint8Array(savedBinary));
                this.runMigrations();
            } catch (err) {
                console.warn('Initializing fresh database from error:', err);
                this.db = new this.SQL.Database();
                this.initFreshSchema();
            }
        } else {
            this.db = new this.SQL.Database();
            this.initFreshSchema();
        }

        this.initialized = true;
        await this.saveToIndexedDB();

        // If local had data but server might not, schedule background sync to server
        if (!loadedFromServer && savedBinary && savedBinary.byteLength > 0) {
            this.scheduleServerSync();
        }

        return this.db;
    }

    exportDatabase() {
        if (!this.db) throw new Error('Database not initialized');
        return this.db.export();
    }

    exportBinary() {
        return this.exportDatabase();
    }

    async importDatabase(arrayBuffer) {
        if (!this.SQL) throw new Error('SQL engine not initialized');
        this.db = new this.SQL.Database(new Uint8Array(arrayBuffer));
        this.runMigrations();
        await this.saveToIndexedDB();
        await this.syncToServer();
        return true;
    }

    async importBinary(arrayBuffer) {
        return this.importDatabase(arrayBuffer);
    }

    transaction(fn) {
        if (!this.db) throw new Error('Database not initialized');
        this.db.run("BEGIN TRANSACTION;");
        try {
            fn(this);
            this.db.run("COMMIT;");
            this.scheduleSave();
        } catch (err) {
            this.db.run("ROLLBACK;");
            throw err;
        }
    }

    runMigrations() {
        try {
            const prodColumns = this.query("PRAGMA table_info(products);");
            const hasProductType = prodColumns.some(col => col.name === 'product_type');
            const hasNotes = prodColumns.some(col => col.name === 'notes');
            const hasImages = prodColumns.some(col => col.name === 'images');

            if (!hasProductType && prodColumns.length > 0) {
                console.log('Old schema detected. Upgrading products table...');
                this.db.run("DROP TABLE IF EXISTS products;");
                this.initFreshSchema();
            } else {
                if (!hasNotes && prodColumns.length > 0) {
                    console.log('Adding notes column to products table...');
                    this.db.run("ALTER TABLE products ADD COLUMN notes TEXT;");
                }
                if (!hasImages && prodColumns.length > 0) {
                    console.log('Adding images column to products table...');
                    this.db.run("ALTER TABLE products ADD COLUMN images TEXT;");
                }

                const hasBundleQty = prodColumns.some(col => col.name === 'bundle_qty');
                if (!hasBundleQty && prodColumns.length > 0) {
                    console.log('Adding bundle_qty column to products table...');
                    this.db.run("ALTER TABLE products ADD COLUMN bundle_qty INTEGER;");
                }

                // Migrate legacy category names: General -> ANT, Diamond -> DTL
                try {
                    this.db.run("UPDATE products SET category = 'ANT' WHERE category = 'General' OR category = 'general';");
                    this.db.run("UPDATE products SET category = 'DTL' WHERE category = 'Diamond' OR category = 'diamond';");
                } catch (e) {
                    console.warn('Category migration warning:', e);
                }

                // Auto-set bundle_qty = 10 for any existing Tire products where bundle_qty is empty / null / 0
                try {
                    this.db.run("UPDATE products SET bundle_qty = 10 WHERE (bundle_qty IS NULL OR bundle_qty = 0 OR bundle_qty = '') AND (LOWER(product_type) = 'tire');");
                } catch (e) {
                    console.warn('Tire bundle qty migration warning:', e);
                }
            }

            // Ensure drivers, trucks, and daily shifts tables exist
            this.initDriversTrucksSchema();
            this.initDailyShiftSchema();
        } catch (err) {
            console.warn('Migration check failed, recreating fresh schema:', err);
            this.initFreshSchema();
        }
    }

    initFreshSchema() {
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
        `;
        this.db.exec(schemaSQL);
        this.initDriversTrucksSchema();
        this.initDailyShiftSchema();
    }

    initDriversTrucksSchema() {
        const schemaSQL = `
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
        `;
        this.db.exec(schemaSQL);

        // Ensure license_number column exists if older drivers table exists
        try {
            const driverColumns = this.query("PRAGMA table_info(drivers);");
            const hasLicense = driverColumns.some(col => col.name === 'license_number');
            if (!hasLicense && driverColumns.length > 0) {
                this.db.run("ALTER TABLE drivers ADD COLUMN license_number TEXT;");
            }
        } catch (e) {
            console.warn('Error checking drivers columns:', e);
        }

        // Seed 3 default/dummy trucks and drivers if table is empty
        try {
            const existingTrucks = this.query("SELECT COUNT(*) as count FROM trucks;");
            if (existingTrucks[0] && existingTrucks[0].count === 0) {
                this.db.run(`
                    INSERT INTO drivers (name, phone, license_number, active, notes) VALUES
                    ('Muhammad Ali', '0300-1234567', 'LIC-98721', 1, 'Main city route'),
                    ('Tariq Mahmood', '0321-7654321', 'CNIC-35201-1234567-1', 1, 'North highway route'),
                    ('Rashid Khan', '0345-9876543', 'LIC-44109', 1, 'South distribution route');

                    INSERT INTO trucks (name, registration_number, driver_id, active, notes) VALUES
                    ('Hino 5T (Truck 1)', 'LES-24-1029', 1, 1, 'Heavy duty 5 Ton truck'),
                    ('Isuzu 3.5T (Truck 2)', 'LHR-8842', 2, 1, 'Medium distribution vehicle'),
                    ('Mazda Titan (Truck 3)', 'KHI-5512', 3, 1, 'City distribution truck');
                `);
            }
        } catch (e) {
            console.warn('Truck seeding check:', e);
        }
    }

    initDailyShiftSchema() {
        const schemaSQL = `
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
        `;
        this.db.exec(schemaSQL);
    }

    queryOne(sql, params = []) {
        const results = this.query(sql, params);
        return results.length > 0 ? results[0] : null;
    }

    query(sql, params = []) {
        if (!this.db) throw new Error('Database not initialized');
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }

    run(sql, params = []) {
        if (!this.db) throw new Error('Database not initialized');
        this.db.run(sql, params);
        const lastIdResult = this.query('SELECT last_insert_rowid() AS id');
        const lastInsertRowId = lastIdResult[0] ? lastIdResult[0].id : 0;
        this.scheduleSave();
        return { lastInsertRowId };
    }

    scheduleSave() {
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => {
            this.saveToIndexedDB().catch(console.error);
            this.scheduleServerSync();
        }, 200);
    }

    scheduleServerSync() {
        if (this._syncTimeout) clearTimeout(this._syncTimeout);
        this._syncTimeout = setTimeout(() => {
            this.syncToServer().catch(() => {});
        }, 500);
    }

    async syncToServer() {
        if (!this.db || typeof window === 'undefined' || typeof fetch === 'undefined') return;
        try {
            const binary = this.db.export();
            const resp = await fetch('/api/save-database', {
                method: 'POST',
                headers: { 'Content-Type': 'application/octet-stream' },
                body: binary
            });
            if (resp.ok) {
                const res = await resp.json();
                if (res.hash) {
                    localStorage.setItem(SYNC_HASH_KEY, res.hash);
                    localStorage.removeItem('local_has_unsaved_changes');
                }
            }
        } catch (e) {
            // Offline or server not reachable: IndexedDB keeps data safe
            try { localStorage.setItem('local_has_unsaved_changes', 'true'); } catch {}
        }
    }

    async saveToIndexedDB() {
        if (!this.db) return;
        const binary = this.db.export();
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(DB_STORE)) {
                    db.createObjectStore(DB_STORE);
                }
            };
            request.onsuccess = (e) => {
                const idb = e.target.result;
                const tx = idb.transaction(DB_STORE, 'readwrite');
                const store = tx.objectStore(DB_STORE);
                store.put(binary, DB_KEY);
                tx.oncomplete = () => { idb.close(); resolve(); };
                tx.onerror = (err) => { idb.close(); reject(err); };
            };
            request.onerror = (err) => reject(err);
        });
    }

    async loadFromIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(DB_STORE)) {
                    db.createObjectStore(DB_STORE);
                }
            };
            request.onsuccess = (e) => {
                const idb = e.target.result;
                const tx = idb.transaction(DB_STORE, 'readonly');
                const store = tx.objectStore(DB_STORE);
                const getReq = store.get(DB_KEY);
                getReq.onsuccess = () => { idb.close(); resolve(getReq.result || null); };
                getReq.onerror = (err) => { idb.close(); reject(err); };
            };
            request.onerror = (err) => reject(err);
        });
    }
}

export const dbManager = new DatabaseManager();
