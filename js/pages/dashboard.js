/**
 * Warehouse Dashboard View
 */
import { inventoryService } from '../services/inventoryService.js';
import { closingService } from '../services/closingService.js';
import { reportService } from '../services/reportService.js';
import { formatDate, formatNumber, getStatusBadge, getStockStatusBadge } from '../utils.js';

export const dashboardPage = {
    render(container, workingDate) {
        // Fetch all metrics
        const totalWarehouseStock = inventoryService.getTotalWarehouseStock(workingDate);
        const lowStockProducts = inventoryService.getLowStockProducts(workingDate);
        const dailyReport = reportService.getDailyReport(workingDate);
        const truckMatrix = closingService.getDailyTruckMatrix(workingDate);
        const workflowAlerts = closingService.getWorkflowAlerts(workingDate);

        // Calculate summary counters
        const totalTrucks = truckMatrix.length;
        const loadedTrucks = truckMatrix.filter(t => t.hasDispatch).length;
        const onRouteTrucks = truckMatrix.filter(t => t.stage === 'LOADED' || t.stage === 'SALES_ENTERED').length;
        const returnedTrucks = truckMatrix.filter(t => t.stage === 'RETURNED' || t.stage === 'MISMATCH' || t.stage === 'CLOSED').length;
        const closedTrucks = truckMatrix.filter(t => t.isClosed).length;
        const mismatchTrucks = truckMatrix.filter(t => t.hasMismatch).length;

        // Alerts HTML
        let alertsHtml = '';
        if (workflowAlerts.length > 0) {
            alertsHtml = `
                <div class="mb-6 space-y-2">
                    ${workflowAlerts.map(a => {
                        const bg = a.type === 'danger' ? 'bg-red-50 border-red-200 text-red-800' :
                                   a.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                   a.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                   'bg-blue-50 border-blue-200 text-blue-800';
                        return `
                            <div class="p-3.5 rounded-xl border flex items-center justify-between ${bg}">
                                <div class="flex items-center space-x-3">
                                    <span class="font-bold text-sm">${a.title}:</span>
                                    <span class="text-sm font-medium">${a.message}</span>
                                </div>
                                <a href="#daily-control" class="ml-4 px-3 py-1 bg-white shadow-xs rounded-lg text-xs font-bold border border-current hover:bg-opacity-80 transition">
                                    Resolve
                                </a>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        // Truck Cards HTML
        const truckCardsHtml = truckMatrix.map(t => {
            const statusBadge = getStatusBadge(t.statusText);
            const diffDisplay = t.totalDiff !== null
                ? (t.totalDiff === 0
                    ? `<span class="text-emerald-600 font-bold">0 (Matched)</span>`
                    : `<span class="text-red-600 font-bold">${t.totalDiff > 0 ? '+' : ''}${t.totalDiff} (Mismatch)</span>`)
                : '<span class="text-gray-400">Pending</span>';

            const physicalDisplay = t.totalPhysical !== null ? formatNumber(t.totalPhysical) : 'Pending';

            return `
                <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden hover:shadow-md transition">
                    <div class="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                        <div>
                            <h4 class="text-base font-bold text-gray-900">${t.truckName}</h4>
                            <p class="text-xs text-gray-500 font-medium">Driver: <span class="text-gray-800 font-semibold">${t.driverName}</span> ${t.truckReg ? `(${t.truckReg})` : ''}</p>
                        </div>
                        <div>${statusBadge}</div>
                    </div>

                    <div class="p-5 space-y-3">
                        <div class="grid grid-cols-2 gap-3 text-sm">
                            <div class="bg-slate-50 p-2.5 rounded-lg">
                                <span class="text-xs text-gray-500 block">Morning Loaded</span>
                                <span class="text-base font-bold text-gray-900">${formatNumber(t.totalLoaded)} pcs</span>
                            </div>
                            <div class="bg-slate-50 p-2.5 rounded-lg">
                                <span class="text-xs text-gray-500 block">Sales Recorded</span>
                                <span class="text-base font-bold text-gray-900">${formatNumber(t.totalSold)} pcs</span>
                            </div>
                            <div class="bg-slate-50 p-2.5 rounded-lg">
                                <span class="text-xs text-gray-500 block">Expected Return</span>
                                <span class="text-base font-bold text-gray-900">${formatNumber(t.totalExpected)} pcs</span>
                            </div>
                            <div class="bg-slate-50 p-2.5 rounded-lg">
                                <span class="text-xs text-gray-500 block">Physical Return</span>
                                <span class="text-base font-bold text-gray-900">${physicalDisplay}</span>
                            </div>
                        </div>

                        <div class="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                            <span class="text-gray-500 font-medium">Reconciliation Diff:</span>
                            <span>${diffDisplay}</span>
                        </div>

                        ${t.mismatchReason ? `
                            <div class="p-2 bg-red-50 rounded text-xs text-red-700 font-medium">
                                <strong>Reason:</strong> ${t.mismatchReason}
                            </div>
                        ` : ''}
                    </div>

                    <div class="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <a href="#daily-control" class="text-xs font-bold text-sky-600 hover:text-sky-800">View in Matrix &rarr;</a>
                        ${!t.hasDispatch ? `
                            <a href="#loading" class="px-2.5 py-1 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700">Load Truck</a>
                        ` : (!t.hasSales ? `
                            <a href="#sales" class="px-2.5 py-1 bg-sky-600 text-white text-xs font-semibold rounded hover:bg-sky-700">Enter Sales</a>
                        ` : (!t.hasReturn ? `
                            <a href="#returns" class="px-2.5 py-1 bg-purple-600 text-white text-xs font-semibold rounded hover:bg-purple-700">Count Return</a>
                        ` : `
                            <span class="text-xs font-bold text-emerald-600">&#10003; Complete</span>
                        `))}
                    </div>
                </div>
            `;
        }).join('');

        // Low stock HTML
        const lowStockHtml = lowStockProducts.length === 0
            ? `<div class="p-4 text-center text-sm text-gray-500 bg-gray-50 rounded-xl">All products currently have healthy stock levels.</div>`
            : `
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                        <thead class="bg-gray-50 text-gray-500 uppercase font-semibold">
                            <tr>
                                <th class="px-3 py-2">Product</th>
                                <th class="px-3 py-2">Category</th>
                                <th class="px-3 py-2 text-right">Current Stock</th>
                                <th class="px-3 py-2 text-right">Min Level</th>
                                <th class="px-3 py-2 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 font-medium">
                            ${lowStockProducts.map(p => `
                                <tr>
                                    <td class="px-3 py-2.5 text-gray-900 font-bold">${p.name} <span class="text-gray-400 font-normal">(${p.sku})</span></td>
                                    <td class="px-3 py-2.5 text-gray-600">${p.category_name || '—'}</td>
                                    <td class="px-3 py-2.5 text-right font-bold ${p.current_stock <= 0 ? 'text-red-600' : 'text-amber-600'}">${formatNumber(p.current_stock)} ${p.unit}</td>
                                    <td class="px-3 py-2.5 text-right text-gray-500">${formatNumber(p.minimum_stock)}</td>
                                    <td class="px-3 py-2.5 text-center">${getStockStatusBadge(p.current_stock, p.minimum_stock)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

        container.innerHTML = `
            <div class="space-y-6 animate-fade-in">
                <!-- Page Title -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900">Warehouse Dashboard</h2>
                        <p class="text-sm text-gray-500">Live operational status and truck sales overview for <span class="font-semibold text-gray-800">${formatDate(workingDate)}</span></p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <a href="#daily-control" class="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-slate-800 transition">
                            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                            Open Daily Control
                        </a>
                    </div>
                </div>

                <!-- Workflow Alerts -->
                ${alertsHtml}

                <!-- Metric Summary Cards -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- Warehouse Stock -->
                    <div class="bg-white p-5 rounded-xl shadow-xs border border-gray-200">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Warehouse Stock</span>
                            <div class="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                            </div>
                        </div>
                        <div class="mt-3">
                            <span class="text-2xl font-extrabold text-gray-900">${formatNumber(totalWarehouseStock)}</span>
                            <span class="text-xs text-gray-500 ml-1">pcs available</span>
                        </div>
                        <div class="mt-2 text-xs text-gray-500 flex items-center">
                            <span class="font-medium text-amber-600">${lowStockProducts.length} low stock</span>
                            <span class="mx-1.5">&bull;</span>
                            <a href="#inventory" class="text-sky-600 hover:underline">View Inventory</a>
                        </div>
                    </div>

                    <!-- Today's Sales -->
                    <div class="bg-white p-5 rounded-xl shadow-xs border border-gray-200">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Sales</span>
                            <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            </div>
                        </div>
                        <div class="mt-3">
                            <span class="text-2xl font-extrabold text-emerald-600">${formatNumber(dailyReport.sales.totalSold)}</span>
                            <span class="text-xs text-gray-500 ml-1">pcs sold</span>
                        </div>
                        <div class="mt-2 text-xs text-gray-500">
                            <span>Dispatched: <strong>${formatNumber(dailyReport.warehouse.totalLoaded)}</strong> pcs</span>
                        </div>
                    </div>

                    <!-- Physical Returns -->
                    <div class="bg-white p-5 rounded-xl shadow-xs border border-gray-200">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Physical Returns</span>
                            <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            </div>
                        </div>
                        <div class="mt-3">
                            <span class="text-2xl font-extrabold text-purple-600">${formatNumber(dailyReport.warehouse.totalPhysicalReturn)}</span>
                            <span class="text-xs text-gray-500 ml-1">pcs returned</span>
                        </div>
                        <div class="mt-2 text-xs text-gray-500">
                            <span>Returned back to stock</span>
                        </div>
                    </div>

                    <!-- Discrepancies / Trucks -->
                    <div class="bg-white p-5 rounded-xl shadow-xs border border-gray-200">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Truck Status</span>
                            <div class="w-8 h-8 rounded-lg ${mismatchTrucks > 0 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'} flex items-center justify-center">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            </div>
                        </div>
                        <div class="mt-3 flex items-baseline space-x-2">
                            <span class="text-2xl font-extrabold text-gray-900">${closedTrucks}/${totalTrucks}</span>
                            <span class="text-xs text-gray-500">closed</span>
                        </div>
                        <div class="mt-2 text-xs font-medium ${mismatchTrucks > 0 ? 'text-red-600' : 'text-emerald-600'}">
                            ${mismatchTrucks > 0 ? `${mismatchTrucks} Mismatch requiring resolution` : 'All trucks reconciled'}
                        </div>
                    </div>
                </div>

                <!-- Truck Status Cards Section -->
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-bold text-gray-900">Today's Trucks Overview</h3>
                        <span class="text-xs text-gray-500">Active Trucks: ${totalTrucks}</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                        ${truckCardsHtml}
                    </div>
                </div>

                <!-- Low Stock & Quick Info Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Low Stock Alerts -->
                    <div class="bg-white p-5 rounded-xl shadow-xs border border-gray-200">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-base font-bold text-gray-900 flex items-center">
                                <svg class="w-5 h-5 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                Low Stock Watchlist
                            </h3>
                            <a href="#inventory" class="text-xs font-semibold text-sky-600 hover:text-sky-800">Manage Stock &rarr;</a>
                        </div>
                        ${lowStockHtml}
                    </div>

                    <!-- Daily Reconciliation Principle Card -->
                    <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-sm border border-slate-700 flex flex-col justify-between">
                        <div>
                            <div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-900 text-sky-200 mb-3">
                                Standard Business Workflow
                            </div>
                            <h4 class="text-lg font-bold mb-2">Daily Inventory Flow Principle</h4>
                            <p class="text-xs text-slate-300 leading-relaxed">
                                <strong>1. Morning:</strong> Dispatches deduct stock from warehouse.<br>
                                <strong>2. Day:</strong> Sales recorded manually (Expected = Loaded &minus; Sales).<br>
                                <strong>3. Evening:</strong> Physical return counted and added back to warehouse.<br>
                                <strong>4. Warehouse Closing:</strong> <code class="bg-slate-950 px-1 py-0.5 rounded text-sky-400 font-mono">Opening - Loaded + Physical Return</code>
                            </p>
                        </div>
                        <div class="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                            <span>Zero double-counting guaranteed</span>
                            <a href="#reports" class="text-sky-400 hover:text-sky-300 font-bold">View Full Daily Report &rarr;</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};
