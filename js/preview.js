/**
 * Standalone Daily Shift Report Preview Controller
 * Handles URL parsing (?id=1 or ?code=SH-...), SQLite database queries,
 * rendering, copying shareable links, and official print mode.
 */
import { dbManager } from './db.js';
import { formatReportProductName } from './utils.js';

class ShiftPreviewController {
    constructor() {
        this.shiftId = null;
        this.shiftCode = null;
        this.shift = null;
        this.items = [];
        this.products = [];

        // DOM Elements
        this.loadingState = document.getElementById('loading-state');
        this.errorState = document.getElementById('error-state');
        this.errorMessage = document.getElementById('error-message');
        this.reportPaper = document.getElementById('report-paper');

        this.topShiftCode = document.getElementById('top-shift-code');
        this.shiftCodeBadge = document.getElementById('shift-code-badge');
        this.shiftStatusBadge = document.getElementById('shift-status-badge');
        this.shiftTimestamp = document.getElementById('shift-timestamp');

        this.metaShiftDate = document.getElementById('meta-shift-date');
        this.metaTruckName = document.getElementById('meta-truck-name');
        this.metaDriverName = document.getElementById('meta-driver-name');
        this.metaNotes = document.getElementById('meta-notes');
        this.signDriverName = document.getElementById('sign-driver-name');

        this.metricItemsCount = document.getElementById('metric-items-count');
        this.metricDispatchQty = document.getElementById('metric-dispatch-qty');
        this.metricSalesQty = document.getElementById('metric-sales-qty');
        this.metricReturnsQty = document.getElementById('metric-returns-qty');

        this.tableItemsBadge = document.getElementById('table-items-badge');
        this.previewTableBody = document.getElementById('preview-table-body');
        this.footDispatchTotal = document.getElementById('foot-dispatch-total');
        this.footSalesTotal = document.getElementById('foot-sales-total');
        this.footReturnsTotal = document.getElementById('foot-returns-total');

        this.btnCopyLink = document.getElementById('btn-copy-link');
        this.copyBtnText = document.getElementById('copy-btn-text');
        this.btnPrintReport = document.getElementById('btn-print-report');
        this.toastContainer = document.getElementById('toast-container');
    }

    async init() {
        this.parseUrlParams();
        this.bindEvents();

        try {
            console.log('Connecting to database for report preview...');
            await dbManager.init();
            await this.loadReportData();
        } catch (err) {
            console.error('Error loading report preview:', err);
            this.showError('Database connection error: ' + err.message);
        }
    }

    parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        this.shiftId = urlParams.get('id');
        this.shiftCode = urlParams.get('code');

