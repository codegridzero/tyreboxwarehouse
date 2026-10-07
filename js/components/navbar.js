/**
 * Top Navigation Header Bar
 */
import { formatDate, formatNumber } from '../utils.js';
import { inventoryService } from '../services/inventoryService.js';

export const navbarComponent = {
    render(currentDate) {
        let totalStock = 0;
        try {
            totalStock = inventoryService.getTotalWarehouseStock(currentDate);
        } catch (_) {}

        return `
            <header id="navbar" class="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm no-print">
                <div class="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
                    <!-- Left: Mobile toggle & Date Selector -->
                    <div class="flex items-center space-x-3">
                        <button id="mobile-sidebar-toggle" class="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none" aria-label="Toggle menu">
                            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                            </svg>
                        </button>

                        <!-- Operational Working Date Control -->
                        <div class="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                            <button id="btn-prev-date" title="Previous Day" class="p-1 rounded text-gray-600 hover:bg-white hover:shadow-xs transition">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                            </button>

                            <div class="flex items-center px-2 space-x-1.5 cursor-pointer" id="date-picker-container">
                                <svg class="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                                <input type="date" id="working-date-input" value="${currentDate}" class="bg-transparent text-xs sm:text-sm font-bold text-gray-800 border-none p-0 cursor-pointer focus:ring-0">
                            </div>

                            <button id="btn-next-date" title="Next Day" class="p-1 rounded text-gray-600 hover:bg-white hover:shadow-xs transition">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                            </button>
                            <button id="btn-today-date" class="ml-1 px-2 py-0.5 text-xs font-semibold bg-sky-600 text-white rounded hover:bg-sky-700 transition">Today</button>
                        </div>

                        <span class="hidden md:inline-block text-xs text-gray-600 font-medium border-l border-gray-300 pl-3">
                            Working Date: <span class="font-bold text-gray-900">${formatDate(currentDate)}</span>
                        </span>
                    </div>

                    <!-- Right: Quick Warehouse Total & Quick Operations Buttons -->
                    <div class="flex items-center space-x-2 sm:space-x-3">
                        <div class="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-sky-50 text-sky-800 rounded-full border border-sky-200 text-xs font-semibold" title="Current Warehouse Available Physical Stock">
                            <span class="w-2 h-2 rounded-full bg-sky-500"></span>
                            <span>WH Stock: <strong class="font-bold text-sky-900">${formatNumber(totalStock)}</strong> pcs</span>
                        </div>

                        <!-- Quick Action Dropdown or Buttons -->
                        <a href="#loading" class="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition">
                            <svg class="w-3.5 h-3.5 mr-1 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                            Load Truck
                        </a>

                        <a href="#daily-control" class="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-600 text-white hover:bg-sky-700 shadow-sm transition">
                            <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                            Daily Matrix
                        </a>
                    </div>
                </div>
            </header>
        `;
    },

    bindEvents(onDateChange) {
        const input = document.getElementById('working-date-input');
        if (input) {
            input.addEventListener('change', (e) => {
                if (e.target.value) {
                    onDateChange(e.target.value);
                }
            });
        }

        const btnPrev = document.getElementById('btn-prev-date');
        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                if (input && input.value) {
                    const d = new Date(input.value + 'T00:00:00');
                    d.setDate(d.getDate() - 1);
                    const newStr = d.toISOString().split('T')[0];
                    onDateChange(newStr);
                }
            });
        }

        const btnNext = document.getElementById('btn-next-date');
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (input && input.value) {
                    const d = new Date(input.value + 'T00:00:00');
                    d.setDate(d.getDate() + 1);
                    const newStr = d.toISOString().split('T')[0];
                    onDateChange(newStr);
                }
            });
        }

        const btnToday = document.getElementById('btn-today-date');
        if (btnToday) {
            btnToday.addEventListener('click', () => {
                const todayStr = new Date().toISOString().split('T')[0];
                onDateChange(todayStr);
            });
        }
    }
};
