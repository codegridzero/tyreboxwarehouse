/**
 * Morning Loading & Dispatch Service
 * 
 * Flow:
 * Warehouse Stock -> Truck Loading -> Morning Dispatch
 * Deducts loaded quantity from warehouse via 'DISPATCH' inventory transaction (-qty).
 */
import { dbManager } from '../db.js';
import { inventoryService } from './inventoryService.js';
import { getTodayDateStr } from '../utils.js';

export const dispatchService = {
    /**
     * Get dispatch for a specific truck and date
     */
    getDispatchByTruckAndDate(truckId, date) {
        if (!date) date = getTodayDateStr();
        const dispatch = dbManager.queryOne(`
            SELECT 
                d.*,
                t.name AS truck_name,
                t.registration_number AS truck_reg,
                dr.name AS driver_name,
                dr.phone AS driver_phone
            FROM dispatches d
            JOIN trucks t ON d.truck_id = t.id
            LEFT JOIN drivers dr ON d.driver_id = dr.id
            WHERE d.truck_id = ? AND d.dispatch_date = ?
        `, [truckId, date]);

        if (!dispatch) return null;

        const items = dbManager.query(`
            SELECT 
                di.*,
                p.sku,
                p.name AS product_name,
                p.brand,
                p.size,
                p.unit,
                c.name AS category_name
            FROM dispatch_items di
            JOIN products p ON di.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE di.dispatch_id = ?
            ORDER BY c.name ASC, p.name ASC
        `, [dispatch.id]);

        return {
            ...dispatch,
            items
        };
    },

    /**
     * Get dispatch by ID
     */
    getDispatchById(id) {
        const dispatch = dbManager.queryOne(`
            SELECT 
                d.*,
                t.name AS truck_name,
                t.registration_number AS truck_reg,
                dr.name AS driver_name,
                dr.phone AS driver_phone
            FROM dispatches d
            JOIN trucks t ON d.truck_id = t.id
            LEFT JOIN drivers dr ON d.driver_id = dr.id
            WHERE d.id = ?
        `, [id]);

        if (!dispatch) return null;

        const items = dbManager.query(`
            SELECT 
                di.*,
                p.sku,
                p.name AS product_name,
                p.brand,
                p.size,
                p.unit,
                c.name AS category_name
            FROM dispatch_items di
            JOIN products p ON di.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE di.dispatch_id = ?
            ORDER BY c.name ASC, p.name ASC
        `, [dispatch.id]);

        return {
            ...dispatch,
            items
        };
    },

    /**
     * Get all dispatches on a date with summary
     */
    getDispatchesByDate(date) {
        if (!date) date = getTodayDateStr();
        const rows = dbManager.query(`
            SELECT 
                d.*,
                t.name AS truck_name,
                t.registration_number AS truck_reg,
                dr.name AS driver_name,
                COALESCE(SUM(di.quantity), 0) AS total_loaded_qty,
                COUNT(di.id) AS item_count
            FROM dispatches d
            JOIN trucks t ON d.truck_id = t.id
            LEFT JOIN drivers dr ON d.driver_id = dr.id
            LEFT JOIN dispatch_items di ON di.dispatch_id = d.id
            WHERE d.dispatch_date = ?
            GROUP BY d.id
            ORDER BY t.name ASC
        `, [date]);

        return rows;
    },

    /**
     * Save or update a Morning Loading Dispatch
     * items: Array of { productId, quantity }
     */
    saveDispatch({ id = null, truckId, driverId = null, dispatchDate, items = [], notes = '', forceOverride = false }) {
        if (!truckId) throw new Error('Truck must be selected');
        if (!dispatchDate) dispatchDate = getTodayDateStr();

        const truck = dbManager.queryOne('SELECT * FROM trucks WHERE id = ?', [truckId]);
        if (!truck) throw new Error('Selected truck does not exist');

        // Filter valid items
        const validItems = items
            .map(i => ({ productId: parseInt(i.productId, 10), quantity: parseInt(i.quantity, 10) || 0 }))
            .filter(i => i.quantity > 0);

        if (validItems.length === 0) {
            throw new Error('Please enter at least one product with loaded quantity > 0');
        }

        // Check for existing dispatch on this date if creating fresh
        let existingDispatch = id ? this.getDispatchById(id) : this.getDispatchByTruckAndDate(truckId, dispatchDate);

        return dbManager.transaction((mgr) => {
            let dispatchId = existingDispatch ? existingDispatch.id : null;

            // Existing loaded item quantities map (to calculate net warehouse availability during edit)
            const existingLoadedMap = new Map();
            if (existingDispatch && existingDispatch.items) {
                existingDispatch.items.forEach(item => {
                    existingLoadedMap.set(item.product_id, item.quantity);
                });
            }

            // Check stock availability for each item
            for (const item of validItems) {
                if (item.quantity < 0) {
                    throw new Error('Loaded quantity cannot be negative');
                }

                const currentStock = inventoryService.getCurrentStock(item.productId);
                const prevLoaded = existingLoadedMap.get(item.productId) || 0;
                // Available stock if we release the previously loaded quantity for this dispatch
                const effectiveAvailable = currentStock + prevLoaded;

                if (item.quantity > effectiveAvailable && !forceOverride) {
                    const prod = mgr.queryOne('SELECT name, sku FROM products WHERE id = ?', [item.productId]);
                    const prodName = prod ? `${prod.name} (${prod.sku})` : `Product #${item.productId}`;
                    throw new Error(`Insufficient warehouse stock for "${prodName}". Available: ${effectiveAvailable}, Attempted: ${item.quantity}`);
                }
            }

            if (dispatchId) {
                // Update dispatch header
                mgr.run(`
                    UPDATE dispatches SET
                        truck_id = ?,
                        driver_id = ?,
                        dispatch_date = ?,
                        notes = ?,
                        updated_at = datetime("now", "localtime")
                    WHERE id = ?
                `, [truckId, driverId || truck.driver_id || null, dispatchDate, notes ? notes.trim() : '', dispatchId]);

                // Clear previous items and inventory deductions
                mgr.run('DELETE FROM dispatch_items WHERE dispatch_id = ?', [dispatchId]);
                mgr.run("DELETE FROM inventory_transactions WHERE reference_type = 'DISPATCH' AND reference_id = ?", [dispatchId]);
            } else {
                // Create new dispatch header
                const result = mgr.run(`
                    INSERT INTO dispatches (
                        truck_id, driver_id, dispatch_date, status, notes,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, 'LOADED', ?, datetime("now", "localtime"), datetime("now", "localtime"))
                `, [truckId, driverId || truck.driver_id || null, dispatchDate, notes ? notes.trim() : '']);

                dispatchId = result.lastInsertRowId;
            }

            // Insert dispatch items and corresponding inventory transactions
            for (const item of validItems) {
                mgr.run(`
                    INSERT INTO dispatch_items (dispatch_id, product_id, quantity)
                    VALUES (?, ?, ?)
                `, [dispatchId, item.productId, item.quantity]);

                // Inventory Transaction: DISPATCH (Deduction, so quantity is negative)
                mgr.run(`
                    INSERT INTO inventory_transactions (
                        product_id, transaction_type, quantity, reference_type,
                        reference_id, transaction_date, notes, created_at
                    ) VALUES (?, 'DISPATCH', ?, 'DISPATCH', ?, ?, ?, datetime("now", "localtime"))
                `, [
                    item.productId,
                    -item.quantity,
                    dispatchId,
                    dispatchDate,
                    `Morning Loading: ${truck.name}`
                ]);
            }

            return dispatchId;
        });
    },

    /**
     * Delete a dispatch (only if no sales or returns are recorded)
     */
    deleteDispatch(dispatchId) {
        const dispatch = this.getDispatchById(dispatchId);
        if (!dispatch) throw new Error('Dispatch not found');

        const sales = dbManager.queryOne('SELECT id FROM sales WHERE dispatch_id = ?', [dispatchId]);
        if (sales) throw new Error('Cannot delete dispatch: Sales records are attached to this dispatch.');

        const returns = dbManager.queryOne('SELECT id FROM returns WHERE dispatch_id = ?', [dispatchId]);
        if (returns) throw new Error('Cannot delete dispatch: Return records are attached to this dispatch.');

        return dbManager.transaction((mgr) => {
            mgr.run("DELETE FROM inventory_transactions WHERE reference_type = 'DISPATCH' AND reference_id = ?", [dispatchId]);
            mgr.run('DELETE FROM dispatch_items WHERE dispatch_id = ?', [dispatchId]);
            mgr.run('DELETE FROM dispatches WHERE id = ?', [dispatchId]);
        });
    }
};
