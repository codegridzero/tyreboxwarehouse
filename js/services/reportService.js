/**
 * Comprehensive Reporting Service
 */
import { dbManager } from '../db.js';
import { inventoryService } from './inventoryService.js';
import { closingService } from './closingService.js';
import { getTodayDateStr } from '../utils.js';

export const reportService = {
    /**
     * Daily Operational & Reconciliation Report
     */
    getDailyReport(date) {
        if (!date) date = getTodayDateStr();

        // 1. Warehouse Stock Summary
        const openingStock = inventoryService.getOpeningStock(null, date);
        const currentStock = inventoryService.getCurrentStock(null, date);

        const loadedTx = dbManager.queryOne(`
            SELECT COALESCE(ABS(SUM(quantity)), 0) AS total_loaded
            FROM inventory_transactions
            WHERE transaction_type = 'DISPATCH' AND transaction_date = ?
        `, [date]);

        const returnTx = dbManager.queryOne(`
            SELECT COALESCE(SUM(quantity), 0) AS total_return
            FROM inventory_transactions
            WHERE transaction_type = 'PHYSICAL_RETURN' AND transaction_date = ?
        `, [date]);

        const totalLoaded = loadedTx ? loadedTx.total_loaded : 0;
        const totalPhysicalReturn = returnTx ? returnTx.total_return : 0;
        const closingStock = currentStock;

        // 2. Sales Summary
        const salesRows = dbManager.query(`
            SELECT 
                si.product_id,
                p.sku,
                p.name AS product_name,
                c.name AS category_name,
                SUM(si.quantity) AS total_sold_qty,
                AVG(si.sale_price) AS avg_price,
                SUM(si.quantity * si.sale_price) AS total_revenue
            FROM sales s
            JOIN sale_items si ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE s.sale_date = ?
            GROUP BY si.product_id
            ORDER BY total_sold_qty DESC
        `, [date]);

        const totalSold = salesRows.reduce((sum, r) => sum + r.total_sold_qty, 0);
        const totalRevenue = salesRows.reduce((sum, r) => sum + r.total_revenue, 0);

        // 3. Truck Matrix
        const truckMatrix = closingService.getDailyTruckMatrix(date);

        // 4. Discrepancies
        const discrepancies = dbManager.query(`
            SELECT 
                r.return_date,
                t.name AS truck_name,
                dr.name AS driver_name,
                p.sku,
                p.name AS product_name,
                c.name AS category_name,
                di.quantity AS loaded_quantity,
                COALESCE(si.quantity, 0) AS sold_quantity,
                ri.expected_quantity,
                ri.physical_quantity,
                ri.difference,
                r.mismatch_reason,
                r.notes,
                r.status
            FROM returns r
            JOIN trucks t ON r.truck_id = t.id
            LEFT JOIN dispatches d ON r.dispatch_id = d.id
            LEFT JOIN drivers dr ON d.driver_id = dr.id
            JOIN return_items ri ON ri.return_id = r.id
            JOIN products p ON ri.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN dispatch_items di ON di.dispatch_id = r.dispatch_id AND di.product_id = ri.product_id
            LEFT JOIN (
                SELECT s.dispatch_id, si_sub.product_id, SUM(si_sub.quantity) AS quantity
                FROM sales s
                JOIN sale_items si_sub ON si_sub.sale_id = s.id
                WHERE s.sale_date = ?
                GROUP BY si_sub.product_id
            ) si ON si.product_id = ri.product_id
            WHERE r.return_date = ? AND ri.difference != 0
            ORDER BY t.name ASC
        `, [date, date]);

        return {
            date,
            warehouse: {
                openingStock,
                totalLoaded,
                totalPhysicalReturn,
                closingStock
            },
            sales: {
                totalSold,
                totalRevenue,
                byProduct: salesRows
            },
            trucks: truckMatrix,
            discrepancies
        };
    },

    /**
     * Truck Performance and Movement Report
     */
    getTruckReport({ truckId = null, fromDate = null, toDate = null } = {}) {
        let sql = `
            SELECT 
                d.dispatch_date AS date,
                t.name AS truck_name,
                t.registration_number AS truck_reg,
                dr.name AS driver_name,
                d.status AS dispatch_status,
                r.status AS return_status,
                COALESCE(SUM(di.quantity), 0) AS total_loaded,
                COALESCE(sales_sum.total_sold, 0) AS total_sold,
                COALESCE(return_sum.total_expected, 0) AS total_expected,
                COALESCE(return_sum.total_physical, 0) AS total_physical,
                COALESCE(return_sum.total_diff, 0) AS total_diff,
                r.mismatch_reason,
                r.notes
            FROM dispatches d
            JOIN trucks t ON d.truck_id = t.id
            LEFT JOIN drivers dr ON d.driver_id = dr.id
            LEFT JOIN dispatch_items di ON di.dispatch_id = d.id
            LEFT JOIN returns r ON r.dispatch_id = d.id
            LEFT JOIN (
                SELECT s.dispatch_id, SUM(si.quantity) AS total_sold
                FROM sales s
                JOIN sale_items si ON si.sale_id = s.id
                GROUP BY s.dispatch_id
            ) sales_sum ON sales_sum.dispatch_id = d.id
            LEFT JOIN (
                SELECT 
                    ri.return_id,
                    SUM(ri.expected_quantity) AS total_expected,
                    SUM(ri.physical_quantity) AS total_physical,
                    SUM(ri.difference) AS total_diff
                FROM return_items ri
                GROUP BY ri.return_id
            ) return_sum ON return_sum.return_id = r.id
            WHERE 1=1
        `;
        const params = [];

        if (truckId) {
            sql += ' AND d.truck_id = ?';
            params.push(truckId);
        }
        if (fromDate) {
            sql += ' AND d.dispatch_date >= ?';
            params.push(fromDate);
        }
        if (toDate) {
            sql += ' AND d.dispatch_date <= ?';
            params.push(toDate);
        }

        sql += ' GROUP BY d.id ORDER BY d.dispatch_date DESC, t.name ASC';
        return dbManager.query(sql, params);
    },

    /**
     * Product Reconciliation and Stock Flow Report
     */
    getProductReport({ productId, fromDate = null, toDate = null }) {
        if (!productId) throw new Error('Product is required');

        const product = dbManager.queryOne(`
            SELECT p.*, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        `, [productId]);

        let sql = `
            SELECT 
                d.dispatch_date AS date,
                t.name AS truck_name,
                dr.name AS driver_name,
                di.quantity AS loaded_quantity,
                COALESCE(si.quantity, 0) AS sold_quantity,
                COALESCE(ri.expected_quantity, (di.quantity - COALESCE(si.quantity, 0))) AS expected_quantity,
                ri.physical_quantity,
                ri.difference,
                r.mismatch_reason,
                r.status AS return_status
            FROM dispatch_items di
            JOIN dispatches d ON di.dispatch_id = d.id
            JOIN trucks t ON d.truck_id = t.id
            LEFT JOIN drivers dr ON d.driver_id = dr.id
            LEFT JOIN (
                SELECT s.dispatch_id, si_sub.product_id, SUM(si_sub.quantity) AS quantity
                FROM sales s
                JOIN sale_items si_sub ON si_sub.sale_id = s.id
                GROUP BY s.dispatch_id, si_sub.product_id
            ) si ON si.dispatch_id = d.id AND si.product_id = di.product_id
            LEFT JOIN returns r ON r.dispatch_id = d.id
            LEFT JOIN return_items ri ON ri.return_id = r.id AND ri.product_id = di.product_id
            WHERE di.product_id = ?
        `;
        const params = [productId];

        if (fromDate) {
            sql += ' AND d.dispatch_date >= ?';
            params.push(fromDate);
        }
        if (toDate) {
            sql += ' AND d.dispatch_date <= ?';
            params.push(toDate);
        }

        sql += ' ORDER BY d.dispatch_date DESC';
        const rows = dbManager.query(sql, params);

        return {
            product,
            rows
        };
    },

    /**
     * Detailed Sales Report
     */
    getSalesReport({ fromDate = null, toDate = null, truckId = null, categoryId = null, productId = null } = {}) {
        let sql = `
            SELECT 
                s.sale_date,
                t.name AS truck_name,
                dr.name AS driver_name,
                p.sku,
                p.name AS product_name,
                c.name AS category_name,
                si.quantity AS sold_quantity,
                si.sale_price,
                (si.quantity * si.sale_price) AS total_amount,
                si.notes AS item_notes
            FROM sales s
            JOIN sale_items si ON si.sale_id = s.id
            JOIN trucks t ON s.truck_id = t.id
            LEFT JOIN dispatches d ON s.dispatch_id = d.id
            LEFT JOIN drivers dr ON d.driver_id = dr.id
            JOIN products p ON si.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (fromDate) {
            sql += ' AND s.sale_date >= ?';
            params.push(fromDate);
        }
        if (toDate) {
            sql += ' AND s.sale_date <= ?';
            params.push(toDate);
        }
        if (truckId) {
            sql += ' AND s.truck_id = ?';
            params.push(truckId);
        }
        if (categoryId) {
            sql += ' AND p.category_id = ?';
            params.push(categoryId);
        }
        if (productId) {
            sql += ' AND si.product_id = ?';
            params.push(productId);
        }

        sql += ' ORDER BY s.sale_date DESC, t.name ASC';
        return dbManager.query(sql, params);
    },

    /**
     * Discrepancies and Mismatch Report
     */
    getMismatchReport({ fromDate = null, toDate = null, truckId = null, productId = null, reason = null } = {}) {
        let sql = `
            SELECT 
                r.return_date AS date,
                t.name AS truck_name,
                dr.name AS driver_name,
                p.sku,
                p.name AS product_name,
                c.name AS category_name,
                di.quantity AS loaded_quantity,
                COALESCE(si.quantity, 0) AS sold_quantity,
                ri.expected_quantity,
                ri.physical_quantity,
                ri.difference,
                r.mismatch_reason,
                r.notes,
                r.status,
                r.closed_at
            FROM return_items ri
            JOIN returns r ON ri.return_id = r.id
            JOIN trucks t ON r.truck_id = t.id
            LEFT JOIN dispatches d ON r.dispatch_id = d.id
            LEFT JOIN drivers dr ON d.driver_id = dr.id
            JOIN products p ON ri.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN dispatch_items di ON di.dispatch_id = r.dispatch_id AND di.product_id = ri.product_id
            LEFT JOIN (
                SELECT s.dispatch_id, si_sub.product_id, SUM(si_sub.quantity) AS quantity
                FROM sales s
                JOIN sale_items si_sub ON si_sub.sale_id = s.id
                GROUP BY s.dispatch_id, si_sub.product_id
            ) si ON si.dispatch_id = r.dispatch_id AND si.product_id = ri.product_id
            WHERE ri.difference != 0
        `;
        const params = [];

        if (fromDate) {
            sql += ' AND r.return_date >= ?';
            params.push(fromDate);
        }
        if (toDate) {
            sql += ' AND r.return_date <= ?';
            params.push(toDate);
        }
        if (truckId) {
            sql += ' AND r.truck_id = ?';
            params.push(truckId);
        }
        if (productId) {
            sql += ' AND ri.product_id = ?';
            params.push(productId);
        }
        if (reason && reason.trim()) {
            sql += ' AND r.mismatch_reason LIKE ?';
            params.push(`%${reason.trim()}%`);
        }

        sql += ' ORDER BY r.return_date DESC, t.name ASC';
        return dbManager.query(sql, params);
    }
};
