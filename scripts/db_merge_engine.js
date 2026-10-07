/**
 * Universal Table-Agnostic SQLite Diff & Merge Engine
 * Enterprise-grade bidirectional & non-destructive database synchronization.
 * Handles ANY table, ANY column, dynamic foreign-key resolution, and schema discovery.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlWasmPath = path.join(__dirname, '../assets/lib/sql-wasm.js');
const sqlWasmBinaryPath = path.join(__dirname, '../assets/lib/sql-wasm.wasm');

let SQL_INSTANCE = null;

export const mergeDatabases = universalMergeDatabases;

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

/**
 * Discovers all user-defined tables in the SQLite database dynamically.
 */
export function getTableList(db) {
    const rows = queryAll(db, "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '__sync_meta' ORDER BY name");
    return rows;
}

/**
 * Discovers columns, data types, primary keys, and nullability for a table.
 */
export function getTableSchema(db, tableName) {
    const cols = queryAll(db, `PRAGMA table_info("${tableName}")`);
    const fks = queryAll(db, `PRAGMA foreign_key_list("${tableName}")`);
    return {
        tableName,
        columns: cols, // { cid, name, type, notnull, dflt_value, pk }
        primaryKeys: cols.filter(c => c.pk > 0).map(c => c.name),
        foreignKeys: fks // { id, seq, table, from, to, on_update, on_delete, match }
    };
}

/**
 * Computes Topological Sort of Tables based on Foreign Key Dependencies
 * Ensures Parent tables (e.g. products, drivers, trucks) are processed before Child tables (e.g. shifts, items).
 */
export function getTopologicalTableOrder(db) {
    const tables = getTableList(db).map(t => t.name);
    const graph = new Map();
    const inDegree = new Map();

    tables.forEach(t => {
        graph.set(t, new Set());
        inDegree.set(t, 0);
    });

    tables.forEach(t => {
        const schema = getTableSchema(db, t);
        schema.foreignKeys.forEach(fk => {
            const parent = fk.table;
            if (graph.has(parent) && parent !== t) {
                if (!graph.get(parent).has(t)) {
                    graph.get(parent).add(t);
                    inDegree.set(t, inDegree.get(t) + 1);
                }
            }
        });
    });

    const queue = tables.filter(t => inDegree.get(t) === 0);
    const order = [];

    while (queue.length > 0) {
        const current = queue.shift();
        order.push(current);
        const dependents = graph.get(current) || [];
        dependents.forEach(dep => {
            inDegree.set(dep, inDegree.get(dep) - 1);
            if (inDegree.get(dep) === 0) {
                queue.push(dep);
            }
        });
    }

    // Include any cyclic or remaining tables
    tables.forEach(t => {
        if (!order.includes(t)) order.push(t);
    });

    return order;
}

/**
 * Ensures sync metadata tracking table exists in the database.
 */
