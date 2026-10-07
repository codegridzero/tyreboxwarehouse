/**
 * Daily Sales Entry Service
 * 
 * Flow:
 * Salesman sells products at customer sites during the day.
 * Sales are entered manually into the system.
 * Expected Remaining = Loaded - Sales (calculated for reference only).
 * 
 * IMPORTANT: Sales do NOT create inventory transactions.
 */
import { dbManager } from '../db.js';
import { dispatchService } from './dispatchService.js';
import { getTodayDateStr } from '../utils.js';

export const salesService = {
    /**
     * Get sales record for a given dispatch ID
     */
    getSalesByDispatchId(dispatchId) {
        const sale = dbManager.queryOne(`
            SELECT 
                s.*,
                t.name AS truck_name,
                dr.name AS driver_name
            FROM sales s
            JOIN trucks t ON s.truck_id = t.id
            LEFT JOIN dispatches d ON s.dispatch_id = d.id
            LEFT JOIN drivers dr ON d.driver_id = dr.id
            WHERE s.dispatch_id = ?
        `, [dispatchId]);

        if (!sale) return null;

        const items = dbManager.query(`
            SELECT 
                si.*,
                p.sku,
                p.name AS product_name,
                p.brand,
                p.size,
                p.unit,
                p.sale_price AS default_sale_price,
                c.name AS category_name,
                di.quantity AS loaded_quantity
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN dispatch_items di ON di.dispatch_id = ? AND di.product_id = si.product_id
            WHERE si.sale_id = ?
            ORDER BY c.name ASC, p.name ASC
        `, [dispatchId, sale.id]);

        return {
            ...sale,
            items
        };
    },

    /**
     * Get sales by truck and date
     */
    getSalesByTruckAndDate(truckId, date) {
        if (!date) date = getTodayDateStr();
        const dispatch = dispatchService.getDispatchByTruckAndDate(truckId, date);
        if (!dispatch) return null;
        return this.getSalesByDispatchId(dispatch.id);
    },

    /**
     * Get sale edit audit history for an item or sale
     */
    getSaleAuditLog(saleId) {
        return dbManager.query(`
            SELECT 
                se.*,
                p.sku,
                p.name AS product_name
            FROM sale_edits se
            JOIN sale_items si ON se.sale_item_id = si.id
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = ?
            ORDER BY se.changed_at DESC
        `, [saleId]);
    },

    /**
     * Save or update manual sales entry
     * items: Array of { productId, quantity, salePrice, notes }
     */
    saveSales({ dispatchId, truckId, saleDate, items = [], notes = '', editReason = '' }) {
        if (!dispatchId) throw new Error('Dispatch ID is required');
        if (!truckId) throw new Error('Truck ID is required');
        if (!saleDate) saleDate = getTodayDateStr();

        const dispatch = dispatchService.getDispatchById(dispatchId);
        if (!dispatch) throw new Error('Associated dispatch not found');

        // Build loaded items lookup
        const loadedMap = new Map();
        dispatch.items.forEach(item => {
            loadedMap.set(item.product_id, item.quantity);
        });

        // Validate items
        const processedItems = items.map(i => ({
            productId: parseInt(i.productId, 10),
            quantity: parseInt(i.quantity, 10) || 0,
            salePrice: Number(i.salePrice) || 0,
            notes: i.notes ? i.notes.trim() : ''
        }));

        for (const item of processedItems) {
            if (item.quantity < 0) {
                throw new Error('Sales quantity cannot be negative');
            }
            const loadedQty = loadedMap.get(item.productId) || 0;
            if (item.quantity > loadedQty) {
                const prod = dbManager.queryOne('SELECT name FROM products WHERE id = ?', [item.productId]);
                const name = prod ? prod.name : `Product #${item.productId}`;
                throw new Error(`Sales quantity (${item.quantity}) cannot exceed loaded quantity (${loadedQty}) for "${name}"`);
            }
        }

        return dbManager.transaction((mgr) => {
            const existingSale = this.getSalesByDispatchId(dispatchId);
            let saleId = existingSale ? existingSale.id : null;

            if (saleId) {
                // Update header
                mgr.run(`
                    UPDATE sales SET
                        sale_date = ?,
                        notes = ?,
                        updated_at = datetime("now", "localtime")
                    WHERE id = ?
                `, [saleDate, notes ? notes.trim() : '', saleId]);

                // Map previous items for audit log
                const prevItemsMap = new Map();
                existingSale.items.forEach(si => {
                    prevItemsMap.set(si.product_id, { id: si.id, quantity: si.quantity });
                });

                for (const item of processedItems) {
                    const prev = prevItemsMap.get(item.productId);
                    if (prev) {
                        // Check if quantity changed
                        if (prev.quantity !== item.quantity) {
                            mgr.run(`
                                INSERT INTO sale_edits (sale_item_id, prev_quantity, new_quantity, reason, changed_at)
                                VALUES (?, ?, ?, ?, datetime("now", "localtime"))
                            `, [
                                prev.id,
                                prev.quantity,
                                item.quantity,
                                editReason || 'Sales quantity adjusted'
                            ]);
                        }

                        mgr.run(`
                            UPDATE sale_items SET
                                quantity = ?,
                                sale_price = ?,
                                notes = ?
                            WHERE id = ?
                        `, [item.quantity, item.salePrice, item.notes, prev.id]);

                        prevItemsMap.delete(item.productId);
                    } else {
                        // New item added to existing sale
                        mgr.run(`
                            INSERT INTO sale_items (sale_id, product_id, quantity, sale_price, notes)
                            VALUES (?, ?, ?, ?, ?)
                        `, [saleId, item.productId, item.quantity, item.salePrice, item.notes]);
                    }
                }

                // Delete any removed items
                for (const [_, oldItem] of prevItemsMap) {
                    mgr.run('DELETE FROM sale_items WHERE id = ?', [oldItem.id]);
                }
            } else {
                // Insert new sale
                const result = mgr.run(`
                    INSERT INTO sales (dispatch_id, truck_id, sale_date, status, notes, created_at, updated_at)
                    VALUES (?, ?, ?, 'RECORDED', ?, datetime("now", "localtime"), datetime("now", "localtime"))
                `, [dispatchId, truckId, saleDate, notes ? notes.trim() : '']);

                saleId = result.lastInsertRowId;

                for (const item of processedItems) {
                    mgr.run(`
                        INSERT INTO sale_items (sale_id, product_id, quantity, sale_price, notes)
                        VALUES (?, ?, ?, ?, ?)
                    `, [saleId, item.productId, item.quantity, item.salePrice, item.notes]);
                }
            }

            // Update dispatch status to ON_ROUTE if currently LOADED
            if (dispatch.status === 'LOADED') {
                mgr.run("UPDATE dispatches SET status = 'ON_ROUTE', updated_at = datetime('now', 'localtime') WHERE id = ?", [dispatchId]);
            }

            return saleId;
        });
    }
};
