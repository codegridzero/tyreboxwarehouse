/**
 * Manual Daily Sales Entry Screen
 */
import { truckService } from '../services/truckService.js';
import { dispatchService } from '../services/dispatchService.js';
import { salesService } from '../services/salesService.js';
import { formatDate, formatNumber, formatCurrency, formatDateTime } from '../utils.js';
import { toast } from '../components/toast.js';
import { modal } from '../components/modal.js';

export const salesPage = {
    render(container, workingDate, urlParams = {}) {
        const trucks = truckService.getTrucks(false);
        if (trucks.length === 0) {
            container.innerHTML = `<div class="p-8 text-center bg-white rounded-xl border">No trucks configured.</div>`;
            return;
        }

        const selectedTruckId = parseInt(urlParams.truckId, 10) || trucks[0].id;
        const selectedDate = urlParams.date || workingDate;

        const dispatch = dispatchService.getDispatchByTruckAndDate(selectedTruckId, selectedDate);
        const existingSales = dispatch ? salesService.getSalesByDispatchId(dispatch.id) : null;
        const selectedTruck = trucks.find(t => t.id === selectedTruckId) || trucks[0];

        if (!dispatch) {
            container.innerHTML = `
                <div class="space-y-6 animate-fade-in max-w-4xl mx-auto">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900">Daily Sales Entry</h2>
                            <p class="text-sm text-gray-500">Record customer sales made by salesmen during the route.</p>
                        </div>
                        <a href="#daily-control?date=${selectedDate}" class="text-xs font-bold text-gray-600 hover:text-gray-900">&larr; Back to Matrix</a>
                    </div>

                    <!-- Config Card -->
                    <div class="bg-white p-5 rounded-xl shadow-xs border border-gray-200">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Sales Date</label>
                                <input type="date" id="sales-date-input" value="${selectedDate}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Select Truck</label>
                                <select id="sales-truck-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold bg-white">
                                    ${trucks.map(t => `<option value="${t.id}" ${t.id === selectedTruckId ? 'selected' : ''}>${t.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="p-12 text-center bg-white rounded-xl border border-dashed border-gray-300 space-y-3">
                        <div class="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        </div>
                        <h3 class="text-base font-bold text-gray-900">No Morning Loading Dispatch Found</h3>
                        <p class="text-xs text-gray-500 max-w-md mx-auto">
                            No morning dispatch was recorded for <strong>${selectedTruck.name}</strong> on <strong>${formatDate(selectedDate)}</strong>. You must record morning loading before entering sales.
                        </p>
                        <a href="#loading?truckId=${selectedTruckId}&date=${selectedDate}" class="mt-2 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-xs">
                            + Record Morning Loading for ${selectedTruck.name}
                        </a>
                    </div>
                </div>
            `;

            container.querySelector('#sales-truck-select').addEventListener('change', (e) => {
                window.location.hash = `#sales?truckId=${e.target.value}&date=${selectedDate}`;
            });
            container.querySelector('#sales-date-input').addEventListener('change', (e) => {
                window.location.hash = `#sales?truckId=${selectedTruckId}&date=${e.target.value}`;
            });
            return;
        }

        // Map existing sales
        const salesMap = new Map();
        if (existingSales && existingSales.items) {
            existingSales.items.forEach(i => salesMap.set(i.product_id, i));
        }

        const itemsRowsHtml = dispatch.items.map(di => {
            const saleItem = salesMap.get(di.product_id);
            const soldQty = saleItem ? saleItem.quantity : 0;
            const salePrice = saleItem ? saleItem.sale_price : (di.default_sale_price || 0);
            const expectedRemaining = Math.max(0, di.quantity - soldQty);

            return `
                <tr class="table-row-hover transition-colors" data-product-id="${di.product_id}" data-loaded="${di.quantity}">
                    <td class="px-4 py-3.5 whitespace-nowrap">
                        <div class="font-bold text-gray-900 text-sm">${di.product_name}</div>
                        <div class="text-xs text-gray-500 font-mono">${di.sku} ${di.brand ? `&bull; ${di.brand}` : ''}</div>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap text-right font-bold text-gray-900 text-sm">
                        <span class="px-2 py-0.5 bg-slate-100 rounded text-slate-800">${formatNumber(di.quantity)} ${di.unit}</span>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap text-right">
                        <div class="inline-flex items-center space-x-1">
                            <input type="number"
                                   min="0"
                                   max="${di.quantity}"
                                   data-prod-id="${di.product_id}"
                                   data-loaded="${di.quantity}"
                                   value="${soldQty > 0 ? soldQty : (existingSales ? 0 : '')}"
                                   placeholder="0"
                                   class="sale-qty-input w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-bold text-right focus:ring-2 focus:ring-sky-500 tabular-nums">
                            <span class="text-xs text-gray-400 w-8 text-left">${di.unit}</span>
                        </div>
                        <div class="sale-error-msg hidden text-[10px] text-red-600 font-bold mt-1">Exceeds loaded qty!</div>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap text-right font-bold text-sm text-sky-700">
                        <span class="expected-display">${formatNumber(expectedRemaining)}</span> <span class="text-xs text-gray-400 font-normal">${di.unit}</span>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap text-right">
                        <div class="inline-flex items-center">
                            <span class="text-xs text-gray-400 mr-1">$</span>
                            <input type="number"
                                   step="0.01"
                                   min="0"
                                   data-price-prod-id="${di.product_id}"
                                   value="${salePrice || ''}"
                                   placeholder="0.00"
                                   class="sale-price-input w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-right focus:ring-2 focus:ring-sky-500 tabular-nums">
                        </div>
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
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 uppercase">Phase 2: Daytime Operation</span>
                            ${existingSales ? `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">Sales Recorded</span>` : ''}
                        </div>
                        <h2 class="text-2xl font-bold text-gray-900 mt-1">Manual Sales Entry</h2>
                        <p class="text-sm text-gray-500">
                            Enter manual sales reported by salesman for <strong>${selectedTruck.name}</strong> on <span class="font-semibold text-gray-800">${formatDate(selectedDate)}</span>
                        </p>
                    </div>
                    <div class="flex items-center space-x-2">
                        ${existingSales ? `
                            <button type="button" id="btn-view-audit-log" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition">
                                View Edit Log
                            </button>
                        ` : ''}
                        <a href="#daily-control?date=${selectedDate}" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition">
                            &larr; Back to Matrix
                        </a>
                    </div>
                </div>

                <!-- Config Switcher -->
                <div class="bg-white p-5 rounded-xl shadow-xs border border-gray-200">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Sales Date</label>
                            <input type="date" id="sales-date-input" value="${selectedDate}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Select Truck</label>
                            <select id="sales-truck-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold bg-white">
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

                <!-- Sales Entry Table -->
                <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                    <div class="p-4 bg-slate-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wider">Dispatched Products & Sales Recording</h3>
                            <p class="text-xs text-gray-500">Sales are entered manually. Expected remaining is calculated automatically as <code class="text-sky-700 font-mono">Loaded &minus; Sales</code></p>
                        </div>
                        <div class="text-xs text-gray-600 flex items-center space-x-4">
                            <span>Total Sold: <strong id="total-sold-badge" class="text-sky-700 font-extrabold text-sm">0</strong> pcs</span>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                            <thead class="bg-gray-50 text-gray-500 uppercase font-semibold">
                                <tr>
                                    <th class="px-4 py-3">Product / SKU</th>
                                    <th class="px-4 py-3 text-right">Morning Loaded</th>
                                    <th class="px-4 py-3 text-right">Manual Sales Quantity</th>
                                    <th class="px-4 py-3 text-right">Expected Remaining</th>
                                    <th class="px-4 py-3 text-right">Sale Price (Optional)</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 bg-white">
                                ${itemsRowsHtml}
                            </tbody>
                        </table>
                    </div>

                    <!-- Notes & Submit -->
                    <div class="p-4 bg-slate-50 border-t border-gray-200 space-y-4">
                        ${existingSales ? `
                            <div>
                                <label class="block text-xs font-bold text-amber-800 mb-1">Reason for Editing Sales (Audit Requirement)</label>
                                <input type="text" id="sales-edit-reason" placeholder="e.g. Salesman corrected duplicate invoice entry" class="w-full px-3 py-2 border border-amber-300 bg-amber-50 rounded-lg text-xs">
                            </div>
                        ` : ''}

                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Customer / Route Sales Notes</label>
                            <input type="text" id="sales-notes" value="${existingSales ? (existingSales.notes || '') : ''}" placeholder="e.g. Route customer deliveries completed" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs">
                        </div>

                        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                            <div class="text-xs text-gray-500">
                                <strong>Important:</strong> Sales entry records business sales activity and does not double-deduct warehouse stock.
                            </div>
                            <div class="flex items-center space-x-2">
                                <button type="button" id="btn-save-sales" class="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-bold shadow-sm transition">
                                    ${existingSales ? 'Update Sales Entry' : 'Save Sales Record'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(container, selectedTruckId, selectedDate, dispatch, existingSales);
    },

    bindEvents(container, currentTruckId, currentDate, dispatch, existingSales) {
        const truckSelect = container.querySelector('#sales-truck-select');
        const dateInput = container.querySelector('#sales-date-input');
        const qtyInputs = container.querySelectorAll('.sale-qty-input');
        const totalSoldBadge = container.querySelector('#total-sold-badge');
        const saveBtn = container.querySelector('#btn-save-sales');
        const auditLogBtn = container.querySelector('#btn-view-audit-log');

        const updateExpectedAndTotals = () => {
            let totalSold = 0;
            let hasError = false;

            qtyInputs.forEach(input => {
                const val = parseInt(input.value, 10) || 0;
                const loaded = parseInt(input.getAttribute('data-loaded'), 10) || 0;
                const row = input.closest('tr');
                const errorMsg = row.querySelector('.sale-error-msg');
                const expectedDisplay = row.querySelector('.expected-display');

                const expected = Math.max(0, loaded - val);
                if (expectedDisplay) expectedDisplay.textContent = formatNumber(expected);

                if (val > loaded) {
                    hasError = true;
                    input.classList.add('border-red-500', 'bg-red-50');
                    if (errorMsg) errorMsg.classList.remove('hidden');
                } else {
                    input.classList.remove('border-red-500', 'bg-red-50');
                    if (errorMsg) errorMsg.classList.add('hidden');
                }

                totalSold += val;
            });

            totalSoldBadge.textContent = formatNumber(totalSold);
            saveBtn.disabled = hasError;
            if (hasError) {
                saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        };

        qtyInputs.forEach(input => input.addEventListener('input', updateExpectedAndTotals));
        updateExpectedAndTotals();

        truckSelect.addEventListener('change', () => {
            window.location.hash = `#sales?truckId=${truckSelect.value}&date=${dateInput.value}`;
        });
        dateInput.addEventListener('change', () => {
            window.location.hash = `#sales?truckId=${truckSelect.value}&date=${dateInput.value}`;
        });

        // View audit log
        if (auditLogBtn && existingSales) {
            auditLogBtn.addEventListener('click', () => {
                const logs = salesService.getSaleAuditLog(existingSales.id);
                const content = logs.length === 0
                    ? `<p class="text-xs text-gray-500 py-4 text-center">No modification logs for this sale record yet.</p>`
                    : `
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200 text-xs">
                                <thead class="bg-gray-50 text-gray-500 uppercase font-semibold">
                                    <tr>
                                        <th class="px-3 py-2">Date & Time</th>
                                        <th class="px-3 py-2">Product</th>
                                        <th class="px-3 py-2 text-right">Previous Qty</th>
                                        <th class="px-3 py-2 text-right">New Qty</th>
                                        <th class="px-3 py-2">Reason</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100">
                                    ${logs.map(l => `
                                        <tr>
                                            <td class="px-3 py-2 text-gray-500 whitespace-nowrap">${formatDateTime(l.changed_at)}</td>
                                            <td class="px-3 py-2 font-bold text-gray-900">${l.product_name}</td>
                                            <td class="px-3 py-2 text-right font-mono">${l.prev_quantity}</td>
                                            <td class="px-3 py-2 text-right font-mono font-bold text-sky-700">${l.new_quantity}</td>
                                            <td class="px-3 py-2 text-gray-600">${l.reason || '—'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;

                modal.show({
                    title: 'Sales Modification Audit Log',
                    content,
                    size: 'max-w-2xl'
                });
            });
        }

        // Save sales
        saveBtn.addEventListener('click', () => {
            const saleDate = dateInput.value;
            const notes = container.querySelector('#sales-notes').value;
            const editReasonInput = container.querySelector('#sales-edit-reason');
            const editReason = editReasonInput ? editReasonInput.value : '';

            const items = [];
            qtyInputs.forEach(input => {
                const productId = parseInt(input.getAttribute('data-prod-id'), 10);
                const quantity = parseInt(input.value, 10) || 0;
                const priceInput = container.querySelector(`[data-price-prod-id="${productId}"]`);
                const salePrice = priceInput ? (parseFloat(priceInput.value) || 0) : 0;

                items.push({ productId, quantity, salePrice });
            });

            try {
                salesService.saveSales({
                    dispatchId: dispatch.id,
                    truckId: currentTruckId,
                    saleDate,
                    items,
                    notes,
                    editReason
                });

                toast.success(`Sales recorded successfully for ${truckSelect.options[truckSelect.selectedIndex].text}!`);
                window.location.hash = `#daily-control?date=${saleDate}`;
            } catch (err) {
                toast.error(err.message);
            }
        });
    }
};