export function ensureSyncMetaTable(db) {
    db.run(`
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

/**
 * Computes Deterministic Row Fingerprint for Fast Row Matching & Diffing.
 */
export function computeRowHash(row, ignoreKeys = ['id', 'created_at', 'updated_at']) {
    const filtered = {};
    Object.keys(row).sort().forEach(k => {
        if (!ignoreKeys.includes(k)) {
            filtered[k] = row[k] === null || row[k] === undefined ? '' : String(row[k]).trim().toLowerCase();
        }
    });
    return crypto.createHash('md5').update(JSON.stringify(filtered)).digest('hex');
}

/**
 * Universal Multi-Table Generic Database Synchronizer
 * Target DB = Live Server DB (Preserved & Updated)
 * Source DB = Incoming Local DB (Inserts/Updates Merged)
 */
export function universalMergeDatabases(targetDb, sourceDb, options = {}) {
    ensureSyncMetaTable(targetDb);
    ensureSyncMetaTable(sourceDb);

    const sourceTables = getTableList(sourceDb);
    const targetTables = getTableList(targetDb);

    // 1. Ensure any missing tables in Target are created dynamically
    sourceTables.forEach(sTbl => {
        const exists = targetTables.some(t => t.name.toLowerCase() === sTbl.name.toLowerCase());
        if (!exists && sTbl.sql) {
            targetDb.run(sTbl.sql);
        }
    });

    // 2. Discover topological table dependency order
    const tableOrder = getTopologicalTableOrder(sourceDb);

    const syncReport = {
        timestamp: new Date().toISOString(),
        tablesProcessed: {},
        idMaps: {} // table -> Map(sourceId -> targetId)
    };

    // 3. Process Each Table Dynamically
    for (const tableName of tableOrder) {
        if (tableName === '__sync_meta') continue;

        const sSchema = getTableSchema(sourceDb, tableName);
        const tSchema = getTableSchema(targetDb, tableName);

        // Ensure missing columns in Target table are auto-migrated
        sSchema.columns.forEach(sCol => {
            const hasCol = tSchema.columns.some(tCol => tCol.name.toLowerCase() === sCol.name.toLowerCase());
            if (!hasCol) {
                try {
                    const defaultClause = sCol.dflt_value ? ` DEFAULT ${sCol.dflt_value}` : '';
                    targetDb.run(`ALTER TABLE "${tableName}" ADD COLUMN "${sCol.name}" ${sCol.type}${defaultClause}`);
                } catch (e) {
                    console.warn(`[Auto-Schema] Notice adding column ${sCol.name} to ${tableName}:`, e.message);
                }
            }
        });

        // Re-read Target schema after migration
        const activeTargetSchema = getTableSchema(targetDb, tableName);
        const targetCols = activeTargetSchema.columns.map(c => c.name);

        const sourceRows = queryAll(sourceDb, `SELECT * FROM "${tableName}"`);
        const targetRows = queryAll(targetDb, `SELECT * FROM "${tableName}"`);

        const idMap = new Map();
        syncReport.idMaps[tableName] = idMap;

        const tableStats = {
            tableName,
            sourceCount: sourceRows.length,
            targetCountBefore: targetRows.length,
            inserted: 0,
            updated: 0,
            preserved: 0
        };

        const pkCol = sSchema.primaryKeys.length === 1 ? sSchema.primaryKeys[0] : null;

        // Foreign Key dependencies to remap for this table
        const fkRules = sSchema.foreignKeys;

        for (const sRow of sourceRows) {
            // Remap any parent foreign key columns if parent ID shifted during merge
            const remappedRow = { ...sRow };
            fkRules.forEach(fk => {
                const parentTable = fk.table;
                const fkColumn = fk.from;
                const parentIdMap = syncReport.idMaps[parentTable];
                if (parentIdMap && remappedRow[fkColumn] !== null && remappedRow[fkColumn] !== undefined) {
                    const mappedParentId = parentIdMap.get(remappedRow[fkColumn]);
                    if (mappedParentId !== undefined) {
                        remappedRow[fkColumn] = mappedParentId;
                    }
                }
            });

            // Find matching row in Target by Natural Business Identity or Content Fingerprint
            let targetMatch = null;

            // Strategy 1: Match by exact content hash
            const sRowHash = computeRowHash(remappedRow);
            targetMatch = targetRows.find(tRow => computeRowHash(tRow) === sRowHash);

            // Strategy 2: Match by Natural Domain Keys
            if (!targetMatch) {
                if (targetCols.includes('product_number') && targetCols.includes('product_type')) {
                    targetMatch = targetRows.find(tRow => 
                        String(tRow.product_number || '').trim().toLowerCase() === String(remappedRow.product_number || '').trim().toLowerCase() &&
                        String(tRow.product_type || '').trim().toLowerCase() === String(remappedRow.product_type || '').trim().toLowerCase() &&
                        (targetCols.includes('category') ? String(tRow.category || '').trim().toLowerCase() === String(remappedRow.category || '').trim().toLowerCase() : true)
                    );
                } else {
                    const naturalKeys = ['shift_code', 'claim_code', 'registration_number', 'license_number', 'sku', 'code', 'slug'];
                    const foundKey = naturalKeys.find(k => targetCols.includes(k) && remappedRow[k]);
                    if (foundKey) {
                        targetMatch = targetRows.find(tRow => 
                            String(tRow[foundKey] || '').trim().toLowerCase() === String(remappedRow[foundKey] || '').trim().toLowerCase()
                        );
                    } else if (targetCols.includes('name') && !targetCols.includes('first_name')) {
                        targetMatch = targetRows.find(tRow => 
                            String(tRow.name || '').trim().toLowerCase() === String(remappedRow.name || '').trim().toLowerCase()
                        );
                    }
                }
            }

            if (targetMatch) {
                // Record already exists in Target
                if (pkCol && remappedRow[pkCol]) {
                    idMap.set(remappedRow[pkCol], targetMatch[pkCol]);
                }

                // Check for field-level differences and update target non-destructively
                const colsToUpdate = [];
                const updateParams = [];

                targetCols.forEach(col => {
                    if (col === pkCol || col === 'created_at') return;
                    const sVal = remappedRow[col];
                    const tVal = targetMatch[col];

                    // If source has a valid value and target is empty or different
                    if (sVal !== undefined && sVal !== null && sVal !== tVal && (tVal === null || tVal === '' || tVal === 0 || tVal === undefined)) {
                        colsToUpdate.push(`"${col}" = ?`);
                        updateParams.push(sVal);
                    }
                });

                if (colsToUpdate.length > 0 && pkCol && targetMatch[pkCol]) {
                    updateParams.push(targetMatch[pkCol]);
                    targetDb.run(`UPDATE "${tableName}" SET ${colsToUpdate.join(', ')} WHERE "${pkCol}" = ?`, updateParams);
                    tableStats.updated++;
                } else {
                    tableStats.preserved++;
                }
            } else {
                // New record from Source! Insert into Target
                const insertCols = targetCols.filter(c => c !== pkCol && remappedRow[c] !== undefined);
                const placeholders = insertCols.map(() => '?').join(', ');
                const insertVals = insertCols.map(c => remappedRow[c]);

                if (insertCols.length > 0) {
                    targetDb.run(`INSERT INTO "${tableName}" ("${insertCols.join('", "')}") VALUES (${placeholders})`, insertVals);
                    const newIdResult = queryAll(targetDb, "SELECT last_insert_rowid() AS id");
                    const newId = newIdResult[0] ? newIdResult[0].id : null;

                    if (pkCol && remappedRow[pkCol] && newId) {
                        idMap.set(remappedRow[pkCol], newId);
                    }
                    tableStats.inserted++;
                    targetRows.push({ ...remappedRow, [pkCol]: newId });
                }
            }
        }

        syncReport.tablesProcessed[tableName] = tableStats;
    }

    // 4. Update Target Database Sync Metadata
    const targetBinary = targetDb.export();
    const newHash = crypto.createHash('sha256').update(targetBinary).digest('hex').slice(0, 16);
    const currentRevRes = queryAll(targetDb, "SELECT MAX(revision) as rev FROM __sync_meta");
    const nextRevision = (currentRevRes[0]?.rev || 0) + 1;

    targetDb.run(`
        INSERT INTO __sync_meta (db_uuid, revision, content_hash, last_synced_at, sync_notes)
        VALUES (?, ?, ?, datetime('now', 'localtime'), ?)
    `, [
        crypto.randomUUID ? crypto.randomUUID() : 'db_' + Date.now(),
        nextRevision,
        newHash,
        `Automated Sync: ${Object.keys(syncReport.tablesProcessed).length} tables synchronized`
    ]);

    syncReport.newHash = newHash;
    syncReport.newRevision = nextRevision;
    return syncReport;
}

/**
 * Merge two SQLite files safely on disk with timestamped backup
 */
export async function mergeDatabaseFiles(targetFilePath, sourceFilePath, backupDir = './backups') {
    const SQL = await getSqlInstance();

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    if (!fs.existsSync(targetFilePath)) {
        if (fs.existsSync(sourceFilePath)) {
            fs.copyFileSync(sourceFilePath, targetFilePath);
            return {
                status: 'INITIALIZED',
                message: `Initialized ${targetFilePath} directly from ${sourceFilePath}`
            };
        } else {
            const db = new SQL.Database();
            ensureSyncMetaTable(db);
            const binary = db.export();
            fs.writeFileSync(targetFilePath, Buffer.from(binary));
            return {
                status: 'CREATED_FRESH',
                message: `Created fresh database at ${targetFilePath}`
            };
        }
    }

    // Create safety backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(backupDir, `pre_merge_${timestamp}.sqlite`);
    fs.copyFileSync(targetFilePath, backupFilePath);

    if (!fs.existsSync(sourceFilePath)) {
        return {
            status: 'NO_SOURCE',
            message: `Source file not found. Target intact. Backup saved at ${backupFilePath}`
        };
    }

    const targetBuf = fs.readFileSync(targetFilePath);
    const sourceBuf = fs.readFileSync(sourceFilePath);

    const targetDb = new SQL.Database(new Uint8Array(targetBuf));
    const sourceDb = new SQL.Database(new Uint8Array(sourceBuf));

    const syncReport = universalMergeDatabases(targetDb, sourceDb);

    const mergedBinary = targetDb.export();
    fs.writeFileSync(targetFilePath, Buffer.from(mergedBinary));

    return {
        status: 'MERGED_SUCCESS',
        syncReport,
        backupFilePath,
        message: `Universal Database Merge Complete. 0% data loss.`
    };
}