        // Fallback to hash if present e.g. #id=1 or #1
        if (!this.shiftId && !this.shiftCode && window.location.hash) {
            const hash = window.location.hash.replace('#', '').trim();
            if (hash.startsWith('id=')) {
                this.shiftId = hash.replace('id=', '');
            } else if (!isNaN(parseInt(hash, 10))) {
                this.shiftId = hash;
            } else if (hash.startsWith('code=')) {
                this.shiftCode = hash.replace('code=', '');
            } else if (hash) {
                this.shiftCode = hash;
            }
        }
    }

    bindEvents() {
        if (this.btnCopyLink) {
            this.btnCopyLink.addEventListener('click', () => this.copyShareableLink());
        }

        if (this.btnPrintReport) {
            this.btnPrintReport.addEventListener('click', () => window.print());
        }
    }

    async loadReportData() {
        if (!this.shiftId && !this.shiftCode) {
            this.showError('No Shift Report ID or Code specified in the URL. Please open a report from the Warehouse Daily Shifts list.');
            return;
        }

        // Query shift header with truck registration number and name joined
        let shifts = [];
        const selectSql = `
            SELECT 
                s.*,
                t.name as truck_title,
                t.registration_number as truck_reg
            FROM daily_shifts s
            LEFT JOIN trucks t ON s.truck_id = t.id
            WHERE ${this.shiftId ? 's.id = ?' : 's.shift_code = ?'};
        `;
        try {
            const param = this.shiftId ? parseInt(this.shiftId, 10) : this.shiftCode;
            shifts = dbManager.query(selectSql, [param]);
        } catch (e) {
            if (this.shiftId) {
                shifts = dbManager.query('SELECT * FROM daily_shifts WHERE id = ?;', [parseInt(this.shiftId, 10)]);
            } else if (this.shiftCode) {
                shifts = dbManager.query('SELECT * FROM daily_shifts WHERE shift_code = ?;', [this.shiftCode]);
            }
        }

        if (!shifts || shifts.length === 0) {
            this.showError(`Shift report ${this.shiftId ? `#${this.shiftId}` : `"${this.shiftCode}"`} was not found in the warehouse database.`);
            return;
        }

        this.shift = shifts[0];
        const actualShiftId = this.shift.id;

        // Query shift items
        try {
            this.items = dbManager.query('SELECT * FROM shift_items WHERE shift_id = ? ORDER BY id ASC;', [actualShiftId]);
        } catch (e) {
            this.items = [];
        }

        // Query products for simple specification name formatting
        try {
            this.products = dbManager.query('SELECT id, product_type, product_number, vehicle_name, position, strength, category, manufacturer FROM products;');
        } catch (e) {
            this.products = [];
        }

        this.renderReport();
    }

    renderReport() {
        const s = this.shift;
        const code = s.shift_code || `SH-${s.id}`;
        document.title = `${code} - Daily Shift Report Preview`;

        if (this.topShiftCode) this.topShiftCode.textContent = code;
        if (this.shiftCodeBadge) this.shiftCodeBadge.textContent = code;

        const isCompleted = s.status === 'Completed' || s.status === 'Closed';
        if (this.shiftStatusBadge) {
            this.shiftStatusBadge.textContent = isCompleted ? 'Completed / Closed Shift' : 'Open Shift';
            this.shiftStatusBadge.className = isCompleted
                ? 'font-bold uppercase text-[11px] text-emerald-800'
                : 'font-bold uppercase text-[11px] text-sky-800';
        }

        const now = new Date();
        if (this.shiftTimestamp) {
            this.shiftTimestamp.textContent = `Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        // Meta details: Assign Truck Name & Number
        if (this.metaShiftDate) this.metaShiftDate.textContent = s.shift_date || '—';
        if (this.metaTruckName) {
            let truckDisplay = '—';
            // If truck_id was stored, try finding in trucks table if truck_reg is missing
            if (!s.truck_reg && s.truck_id) {
                try {
                    const trk = dbManager.query('SELECT name, registration_number FROM trucks WHERE id = ?;', [s.truck_id]);
                    if (trk && trk.length > 0) {
                        s.truck_title = trk[0].name;
                        s.truck_reg = trk[0].registration_number;
                    }
                } catch (e) {}
            }

            if (s.truck_title && s.truck_reg) {
                truckDisplay = `${s.truck_title} • ${s.truck_reg}`;
            } else if (s.truck_name && s.truck_reg) {
                truckDisplay = `${s.truck_name} • ${s.truck_reg}`;
            } else if (s.truck_title) {
                truckDisplay = s.truck_title;
            } else if (s.truck_name) {
                truckDisplay = s.truck_name;
            } else if (s.truck_reg) {
                truckDisplay = `Truck Reg: ${s.truck_reg}`;
            }
            this.metaTruckName.textContent = truckDisplay;
        }
        if (this.metaDriverName) this.metaDriverName.textContent = s.driver_name || '—';
        if (this.metaNotes) this.metaNotes.textContent = s.notes || '—';
        if (this.signDriverName) this.signDriverName.textContent = s.driver_name ? `${s.driver_name} (Driver)` : 'Driver / Salesman';

        // Calculate Totals
        let totalDispatch = 0;
        let totalSales = 0;
        let totalReturns = 0;

        const itemsHtml = this.items.map((item, idx) => {
            const dispatch = item.dispatch_qty || 0;
            const sale = (item.sale_qty !== null && item.sale_qty !== undefined && item.sale_qty !== '') ? parseInt(item.sale_qty, 10) : 0;
            const returnQty = item.return_qty !== null && item.return_qty !== undefined ? item.return_qty : Math.max(0, dispatch - sale);

            totalDispatch += dispatch;
            totalSales += sale;
            totalReturns += returnQty;

            const prod = this.products.find(p => p.id === item.product_id);
            const simpleName = formatReportProductName(prod || item);

            return `
                <tr class="hover:bg-slate-50 transition">
                    <td class="py-1 px-1 text-center font-mono text-[10px]">${idx + 1}</td>
                    <td class="py-1 px-2 font-bold text-black text-[11px]">
                        ${this.escapeHtml(simpleName)}
                    </td>
                    <td class="py-1 px-2 text-right font-mono font-bold text-[11px]">
                        ${dispatch} <span class="text-slate-500 font-normal text-[9px]">pcs</span>
                    </td>
                    <td class="py-1 px-2 text-right font-mono font-bold text-[11px]">
                        ${sale} <span class="text-slate-500 font-normal text-[9px]">pcs</span>
                    </td>
                    <td class="py-1 px-2 text-right font-mono font-bold text-[11px]">
                        ${returnQty} <span class="text-slate-500 font-normal text-[9px]">pcs</span>
                    </td>
                </tr>
            `;
        }).join('');

        if (this.previewTableBody) {
            if (this.items.length === 0) {
                this.previewTableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-xs text-slate-500 italic">No products recorded in this daily shift sheet.</td></tr>`;
            } else {
                this.previewTableBody.innerHTML = itemsHtml;
            }
        }

        // Metrics & Footers
        if (this.metricItemsCount) this.metricItemsCount.textContent = this.items.length;
        if (this.metricDispatchQty) this.metricDispatchQty.textContent = totalDispatch;
        if (this.metricSalesQty) this.metricSalesQty.textContent = totalSales;
        if (this.metricReturnsQty) this.metricReturnsQty.textContent = totalReturns;

        if (this.tableItemsBadge) this.tableItemsBadge.textContent = `${this.items.length} Products`;
        if (this.footDispatchTotal) this.footDispatchTotal.textContent = totalDispatch;
        if (this.footSalesTotal) this.footSalesTotal.textContent = totalSales;
        if (this.footReturnsTotal) this.footReturnsTotal.textContent = totalReturns;

        // Show report paper, hide loading
        if (this.loadingState) this.loadingState.classList.add('hidden');
        if (this.errorState) this.errorState.classList.add('hidden');
        if (this.reportPaper) this.reportPaper.classList.remove('hidden');
    }

    showError(msg) {
        if (this.loadingState) this.loadingState.classList.add('hidden');
        if (this.reportPaper) this.reportPaper.classList.add('hidden');
        if (this.errorMessage) this.errorMessage.textContent = msg;
        if (this.errorState) this.errorState.classList.remove('hidden');
    }

    async copyShareableLink() {
        const fullUrl = window.location.href;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(fullUrl);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = fullUrl;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            if (this.copyBtnText) this.copyBtnText.textContent = '✓ Link Copied!';
            this.showToast('📋 Unique report link copied to clipboard!', 'success');

            setTimeout(() => {
                if (this.copyBtnText) this.copyBtnText.textContent = 'Copy Shareable Link';
            }, 2500);
        } catch (err) {
            console.error('Failed to copy link:', err);
            this.showToast('Failed to copy link automatically', 'error');
        }
    }

    showToast(message, type = 'info') {
        if (!this.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold text-white transition-all duration-300 transform opacity-0 translate-y-2 pointer-events-auto ${
            type === 'success' ? 'bg-emerald-600 border border-emerald-400' :
            type === 'error' ? 'bg-rose-600 border border-rose-400' :
            'bg-slate-900 border border-slate-700'
        }`;

        toast.innerHTML = `
            <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
            <span>${this.escapeHtml(message)}</span>
        `;

        this.toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.remove('opacity-0', 'translate-y-2');
            toast.classList.add('opacity-100', 'translate-y-0');
        });

        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 250);
        }, 3000);
    }

    escapeHtml(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// Start preview controller on DOM load
document.addEventListener('DOMContentLoaded', () => {
    const previewController = new ShiftPreviewController();
    previewController.init();
});
