/**
 * Daily Operations Matrix & Closing Service
 * 
 * Manages daily truck workflow state machine:
 * [Not Started] -> [Loaded] -> [On Route / Sales] -> [Returned / Mismatch] -> [Closed]
 */
import { dbManager } from '../db.js';
import { truckService } from './truckService.js';
import { dispatchService } from './dispatchService.js';
import { salesService } from './salesService.js';
import { returnService } from './returnService.js';
import { getTodayDateStr } from '../utils.js';

export const closingService = {
    /**
     * Get 360-degree daily matrix for all trucks on a date
     */
    getDailyTruckMatrix(date) {
        if (!date) date = getTodayDateStr();

        const trucks = truckService.getTrucks(false);

        return trucks.map(truck => {
            const dispatch = dispatchService.getDispatchByTruckAndDate(truck.id, date);
            const sales = dispatch ? salesService.getSalesByDispatchId(dispatch.id) : null;
            const eveningReturn = dispatch ? returnService.getReturnByDispatchId(dispatch.id) : null;

            // Compute totals
            let totalLoaded = 0;
            let totalSold = 0;
            let totalExpected = 0;
            let totalPhysical = 0;
            let totalDiff = 0;
            let hasMismatch = false;

            if (dispatch && dispatch.items) {
                totalLoaded = dispatch.items.reduce((sum, i) => sum + i.quantity, 0);

                const salesMap = new Map();
                if (sales && sales.items) {
                    sales.items.forEach(si => salesMap.set(si.product_id, si.quantity));
                    totalSold = sales.items.reduce((sum, i) => sum + i.quantity, 0);
                }

                const returnMap = new Map();
                if (eveningReturn && eveningReturn.items) {
                    eveningReturn.items.forEach(ri => returnMap.set(ri.product_id, ri.physical_quantity));
                    totalPhysical = eveningReturn.items.reduce((sum, i) => sum + i.physical_quantity, 0);
                }

                dispatch.items.forEach(item => {
                    const loaded = item.quantity;
                    const sold = salesMap.get(item.product_id) || 0;
                    const expected = Math.max(0, loaded - sold);
                    totalExpected += expected;

                    if (returnMap.has(item.product_id)) {
                        const phys = returnMap.get(item.product_id);
                        const diff = phys - expected;
                        if (diff !== 0) hasMismatch = true;
                    }
                });

                if (eveningReturn) {
                    totalDiff = totalPhysical - totalExpected;
                }
            }

            // Determine status and next action
            let stage = 'NOT_STARTED';
            let statusText = 'Not Loaded';
            let isClosed = false;

            if (dispatch) {
                if (dispatch.status === 'CLOSED' || dispatch.status === 'MISMATCH_CLOSED' ||
                    (eveningReturn && (eveningReturn.status === 'CLOSED' || eveningReturn.status === 'MISMATCH_CLOSED'))) {
                    stage = 'CLOSED';
                    statusText = hasMismatch ? 'Closed (Mismatch)' : 'Closed';
                    isClosed = true;
                } else if (eveningReturn) {
                    stage = hasMismatch ? 'MISMATCH' : 'RETURNED';
                    statusText = hasMismatch ? 'Mismatch' : 'Returned';
                } else if (sales) {
                    stage = 'SALES_ENTERED';
                    statusText = 'On Route (Sales Entered)';
                } else {
                    stage = 'LOADED';
                    statusText = 'Loaded (Pending Sales)';
                }
            }

            const canClose = Boolean(dispatch && sales && eveningReturn && !isClosed);

            return {
                truckId: truck.id,
                truckName: truck.name,
                truckReg: truck.registration_number,
                driverName: truck.driver_name || 'Unassigned',
                driverPhone: truck.driver_phone,
                dispatchId: dispatch ? dispatch.id : null,
                hasDispatch: Boolean(dispatch),
                hasSales: Boolean(sales),
                hasReturn: Boolean(eveningReturn),
                isClosed,
                canClose,
                hasMismatch,
                stage,
                statusText,
                mismatchReason: eveningReturn ? eveningReturn.mismatch_reason : '',
                notes: eveningReturn ? eveningReturn.notes : (dispatch ? dispatch.notes : ''),
                totalLoaded,
                totalSold,
                totalExpected,
                totalPhysical: eveningReturn ? totalPhysical : null,
                totalDiff: eveningReturn ? totalDiff : null,
                dispatch,
                sales,
                eveningReturn
            };
        });
    },

    /**
     * Close truck daily operations
     */
    closeTruck(dispatchId, { mismatchReason = '', notes = '' } = {}) {
        const dispatch = dispatchService.getDispatchById(dispatchId);
        if (!dispatch) throw new Error('Dispatch record not found');

        const sales = salesService.getSalesByDispatchId(dispatchId);
        if (!sales) throw new Error('Cannot close truck: Sales have not been recorded yet.');

        const eveningReturn = returnService.getReturnByDispatchId(dispatchId);
        if (!eveningReturn) throw new Error('Cannot close truck: Evening physical return has not been counted yet.');

        // Check if discrepancy exists
        const returnItems = eveningReturn.items || [];
        const hasDiscrepancy = returnItems.some(i => i.difference !== 0);

        if (hasDiscrepancy && !mismatchReason && !eveningReturn.mismatch_reason) {
            throw new Error('A mismatch reason is required before closing a truck with discrepancy.');
        }

        const closeStatus = hasDiscrepancy ? 'MISMATCH_CLOSED' : 'CLOSED';

        return dbManager.transaction((mgr) => {
            const finalReason = mismatchReason ? mismatchReason.trim() : (eveningReturn.mismatch_reason || '');
            const finalNotes = notes ? notes.trim() : (eveningReturn.notes || '');

            mgr.run(`
                UPDATE returns SET
                    status = ?,
                    mismatch_reason = ?,
                    notes = ?,
                    closed_at = datetime("now", "localtime"),
                    updated_at = datetime("now", "localtime")
                WHERE id = ?
            `, [closeStatus, finalReason, finalNotes, eveningReturn.id]);

            mgr.run(`
                UPDATE dispatches SET
                    status = ?,
                    updated_at = datetime("now", "localtime")
                WHERE id = ?
            `, [closeStatus, dispatchId]);
        });
    },

    /**
     * Get missing workflow alerts for warehouse dashboard
     */
    getWorkflowAlerts(date) {
        if (!date) date = getTodayDateStr();
        const matrix = this.getDailyTruckMatrix(date);
        const alerts = [];

        matrix.forEach(row => {
            if (row.hasDispatch && !row.hasSales) {
                alerts.push({
                    type: 'warning',
                    category: 'MISSING_SALES',
                    truckName: row.truckName,
                    truckId: row.truckId,
                    dispatchId: row.dispatchId,
                    title: `Sales pending for ${row.truckName}`,
                    message: `${row.truckName} has morning loading recorded (${row.totalLoaded} items), but daily sales have not been entered yet.`
                });
            } else if (row.hasDispatch && row.hasSales && !row.hasReturn) {
                alerts.push({
                    type: 'info',
                    category: 'MISSING_RETURN',
                    truckName: row.truckName,
                    truckId: row.truckId,
                    dispatchId: row.dispatchId,
                    title: `Physical return pending for ${row.truckName}`,
                    message: `${row.truckName} has sales recorded, but physical evening return counting is pending.`
                });
            } else if (row.canClose) {
                if (row.hasMismatch) {
                    alerts.push({
                        type: 'danger',
                        category: 'UNCLOSED_MISMATCH',
                        truckName: row.truckName,
                        truckId: row.truckId,
                        dispatchId: row.dispatchId,
                        title: `Discrepancy closing required for ${row.truckName}`,
                        message: `${row.truckName} has physical return discrepancies (Diff: ${row.totalDiff}). Closing requires reason documentation.`
                    });
                } else {
                    alerts.push({
                        type: 'success',
                        category: 'READY_TO_CLOSE',
                        truckName: row.truckName,
                        truckId: row.truckId,
                        dispatchId: row.dispatchId,
                        title: `Ready to close: ${row.truckName}`,
                        message: `${row.truckName} loading, sales, and return are completed and matched. Ready for daily closing.`
                    });
                }
            }
        });

        return alerts;
    }
};
