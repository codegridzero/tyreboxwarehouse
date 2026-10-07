/**
 * Master Daily Operations Control Screen (3-Truck Matrix)
 */
import { closingService } from '../services/closingService.js';
import { formatDate, formatNumber, getStatusBadge } from '../utils.js';
import { modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export const dailyControlPage = {
    render(container, workingDate, onRefresh) {
        const matrix = closingService.getDailyTruckMatrix(workingDate);

        // Calculate totals across all trucks
        let totalLoadedAll = 0;
        let totalSoldAll = 0;
        let totalExpectedAll = 0;
        let totalPhysicalAll = 0;
        let totalDiffAll = 0;
        let hasAnyPhysical = false;

        matrix.forEach(t => {
            totalLoadedAll += t.totalLoaded || 0;
            totalSoldAll += t.totalSold || 0;
            totalExpectedAll += t.totalExpected || 0;
            if (t.totalPhysical !== null) {
                totalPhysicalAll += t.totalPhysical;
                totalDiffAll += (t.totalDiff || 0);
                hasAnyPhysical = true;
            }
        });

        const rowsHtml = matrix.map(t => {
            const statusBadge = getStatusBadge(t.statusText);

            // Loading column
            const loadingCell = t.hasDispatch
                ? `<div>
                     <span class="font-bold text-gray-900">${formatNumber(t.totalLoaded)} pcs</span>
                     <span class="block text-[11px] text-gray-500">${t.dispatch.items.length} products</span>
                     <a href="#loading?truckId=${t.truckId}&date=${workingDate}" class="text-[11px] text-sky-600 font-semibold hover:underline">Edit Load</a>
                   </div>`
                : `<a href="#loading?truckId=${t.truckId}&date=${workingDate}" class="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
                     + Load Truck
                   </a>`;

            // Sales column
            const salesCell = t.hasSales
                ? `<div>
                     <span class="font-bold text-gray-900">${formatNumber(t.totalSold)} pcs</span>
                     <span class="block text-[11px] text-gray-500">${t.sales.items.length} sold</span>
                     <a href="#sales?truckId=${t.truckId}&date=${workingDate}" class="text-[11px] text-sky-600 font-semibold hover:underline">Edit Sales</a>
                   </div>`
                : (t.hasDispatch
                    ? `<a href="#sales?truckId=${t.truckId}&date=${workingDate}" class="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200">
                         + Enter Sales
                       </a>`
                    : `<span class="text-xs text-gray-400 italic">Pending Load</span>`);

            // Expected return column
            const expectedCell = t.hasDispatch
                ? `<span class="font-bold text-gray-800">${formatNumber(t.totalExpected)} pcs</span>`
                : `<span class="text-xs text-gray-400">—</span>`;

            // Physical return column
            const returnCell = t.hasReturn
                ? `<div>
                     <span class="font-bold text-gray-900">${formatNumber(t.totalPhysical)} pcs</span>
                     <a href="#returns?truckId=${t.truckId}&date=${workingDate}" class="block text-[11px] text-purple-600 font-semibold hover:underline">Edit Return</a>
                   </div>`
                : (t.hasDispatch
                    ? `<a href="#returns?truckId=${t.truckId}&date=${workingDate}" class="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200">
                         + Count Return
                       </a>`
                    : `<span class="text-xs text-gray-400 italic">Pending</span>`);

            // Difference column
            let diffCell = '<span class="text-xs text-gray-400">—</span>';
            if (t.totalDiff !== null) {
                if (t.totalDiff === 0) {
                    diffCell = `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">0 (Matched)</span>`;
                } else {
                    const sign = t.totalDiff > 0 ? '+' : '';
                    diffCell = `<div>
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">${sign}${t.totalDiff} (Mismatch)</span>
                        ${t.mismatchReason ? `<span class="block text-[10px] text-red-600 truncate max-w-[120px]" title="${t.mismatchReason}">Reason: ${t.mismatchReason}</span>` : ''}
                    </div>`;
                }
            }

            // Action button
            let actionBtnHtml = '';
            if (t.isClosed) {
                actionBtnHtml = `<span class="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <svg class="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                    Closed
                </span>`;
            } else if (t.canClose) {
                actionBtnHtml = `<button data-action="close-truck" data-dispatch-id="${t.dispatchId}" data-truck-name="${t.truckName}" data-has-mismatch="${t.hasMismatch}" data-diff="${t.totalDiff}" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                    Close Truck &rarr;
                </button>`;
            } else if (!t.hasDispatch) {
                actionBtnHtml = `<a href="#loading?truckId=${t.truckId}&date=${workingDate}" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                    Start Loading
                </a>`;
            } else if (!t.hasSales) {
                actionBtnHtml = `<a href="#sales?truckId=${t.truckId}&date=${workingDate}" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                    Enter Sales
                </a>`;
            } else if (!t.hasReturn) {
                actionBtnHtml = `<a href="#returns?truckId=${t.truckId}&date=${workingDate}" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                    Physical Return
                </a>`;
            }

            return `
                <tr class="table-row-hover transition-colors">
                    <td class="px-4 py-3.5 whitespace-nowrap">
                        <div class="font-bold text-gray-900 text-sm">${t.truckName}</div>
                        <div class="text-xs text-gray-500 font-medium">Driver: <span class="text-gray-700 font-semibold">${t.driverName}</span> ${t.truckReg ? `(${t.truckReg})` : ''}</div>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap">${loadingCell}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap">${salesCell}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap">${expectedCell}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap">${returnCell}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap">${diffCell}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap">${statusBadge}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap text-right">${actionBtnHtml}</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="space-y-6 animate-fade-in">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900">Daily Operations Matrix</h2>
                        <p class="text-sm text-gray-500">Live operational workflow and daily closing control for <span class="font-semibold text-gray-800">${formatDate(workingDate)}</span></p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <a href="#loading?date=${workingDate}" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                            + Load Truck
                        </a>
                        <a href="#sales?date=${workingDate}" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                            + Sales Entry
                        </a>
                        <a href="#returns?date=${workingDate}" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                            + Evening Return
                        </a>
                    </div>
                </div>

                <!-- Workflow Progress Bar Indicator -->
                <div class="bg-white p-4 rounded-xl shadow-xs border border-gray-200 flex items-center justify-between overflow-x-auto text-xs font-semibold">
                    <div class="flex items-center space-x-2 text-indigo-700">
                        <span class="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center font-bold">1</span>
                        <span>Morning Loading</span>
                    </div>
                    <span class="text-gray-300 font-bold">&rarr;</span>
                    <div class="flex items-center space-x-2 text-sky-700">
                        <span class="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center font-bold">2</span>
                        <span>Day Sales Entry</span>
                    </div>
                    <span class="text-gray-300 font-bold">&rarr;</span>
                    <div class="flex items-center space-x-2 text-purple-700">
                        <span class="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center font-bold">3</span>
                        <span>Evening Physical Count</span>
                    </div>
                    <span class="text-gray-300 font-bold">&rarr;</span>
                    <div class="flex items-center space-x-2 text-emerald-700">
                        <span class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center font-bold">4</span>
                        <span>Daily Closing & Next Day Flow</span>
                    </div>
                </div>

                <!-- Master Matrix Table -->
                <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                            <thead class="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                                <tr>
                                    <th class="px-4 py-3.5">Truck & Driver</th>
                                    <th class="px-4 py-3.5">Morning Loading</th>
                                    <th class="px-4 py-3.5">Manual Sales</th>
                                    <th class="px-4 py-3.5">Expected Return</th>
                                    <th class="px-4 py-3.5">Physical Return</th>
                                    <th class="px-4 py-3.5">Difference</th>
                                    <th class="px-4 py-3.5">Daily Status</th>
                                    <th class="px-4 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 bg-white">
                                ${rowsHtml}
                            </tbody>
                            <!-- Aggregate Footer -->
                            <tfoot class="bg-slate-100 font-bold text-slate-800 text-xs">
                                <tr>
                                    <td class="px-4 py-3 text-gray-900">Total All Trucks</td>
                                    <td class="px-4 py-3">${formatNumber(totalLoadedAll)} pcs</td>
                                    <td class="px-4 py-3">${formatNumber(totalSoldAll)} pcs</td>
                                    <td class="px-4 py-3">${formatNumber(totalExpectedAll)} pcs</td>
                                    <td class="px-4 py-3">${hasAnyPhysical ? `${formatNumber(totalPhysicalAll)} pcs` : '—'}</td>
                                    <td class="px-4 py-3">${hasAnyPhysical ? `${totalDiffAll >= 0 ? '+' : ''}${totalDiffAll}` : '—'}</td>
                                    <td class="px-4 py-3" colspan="2"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <!-- Quick Help / Workflow Rule Note -->
                <div class="p-4 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-900 flex items-start space-x-3">
                    <svg class="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <div>
                        <strong class="font-bold">Truck Closing Rule:</strong> A truck can be marked <strong>Closed</strong> once Morning Loading, Sales, and Physical Return are entered. If a discrepancy exists (Difference &ne; 0), a reason must be recorded before closing. The physically counted returned stock automatically returns to warehouse available inventory for the next day.
                    </div>
                </div>
            </div>
        `;

        // Bind Close Truck button handlers
        container.querySelectorAll('[data-action="close-truck"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dispatchId = btn.getAttribute('data-dispatch-id');
                const truckName = btn.getAttribute('data-truck-name');
                const hasMismatch = btn.getAttribute('data-has-mismatch') === 'true';
                const diff = btn.getAttribute('data-diff');

                this.openCloseTruckModal(dispatchId, truckName, hasMismatch, diff, onRefresh);
            });
        });
    },

    openCloseTruckModal(dispatchId, truckName, hasMismatch, diff, onRefresh) {
        if (!hasMismatch) {
            // Normal Matched Closing
            modal.show({
                title: `Close Operations for ${truckName}`,
                content: `
                    <div class="space-y-4">
                        <div class="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200 flex items-center">
                            <svg class="w-4 h-4 mr-2 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                            All items match physical counts perfectly (Difference: 0).
                        </div>
                        <p class="text-sm text-gray-600">
                            Confirm closing for <strong>${truckName}</strong>? This will lock today's operations and verify returned goods are added back to warehouse inventory.
                        </p>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Optional Closing Notes</label>
                            <textarea id="close-notes" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Route completed on time"></textarea>
                        </div>
                        <div class="flex justify-end space-x-2 pt-3 border-t">
                            <button type="button" id="modal-cancel-close" class="px-4 py-2 border rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                            <button type="button" id="modal-confirm-close" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs">Confirm Daily Closing</button>
                        </div>
                    </div>
                `,
                onOpen: (modalEl, close) => {
                    modalEl.querySelector('#modal-cancel-close').addEventListener('click', close);
                    modalEl.querySelector('#modal-confirm-close').addEventListener('click', () => {
                        const notes = modalEl.querySelector('#close-notes').value;
                        try {
                            closingService.closeTruck(dispatchId, { mismatchReason: '', notes });
                            toast.success(`${truckName} daily operations successfully closed!`);
                            close();
                            if (onRefresh) onRefresh();
                        } catch (err) {
                            toast.error(err.message);
                        }
                    });
                }
            });
        } else {
            // Discrepancy Closing Modal: MUST REQUIRE MISMATCH REASON!
            modal.show({
                title: `Discrepancy Notice: Close ${truckName}`,
                content: `
                    <div class="space-y-4">
                        <div class="p-3 bg-red-50 text-red-800 rounded-lg text-xs font-semibold border border-red-200">
                            <strong>Warning:</strong> A stock discrepancy of <strong>${diff}</strong> exists between manual sales and physical return count.
                        </div>
                        <p class="text-xs text-gray-600">
                            To close this truck, business policy requires selecting a discrepancy reason. Entered sales and physical returns will remain preserved.
                        </p>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Discrepancy Reason <span class="text-red-500">*</span></label>
                            <select id="mismatch-reason-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 bg-white">
                                <option value="">-- Select Reason --</option>
                                <option value="Counting Error">Counting Error</option>
                                <option value="Sales Entry Error">Sales Entry Error</option>
                                <option value="Damaged Product">Damaged Product</option>
                                <option value="Missing Product">Missing Product</option>
                                <option value="Extra Product">Extra Product</option>
                                <option value="Data Entry Error">Data Entry Error</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Detailed Explanation / Notes <span class="text-red-500">*</span></label>
                            <textarea id="mismatch-notes" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500" placeholder="e.g. 1 unit unaccounted for; driver notes damaged tire left at client location"></textarea>
                        </div>
                        <div class="flex justify-end space-x-2 pt-3 border-t">
                            <button type="button" id="modal-cancel-close" class="px-4 py-2 border rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                            <button type="button" id="modal-confirm-close" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs">Confirm & Close with Discrepancy</button>
                        </div>
                    </div>
                `,
                onOpen: (modalEl, close) => {
                    modalEl.querySelector('#modal-cancel-close').addEventListener('click', close);
                    modalEl.querySelector('#modal-confirm-close').addEventListener('click', () => {
                        const reason = modalEl.querySelector('#mismatch-reason-select').value;
                        const notes = modalEl.querySelector('#mismatch-notes').value;

                        if (!reason) {
                            toast.error('Please select a discrepancy reason');
                            return;
                        }
                        if (!notes || !notes.trim()) {
                            toast.error('Please provide an explanatory note for the discrepancy');
                            return;
                        }

                        try {
                            closingService.closeTruck(dispatchId, { mismatchReason: reason, notes });
                            toast.warning(`${truckName} closed with discrepancy noted: ${reason}`);
                            close();
                            if (onRefresh) onRefresh();
                        } catch (err) {
                            toast.error(err.message);
                        }
                    });
                }
            });
        }
    }
};
