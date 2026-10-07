/**
 * Backup, Restore, and CSV Data Management Service
 */
import { dbManager } from '../db.js';
import { downloadJSON, downloadCSV, getTodayDateStr } from '../utils.js';

const APP_VERSION = '1.0.0';
const BACKUP_SCHEMA_VERSION = 1;

export const backupService = {
    /**
     * Export complete application data to a clean JSON object
     */
    getFullBackupData() {
        const tables = [
            'categories',
            'products',
            'drivers',
            'trucks',
            'dispatches',
            'dispatch_items',
            'sales',
            'sale_items',
            'sale_edits',
            'returns',
            'return_items',
            'inventory_transactions',
            'settings'
        ];

        const backup = {
            metadata: {
                app: 'WarehouseInventoryTruckSales',
                version: APP_VERSION,
                schemaVersion: BACKUP_SCHEMA_VERSION,
                exportedAt: new Date().toISOString(),
                recordCounts: {}
            },
            data: {}
        };

        tables.forEach(tableName => {
            const rows = dbManager.query(`SELECT * FROM ${tableName}`);
            backup.data[tableName] = rows;
            backup.metadata.recordCounts[tableName] = rows.length;
        });

        return backup;
    },

    /**
     * Trigger download of full JSON backup file
     */
    downloadFullBackup() {
        const backup = this.getFullBackupData();
        const dateStr = getTodayDateStr();
        const filename = `warehouse-backup-${dateStr}.json`;
        downloadJSON(filename, backup);
        return { filename, recordCounts: backup.metadata.recordCounts };
    },

    /**
     * Validate and restore data from a backup JSON object
     */
    async restoreFromJSON(jsonObj) {
        if (!jsonObj || typeof jsonObj !== 'object') {
            throw new Error('Invalid backup file format: Root must be a JSON object');
        }

        if (!jsonObj.metadata || !jsonObj.data) {
            throw new Error('Invalid backup file: Missing metadata or data sections');
        }

        const requiredTables = [
            'categories',
            'products',
            'drivers',
            'trucks',
            'dispatches',
            'dispatch_items',
            'sales',
            'sale_items',
            'returns',
            'return_items',
            'inventory_transactions'
        ];

        for (const table of requiredTables) {
            if (!Array.isArray(jsonObj.data[table])) {
                throw new Error(`Invalid backup file: Missing or invalid table array "${table}"`);
            }
        }

        // 1. Take safety snapshot of current DB binary in case of restore issues
        const safetySnapshot = dbManager.exportBinary();

        try {
            dbManager.transaction((mgr) => {
                // Clear tables in reverse dependency order
                const deleteOrder = [
                    'return_items',
                    'returns',
                    'sale_edits',
                    'sale_items',
                    'sales',
                    'dispatch_items',
                    'dispatches',
                    'inventory_transactions',
                    'trucks',
                    'drivers',
                    'products',
                    'categories',
                    'settings'
                ];

                deleteOrder.forEach(table => {
                    mgr.run(`DELETE FROM ${table}`);
                });

                // Insert helpers
                const insertRows = (tableName, rows) => {
                    if (!rows || rows.length === 0) return;
                    const cols = Object.keys(rows[0]);
                    const placeholders = cols.map(() => '?').join(', ');
                    const sql = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})`;

                    rows.forEach(row => {
                        const vals = cols.map(c => row[c]);
                        mgr.run(sql, vals);
                    });
                };

                // Restore in forward dependency order
                const insertOrder = [
                    'categories',
                    'products',
                    'drivers',
                    'trucks',
                    'inventory_transactions',
                    'dispatches',
                    'dispatch_items',
                    'sales',
                    'sale_items',
                    'sale_edits',
                    'returns',
                    'return_items',
                    'settings'
                ];

                insertOrder.forEach(table => {
                    if (jsonObj.data[table]) {
                        insertRows(table, jsonObj.data[table]);
                    }
                });
            });

            await dbManager.saveToIndexedDB();
            dbManager.notifyChange('DB_RESTORED');
            return true;
        } catch (err) {
            console.error('Restore failed, reverting from snapshot:', err);
            // Revert from snapshot
            if (safetySnapshot) {
                await dbManager.importBinary(safetySnapshot);
            }
            throw new Error(`Restore failed and was rolled back: ${err.message}`);
        }
    },

    /**
     * Export tabular reports to CSV
     */
    exportCSV(reportType, rows) {
        const dateStr = getTodayDateStr();
        switch (reportType) {
            case 'daily_trucks':
                downloadCSV(`daily-truck-report-${dateStr}.csv`, rows, {
                    truckName: 'Truck',
                    driverName: 'Driver',
                    totalLoaded: 'Loaded Qty',
                    totalSold: 'Sales Qty',
                    totalExpected: 'Expected Return',
                    totalPhysical: 'Physical Return',
                    totalDiff: 'Difference',
                    statusText: 'Status'
                });
                break;
            case 'sales':
                downloadCSV(`sales-report-${dateStr}.csv`, rows, {
                    sale_date: 'Date',
                    truck_name: 'Truck',
                    driver_name: 'Driver',
                    sku: 'SKU',
                    product_name: 'Product',
                    category_name: 'Category',
                    sold_quantity: 'Quantity Sold',
                    sale_price: 'Unit Price',
                    total_amount: 'Total Sales ($)'
                });
                break;
            case 'mismatches':
                downloadCSV(`mismatch-report-${dateStr}.csv`, rows, {
                    date: 'Date',
                    truck_name: 'Truck',
                    driver_name: 'Driver',
                    sku: 'SKU',
                    product_name: 'Product',
                    loaded_quantity: 'Loaded',
                    sold_quantity: 'Sales',
                    expected_quantity: 'Expected Return',
                    physical_quantity: 'Physical Return',
                    difference: 'Difference',
                    mismatch_reason: 'Reason',
                    notes: 'Notes'
                });
                break;
            case 'product_history':
                downloadCSV(`product-history-${dateStr}.csv`, rows, {
                    date: 'Date',
                    truck_name: 'Truck',
                    driver_name: 'Driver',
                    loaded_quantity: 'Loaded',
                    sold_quantity: 'Sales',
                    expected_quantity: 'Expected Return',
                    physical_quantity: 'Physical Return',
                    difference: 'Difference',
                    mismatch_reason: 'Reason'
                });
                break;
            case 'inventory_stock':
                downloadCSV(`warehouse-stock-${dateStr}.csv`, rows, {
                    sku: 'SKU',
                    name: 'Product Name',
                    category_name: 'Category',
                    current_stock: 'Current Stock',
                    minimum_stock: 'Min Stock Level',
                    unit: 'Unit',
                    stock_status: 'Status',
                    sale_price: 'Sale Price'
                });
                break;
            default:
                downloadCSV(`export-${dateStr}.csv`, rows);
        }
    }
};
