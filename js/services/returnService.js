/**
 * Evening Physical Return & Reconciliation Service
 * 
 * Logic:
 * 1. Expected Remaining = Loaded - Sales
 * 2. Physical Return = Actual quantity physically counted when truck returns
 * 3. Return Difference = Physical Return - Expected Remaining
 * 4. Matched (Diff == 0) vs Mismatch (Diff != 0)
 * 5. Physical Return quantity is added back to warehouse stock via 'PHYSICAL_RETURN' (+qty)
 */
import { dbManager } from '../db.js';
import { dispatchService } from './dispatchService.js';
import { salesService } from './salesService.js';
import { getTodayDateStr } from '../utils.js';

export const returnService = {
    /**
     * Get evening return for a dispatch ID
     */
    getReturnByDispatchId(dispatchId) {
        const ret = dbManager.queryOne(`
            SELECT 
                r.*,
                t.name AS truck_name,
                dr.name AS driver_name
            FROM returns r
            JOIN trucks t ON r.truck_id = t.id
            LEFT JOIN dispatches d ON r.dispatch_id = d.id
            LEFT JOIN drivers dr ON d.driver_id = dr.id
            WHERE r.dispatch_id = ?
        `, [dispatchId]);

        if (!ret) return null;

        const items = dbManager.query(`
            SELECT 
                ri.*,
                p.sku,
                p.name AS product_name,
                p.brand,
                p.size,
                p.unit,
                c.name AS category_name,
                COALESCE(di.quantity, 0) AS loaded_quantity,
                COALESCE(si.quantity, 0) AS sold_quantity
            FROM return_items ri
            JOIN products p ON ri.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN dispatch_items di ON di.dispatch_id = ? AND di.product_id = ri.product_id
            LEFT JOIN (
                SELECT s.dispatch_id, si_sub.product_id, SUM(si_sub.quantity) AS quantity
                FROM sales s
                JOIN sale_items si_sub ON si_sub.sale_id = s.id
                WHERE s.dispatch_id = ?
                GROUP BY si_sub.product_id
            ) si ON si.product_id = ri.product_id
            WHERE ri.return_id = ?
            ORDER BY c.name ASC, p.name ASC
        `, [dispatchId, dispatchId, ret.id]);

        return {
            ...ret,
            items
        };
    },

    /**
     * Get evening return by truck and date
     */
    getReturnByTruckAndDate(truckId, date) {
        if (!date) date = getTodayDateStr();
        const dispatch = dispatchService.getDispatchByTruckAndDate(truckId, date);
        if (!dispatch) return null;
        return this.getReturnByDispatchId(dispatch.id);
    },

    /**
     * Prepare reconciliation worksheet for a dispatch
     * Aggregates: Loaded, Sales, Expected, and any existing Physical Return
     */
    getReconciliationWorksheet(dispatchId) {
        const dispatch = dispatchService.getDispatchById(dispatchId);
        if (!dispatch) throw new Error('Dispatch not found');

        const sales = salesService.getSalesByDispatchId(dispatchId);
        const existingReturn = this.getReturnByDispatchId(dispatchId);

        // Sales map
        const salesMap = new Map();
        if (sales && sales.items) {
            sales.items.forEach(si => salesMap.set(si.product_id, si.quantity));
        }

        // Return map
        const returnMap = new Map();
        if (existingReturn && existingReturn.items) {
            existingReturn.items.forEach(ri => returnMap.set(ri.product_id, ri.physical_quantity));
        }

        const items = dispatch.items.map(di => {
            const loaded = di.quantity;
            const sold = salesMap.get(di.product_id) || 0;
            const expected = Math.max(0, loaded - sold);
            const physical = returnMap.has(di.product_id) ? returnMap.get(di.product_id) : null;
            const diff = physical !== null ? physical - expected : null;

            return {
                productId: di.product_id,
                productName: di.product_name,
                sku: di.sku,
                brand: di.brand,
                size: di.size,
                unit: di.unit,
                categoryName: di.category_name,
                loadedQuantity: loaded,
                soldQuantity: sold,
                expectedQuantity: expected,
                physicalQuantity: physical,
                difference: diff
            };
        });

        const hasSales = Boolean(sales);
        const hasReturn = Boolean(existingReturn);

        return {
            dispatch,
            sales,
            existingReturn,
            hasSales,
            hasReturn,
            items
        };
    },

    /**
     * Save Evening Physical Return and update warehouse inventory transactions
     * items: Array of { productId, physicalQuantity }
     */
    saveReturn({
        dispatchId,
        truckId,
        returnDate,
        items = [],
        mismatchReason = '',
        notes = '',
        markClosed = false
    }) {
        if (!dispatchId) throw new Error('Dispatch ID is required');
        if (!truckId) throw new Error('Truck ID is required');
        if (!returnDate) returnDate = getTodayDateStr();

        const dispatch = dispatchService.getDispatchById(dispatchId);
        if (!dispatch) throw new Error('Associated dispatch not found');

        const sales = salesService.getSalesByDispatchId(dispatchId);
        const salesMap = new Map();
        if (sales && sales.items) {
            sales.items.forEach(si => salesMap.set(si.product_id, si.quantity));
        }

        // Loaded map
        const loadedMap = new Map();
        dispatch.items.forEach(item => {
            loadedMap.set(item.product_id, item.quantity);
        });

        // Compute items reconciliation
        let hasMismatch = false;
        const processedItems = items.map(i => {
            const productId = parseInt(i.productId, 10);
            const physicalQty = parseInt(i.physicalQuantity, 10);
            if (isNaN(physicalQty) || physicalQty < 0) {
                throw new Error('Physical return quantity must be a non-negative number');
            }

            const loadedQty = loadedMap.get(productId) || 0;
            const soldQty = salesMap.get(productId) || 0;
            const expectedQty = Math.max(0, loadedQty - soldQty);
            const difference = physicalQty - expectedQty;

            if (difference !== 0) {
                hasMismatch = true;
            }

            return {
                productId,
                physicalQuantity: physicalQty,
                expectedQuantity: expectedQty,
                difference
            };
        });

        if (hasMismatch && markClosed && (!mismatchReason || !mismatchReason.trim())) {
            throw new Error('A reason is required before closing a truck with stock discrepancies');
        }

        return dbManager.transaction((mgr) => {
            const existingReturn = this.getReturnByDispatchId(dispatchId);
            let returnId = existingReturn ? existingReturn.id : null;

            const finalStatus = markClosed
                ? (hasMismatch ? 'MISMATCH_CLOSED' : 'CLOSED')
                : (hasMismatch ? 'MISMATCH' : 'MATCHED');

            const dispatchStatus = markClosed
                ? (hasMismatch ? 'MISMATCH_CLOSED' : 'CLOSED')
                : (hasMismatch ? 'MISMATCH' : 'RETURNED');

            if (returnId) {
                // Update return header
                mgr.run(`
                    UPDATE returns SET
                        return_date = ?,
                        status = ?,
                        mismatch_reason = ?,
                        notes = ?,
                        closed_at = ?,
                        updated_at = datetime("now", "localtime")
                    WHERE id = ?
                `, [
                    returnDate,
                    finalStatus,
                    mismatchReason ? mismatchReason.trim() : (existingReturn.mismatch_reason || ''),
                    notes ? notes.trim() : (existingReturn.notes || ''),
                    markClosed ? (existingReturn.closed_at || new Date().toISOString()) : null,
                    returnId
                ]);

                // Remove previous return items and previous inventory returns
                mgr.run('DELETE FROM return_items WHERE return_id = ?', [returnId]);
                mgr.run("DELETE FROM inventory_transactions WHERE reference_type = 'RETURN' AND reference_id = ?", [returnId]);
            } else {
                // Insert new return header
                const result = mgr.run(`
                    INSERT INTO returns (
                        dispatch_id, truck_id, return_date, status, mismatch_reason,
                        notes, closed_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now", "localtime"), datetime("now", "localtime"))
                `, [
                    dispatchId,
                    truckId,
                    returnDate,
                    finalStatus,
                    mismatchReason ? mismatchReason.trim() : '',
                    notes ? notes.trim() : '',
                    markClosed ? new Date().toISOString() : null
                ]);

                returnId = result.lastInsertRowId;
            }

            // Insert return items and inventory replenishment
            for (const item of processedItems) {
                mgr.run(`
                    INSERT INTO return_items (return_id, product_id, physical_quantity, expected_quantity, difference)
                    VALUES (?, ?, ?, ?, ?)
                `, [returnId, item.productId, item.physicalQuantity, item.expectedQuantity, item.difference]);

                // IMPORTANT: Add physical returned stock back to warehouse inventory
                if (item.physicalQuantity > 0) {
                    mgr.run(`
                        INSERT INTO inventory_transactions (
                            product_id, transaction_type, quantity, reference_type,
                            reference_id, transaction_date, notes, created_at
                        ) VALUES (?, 'PHYSICAL_RETURN', ?, 'RETURN', ?, ?, ?, datetime("now", "localtime"))
                    `, [
                        item.productId,
                        item.physicalQuantity,
                        returnId,
                        returnDate,
                        `Evening return: ${dispatch.truck_name}`
                    ]);
                }
            }

            // Update dispatch status
            mgr.run(`
                UPDATE dispatches SET
                    status = ?,
                    updated_at = datetime("now", "localtime")
                WHERE id = ?
            `, [dispatchStatus, dispatchId]);

            return { returnId, status: finalStatus, hasMismatch };
        });
    }
};
