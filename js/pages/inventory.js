/**
 * Warehouse Inventory Management Screen
 * Calculates current warehouse stock strictly from transactions
 */
import { inventoryService } from '../services/inventoryService.js';
import { productService } from '../services/productService.js';
import { backupService } from '../services/backupService.js';
import { formatDate, formatNumber, getStockStatusBadge, escapeHtml } from '../utils.js';
import { modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export const inventoryPage = {
    render(container, workingDate, urlParams = {}) {
        const activeTab = urlParams.tab || 'stock';
        const categories = productService.getCategories(false);
        const stockList = inventoryService.getAllProductsStock(workingDate);
        const totalWarehouseStock = inventoryService.getTotalWarehouseStock(workingDate);

        let contentHtml = '';

        if (activeTab === 'ledger') {
            // Transaction Ledger View
            const ledgerRows = inventoryService.getLedger({ limit: 150 });
            contentHtml = `
                <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                    <div class="p-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wider">Inventory Transaction Ledger</h3>
                            <p class="text-xs text-gray-500">Immutable ledger of all warehouse stock movements (Dispatches, Returns, Initial Stock, Adjustments)</p>
                        </div>
                        <span class="text-xs text-gray-500">Showing last ${ledgerRows.length} transactions</span>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                            <thead class="bg-gray-50 text-gray-500 uppercase font-semibold">
                                <tr>
                                    <th class="px-4 py-3">Date</th>
                                    <th class="px-4 py-3">Product / SKU</th>
                                    <th class="px-4 py-3">Transaction Type</th>
                                    <th class="px-4 py-3 text-right">Quantity Delta</th>
                                    <th class="px-4 py-3">Reference / Notes</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 bg-white">
                                ${ledgerRows.length === 0 ? `
                                    <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">No inventory transactions found.</td></tr>
                                ` : ledgerRows.map(tx => {
                                    let typeBadge = '';
                                    let qtyClass = '';
                                    const isPositive = tx.quantity > 0;

                                    switch (tx.transaction_type) {
                                        case 'DISPATCH':
                                            typeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">TRUCK DISPATCH</span>`;
                                            qtyClass = 'text-indigo-700';
                                            break;
                                        case 'PHYSICAL_RETURN':
                                            typeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">PHYSICAL RETURN</span>`;
                                            qtyClass = 'text-purple-700';
                                            break;
                                        case 'INITIAL_STOCK':
                                            typeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">OPENING BALANCE</span>`;
                                            qtyClass = 'text-emerald-700';
                                            break;
                                        case 'STOCK_ADJUSTMENT':
                                        default:
                                            typeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">STOCK ADJUSTMENT</span>`;
                                            qtyClass = isPositive ? 'text-emerald-700' : 'text-red-700';
                                            break;
                                    }

                                    return `
                                        <tr class="table-row-hover">
                                            <td class="px-4 py-3 whitespace-nowrap text-gray-500 font-mono">${formatDate(tx.transaction_date)}</td>
                                            <td class="px-4 py-3 whitespace-nowrap">
                                                <span class="font-bold text-gray-900">${tx.product_name}</span>
                                                <span class="text-gray-400 block text-[11px] font-mono">${tx.sku}</span>
                                            </td>
                                            <td class="px-4 py-3 whitespace-nowrap">${typeBadge}</td>
                                            <td class="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-sm ${qtyClass}">
                                                ${tx.quantity > 0 ? '+' : ''}${formatNumber(tx.quantity)} ${tx.unit}
                                            </td>
                                            <td class="px-4 py-3 text-gray-600 text-xs">${escapeHtml(tx.notes || '—')}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else {
            // Warehouse Stock List View
            contentHtml = `
                <!-- Stock Filters & Actions Bar -->
                <div class="bg-white p-4 rounded-xl shadow-xs border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div class="flex items-center space-x-3 w-full sm:w-auto">
                        <div class="relative w-full sm:w-64">
                            <input type="text" id="stock-search-input" placeholder="Search product, SKU, brand..." class="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500">
                            <svg class="w-4 h-4 text-gray-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        </div>
                        <select id="stock-category-filter" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-sky-500">
                            <option value="">All Categories</option>
                            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>

                    <div class="flex items-center space-x-2 w-full sm:w-auto justify-end">
                        <button type="button" id="btn-export-stock-csv" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition flex items-center">
                            <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            Export CSV
                        </button>
                        <button type="button" id="btn-open-adjustment-modal" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                            &plusmn; Adjust Stock
                        </button>
                        <button type="button" id="btn-open-initial-stock-modal" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                            + Initial Opening Stock
                        </button>
                    </div>
                </div>

                <!-- Warehouse Stock Table -->
                <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table id="warehouse-stock-table" class="min-w-full divide-y divide-gray-200 text-left text-xs">
                            <thead class="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                                <tr>
                                    <th class="px-4 py-3.5">Product / SKU</th>
                                    <th class="px-4 py-3.5">Category</th>
                                    <th class="px-4 py-3.5">Brand & Size</th>
                                    <th class="px-4 py-3.5 text-right">Current Available Stock</th>
                                    <th class="px-4 py-3.5 text-right">Min Stock Level</th>
                                    <th class="px-4 py-3.5 text-center">Status</th>
                                    <th class="px-4 py-3.5 text-right">Quick Action</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 bg-white" id="stock-table-body">
                                ${stockList.length === 0 ? `
                                    <tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No products in inventory yet. Add products to get started.</td></tr>
                                ` : stockList.map(p => {
                                    const stockClass = p.current_stock <= 0
                                        ? 'text-red-600 font-extrabold'
                                        : (p.current_stock <= p.minimum_stock ? 'text-amber-600 font-bold' : 'text-gray-900 font-bold');

                                    return `
                                        <tr class="table-row-hover" data-name="${p.name.toLowerCase()}" data-sku="${p.sku.toLowerCase()}" data-cat="${p.category_id}">
                                            <td class="px-4 py-3.5 whitespace-nowrap">
                                                <div class="font-bold text-gray-900 text-sm">${p.name}</div>
                                                <div class="text-xs text-gray-400 font-mono">${p.sku}</div>
                                            </td>
                                            <td class="px-4 py-3.5 whitespace-nowrap text-gray-600">${p.category_name || '—'}</td>
                                            <td class="px-4 py-3.5 whitespace-nowrap text-gray-600">${p.brand || '—'} ${p.size ? `(${p.size})` : ''}</td>
                                            <td class="px-4 py-3.5 whitespace-nowrap text-right text-base ${stockClass}">
                                                ${formatNumber(p.current_stock)} <span class="text-xs font-normal text-gray-500">${p.unit}</span>
                                            </td>
                                            <td class="px-4 py-3.5 whitespace-nowrap text-right text-gray-500 font-medium">
                                                ${formatNumber(p.minimum_stock)} ${p.unit}
                                            </td>
                                            <td class="px-4 py-3.5 whitespace-nowrap text-center">
                                                ${getStockStatusBadge(p.current_stock, p.minimum_stock)}
                                            </td>
                                            <td class="px-4 py-3.5 whitespace-nowrap text-right">
                                                <button type="button" data-action="adjust-single" data-id="${p.id}" data-name="${p.name}" data-stock="${p.current_stock}" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold">
                                                    Adjust
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="space-y-6 animate-fade-in">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900">Warehouse Inventory</h2>
                        <p class="text-sm text-gray-500">
                            Available physical inventory calculated strictly from verified stock ledger transactions. Total warehouse stock: <strong class="text-gray-900 font-bold">${formatNumber(totalWarehouseStock)} pcs</strong>
                        </p>
                    </div>

                    <!-- Tab Switcher -->
                    <div class="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold">
                        <a href="#inventory?tab=stock" class="px-3 py-1.5 rounded-lg transition ${activeTab === 'stock' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}">
                            Warehouse Stock
                        </a>
                        <a href="#inventory?tab=ledger" class="px-3 py-1.5 rounded-lg transition ${activeTab === 'ledger' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}">
                            Transaction Ledger
                        </a>
                    </div>
                </div>

                <!-- Main Content Tab -->
                ${contentHtml}
            </div>
        `;

        this.bindEvents(container, workingDate, stockList, categories);
    },

    bindEvents(container, workingDate, stockList, categories) {
        // Search & Filter
        const searchInput = container.querySelector('#stock-search-input');
        const catFilter = container.querySelector('#stock-category-filter');
        const tableBody = container.querySelector('#stock-table-body');

        if (searchInput && tableBody) {
            const filterRows = () => {
                const query = searchInput.value.trim().toLowerCase();
                const catId = catFilter.value;
                const rows = tableBody.querySelectorAll('tr');

                rows.forEach(row => {
                    const name = row.getAttribute('data-name') || '';
                    const sku = row.getAttribute('data-sku') || '';
                    const cat = row.getAttribute('data-cat') || '';

                    const matchesQuery = !query || name.includes(query) || sku.includes(query);
                    const matchesCat = !catId || cat === catId;

                    if (matchesQuery && matchesCat) {
                        row.classList.remove('hidden');
                    } else {
                        row.classList.add('hidden');
                    }
                });
            };

            searchInput.addEventListener('input', filterRows);
            catFilter.addEventListener('change', filterRows);
        }

        // CSV Export
        const exportBtn = container.querySelector('#btn-export-stock-csv');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                backupService.exportCSV('inventory_stock', stockList);
                toast.success('Warehouse stock CSV exported');
            });
        }

        // Initial Stock Modal
        const initialStockBtn = container.querySelector('#btn-open-initial-stock-modal');
        if (initialStockBtn) {
            initialStockBtn.addEventListener('click', () => this.openInitialStockModal(workingDate, stockList));
        }

        // Stock Adjustment Modal
        const adjustBtn = container.querySelector('#btn-open-adjustment-modal');
        if (adjustBtn) {
            adjustBtn.addEventListener('click', () => this.openAdjustmentModal(workingDate, stockList));
        }

        // Single Product Quick Adjust
        container.querySelectorAll('[data-action="adjust-single"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const prodId = parseInt(btn.getAttribute('data-id'), 10);
                this.openAdjustmentModal(workingDate, stockList, prodId);
            });
        });
    },

    openInitialStockModal(workingDate, stockList) {
        modal.show({
            title: 'Set Initial Warehouse Opening Stock',
            content: `
                <div class="space-y-4">
                    <p class="text-xs text-gray-600">
                        Record opening stock balances for your warehouse. This creates verified <code class="text-emerald-700 font-mono">INITIAL_STOCK</code> ledger entries.
                    </p>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Select Product <span class="text-red-500">*</span></label>
                        <select id="modal-initial-prod-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white">
                            ${stockList.map(p => `<option value="${p.id}">${p.name} (${p.sku}) - Current: ${p.current_stock} ${p.unit}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Opening Stock Quantity <span class="text-red-500">*</span></label>
                        <input type="number" id="modal-initial-qty" min="0" placeholder="e.g. 100" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Notes / Batch Reference</label>
                        <input type="text" id="modal-initial-notes" placeholder="e.g. Warehouse initial inventory count" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs">
                    </div>
                    <div class="flex justify-end space-x-2 pt-3 border-t">
                        <button type="button" id="modal-cancel-initial" class="px-4 py-2 border rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="button" id="modal-save-initial" class="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs">Record Initial Stock</button>
                    </div>
                </div>
            `,
            onOpen: (modalEl, close) => {
                modalEl.querySelector('#modal-cancel-initial').addEventListener('click', close);
                modalEl.querySelector('#modal-save-initial').addEventListener('click', () => {
                    const prodId = parseInt(modalEl.querySelector('#modal-initial-prod-select').value, 10);
                    const qty = parseInt(modalEl.querySelector('#modal-initial-qty').value, 10);
                    const notes = modalEl.querySelector('#modal-initial-notes').value;

                    if (isNaN(qty) || qty < 0) {
                        toast.error('Please enter a valid non-negative initial quantity');
                        return;
                    }

                    try {
                        inventoryService.recordInitialStock(prodId, qty, workingDate, notes);
                        toast.success('Initial opening stock balance recorded successfully!');
                        close();
                        window.location.reload();
                    } catch (err) {
                        toast.error(err.message);
                    }
                });
            }
        });
    },

    openAdjustmentModal(workingDate, stockList, defaultProdId = null) {
        modal.show({
            title: 'Manual Stock Adjustment',
            content: `
                <div class="space-y-4">
                    <div class="p-3 bg-amber-50 text-amber-900 rounded-lg text-xs border border-amber-200">
                        <strong>Policy:</strong> Adjustments require a documented business reason and will be permanently recorded in the immutable inventory ledger.
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Select Product <span class="text-red-500">*</span></label>
                        <select id="modal-adj-prod-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white">
                            ${stockList.map(p => `<option value="${p.id}" ${p.id === defaultProdId ? 'selected' : ''}>${p.name} (${p.sku}) - Current: ${p.current_stock} ${p.unit}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Quantity Adjustment Delta <span class="text-red-500">*</span></label>
                        <div class="flex items-center space-x-2">
                            <input type="number" id="modal-adj-qty" placeholder="e.g. +5 or -2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold tabular-nums">
                        </div>
                        <span class="text-[11px] text-gray-500 block mt-1">Use positive numbers (e.g. <strong>5</strong>) for additions, negative (e.g. <strong>-2</strong>) for deductions.</span>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Reason for Adjustment <span class="text-red-500">*</span></label>
                        <select id="modal-adj-reason" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white">
                            <option value="">-- Select Reason --</option>
                            <option value="Physical Warehouse Recount Discrepancy">Physical Warehouse Recount Discrepancy</option>
                            <option value="Damaged / Scrap Product in Warehouse">Damaged / Scrap Product in Warehouse</option>
                            <option value="Supplier Delivery Receipt">Supplier Delivery Receipt</option>
                            <option value="Customer Return directly to Warehouse">Customer Return directly to Warehouse</option>
                            <option value="Data Entry Correction">Data Entry Correction</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Detailed Explanation / Notes</label>
                        <input type="text" id="modal-adj-notes" placeholder="e.g. Physical recount revealed 1 missing tire on rack B" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs">
                    </div>
                    <div class="flex justify-end space-x-2 pt-3 border-t">
                        <button type="button" id="modal-cancel-adj" class="px-4 py-2 border rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="button" id="modal-save-adj" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs">Post Stock Adjustment</button>
                    </div>
                </div>
            `,
            onOpen: (modalEl, close) => {
                modalEl.querySelector('#modal-cancel-adj').addEventListener('click', close);
                modalEl.querySelector('#modal-save-adj').addEventListener('click', () => {
                    const prodId = parseInt(modalEl.querySelector('#modal-adj-prod-select').value, 10);
                    const qtyDelta = parseInt(modalEl.querySelector('#modal-adj-qty').value, 10);
                    const reason = modalEl.querySelector('#modal-adj-reason').value;
                    const notes = modalEl.querySelector('#modal-adj-notes').value;

                    if (isNaN(qtyDelta) || qtyDelta === 0) {
                        toast.error('Please enter a non-zero adjustment quantity delta');
                        return;
                    }
                    if (!reason) {
                        toast.error('Please select an adjustment reason');
                        return;
                    }

                    try {
                        inventoryService.recordAdjustment(prodId, qtyDelta, reason, workingDate, notes);
                        toast.success('Stock adjustment successfully posted to ledger!');
                        close();
                        window.location.reload();
                    } catch (err) {
                        toast.error(err.message);
                    }
                });
            }
        });
    }
};
