/**
 * Evening Physical Return & Reconciliation Screen
 */
import { truckService } from '../services/truckService.js';
import { dispatchService } from '../services/dispatchService.js';
import { returnService } from '../services/returnService.js';
import { formatDate, formatNumber, getStatusBadge } from '../utils.js';
import { toast } from '../components/toast.js';

export const returnsPage = {
    render(container, workingDate, urlParams = {}) {
        const trucks = truckService.getTrucks(false);
        if (trucks.length === 0) {
            container.innerHTML = `<div class="p-8 text-center bg-white rounded-xl border">No trucks configured.</div>`;
            return;
        }

        const selectedTruckId = parseInt(urlParams.truckId, 10) || trucks[0].id;
        const selectedDate = urlParams.date || workingDate;

        const selectedTruck = trucks.find(t => t.id === selectedTruckId) || trucks[0];
        const dispatch = dispatchService.getDispatchByTruckAndDate(selectedTruckId, selectedDate);

        if (!dispatch) {
            container.innerHTML = `
                <div class="space-y-6 animate-fade-in max-w-4xl mx-auto">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900">Evening Physical Return</h2>
                            <p class="text-sm text-gray-500">Count and reconcile physical inventory returned to the warehouse at end of day.</p>
                        </div>
                        <a href="#daily-control?date=${selectedDate}" class="text-xs font-bold text-gray-600 hover:text-gray-900">&larr; Back to Matrix</a>
                    </div>

                    <!-- Config Card -->
                    <div class="bg-white p-5 rounded-xl shadow-xs border border-gray-200">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Return Date</label>
                                <input type="date" id="return-date-input" value="${selectedDate}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Select Truck</label>
                                <select id="return-truck-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold bg-white">
                                    ${trucks.map(t => `<option value="${t.id}" ${t.id === selectedTruckId ? 'selected' : ''}>${t.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="p-12 text-center bg-white rounded-xl border border-dashed border-gray-300 space-y-3">
                        <div class="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        </div>
                        <h3 class="text-base font-bold text-gray-900">No Morning Dispatch Found</h3>
                        <p class="text-xs text-gray-500 max-w-md mx-auto">
                            No loading dispatch was recorded for <strong>${selectedTruck.name}</strong> on <strong>${formatDate(selectedDate)}</strong>.
                        </p>
                        <a href="#loading?truckId=${selectedTruckId}&date=${selectedDate}" class="mt-2 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-xs">
                            + Record Morning Loading
                        </a>
                    </div>
                </div>
            `;

            container.querySelector('#return-truck-select').addEventListener('change', (e) => {
                window.location.hash = `#returns?truckId=${e.target.value}&date=${selectedDate}`;
            });
            container.querySelector('#return-date-input').addEventListener('change', (e) => {
                window.location.hash = `#returns?truckId=${selectedTruckId}&date=${e.target.value}`;
            });
            return;
        }

        const worksheet = returnService.getReconciliationWorksheet(dispatch.id);
        const existingReturn = worksheet.existingReturn;

        const tableRowsHtml = worksheet.items.map(item => {
            const initialPhysicalVal = item.physicalQuantity !== null ? item.physicalQuantity : '';

            return `
                <tr class="table-row-hover transition-colors" data-product-id="${item.productId}" data-expected="${item.expectedQuantity}">
                    <td class="px-4 py-3.5 whitespace-nowrap">
                        <div class="font-bold text-gray-900 text-sm">${item.productName}</div>
                        <div class="text-xs text-gray-500 font-mono">${item.sku} ${item.brand ? `&bull; ${item.brand}` : ''}</div>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap text-right text-sm font-semibold text-gray-700">
                        ${formatNumber(item.loadedQuantity)} ${item.unit}
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap text-right text-sm font-semibold text-gray-700">
                        ${formatNumber(item.soldQuantity)} ${item.unit}
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap text-right text-sm font-bold text-sky-800 bg-sky-50/40">
                        <span class="expected-qty-val">${formatNumber(item.expectedQuantity)}</span> ${item.unit}
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap text-right">
                        <div class="inline-flex items-center space-x-1">
                            <input type="number"
                                   min="0"
                                   data-prod-id="${item.productId}"
                                   data-expected="${item.expectedQuantity}"
                                   value="${initialPhysicalVal}"
                                   placeholder="0"
                                   class="physical-qty-input w-28 px-3 py-1.5 border border-purple-300 rounded-lg text-sm font-bold text-right focus:ring-2 focus:ring-purple-500 bg-purple-50/30 tabular-nums">
                            <span class="text-xs text-gray-400 w-8 text-left">${item.unit}</span>
                        </div>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap text-right text-sm font-bold item-diff-cell">
                        <span class="diff-badge inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600">—</span>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="space-y-6 animate-fade-in max-w-5xl mx-auto">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 uppercase">Phase 3: Evening Operation</span>
                            ${existingReturn ? `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">Return Recorded (${existingReturn.status})</span>` : ''}
                        </div>
                        <h2 class="text-2xl font-bold text-gray-900 mt-1">Evening Physical Return & Reconciliation</h2>
                        <p class="text-sm text-gray-500">
                            Physically count actual inventory remaining on <strong>${selectedTruck.name}</strong> upon return.
                        </p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <a href="#daily-control?date=${selectedDate}" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition">
                            &larr; Back to Matrix
                        </a>
                    </div>
                </div>

                <!-- Config Switcher -->
                <div class="bg-white p-5 rounded-xl shadow-xs border border-gray-200">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Return Date</label>
                            <input type="date" id="return-date-input" value="${selectedDate}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Select Truck</label>
                            <select id="return-truck-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold bg-white">
                                ${trucks.map(t => `<option value="${t.id}" ${t.id === selectedTruckId ? 'selected' : ''}>${t.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Route Driver</label>
                            <div class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800">
                                ${dispatch.driver_name || 'No driver assigned'}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Live Status Banner (Mismatch / Matched) -->
                <div id="reconciliation-status-banner" class="hidden p-4 rounded-xl border flex items-center justify-between transition-all">
                    <!-- Dynamic Banner Content -->
                </div>

                <!-- Return Worksheet Table -->
                <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                    <div class="p-4 bg-slate-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wider">Physical Count Worksheet</h3>
                            <p class="text-xs text-gray-500">
                                Enter the <strong>Physical Return</strong> physically counted. Difference = <code class="text-purple-700 font-mono">Physical Return &minus; Expected Remaining</code>
                            </p>
                        </div>
                        <div class="text-xs text-gray-600 flex items-center space-x-4">
                            <span>Total Counted: <strong id="total-physical-badge" class="text-purple-700 font-extrabold text-sm">0</strong> pcs</span>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                            <thead class="bg-gray-50 text-gray-500 uppercase font-semibold">
                                <tr>
                                    <th class="px-4 py-3">Product / SKU</th>
                                    <th class="px-4 py-3 text-right">Morning Loaded</th>
                                    <th class="px-4 py-3 text-right">Manual Sales</th>
                                    <th class="px-4 py-3 text-right bg-sky-50/50">Expected Return</th>
                                    <th class="px-4 py-3 text-right text-purple-800">Physical Return Count</th>
                                    <th class="px-4 py-3 text-right">Difference</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 bg-white">
                                ${tableRowsHtml}
                            </tbody>
                        </table>
                    </div>

                    <!-- Discrepancy Reason Section (Revealed if difference != 0) -->
                    <div id="mismatch-section" class="p-5 bg-red-50/70 border-t border-red-200 space-y-3 hidden">
                        <div class="flex items-center space-x-2 text-red-800 font-bold text-xs uppercase tracking-wider">
                            <svg class="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                            <span>Discrepancy Justification (Required for Mismatch)</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-red-900 mb-1">Discrepancy Reason</label>
                                <select id="mismatch-reason-select" class="w-full px-3 py-2 border border-red-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-500">
                                    <option value="">-- Select Reason --</option>
                                    <option value="Counting Error" ${existingReturn && existingReturn.mismatch_reason === 'Counting Error' ? 'selected' : ''}>Counting Error</option>
                                    <option value="Sales Entry Error" ${existingReturn && existingReturn.mismatch_reason === 'Sales Entry Error' ? 'selected' : ''}>Sales Entry Error</option>
                                    <option value="Damaged Product" ${existingReturn && existingReturn.mismatch_reason === 'Damaged Product' ? 'selected' : ''}>Damaged Product</option>
                                    <option value="Missing Product" ${existingReturn && existingReturn.mismatch_reason === 'Missing Product' ? 'selected' : ''}>Missing Product</option>
                                    <option value="Extra Product" ${existingReturn && existingReturn.mismatch_reason === 'Extra Product' ? 'selected' : ''}>Extra Product</option>
                                    <option value="Data Entry Error" ${existingReturn && existingReturn.mismatch_reason === 'Data Entry Error' ? 'selected' : ''}>Data Entry Error</option>
                                    <option value="Other" ${existingReturn && existingReturn.mismatch_reason === 'Other' ? 'selected' : ''}>Other</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-red-900 mb-1">Detailed Explanation / Notes</label>
                                <input type="text" id="mismatch-notes-input" value="${existingReturn ? (existingReturn.notes || '') : ''}" placeholder="e.g. 1 unit unaccounted for; driver investigating" class="w-full px-3 py-2 border border-red-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500">
                            </div>
                        </div>
                    </div>

                    <!-- Actions & Submit Bar -->
                    <div class="p-4 bg-slate-50 border-t border-gray-200 space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">General Evening Return Notes (Optional)</label>
                            <input type="text" id="return-general-notes" value="${existingReturn ? (existingReturn.notes || '') : ''}" placeholder="e.g. Evening truck inspection clean" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs">
                        </div>

                        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                            <div class="text-xs text-gray-500">
                                <strong>Next-Day Flow:</strong> Actual physical return quantity will be replenished back to warehouse stock.
                            </div>
                            <div class="flex items-center space-x-3">
                                <button type="button" id="btn-save-return" class="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold shadow-sm transition">
                                    Save Return Count
                                </button>
                                <button type="button" id="btn-save-and-close" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition">
                                    Save & Close Truck &rarr;
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(container, selectedTruckId, selectedDate, dispatch, existingReturn);
    },

    bindEvents(container, currentTruckId, currentDate, dispatch, existingReturn) {
        const truckSelect = container.querySelector('#return-truck-select');
        const dateInput = container.querySelector('#return-date-input');
        const qtyInputs = container.querySelectorAll('.physical-qty-input');
        const totalBadge = container.querySelector('#total-physical-badge');
        const statusBanner = container.querySelector('#reconciliation-status-banner');
        const mismatchSection = container.querySelector('#mismatch-section');
        const saveReturnBtn = container.querySelector('#btn-save-return');
        const saveAndCloseBtn = container.querySelector('#btn-save-and-close');

        const updateDiffsAndReconciliation = () => {
            let totalPhysical = 0;
            let totalExpectedAll = 0;
            let totalDiff = 0;
            let hasAnyMismatch = false;
            let hasEnteredAny = false;

            qtyInputs.forEach(input => {
                const physicalValStr = input.value;
                const physicalVal = parseInt(physicalValStr, 10);
                const expectedVal = parseInt(input.getAttribute('data-expected'), 10) || 0;
                const row = input.closest('tr');
                const diffBadge = row.querySelector('.diff-badge');

                totalExpectedAll += expectedVal;

                if (physicalValStr !== '' && !isNaN(physicalVal)) {
                    hasEnteredAny = true;
                    totalPhysical += physicalVal;
                    const diff = physicalVal - expectedVal;
                    totalDiff += diff;

                    if (diff === 0) {
                        diffBadge.className = 'diff-badge inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
                        diffBadge.textContent = '0 (Matched)';
                    } else {
                        hasAnyMismatch = true;
                        const sign = diff > 0 ? '+' : '';
                        diffBadge.className = 'diff-badge inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200';
                        diffBadge.textContent = `${sign}${diff} (Mismatch)`;
                    }
                } else {
                    diffBadge.className = 'diff-badge inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-500';
                    diffBadge.textContent = '—';
                }
            });

            totalBadge.textContent = formatNumber(totalPhysical);

            if (hasEnteredAny) {
                statusBanner.classList.remove('hidden');
                if (hasAnyMismatch) {
                    statusBanner.className = 'p-4 rounded-xl border bg-red-50 border-red-200 text-red-900 flex items-center justify-between';
                    statusBanner.innerHTML = `
                        <div class="flex items-center space-x-3">
                            <span class="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold">!</span>
                            <div>
                                <h4 class="text-sm font-bold">Stock Discrepancy Detected (Net Difference: ${totalDiff > 0 ? '+' : ''}${totalDiff})</h4>
                                <p class="text-xs text-red-700">Physical return count does not match expected remaining. Reason documentation is required before closing.</p>
                            </div>
                        </div>
                        <span class="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-extrabold uppercase tracking-wide">MISMATCH</span>
                    `;
                    mismatchSection.classList.remove('hidden');
                } else {
                    statusBanner.className = 'p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 flex items-center justify-between';
                    statusBanner.innerHTML = `
                        <div class="flex items-center space-x-3">
                            <span class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">&#10003;</span>
                            <div>
                                <h4 class="text-sm font-bold">All Products Matched Perfectly (Difference: 0)</h4>
                                <p class="text-xs text-emerald-700">Physical counted inventory precisely matches Expected Remaining (Loaded &minus; Sales).</p>
                            </div>
                        </div>
                        <span class="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-extrabold uppercase tracking-wide">MATCHED</span>
                    `;
                    mismatchSection.classList.add('hidden');
                }
            } else {
                statusBanner.classList.add('hidden');
                mismatchSection.classList.add('hidden');
            }

            return { hasAnyMismatch, totalDiff };
        };

        qtyInputs.forEach(input => input.addEventListener('input', updateDiffsAndReconciliation));
        updateDiffsAndReconciliation();

        truckSelect.addEventListener('change', () => {
            window.location.hash = `#returns?truckId=${truckSelect.value}&date=${dateInput.value}`;
        });
        dateInput.addEventListener('change', () => {
            window.location.hash = `#returns?truckId=${truckSelect.value}&date=${dateInput.value}`;
        });

        const performSave = (markClosed) => {
            const returnDate = dateInput.value;
            const mismatchReason = container.querySelector('#mismatch-reason-select').value;
            const mismatchNotes = container.querySelector('#mismatch-notes-input').value;
            const generalNotes = container.querySelector('#return-general-notes').value;

            const items = [];
            let allFilled = true;

            qtyInputs.forEach(input => {
                const productId = parseInt(input.getAttribute('data-prod-id'), 10);
                const valStr = input.value.trim();
                if (valStr === '') {
                    allFilled = false;
                }
                const physicalQuantity = parseInt(valStr, 10) || 0;
                items.push({ productId, physicalQuantity });
            });

            if (!allFilled) {
                toast.warning('Please enter physical count for all loaded products (enter 0 if none remain)');
                return;
            }

            const { hasAnyMismatch } = updateDiffsAndReconciliation();

            if (hasAnyMismatch && markClosed && !mismatchReason) {
                toast.error('A discrepancy reason is required before closing this truck');
                container.querySelector('#mismatch-reason-select').focus();
                return;
            }

            try {
                const finalNotes = mismatchNotes ? `${mismatchNotes}${generalNotes ? ' | ' + generalNotes : ''}` : generalNotes;

                returnService.saveReturn({
                    dispatchId: dispatch.id,
                    truckId: currentTruckId,
                    returnDate,
                    items,
                    mismatchReason,
                    notes: finalNotes,
                    markClosed
                });

                if (markClosed) {
                    toast.success(`${truckSelect.options[truckSelect.selectedIndex].text} evening return recorded and truck closed!`);
                } else {
                    toast.success(`${truckSelect.options[truckSelect.selectedIndex].text} evening physical return count saved.`);
                }

                window.location.hash = `#daily-control?date=${returnDate}`;
            } catch (err) {
                toast.error(err.message);
            }
        };

        saveReturnBtn.addEventListener('click', () => performSave(false));
        saveAndCloseBtn.addEventListener('click', () => performSave(true));
    }
};
