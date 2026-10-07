/**
 * Inventory Ledger and Stock Calculation Service
 * 
 * Strict physical stock accounting:
 * Warehouse Stock = Initial + Adjustments - Dispatches + Physical Returns
 * (Sales are tracked separately for reconciliation, NEVER as a double deduction)
 */
import { dbManager } from '../db.js';
import { getTodayDateStr } from '../utils.js';

export const inventoryService = {
    /**
     * Get calculated current warehouse stock for a product
     */
    getCurrentStock(productId, asOfDate = null) {
        let sql = `
            SELECT COALESCE(SUM(quantity), 0) AS current_stock
            FROM inventory_transactions
            WHERE product_id = ?
        `;
        const params = [productId];

        if (asOfDate) {
            sql += ' AND transaction_date <= ?';
            params.push(asOfDate);
        }

        const res = dbManager.queryOne(sql, params);
        return res ? res.current_stock : 0;
    },

    /**
     * Get opening stock for a product at the start of a specific date (prior transactions)
     */
    getOpeningStock(productId, date) {
        if (!date) date = getTodayDateStr();
        const sql = `
            SELECT COALESCE(SUM(quantity), 0) AS opening_stock
            FROM inventory_transactions
            WHERE product_id = ? AND transaction_date < ?
        `;
        const res = dbManager.queryOne(sql, [productId, date]);
        return res ? res.opening_stock : 0;
    },

    /**
     * Get stock overview for all active products
     */
    getAllProductsStock(asOfDate = null, includeInactive = false) {
        const dateCondition = asOfDate ? 'AND it.transaction_date <= ?' : '';
        const activeCondition = includeInactive ? '' : 'WHERE p.active = 1';

        const sql = `
            SELECT 
                p.id,
                p.sku,
                p.name,
                p.category_id,
                c.name AS category_name,
                p.brand,
                p.size,
                p.type,
                p.unit,
                p.cost_price,
                p.sale_price,
                p.minimum_stock,
                p.active,
                COALESCE(stock_summary.current_stock, 0) AS current_stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN (
                SELECT product_id, SUM(quantity) AS current_stock
                FROM inventory_transactions it
                WHERE 1=1 ${dateCondition}
                GROUP BY product_id
            ) stock_summary ON stock_summary.product_id = p.id
            ${activeCondition}
            ORDER BY c.name ASC, p.name ASC
        `;

        const params = asOfDate ? [asOfDate] : [];
        const rows = dbManager.query(sql, params);

        return rows.map(r => {
            let status = 'Normal';
            if (r.current_stock <= 0) {
                status = 'Out of Stock';
            } else if (r.current_stock <= r.minimum_stock) {
                status = 'Low Stock';
            }
            return {
                ...r,
                stock_status: status
            };
        });
    },

    /**
     * Get total quantity of items currently in the warehouse
     */
    getTotalWarehouseStock(asOfDate = null) {
        let sql = 'SELECT COALESCE(SUM(quantity), 0) AS total_qty FROM inventory_transactions';
        const params = [];
        if (asOfDate) {
            sql += ' WHERE transaction_date <= ?';
            params.push(asOfDate);
        }
        const res = dbManager.queryOne(sql, params);
        return res ? res.total_qty : 0;
    },

    /**
     * Get list of low stock or out-of-stock products
     */
    getLowStockProducts(asOfDate = null) {
        const allStock = this.getAllProductsStock(asOfDate, false);
        return allStock.filter(p => p.current_stock <= p.minimum_stock);
    },

    /**
     * Record Initial Stock for a product
     */
    recordInitialStock(productId, quantity, date = null, notes = 'Initial warehouse stock') {
        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty < 0) throw new Error('Initial stock quantity must be a non-negative number');
        const txDate = date || getTodayDateStr();

        return dbManager.transaction((mgr) => {
            // Remove previous initial stock entry if exists to avoid duplication
            mgr.run(`
                DELETE FROM inventory_transactions
                WHERE product_id = ? AND transaction_type = 'INITIAL_STOCK'
            `, [productId]);

            if (qty > 0) {
                mgr.run(`
                    INSERT INTO inventory_transactions (
                        product_id, transaction_type, quantity, reference_type,
                        reference_id, transaction_date, notes, created_at
                    ) VALUES (?, 'INITIAL_STOCK', ?, 'INITIAL', NULL, ?, ?, datetime("now", "localtime"))
                `, [productId, qty, txDate, notes.trim()]);
            }
        });
    },

    /**
     * Record manual Stock Adjustment (e.g. physical recount discrepancy, damage, etc.)
     */
    recordAdjustment(productId, quantityDelta, reason, date = null, notes = '') {
        const delta = parseInt(quantityDelta, 10);
        if (isNaN(delta) || delta === 0) throw new Error('Adjustment quantity delta cannot be zero');
        if (!reason || !reason.trim()) throw new Error('Reason for adjustment is required');

        const txDate = date || getTodayDateStr();
        const fullNotes = `Reason: ${reason.trim()}${notes ? ' | ' + notes.trim() : ''}`;

        const result = dbManager.run(`
            INSERT INTO inventory_transactions (
                product_id, transaction_type, quantity, reference_type,
                reference_id, transaction_date, notes, created_at
            ) VALUES (?, 'STOCK_ADJUSTMENT', ?, 'ADJUSTMENT', NULL, ?, ?, datetime("now", "localtime"))
        `, [productId, delta, txDate, fullNotes]);

        dbManager.notifyChange('STOCK_ADJUSTED', { productId, delta });
        return result.lastInsertRowId;
    },

    /**
     * Get inventory transaction ledger for product or whole warehouse
     */
    getLedger({ productId = null, fromDate = null, toDate = null, limit = 100 } = {}) {
        let sql = `
            SELECT 
                it.*,
                p.sku,
                p.name AS product_name,
                p.unit,
                c.name AS category_name
            FROM inventory_transactions it
            JOIN products p ON it.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (productId) {
            sql += ' AND it.product_id = ?';
            params.push(productId);
        }
        if (fromDate) {
            sql += ' AND it.transaction_date >= ?';
            params.push(fromDate);
        }
        if (toDate) {
            sql += ' AND it.transaction_date <= ?';
            params.push(toDate);
        }

        sql += ' ORDER BY it.transaction_date DESC, it.id DESC LIMIT ?';
        params.push(limit);

        return dbManager.query(sql, params);
    }
};
