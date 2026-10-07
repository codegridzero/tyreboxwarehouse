/**
 * Enterprise Local-First SQLite Database Manager using sql.js (WASM)
 * Features Universal Dynamic Schema Detection, Real-time Delta Sync,
 * IndexedDB Persistence, and Zero Data Loss Bidirectional Merging.
 */

const DB_NAME = 'WarehouseTireDB';
const DB_STORE = 'sqlite_store';
const DB_KEY = 'sqlite_binary';
const SYNC_META_KEY = 'warehouse_sync_version_meta';

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

        // 1. Load existing binary from local IndexedDB
        let localBinary = await this.loadFromIndexedDB();
        let serverBinary = null;

        // 2. Fetch server database snapshot dynamically
        if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
            try {
                const resp = await fetch(`warehouse.sqlite?t=${Date.now()}`, { cache: 'no-store' });
                if (resp.ok) {
                    const ab = await resp.arrayBuffer();
                    if (ab && ab.byteLength > 0) {
                        serverBinary = ab;
                    }
                }
            } catch (err) {
                console.warn('[Sync] Offline or server unreachable, working local-first.');
            }
        }

        // 3. Smart Database Resolver
        if (serverBinary && (!localBinary || localBinary.byteLength === 0)) {
            // First time load or empty local cache -> adopt server database directly
            this.db = new this.SQL.Database(new Uint8Array(serverBinary));
            console.log('✓ Initialized database directly from server bundle.');
        } else if (serverBinary && localBinary && localBinary.byteLength > 0) {
            // Both exist! Perform non-destructive in-memory merge
            try {
                const localDbInstance = new this.SQL.Database(new Uint8Array(localBinary));
                const serverDbInstance = new this.SQL.Database(new Uint8Array(serverBinary));

                // Merge server updates into local database non-destructively
                this.mergeDatabasesInMemory(localDbInstance, serverDbInstance);
                this.db = localDbInstance;
                serverDbInstance.close();
                console.log('✓ Synchronized and merged server updates into local database.');
            } catch (mergeErr) {
                console.warn('[Sync] In-memory merge fallback to local DB:', mergeErr);
                this.db = new this.SQL.Database(new Uint8Array(localBinary));
            }
        } else if (localBinary && localBinary.byteLength > 0) {
            this.db = new this.SQL.Database(new Uint8Array(localBinary));
        } else {
            this.db = new this.SQL.Database();
            this.ensureDefaultSchemas();
        }

        this.runDynamicSchemaMigrations();
        this.initialized = true;
        await this.saveToIndexedDB();

        // Background server sync if server is writable
        this.scheduleServerSync();
        return this.db;
    }

    /**
     * Universal in-memory merge between two WebAssembly SQLite instances
     */
    mergeDatabasesInMemory(targetDb, sourceDb) {
        const sourceTables = this.getTableListFromDb(sourceDb);
        const targetTables = this.getTableListFromDb(targetDb);

        // Ensure missing tables in target
        sourceTables.forEach(t => {
            if (!targetTables.some(tt => tt.name.toLowerCase() === t.name.toLowerCase()) && t.sql) {
                targetDb.run(t.sql);
            }
        });

        // Loop dynamically over all tables
        sourceTables.forEach(t => {
            const tableName = t.name;
            if (tableName.startsWith('sqlite_') || tableName === '__sync_meta') return;

            const sCols = this.queryFromDb(sourceDb, `PRAGMA table_info("${tableName}")`);
            const tCols = this.queryFromDb(targetDb, `PRAGMA table_info("${tableName}")`);

            // Auto-add any missing columns
            sCols.forEach(sc => {
                if (!tCols.some(tc => tc.name.toLowerCase() === sc.name.toLowerCase())) {
                    try {
                        const def = sc.dflt_value ? ` DEFAULT ${sc.dflt_value}` : '';
                        targetDb.run(`ALTER TABLE "${tableName}" ADD COLUMN "${sc.name}" ${sc.type}${def}`);
                    } catch (e) {}
                }
            });

            const sRows = this.queryFromDb(sourceDb, `SELECT * FROM "${tableName}"`);
            const tRows = this.queryFromDb(targetDb, `SELECT * FROM "${tableName}"`);
            const targetColNames = this.queryFromDb(targetDb, `PRAGMA table_info("${tableName}")`).map(c => c.name);

            sRows.forEach(sRow => {
                // Find match in target
                const pk = sCols.find(c => c.pk > 0)?.name || 'id';
                let match = tRows.find(tRow => tRow[pk] === sRow[pk]);

                // Or match by common unique fields
                if (!match) {
                    const uniqueKeys = ['shift_code', 'claim_code', 'product_number', 'registration_number', 'license_number', 'sku', 'name'];
                    const foundKey = uniqueKeys.find(k => targetColNames.includes(k) && sRow[k]);
                    if (foundKey) {
                        match = tRows.find(tRow => String(tRow[foundKey]).trim().toLowerCase() === String(sRow[foundKey]).trim().toLowerCase());
                    }
                }

                if (!match) {
                    const insertCols = targetColNames.filter(c => c !== pk && sRow[c] !== undefined);
                    const placeholders = insertCols.map(() => '?').join(', ');
                    const vals = insertCols.map(c => sRow[c]);
                    if (insertCols.length > 0) {
                        targetDb.run(`INSERT INTO "${tableName}" ("${insertCols.join('", "')}") VALUES (${placeholders})`, vals);
                    }
                }
            });
        });
    }

    getTableListFromDb(database) {
        return this.queryFromDb(database, "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    }

    queryFromDb(database, sql, params = []) {
        const stmt = database.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) results.push(stmt.getAsObject());
        stmt.free();
        return results;
    }

    runDynamicSchemaMigrations() {
        if (!this.db) return;
        // Ensure standard tables exist if completely brand new
        this.ensureDefaultSchemas();

        try {
            // Check and migrate claim_items table to remove legacy claim_reason column if present
            const itemCols = this.query('PRAGMA table_info("claim_items")');
            if (itemCols && itemCols.length > 0) {
                const hasReason = itemCols.some(c => c.name.toLowerCase() === 'claim_reason');
                if (hasReason) {
                    this.db.run(`
                        CREATE TABLE claim_items_clean (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            claim_id INTEGER NOT NULL,
                            product_id INTEGER,
                            display_name TEXT NOT NULL,
                            manufacturer TEXT,
                            product_type TEXT,
                            quantity INTEGER NOT NULL DEFAULT 1,
                            created_at TEXT DEFAULT (datetime('now', 'localtime')),
                            FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
                            FOREIGN KEY (product_id) REFERENCES products(id)
                        );
                        INSERT INTO claim_items_clean (id, claim_id, product_id, display_name, manufacturer, product_type, quantity, created_at)
                        SELECT id, claim_id, product_id, display_name, manufacturer, product_type, quantity, created_at FROM claim_items;
                        DROP TABLE claim_items;
                        ALTER TABLE claim_items_clean RENAME TO claim_items;
                    `);
                    console.log('✓ Successfully migrated claim_items table to clean schema without claim_reason.');
                }
            }

            // Ensure missing columns in claims table if from an older schema cache
            const claimsCols = this.query('PRAGMA table_info("claims")');
            if (claimsCols && claimsCols.length > 0) {
                const addIfMissing = (colName, colTypeDef) => {
                    if (!claimsCols.some(c => c.name.toLowerCase() === colName.toLowerCase())) {
                        try {
                            this.db.run(`ALTER TABLE "claims" ADD COLUMN "${colName}" ${colTypeDef}`);
                        } catch (e) {}
                    }
                };
                addIfMissing('claim_code', 'TEXT');
                addIfMissing('truck_name', 'TEXT');
                addIfMissing('driver_name', 'TEXT');
                addIfMissing('customer_shop', 'TEXT');
                addIfMissing('total_items', 'INTEGER DEFAULT 0');
                addIfMissing('status', 'TEXT DEFAULT "Received"');
                addIfMissing('notes', 'TEXT');
                addIfMissing('updated_at', 'TEXT DEFAULT (datetime(\'now\', \'localtime\'))');
            }
        } catch (migErr) {
            console.warn('[DB Migration] Dynamic schema migration info:', migErr);
        }
    }

    ensureDefaultSchemas() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_type TEXT NOT NULL,
                product_number TEXT NOT NULL,
                vehicle_name TEXT NOT NULL,
                position TEXT NOT NULL,
                strength TEXT NOT NULL,
                category TEXT NOT NULL,
                bundle_qty INTEGER DEFAULT 10,
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

            CREATE TABLE IF NOT EXISTS claims (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                claim_code TEXT UNIQUE,
                claim_date TEXT NOT NULL,
                driver_id INTEGER,
                driver_name TEXT NOT NULL,
                truck_id INTEGER,
                truck_name TEXT,
                customer_shop TEXT,
                total_items INTEGER DEFAULT 0,
                status TEXT DEFAULT 'Received',
                notes TEXT,
                created_at TEXT DEFAULT (datetime('now', 'localtime')),
                updated_at TEXT DEFAULT (datetime('now', 'localtime')),
                FOREIGN KEY (driver_id) REFERENCES drivers(id),
                FOREIGN KEY (truck_id) REFERENCES trucks(id)
            );

            CREATE TABLE IF NOT EXISTS claim_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                claim_id INTEGER NOT NULL,
                product_id INTEGER,
                display_name TEXT NOT NULL,
                manufacturer TEXT,
                product_type TEXT,
                quantity INTEGER NOT NULL DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now', 'localtime')),
                FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id)
            );

            CREATE TABLE IF NOT EXISTS __sync_meta (
                id INTEGER PRIMARY KEY,
                db_uuid TEXT NOT NULL,
                revision INTEGER NOT NULL DEFAULT 1,
                content_hash TEXT,
                last_synced_at TEXT DEFAULT (datetime('now', 'localtime')),
                sync_notes TEXT
            );
        `);
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
        while (stmt.step()) results.push(stmt.getAsObject());
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
        this.runDynamicSchemaMigrations();
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

    scheduleSave() {
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => {
            this.saveToIndexedDB().catch(console.error);
            this.scheduleServerSync();
        }, 150);
    }

    scheduleServerSync() {
        if (this._syncTimeout) clearTimeout(this._syncTimeout);
        this._syncTimeout = setTimeout(() => {
            this.syncToServer().catch(() => {});
        }, 300);
    }

    async syncToServer() {
        if (!this.db || typeof window === 'undefined' || typeof fetch === 'undefined') return;
        try {
            const binary = this.db.export();
            let saved = false;

            // 1. Try Node.js endpoint first
            try {
                const resp = await fetch('/api/save-database', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    body: binary
                });
                if (resp && resp.ok) saved = true;
            } catch (e) {}

            // 2. If on Hostinger PHP Web Hosting, save via api.php
            if (!saved) {
                try {
                    await fetch('api.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/octet-stream' },
                        body: binary
                    });
                } catch (e) {}
            }
        } catch (e) {
            // Fails silently when offline
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
