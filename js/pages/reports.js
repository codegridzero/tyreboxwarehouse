/**
 * Comprehensive Reports and Intelligence Suite
 */
import { reportService } from '../services/reportService.js';
import { productService } from '../services/productService.js';
import { truckService } from '../services/truckService.js';
import { backupService } from '../services/backupService.js';
import { formatDate, formatNumber, formatCurrency, getStatusBadge, escapeHtml, getTodayDateStr, formatReportProductName } from '../utils.js';
import { toast } from '../components/toast.js';

export const reportsPage = {
    render(container, workingDate, urlParams = {}) {
        const activeTab = urlParams.tab || 'daily';
        const products = productService.getProducts({ includeInactive: true });
        const trucks = truckService.getTrucks(true);
        const categories = productService.getCategories(true);

        const fromDate = urlParams.fromDate || workingDate;
        const toDate = urlParams.toDate || workingDate;
        const selectedTruckId = urlParams.truckId ? parseInt(urlParams.truckId, 10) : null;
        const selectedProdId = urlParams.productId ? parseInt(urlParams.productId, 10) : (products[0] ? products[0].id : null);
        const selectedCatId = urlParams.categoryId ? parseInt(urlParams.categoryId, 10) : null;
        const selectedReason = urlParams.reason || '';

        let reportContentHtml = '';

        if (activeTab === 'daily') {
            const daily = reportService.getDailyReport(workingDate);
            reportContentHtml = `
                <!-- Daily Operational Report View -->
                <div class="print-container space-y-6">
                    <!-- Print Header (Hidden on screen, visible on print) -->
                    <div class="hidden print-header">
                        <div class="flex justify-between items-center">
                            <div>
                                <h1 class="text-xl font-bold">TIRE & TUBE WAREHOUSE MANAGEMENT SYSTEM</h1>
                                <h2 class="text-sm font-semibold text-gray-700">Daily Inventory & Truck Reconciliation Report</h2>
                            </div>
                            <div class="text-right text-xs">
                                <div><strong>Date:</strong> ${formatDate(workingDate)}</div>
                                <div><strong>Printed At:</strong> ${new Date().toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Bar -->
                    <div class="no-print bg-white p-4 rounded-xl shadow-xs border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div class="flex items-center space-x-2">
                            <label class="text-xs font-bold text-gray-700 uppercase">Select Date:</label>
                            <input type="date" id="daily-rep-date" value="${workingDate}" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold">
                        </div>
                        <div class="flex items-center space-x-2">
                            <button type="button" id="btn-export-daily-csv" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition flex items-center">
                                <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                Export CSV
                            </button>
                            <button type="button" onclick="window.print()" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center">
                                <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                                Print Report
                            </button>
                        </div>
                    </div>

                    <!-- Summary Grid -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div class="bg-white p-4 rounded-xl border border-gray-200 card">
                            <span class="text-xs text-gray-500 font-bold uppercase">Opening WH Stock</span>
                            <div class="text-xl font-extrabold text-gray-900 mt-1">${formatNumber(daily.warehouse.openingStock)} pcs</div>
                        </div>
                        <div class="bg-white p-4 rounded-xl border border-gray-200 card">
                            <span class="text-xs text-gray-500 font-bold uppercase">Total Dispatched</span>
                            <div class="text-xl font-extrabold text-indigo-700 mt-1">${formatNumber(daily.warehouse.totalLoaded)} pcs</div>
                        </div>
                        <div class="bg-white p-4 rounded-xl border border-gray-200 card">
                            <span class="text-xs text-gray-500 font-bold uppercase">Total Physical Return</span>
                            <div class="text-xl font-extrabold text-purple-700 mt-1">${formatNumber(daily.warehouse.totalPhysicalReturn)} pcs</div>
                        </div>
                        <div class="bg-white p-4 rounded-xl border border-gray-200 card">
                            <span class="text-xs text-gray-500 font-bold uppercase">Closing WH Stock</span>
                            <div class="text-xl font-extrabold text-emerald-700 mt-1">${formatNumber(daily.warehouse.closingStock)} pcs</div>
                        </div>
                    </div>

                    <!-- Truck Reconciliation Table -->
                    <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden card">
                        <div class="p-3.5 bg-slate-50 border-b border-gray-200">
                            <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider">Truck Operational Performance</h3>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                                <thead class="bg-gray-50 text-gray-500 font-bold uppercase">
                                    <tr>
                                        <th class="px-4 py-3">Truck & Driver</th>
                                        <th class="px-4 py-3 text-right">Morning Loaded</th>
                                        <th class="px-4 py-3 text-right">Manual Sales</th>
                                        <th class="px-4 py-3 text-right">Expected Return</th>
                                        <th class="px-4 py-3 text-right">Physical Return</th>
                                        <th class="px-4 py-3 text-right">Difference</th>
                                        <th class="px-4 py-3 text-center">Reconciliation Status</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100 font-medium">
                                    ${daily.trucks.map(t => {
                                        const diff = t.totalDiff !== null
                                            ? (t.totalDiff === 0 ? `<span class="text-emerald-600 font-bold">0</span>` : `<span class="text-red-600 font-bold">${t.totalDiff > 0 ? '+' : ''}${t.totalDiff}</span>`)
                                            : '—';
                                        return `
                                            <tr>
                                                <td class="px-4 py-3">
                                                    <div class="font-bold text-gray-900">${t.truckName}</div>
                                                    <div class="text-[11px] text-gray-500 font-normal">Driver: ${t.driverName}</div>
                                                </td>
                                                <td class="px-4 py-3 text-right font-bold">${formatNumber(t.totalLoaded)} pcs</td>
                                                <td class="px-4 py-3 text-right font-bold">${formatNumber(t.totalSold)} pcs</td>
                                                <td class="px-4 py-3 text-right font-bold">${formatNumber(t.totalExpected)} pcs</td>
                                                <td class="px-4 py-3 text-right font-bold">${t.totalPhysical !== null ? `${formatNumber(t.totalPhysical)} pcs` : '—'}</td>
                                                <td class="px-4 py-3 text-right">${diff}</td>
                                                <td class="px-4 py-3 text-center">${getStatusBadge(t.statusText)}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Product Sales Breakdown -->
                    <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden card">
                        <div class="p-3.5 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
                            <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider">Product Sales Summary</h3>
                            <span class="text-xs text-gray-600 font-bold">Total Units Sold: ${formatNumber(daily.sales.totalSold)} pcs ${daily.sales.totalRevenue > 0 ? `| Revenue: ${formatCurrency(daily.sales.totalRevenue)}` : ''}</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                                <thead class="bg-gray-50 text-gray-500 uppercase font-semibold">
                                    <tr>
                                        <th class="px-4 py-2.5">Product / SKU</th>
                                        <th class="px-4 py-2.5">Category</th>
                                        <th class="px-4 py-2.5 text-right">Quantity Sold</th>
                                        <th class="px-4 py-2.5 text-right">Unit Price</th>
                                        <th class="px-4 py-2.5 text-right">Total Amount</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100 font-medium">
                                    ${daily.sales.byProduct.length === 0 ? `
                                        <tr><td colspan="5" class="px-4 py-4 text-center text-gray-400">No sales recorded on this date.</td></tr>
                                    ` : daily.sales.byProduct.map(s => {
                                        const pName = formatReportProductName(s, products);
                                        return `
                                        <tr>
                                            <td class="px-4 py-2.5 font-bold text-gray-900">${escapeHtml(pName)}</td>
                                            <td class="px-4 py-2.5 text-gray-600">${s.category_name || '—'}</td>
                                            <td class="px-4 py-2.5 text-right font-bold text-sky-700">${formatNumber(s.total_sold_qty)} pcs</td>
                                            <td class="px-4 py-2.5 text-right text-gray-600">${s.avg_price ? formatCurrency(s.avg_price) : '—'}</td>
                                            <td class="px-4 py-2.5 text-right font-bold text-gray-900">${s.total_revenue ? formatCurrency(s.total_revenue) : '—'}</td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Discrepancy Breakdown Section (if any) -->
                    ${daily.discrepancies.length > 0 ? `
                        <div class="bg-red-50/70 rounded-xl border border-red-200 overflow-hidden card">
                            <div class="p-3.5 bg-red-100/70 border-b border-red-200">
                                <h3 class="text-xs font-bold text-red-900 uppercase tracking-wider">Documented Discrepancies & Mismatches</h3>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="min-w-full divide-y divide-red-200 text-left text-xs">
                                    <thead class="bg-red-50 text-red-800 font-bold uppercase">
                                        <tr>
                                            <th class="px-4 py-2.5">Truck</th>
                                            <th class="px-4 py-2.5">Product</th>
                                            <th class="px-4 py-2.5 text-right">Loaded</th>
                                            <th class="px-4 py-2.5 text-right">Sales</th>
                                            <th class="px-4 py-2.5 text-right">Expected</th>
                                            <th class="px-4 py-2.5 text-right">Physical Return</th>
                                            <th class="px-4 py-2.5 text-right">Diff</th>
                                            <th class="px-4 py-2.5">Documented Reason & Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-red-100 font-medium text-red-950">
                                        ${daily.discrepancies.map(d => {
                                            const pName = formatReportProductName(d, products);
                                            return `
                                            <tr>
                                                <td class="px-4 py-2.5 font-bold">${d.truck_name}</td>
                                                <td class="px-4 py-2.5 font-bold">${escapeHtml(pName)}</td>
                                                <td class="px-4 py-2.5 text-right">${formatNumber(d.loaded_quantity)}</td>
                                                <td class="px-4 py-2.5 text-right">${formatNumber(d.sold_quantity)}</td>
                                                <td class="px-4 py-2.5 text-right font-bold">${formatNumber(d.expected_quantity)}</td>
                                                <td class="px-4 py-2.5 text-right font-bold">${formatNumber(d.physical_quantity)}</td>
                                                <td class="px-4 py-2.5 text-right font-bold text-red-600">${d.difference > 0 ? '+' : ''}${d.difference}</td>
                                                <td class="px-4 py-2.5">
                                                    <span class="font-bold block">${escapeHtml(d.mismatch_reason || 'Unspecified')}</span>
                                                    <span class="text-[11px] text-red-800">${escapeHtml(d.notes || '—')}</span>
                                                </td>
                                            </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Print Signatures Footer -->
                    <div class="hidden print-signatures">
                        <div>
                            <p class="font-semibold text-xs">Prepared By (Warehouse Staff): ___________________________</p>
                            <p class="text-[10px] text-gray-500 mt-1">Date: ________________________</p>
                        </div>
                        <div>
                            <p class="font-semibold text-xs">Checked & Approved By (Manager): ___________________________</p>
                            <p class="text-[10px] text-gray-500 mt-1">Date: ________________________</p>
                        </div>
                    </div>
                </div>
            `;
        } else if (activeTab === 'truck') {
            const rows = reportService.getTruckReport({ truckId: selectedTruckId, fromDate, toDate });
            reportContentHtml = `
                <!-- Truck Report View -->
                <div class="print-container space-y-6">
                    <div class="no-print bg-white p-4 rounded-xl shadow-xs border border-gray-200 flex flex-wrap items-center justify-between gap-3">
                        <div class="flex flex-wrap items-center gap-3">
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase">Select Truck</label>
                                <select id="rep-truck-select" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white">
                                    <option value="">All Trucks</option>
                                    ${trucks.map(t => `<option value="${t.id}" ${t.id === selectedTruckId ? 'selected' : ''}>${t.name}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase">From Date</label>
                                <input type="date" id="rep-from-date" value="${fromDate}" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase">To Date</label>
                                <input type="date" id="rep-to-date" value="${toDate}" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold">
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button type="button" id="btn-export-truck-csv" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition">
                                Export CSV
                            </button>
                            <button type="button" onclick="window.print()" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs">
                                Print
                            </button>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden card">
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                                <thead class="bg-slate-50 text-slate-600 font-bold uppercase">
                                    <tr>
                                        <th class="px-4 py-3">Date</th>
                                        <th class="px-4 py-3">Truck & Driver</th>
                                        <th class="px-4 py-3 text-right">Loaded</th>
                                        <th class="px-4 py-3 text-right">Sales</th>
                                        <th class="px-4 py-3 text-right">Expected</th>
                                        <th class="px-4 py-3 text-right">Physical Return</th>
                                        <th class="px-4 py-3 text-right">Diff</th>
                                        <th class="px-4 py-3">Notes / Reason</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100 bg-white">
                                    ${rows.length === 0 ? `
                                        <tr><td colspan="8" class="px-4 py-8 text-center text-gray-400">No truck history records found for selected range.</td></tr>
                                    ` : rows.map(r => `
                                        <tr class="table-row-hover">
                                            <td class="px-4 py-3 font-mono font-medium text-gray-500 whitespace-nowrap">${formatDate(r.date)}</td>
                                            <td class="px-4 py-3 font-bold text-gray-900">${r.truck_name} <span class="text-gray-400 font-normal">(${r.driver_name || 'No driver'})</span></td>
                                            <td class="px-4 py-3 text-right font-bold">${formatNumber(r.total_loaded)}</td>
                                            <td class="px-4 py-3 text-right font-bold">${formatNumber(r.total_sold)}</td>
                                            <td class="px-4 py-3 text-right font-bold">${formatNumber(r.total_expected)}</td>
                                            <td class="px-4 py-3 text-right font-bold">${formatNumber(r.total_physical)}</td>
                                            <td class="px-4 py-3 text-right font-bold ${r.total_diff !== 0 ? 'text-red-600' : 'text-emerald-600'}">
                                                ${r.total_diff > 0 ? '+' : ''}${r.total_diff}
                                            </td>
                                            <td class="px-4 py-3 text-gray-600 text-xs">${escapeHtml(r.mismatch_reason || r.notes || '—')}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } else if (activeTab === 'product') {
            const rep = selectedProdId ? reportService.getProductReport({ productId: selectedProdId, fromDate, toDate }) : null;
            reportContentHtml = `
                <!-- Product Reconciliation Report View -->
                <div class="print-container space-y-6">
                    <div class="no-print bg-white p-4 rounded-xl shadow-xs border border-gray-200 flex flex-wrap items-center justify-between gap-3">
                        <div class="flex flex-wrap items-center gap-3">
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase">Select Product</label>
                                <select id="rep-prod-select" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white">
                                    ${products.map(p => `<option value="${p.id}" ${p.id === selectedProdId ? 'selected' : ''}>${p.name} (${p.sku})</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase">From Date</label>
                                <input type="date" id="rep-prod-from" value="${fromDate}" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase">To Date</label>
                                <input type="date" id="rep-prod-to" value="${toDate}" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold">
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button type="button" id="btn-export-prod-csv" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition">
                                Export CSV
                            </button>
                            <button type="button" onclick="window.print()" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs">
                                Print
                            </button>
                        </div>
                    </div>

                    ${rep ? `
                        <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden card">
                            <div class="p-3.5 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
                                <div>
                                    <h3 class="text-sm font-bold text-gray-900">${escapeHtml(formatReportProductName(rep.product))}</h3>
                                    <p class="text-xs text-gray-500">Category: ${rep.product.category_name || rep.product.category || '—'} | Unit: ${rep.product.unit || 'pcs'}</p>
                                </div>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                                    <thead class="bg-gray-50 text-gray-500 font-bold uppercase">
                                        <tr>
                                            <th class="px-4 py-3">Date</th>
                                            <th class="px-4 py-3">Truck</th>
                                            <th class="px-4 py-3 text-right">Loaded</th>
                                            <th class="px-4 py-3 text-right">Sales</th>
                                            <th class="px-4 py-3 text-right">Expected Return</th>
                                            <th class="px-4 py-3 text-right">Physical Return</th>
                                            <th class="px-4 py-3 text-right">Difference</th>
                                            <th class="px-4 py-3">Discrepancy Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-100 bg-white">
                                        ${rep.rows.length === 0 ? `
                                            <tr><td colspan="8" class="px-4 py-8 text-center text-gray-400">No dispatch or return records found for this product.</td></tr>
                                        ` : rep.rows.map(r => `
                                            <tr class="table-row-hover">
                                                <td class="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">${formatDate(r.date)}</td>
                                                <td class="px-4 py-3 font-bold text-gray-900">${r.truck_name}</td>
                                                <td class="px-4 py-3 text-right font-bold">${formatNumber(r.loaded_quantity)}</td>
                                                <td class="px-4 py-3 text-right font-bold">${formatNumber(r.sold_quantity)}</td>
                                                <td class="px-4 py-3 text-right font-bold">${formatNumber(r.expected_quantity)}</td>
                                                <td class="px-4 py-3 text-right font-bold">${r.physical_quantity !== null ? formatNumber(r.physical_quantity) : '—'}</td>
                                                <td class="px-4 py-3 text-right font-bold ${r.difference !== null && r.difference !== 0 ? 'text-red-600' : 'text-emerald-600'}">
                                                    ${r.difference !== null ? (r.difference > 0 ? '+' : '') + r.difference : '—'}
                                                </td>
                                                <td class="px-4 py-3 text-gray-600 text-xs">${escapeHtml(r.mismatch_reason || '—')}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (activeTab === 'sales') {
            const salesRows = reportService.getSalesReport({ fromDate, toDate, truckId: selectedTruckId, categoryId: selectedCatId });
            const totalQty = salesRows.reduce((sum, r) => sum + r.sold_quantity, 0);
            const totalAmt = salesRows.reduce((sum, r) => sum + r.total_amount, 0);

            reportContentHtml = `
                <!-- Sales Report View -->
                <div class="print-container space-y-6">
                    <div class="no-print bg-white p-4 rounded-xl shadow-xs border border-gray-200 flex flex-wrap items-center justify-between gap-3">
                        <div class="flex flex-wrap items-center gap-3">
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase">From Date</label>
                                <input type="date" id="rep-sales-from" value="${fromDate}" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase">To Date</label>
                                <input type="date" id="rep-sales-to" value="${toDate}" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase">Truck</label>
                                <select id="rep-sales-truck" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-semibold">
                                    <option value="">All Trucks</option>
                                    ${trucks.map(t => `<option value="${t.id}" ${t.id === selectedTruckId ? 'selected' : ''}>${t.name}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase">Category</label>
                                <select id="rep-sales-cat" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-semibold">
                                    <option value="">All Categories</option>
                                    ${categories.map(c => `<option value="${c.id}" ${c.id === selectedCatId ? 'selected' : ''}>${c.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button type="button" id="btn-export-sales-csv" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition">
                                Export CSV
                            </button>
                            <button type="button" onclick="window.print()" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs">
                                Print
                            </button>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden card">
                        <div class="p-3.5 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
                            <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider">Detailed Sales Ledger</h3>
                            <span class="text-xs font-bold text-sky-800">Total Units: ${formatNumber(totalQty)} pcs ${totalAmt > 0 ? `| Revenue: ${formatCurrency(totalAmt)}` : ''}</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                                <thead class="bg-gray-50 text-gray-500 font-bold uppercase">
                                    <tr>
                                        <th class="px-4 py-3">Date</th>
                                        <th class="px-4 py-3">Truck & Driver</th>
                                        <th class="px-4 py-3">Product Name</th>
                                        <th class="px-4 py-3">Category</th>
                                        <th class="px-4 py-3 text-right">Sold Qty</th>
                                        <th class="px-4 py-3 text-right">Unit Price</th>
                                        <th class="px-4 py-3 text-right">Total ($)</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100 bg-white">
                                    ${salesRows.length === 0 ? `
                                        <tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">No sales records found for selected filter criteria.</td></tr>
                                    ` : salesRows.map(s => {
                                        const pName = formatReportProductName(s, products);
                                        return `
                                        <tr class="table-row-hover">
                                            <td class="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">${formatDate(s.sale_date)}</td>
                                            <td class="px-4 py-3 font-bold text-gray-900">${s.truck_name} <span class="text-gray-400 font-normal">(${s.driver_name || '—'})</span></td>
                                            <td class="px-4 py-3 font-bold text-gray-900">${escapeHtml(pName)}</td>
                                            <td class="px-4 py-3 text-gray-600">${s.category_name || '—'}</td>
                                            <td class="px-4 py-3 text-right font-bold text-sky-700">${formatNumber(s.sold_quantity)}</td>
                                            <td class="px-4 py-3 text-right text-gray-600">${s.sale_price ? formatCurrency(s.sale_price) : '—'}</td>
                                            <td class="px-4 py-3 text-right font-bold text-gray-900">${s.total_amount ? formatCurrency(s.total_amount) : '—'}</td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } else if (activeTab === 'mismatches') {
            const mismatchRows = reportService.getMismatchReport({ fromDate, toDate, truckId: selectedTruckId, reason: selectedReason });
            reportContentHtml = `
                <!-- Discrepancy / Mismatch Report View -->
                <div class="print-container space-y-6">
                    <div class="no-print bg-white p-4 rounded-xl shadow-xs border border-gray-200 flex flex-wrap items-center justify-between gap-3">
                        <div class="flex flex-wrap items-center gap-3">
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase">From Date</label>
                                <input type="date" id="rep-mis-from" value="${fromDate}" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase">To Date</label>
                                <input type="date" id="rep-mis-to" value="${toDate}" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase">Truck</label>
                                <select id="rep-mis-truck" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-semibold">
                                    <option value="">All Trucks</option>
                                    ${trucks.map(t => `<option value="${t.id}" ${t.id === selectedTruckId ? 'selected' : ''}>${t.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button type="button" id="btn-export-mis-csv" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition">
                                Export CSV
                            </button>
                            <button type="button" onclick="window.print()" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs">
                                Print
                            </button>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden card">
                        <div class="p-3.5 bg-red-50 border-b border-red-200 flex justify-between items-center">
                            <h3 class="text-xs font-bold text-red-900 uppercase tracking-wider">Historical Discrepancy & Mismatch Audit Log</h3>
                            <span class="text-xs font-bold text-red-800">${mismatchRows.length} discrepancies recorded</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                                <thead class="bg-gray-50 text-gray-500 font-bold uppercase">
                                    <tr>
                                        <th class="px-4 py-3">Date</th>
                                        <th class="px-4 py-3">Truck & Driver</th>
                                        <th class="px-4 py-3">Product Name</th>
                                        <th class="px-4 py-3 text-right">Loaded</th>
                                        <th class="px-4 py-3 text-right">Sales</th>
                                        <th class="px-4 py-3 text-right">Expected</th>
                                        <th class="px-4 py-3 text-right">Physical</th>
                                        <th class="px-4 py-3 text-right">Diff</th>
                                        <th class="px-4 py-3">Documented Reason & Notes</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100 bg-white">
                                    ${mismatchRows.length === 0 ? `
                                        <tr><td colspan="9" class="px-4 py-8 text-center text-gray-400">No stock mismatches found in this period. Perfect reconciliation!</td></tr>
                                    ` : mismatchRows.map(m => {
                                        const pName = formatReportProductName(m, products);
                                        return `
                                        <tr class="table-row-hover bg-red-50/20">
                                            <td class="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">${formatDate(m.date)}</td>
                                            <td class="px-4 py-3 font-bold text-gray-900">${m.truck_name} <span class="text-gray-400 font-normal">(${m.driver_name || '—'})</span></td>
                                            <td class="px-4 py-3 font-bold text-gray-900">${escapeHtml(pName)}</td>
                                            <td class="px-4 py-3 text-right">${formatNumber(m.loaded_quantity)}</td>
                                            <td class="px-4 py-3 text-right">${formatNumber(m.sold_quantity)}</td>
                                            <td class="px-4 py-3 text-right font-bold">${formatNumber(m.expected_quantity)}</td>
                                            <td class="px-4 py-3 text-right font-bold">${formatNumber(m.physical_quantity)}</td>
                                            <td class="px-4 py-3 text-right font-bold text-red-600">${m.difference > 0 ? '+' : ''}${m.difference}</td>
                                            <td class="px-4 py-3">
                                                <span class="font-bold text-red-900 block">${escapeHtml(m.mismatch_reason || 'Unspecified')}</span>
                                                <span class="text-[11px] text-gray-600">${escapeHtml(m.notes || '—')}</span>
                                            </td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="space-y-6 animate-fade-in">
                <!-- Header -->
                <div class="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900">Intelligence & Reports</h2>
                        <p class="text-sm text-gray-500">Comprehensive daily reports, truck audits, sales summaries, and discrepancy tracking</p>
                    </div>

                    <!-- Tab Switcher -->
                    <div class="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold overflow-x-auto">
                        <a href="#reports?tab=daily&date=${workingDate}" class="px-3 py-1.5 rounded-lg transition whitespace-nowrap ${activeTab === 'daily' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}">
                            Daily Report
                        </a>
                        <a href="#reports?tab=truck&fromDate=${fromDate}&toDate=${toDate}" class="px-3 py-1.5 rounded-lg transition whitespace-nowrap ${activeTab === 'truck' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}">
                            Truck Report
                        </a>
                        <a href="#reports?tab=product&fromDate=${fromDate}&toDate=${toDate}" class="px-3 py-1.5 rounded-lg transition whitespace-nowrap ${activeTab === 'product' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}">
                            Product Report
                        </a>
                        <a href="#reports?tab=sales&fromDate=${fromDate}&toDate=${toDate}" class="px-3 py-1.5 rounded-lg transition whitespace-nowrap ${activeTab === 'sales' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}">
                            Sales Report
                        </a>
                        <a href="#reports?tab=mismatches&fromDate=${fromDate}&toDate=${toDate}" class="px-3 py-1.5 rounded-lg transition whitespace-nowrap ${activeTab === 'mismatches' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}">
                            Discrepancies
                        </a>
                    </div>
                </div>

                <!-- Report Content -->
                ${reportContentHtml}
            </div>
        `;

        this.bindEvents(container, activeTab, workingDate, fromDate, toDate, selectedTruckId, selectedProdId, selectedCatId);
    },

    bindEvents(container, activeTab, workingDate, fromDate, toDate, truckId, prodId, catId) {
        if (activeTab === 'daily') {
            const dateInput = container.querySelector('#daily-rep-date');
            if (dateInput) {
                dateInput.addEventListener('change', (e) => {
                    window.location.hash = `#reports?tab=daily&date=${e.target.value}`;
                });
            }
            const csvBtn = container.querySelector('#btn-export-daily-csv');
            if (csvBtn) {
                csvBtn.addEventListener('click', () => {
                    const matrix = reportService.getDailyReport(workingDate).trucks;
                    backupService.exportCSV('daily_trucks', matrix);
                    toast.success('Daily report CSV downloaded');
                });
            }
        } else if (activeTab === 'truck') {
            const truckSelect = container.querySelector('#rep-truck-select');
            const fromInput = container.querySelector('#rep-from-date');
            const toInput = container.querySelector('#rep-to-date');

            const refresh = () => {
                window.location.hash = `#reports?tab=truck&truckId=${truckSelect.value}&fromDate=${fromInput.value}&toDate=${toInput.value}`;
            };
            if (truckSelect) truckSelect.addEventListener('change', refresh);
            if (fromInput) fromInput.addEventListener('change', refresh);
            if (toInput) toInput.addEventListener('change', refresh);

            const csvBtn = container.querySelector('#btn-export-truck-csv');
            if (csvBtn) {
                csvBtn.addEventListener('click', () => {
                    const rows = reportService.getTruckReport({ truckId, fromDate, toDate });
                    backupService.exportCSV('daily_trucks', rows);
                    toast.success('Truck report CSV downloaded');
                });
            }
        } else if (activeTab === 'product') {
            const prodSelect = container.querySelector('#rep-prod-select');
            const fromInput = container.querySelector('#rep-prod-from');
            const toInput = container.querySelector('#rep-prod-to');

            const refresh = () => {
                window.location.hash = `#reports?tab=product&productId=${prodSelect.value}&fromDate=${fromInput.value}&toDate=${toInput.value}`;
            };
            if (prodSelect) prodSelect.addEventListener('change', refresh);
            if (fromInput) fromInput.addEventListener('change', refresh);
            if (toInput) toInput.addEventListener('change', refresh);

            const csvBtn = container.querySelector('#btn-export-prod-csv');
            if (csvBtn) {
                csvBtn.addEventListener('click', () => {
                    const rep = reportService.getProductReport({ productId: prodId, fromDate, toDate });
                    backupService.exportCSV('product_history', rep ? rep.rows : []);
                    toast.success('Product report CSV downloaded');
                });
            }
        } else if (activeTab === 'sales') {
            const fromInput = container.querySelector('#rep-sales-from');
            const toInput = container.querySelector('#rep-sales-to');
            const truckSelect = container.querySelector('#rep-sales-truck');
            const catSelect = container.querySelector('#rep-sales-cat');

            const refresh = () => {
                window.location.hash = `#reports?tab=sales&fromDate=${fromInput.value}&toDate=${toInput.value}&truckId=${truckSelect.value}&categoryId=${catSelect.value}`;
            };
            if (fromInput) fromInput.addEventListener('change', refresh);
            if (toInput) toInput.addEventListener('change', refresh);
            if (truckSelect) truckSelect.addEventListener('change', refresh);
            if (catSelect) catSelect.addEventListener('change', refresh);

            const csvBtn = container.querySelector('#btn-export-sales-csv');
            if (csvBtn) {
                csvBtn.addEventListener('click', () => {
                    const rows = reportService.getSalesReport({ fromDate, toDate, truckId, categoryId: catId });
                    backupService.exportCSV('sales', rows);
                    toast.success('Sales report CSV downloaded');
                });
            }
        } else if (activeTab === 'mismatches') {
            const fromInput = container.querySelector('#rep-mis-from');
            const toInput = container.querySelector('#rep-mis-to');
            const truckSelect = container.querySelector('#rep-mis-truck');

            const refresh = () => {
                window.location.hash = `#reports?tab=mismatches&fromDate=${fromInput.value}&toDate=${toInput.value}&truckId=${truckSelect.value}`;
            };
            if (fromInput) fromInput.addEventListener('change', refresh);
            if (toInput) toInput.addEventListener('change', refresh);
            if (truckSelect) truckSelect.addEventListener('change', refresh);

            const csvBtn = container.querySelector('#btn-export-mis-csv');
            if (csvBtn) {
                csvBtn.addEventListener('click', () => {
                    const rows = reportService.getMismatchReport({ fromDate, toDate, truckId });
                    backupService.exportCSV('mismatches', rows);
                    toast.success('Mismatch report CSV downloaded');
                });
            }
        }
    }
};
