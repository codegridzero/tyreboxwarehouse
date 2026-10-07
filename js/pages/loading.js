/**
 * Morning Loading & Truck Dispatch Screen
 */
import { truckService } from '../services/truckService.js';
import { productService } from '../services/productService.js';
import { inventoryService } from '../services/inventoryService.js';
import { dispatchService } from '../services/dispatchService.js';
import { formatDate, formatNumber } from '../utils.js';
import { toast } from '../components/toast.js';

export const loadingPage = {
    render(container, workingDate, urlParams = {}) {
        const trucks = truckService.getTrucks(false);
        const drivers = truckService.getDrivers(false);
        const allProducts = productService.getProducts({ includeInactive: false });

        if (trucks.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center bg-white rounded-xl border border-gray-200">
                    <h3 class="text-lg font-bold text-gray-800">No Trucks Available</h3>
                    <p class="text-sm text-gray-500 mt-2">Please create at least one truck before recording morning loading.</p>
                    <a href="#trucks" class="mt-4 inline-block px-4 py-2 bg-sky-600 text-white font-bold rounded-lg text-xs">Manage Trucks</a>
                </div>
            `;
            return;
        }

        const selectedTruckId = parseInt(urlParams.truckId, 10) || trucks[0].id;
        const selectedDate = urlParams.date || workingDate;

        // Check if an existing dispatch exists for this truck and date
        const existingDispatch = dispatchService.getDispatchByTruckAndDate(selectedTruckId, selectedDate);
        const selectedTruck = trucks.find(t => t.id === selectedTruckId) || trucks[0];

        // Map existing loaded quantities
        const loadedMap = new Map();
        if (existingDispatch && existingDispatch.items) {
            existingDispatch.items.forEach(i => loadedMap.set(i.product_id, i.quantity));
        }

        // Build products rows with available warehouse stock
        const productRowsHtml = allProducts.map(p => {
            const currentStock = inventoryService.getCurrentStock(p.id);
            const prevLoaded = loadedMap.get(p.id) || 0;
            // Available is current stock + previous loaded if we are editing this existing dispatch
            const effectiveAvailable = currentStock + prevLoaded;
            const loadedVal = prevLoaded > 0 ? prevLoaded : '';

            const isLow = effectiveAvailable <= p.minimum_stock;
            const isOut = effectiveAvailable <= 0;

            const stockClass = isOut ? 'text-red-600 font-bold' : (isLow ? 'text-amber-600 font-semibold' : 'text-gray-900 font-medium');

            return `
                <tr class="table-row-hover transition-colors" data-product-id="${p.id}" data-available="${effectiveAvailable}">
                    <td class="px-4 py-3 whitespace-nowrap">
                        <div class="font-bold text-gray-900 text-sm">${p.name}</div>
                        <div class="text-xs text-gray-500 font-mono">${p.sku} ${p.brand ? `&bull; ${p.brand}` : ''} ${p.size ? `&bull; ${p.size}` : ''}</div>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        ${p.category_name || '—'}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-right text-sm ${stockClass}">
                        <span class="stock-avail-display">${formatNumber(effectiveAvailable)}</span> <span class="text-xs text-gray-500 font-normal">${p.unit}</span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-right">
                        <div class="inline-flex items-center space-x-1">
                            <input type="number"
                                   min="0"
                                   max="${effectiveAvailable}"
                                   data-prod-id="${p.id}"
                                   data-available="${effectiveAvailable}"
                                   value="${loadedVal}"
                                   placeholder="0"
                                   class="load-qty-input w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-bold text-right focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 tabular-nums">
                            <span class="text-xs text-gray-400 w-8 text-left">${p.unit}</span>
                        </div>
                        <div class="stock-error-msg hidden text-[11px] text-red-600 font-bold mt-1">Exceeds available stock!</div>
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
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 uppercase">Phase 1: Morning Operation</span>
                            ${existingDispatch ? `<span class="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">Existing Dispatch (${existingDispatch.status})</span>` : ''}
                        </div>
                        <h2 class="text-2xl font-bold text-gray-900 mt-1">Morning Truck Loading / Dispatch</h2>
                        <p class="text-sm text-gray-500">Physically count loaded inventory items. Loaded quantities will be deducted from warehouse stock.</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <a href="#daily-control?date=${selectedDate}" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition">
                            &larr; Back to Matrix
                        </a>
                    </div>
                </div>

                <!-- Dispatch Config Card -->
                <div class="bg-white p-5 rounded-xl shadow-xs border border-gray-200">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <!-- Date -->
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Dispatch Date</label>
                            <input type="date" id="dispatch-date-input" value="${selectedDate}" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500">
                        </div>

                        <!-- Truck -->
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Select Truck</label>
                            <select id="dispatch-truck-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 bg-white">
                                ${trucks.map(t => `
                                    <option value="${t.id}" ${t.id === selectedTruckId ? 'selected' : ''}>${t.name} ${t.registration_number ? `(${t.registration_number})` : ''}</option>
                                `).join('')}
                            </select>
                        </div>

                        <!-- Driver -->
                        <div>
                            <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Assigned Driver</label>
                            <select id="dispatch-driver-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 bg-white">
                                <option value="">-- No Driver Assigned --</option>
                                ${drivers.map(d => `
                                    <option value="${d.id}" ${(existingDispatch ? existingDispatch.driver_id === d.id : selectedTruck.driver_id === d.id) ? 'selected' : ''}>${d.name} ${d.phone ? `(${d.phone})` : ''}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Product Loading Table -->
                <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                    <div class="p-4 bg-slate-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wider">Product Inventory Loading List</h3>
                            <p class="text-xs text-gray-500">Enter actual physical quantities loaded onto <span class="font-bold text-indigo-700">${selectedTruck.name}</span></p>
                        </div>
                        <div class="text-xs text-gray-600 flex items-center space-x-3">
                            <span>Total Items to Load: <strong id="total-loaded-badge" class="text-indigo-700 font-extrabold text-sm">0</strong> pcs</span>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                            <thead class="bg-gray-50 text-gray-500 uppercase font-semibold">
                                <tr>
                                    <th class="px-4 py-3">Product / SKU</th>
                                    <th class="px-4 py-3">Category</th>
                                    <th class="px-4 py-3 text-right">Warehouse Available</th>
                                    <th class="px-4 py-3 text-right">Morning Loaded Qty</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 bg-white">
                                ${productRowsHtml}
                            </tbody>
                        </table>
                    </div>

                    <!-- Notes and Submit Bar -->
                    <div class="p-4 bg-slate-50 border-t border-gray-200 space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Dispatch Route Notes (Optional)</label>
                            <input type="text" id="dispatch-notes" value="${existingDispatch ? (existingDispatch.notes || '') : ''}" placeholder="e.g. Route A - North Wholesale Customers" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs">
                        </div>

                        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                            <div class="text-xs text-gray-500">
                                <strong>Validation:</strong> Loaded quantities cannot exceed physical warehouse available stock.
                            </div>
                            <div class="flex items-center space-x-2">
                                <button type="button" id="btn-save-dispatch" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition">
                                    ${existingDispatch ? 'Update Morning Dispatch' : 'Save & Confirm Loading'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(container, selectedTruckId, selectedDate, existingDispatch);
    },

    bindEvents(container, currentTruckId, currentDate, existingDispatch) {
        const truckSelect = container.querySelector('#dispatch-truck-select');
        const dateInput = container.querySelector('#dispatch-date-input');
        const driverSelect = container.querySelector('#dispatch-driver-select');
        const qtyInputs = container.querySelectorAll('.load-qty-input');
        const totalBadge = container.querySelector('#total-loaded-badge');
        const saveBtn = container.querySelector('#btn-save-dispatch');

        const updateTotal = () => {
            let total = 0;
            let hasError = false;

            qtyInputs.forEach(input => {
                const val = parseInt(input.value, 10) || 0;
                const avail = parseInt(input.getAttribute('data-available'), 10) || 0;
                const row = input.closest('tr');
                const errorMsg = row.querySelector('.stock-error-msg');

                if (val > avail) {
                    hasError = true;
                    input.classList.add('border-red-500', 'bg-red-50');
                    if (errorMsg) errorMsg.classList.remove('hidden');
                } else {
                    input.classList.remove('border-red-500', 'bg-red-50');
                    if (errorMsg) errorMsg.classList.add('hidden');
                }

                if (val > 0) total += val;
            });

            totalBadge.textContent = formatNumber(total);
            saveBtn.disabled = hasError;
            if (hasError) {
                saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        };

        qtyInputs.forEach(input => {
            input.addEventListener('input', updateTotal);
        });

        // Initialize total count
        updateTotal();

        // Switch truck or date
        const handleFilterChange = () => {
            const newTruck = truckSelect.value;
            const newDate = dateInput.value;
            window.location.hash = `#loading?truckId=${newTruck}&date=${newDate}`;
        };

        truckSelect.addEventListener('change', handleFilterChange);
        dateInput.addEventListener('change', handleFilterChange);

        // Save Dispatch
        saveBtn.addEventListener('click', () => {
            const truckId = parseInt(truckSelect.value, 10);
            const driverId = driverSelect.value ? parseInt(driverSelect.value, 10) : null;
            const dispatchDate = dateInput.value;
            const notes = container.querySelector('#dispatch-notes').value;

            const items = [];
            qtyInputs.forEach(input => {
                const productId = parseInt(input.getAttribute('data-prod-id'), 10);
                const quantity = parseInt(input.value, 10) || 0;
                if (quantity > 0) {
                    items.push({ productId, quantity });
                }
            });

            if (items.length === 0) {
                toast.warning('Please enter at least one product with loaded quantity > 0');
                return;
            }

            try {
                dispatchService.saveDispatch({
                    id: existingDispatch ? existingDispatch.id : null,
                    truckId,
                    driverId,
                    dispatchDate,
                    items,
                    notes
                });

                toast.success(`Morning dispatch for ${truckSelect.options[truckSelect.selectedIndex].text} successfully saved!`);
                window.location.hash = `#daily-control?date=${dispatchDate}`;
            } catch (err) {
                toast.error(err.message);
            }
        });
    }
};
