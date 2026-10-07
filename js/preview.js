/**
 * Enterprise Report Preview Controller
 * Handles URL parsing for Daily Shifts (?id=1 or ?code=SH-...)
 * and Warranty Claims (?type=claims&mode=combined|driver|full&from=...&to=...&driver_id=...),
 * high-density paper-saving Excel-style rendering, link sharing, and clean A4 printing.
 */
import { dbManager } from './db.js';
import { formatReportProductName, formatDate } from './utils.js';

class WarehouseReportPreviewController {
    constructor() {
        this.reportType = 'shift'; // 'shift' | 'claims'
        this.shiftId = null;
        this.shiftCode = null;
        this.shift = null;
        this.items = [];
        this.products = [];

        // Claims Report State
        this.claimMode = 'combined'; // 'combined' | 'driver' | 'full'
        this.fromDate = '';
        this.toDate = '';
        this.driverId = '';
        this.claims = [];
        this.claimItems = [];

        // DOM Elements
        this.loadingState = document.getElementById('loading-state');
        this.errorState = document.getElementById('error-state');
        this.errorMessage = document.getElementById('error-message');
        this.errorTitle = document.getElementById('error-title');
        this.errorBackLink = document.getElementById('error-back-link');
        this.btnBackLink = document.getElementById('btn-back-link');
        this.topTypeLabel = document.getElementById('top-type-label');
        this.topShiftCode = document.getElementById('top-shift-code');

        this.reportPaper = document.getElementById('report-paper');
        this.claimsReportPaper = document.getElementById('claims-report-paper');

        // Shift specific elements
        this.shiftCodeBadge = document.getElementById('shift-code-badge');
        this.shiftStatusBadge = document.getElementById('shift-status-badge');
        this.shiftTimestamp = document.getElementById('shift-timestamp');
        this.metaShiftDate = document.getElementById('meta-shift-date');
        this.metaTruckName = document.getElementById('meta-truck-name');
        this.metaDriverName = document.getElementById('meta-driver-name');
        this.metaNotes = document.getElementById('meta-notes');
        this.signDriverName = document.getElementById('sign-driver-name');
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
        const type = (urlParams.get('type') || '').toLowerCase();

        if (type === 'claims' || type === 'claim' || type === 'warranty' || type === 'returns') {
            this.reportType = 'claims';
            this.claimMode = urlParams.get('mode') || 'combined';
            this.fromDate = urlParams.get('from') || '';
            this.toDate = urlParams.get('to') || '';
            this.driverId = urlParams.get('driver_id') || '';
        } else {
            this.reportType = 'shift';
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
                } else if (hash.startsWith('claims')) {
                    this.reportType = 'claims';
                } else if (hash) {
                    this.shiftCode = hash;
                }
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
        if (this.reportType === 'claims') {
            await this.loadClaimsReportData();
        } else {
            await this.loadShiftReportData();
        }
    }

    // ================= SHIFT REPORT DATA & RENDERING =================

    async loadShiftReportData() {
        if (this.btnBackLink) this.btnBackLink.href = 'index.html#shifts';
        if (this.errorBackLink) this.errorBackLink.href = 'index.html#shifts';
        if (this.topTypeLabel) this.topTypeLabel.textContent = 'Shift:';

        if (!this.shiftId && !this.shiftCode) {
            this.showError('No Shift Report ID or Code specified in the URL. Please open a report from the Warehouse Daily Shifts list.');
            return;
        }

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

        try {
            this.items = dbManager.query('SELECT * FROM shift_items WHERE shift_id = ? ORDER BY id ASC;', [actualShiftId]);
        } catch (e) {
            this.items = [];
        }

        try {
            this.products = dbManager.query('SELECT id, product_type, product_number, vehicle_name, position, strength, category, manufacturer FROM products;');
        } catch (e) {
            this.products = [];
        }

        this.renderShiftReport();
    }

    renderShiftReport() {
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
            this.shiftTimestamp.textContent = `Printed: ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        if (this.metaShiftDate) this.metaShiftDate.textContent = s.shift_date || '—';
        if (this.metaTruckName) {
            let truckDisplay = '—';
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

        if (this.footDispatchTotal) this.footDispatchTotal.textContent = totalDispatch;
        if (this.footSalesTotal) this.footSalesTotal.textContent = totalSales;
        if (this.footReturnsTotal) this.footReturnsTotal.textContent = totalReturns;

        // Show shift report paper, hide claims paper & loading
        if (this.loadingState) this.loadingState.classList.add('hidden');
        if (this.errorState) this.errorState.classList.add('hidden');
        if (this.claimsReportPaper) this.claimsReportPaper.classList.add('hidden');
        if (this.reportPaper) this.reportPaper.classList.remove('hidden');
    }

    // ================= WARRANTY CLAIMS DATA & RENDERING =================

    async loadClaimsReportData() {
        if (this.btnBackLink) this.btnBackLink.href = 'index.html#claims';
        if (this.errorBackLink) this.errorBackLink.href = 'index.html#claims';
        if (this.topTypeLabel) this.topTypeLabel.textContent = 'Claims Report:';

        let sql = `
            SELECT 
                c.*,
                d.name as live_driver_name,
                d.phone as live_driver_phone,
                t.name as live_truck_name
            FROM claims c
            LEFT JOIN drivers d ON c.driver_id = d.id
            LEFT JOIN trucks t ON c.truck_id = t.id
            WHERE 1=1
        `;
        const params = [];

        if (this.fromDate) {
            sql += ' AND c.claim_date >= ?';
            params.push(this.fromDate);
        }
        if (this.toDate) {
            sql += ' AND c.claim_date <= ?';
            params.push(this.toDate);
        }
        if (this.driverId && this.driverId !== 'all') {
            sql += ' AND c.driver_id = ?';
            params.push(parseInt(this.driverId, 10));
        }

        sql += ' ORDER BY c.claim_date ASC, c.id ASC;';

        try {
            this.claims = dbManager.query(sql, params);
        } catch (e) {
            this.claims = [];
        }

        if (!this.claims || this.claims.length === 0) {
            this.showError('No warranty claim entries found matching the specified date range and driver filter.');
            return;
        }

        // Load all claim_items
        const claimIds = this.claims.map(c => c.id);
        const placeholders = claimIds.map(() => '?').join(',');
        try {
            this.claimItems = dbManager.query(`SELECT * FROM claim_items WHERE claim_id IN (${placeholders}) ORDER BY id ASC;`, claimIds);
        } catch (e) {
            this.claimItems = [];
        }

        this.renderClaimsReport();
    }

    renderClaimsReport() {
        const modeTitle = this.claimMode === 'combined'
            ? ((this.driverId && this.driverId !== 'all') ? `Factory Return (${this.claims[0]?.driver_name || 'Driver'})` : 'Factory Company Return Sheet (Combined)')
            : (this.claimMode === 'driver'
                ? `Driver Return Chit (${this.claims[0]?.driver_name || 'Driver'})`
                : 'Full Complete Warranty Claims Audit Report');

        document.title = `${modeTitle} - Warehouse System`;
        if (this.topShiftCode) this.topShiftCode.textContent = modeTitle;

        const dateRangeStr = (this.fromDate && this.toDate)
            ? `${formatDate(this.fromDate)} to ${formatDate(this.toDate)}`
            : (this.fromDate ? `From ${formatDate(this.fromDate)}` : (this.toDate ? `Up to ${formatDate(this.toDate)}` : 'All Recorded Time'));

        let grandTotalPieces = 0;
        this.claims.forEach(c => {
            grandTotalPieces += (parseInt(c.total_items, 10) || 0);
        });

        let contentHtml = '';

        if (this.claimMode === 'combined') {
            contentHtml = this.buildCombinedCompanyReportHtml(dateRangeStr, grandTotalPieces);
        } else if (this.claimMode === 'driver') {
            contentHtml = this.buildSingleDriverReportHtml(dateRangeStr, grandTotalPieces);
        } else {
            // Full Mode
            contentHtml = this.buildFullCompleteReportHtml(dateRangeStr, grandTotalPieces);
        }

        if (this.claimsReportPaper) {
            this.claimsReportPaper.innerHTML = contentHtml;
            this.claimsReportPaper.classList.remove('hidden');
        }

        if (this.reportPaper) this.reportPaper.classList.add('hidden');
        if (this.loadingState) this.loadingState.classList.add('hidden');
        if (this.errorState) this.errorState.classList.add('hidden');
    }

    buildCombinedCompanyReportHtml(dateRangeStr, grandTotalPieces) {
        const now = new Date();
        const printedStr = `${now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const driverName = (this.driverId && this.driverId !== 'all' && this.claims[0]) ? (this.claims[0].driver_name || 'Driver') : 'All Drivers';
        const modeLabel = (this.driverId && this.driverId !== 'all') ? `Factory Return (${this.escapeHtml(driverName)})` : 'Combined Factory Return (All Drivers)';

        // Group by Manufacturer & Product
        const summaryMap = new Map();
        let totalCounted = 0;

        this.claimItems.forEach(item => {
            const key = `${item.manufacturer || 'General'}|||${item.display_name}`;
            const qty = parseInt(item.quantity, 10) || 1;
            totalCounted += qty;

            if (!summaryMap.has(key)) {
                summaryMap.set(key, {
                    manufacturer: item.manufacturer || 'General',
                    product_type: item.product_type || 'Part',
                    display_name: item.display_name,
                    totalQty: 0
                });
            }
            const record = summaryMap.get(key);
            record.totalQty += qty;
        });

        const sortedRecords = Array.from(summaryMap.values()).sort((a, b) => {
            if (a.manufacturer.localeCompare(b.manufacturer) !== 0) {
                return a.manufacturer.localeCompare(b.manufacturer);
            }
            return b.totalQty - a.totalQty;
        });

        const rowsHtml = sortedRecords.map((rec, index) => {
            const percent = totalCounted > 0 ? ((rec.totalQty / totalCounted) * 100).toFixed(1) : 0;
            return `
                <tr>
                    <td class="p-1 px-1 text-center font-mono text-[10px]">${index + 1}</td>
                    <td class="p-1 px-2 font-bold uppercase text-[11px]">${this.escapeHtml(rec.manufacturer)}</td>
                    <td class="p-1 px-2 text-[10px]">${this.escapeHtml(rec.product_type)}</td>
                    <td class="p-1 px-2 font-bold text-[11px] text-black">${this.escapeHtml(rec.display_name)}</td>
                    <td class="p-1 px-2 text-right font-mono font-bold text-[11px]">${rec.totalQty}</td>
                    <td class="p-1 px-2 text-right font-mono text-[10px]">${percent}%</td>
                </tr>
            `;
        }).join('');

        return `
            <!-- Compact Official Excel Header Box -->
            <table class="excel-table text-left mb-1">
                <thead>
                    <tr>
                        <th colspan="4" class="py-1 px-2 text-center text-xs font-black uppercase bg-slate-100 tracking-wider">
                            WAREHOUSE MANAGEMENT SYSTEM — OFFICIAL COMPANY DEFECTIVE CLAIMS RETURN REPORT
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="text-[11px]">
                        <td class="p-1 px-2 w-1/4"><strong>Report Mode:</strong> <span class="font-bold text-amber-900">${modeLabel}</span></td>
                        <td class="p-1 px-2 w-1/4"><strong>Period:</strong> <span class="font-mono">${this.escapeHtml(dateRangeStr)}</span></td>
                        <td class="p-1 px-2 w-1/4"><strong>Claim Entries:</strong> <span class="font-bold">${this.claims.length} Daily Chits</span></td>
                        <td class="p-1 px-2 w-1/4"><strong>Total Return Units:</strong> <span class="font-mono font-bold text-black">${totalCounted} pcs</span></td>
                    </tr>
                    <tr class="text-[10px] bg-slate-50/50">
                        <td colspan="3" class="p-1 px-2">
                            <strong>Submission Purpose:</strong> Official physical defect return sheet for manufacturer warranty credit / replacement.
                        </td>
                        <td class="p-1 px-2 text-right">
                            <span class="text-[9px] text-gray-600 font-mono">Printed: ${printedStr}</span>
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Itemized Consolidated Product Table -->
            <div class="w-full overflow-x-auto">
                <table class="excel-table text-left text-xs">
                    <thead>
                        <tr class="bg-slate-200 text-black font-bold uppercase text-[10px]">
                            <th class="py-1 px-1 text-center w-8">#</th>
                            <th class="py-1 px-2 w-28">Brand / Company</th>
                            <th class="py-1 px-2 w-20">Type</th>
                            <th class="py-1 px-2">Product Specification / Name</th>
                            <th class="py-1 px-2 text-right w-24">Return Pcs</th>
                            <th class="py-1 px-2 text-right w-16">% Total</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white text-black font-medium text-[11px]">
                        ${rowsHtml || '<tr><td colspan="6" class="p-4 text-center text-xs">No claim items recorded.</td></tr>'}
                    </tbody>
                    <tfoot>
                        <tr class="bg-slate-100 font-bold border-t-2 border-b-2 border-black text-black text-[11px]">
                            <td colspan="4" class="py-1 px-2 text-right uppercase">
                                Grand Total Factory Return Units:
                            </td>
                            <td class="py-1 px-2 text-right font-mono font-bold">
                                ${totalCounted} pcs
                            </td>
                            <td class="py-1 px-2 text-right font-mono font-bold">
                                100%
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- Compact 3-Column Signatures Block -->
            <table class="excel-table text-[10px] mt-2">
                <tr>
                    <td class="py-2 px-2 text-center w-1/3">
                        <span class="text-gray-500 block text-[9px] mb-3">Warehouse Incharge Sign & Stamp</span>
                        <div class="border-t border-black pt-0.5 font-bold uppercase text-[9px]">Warehouse Dispatcher</div>
                    </td>
                    <td class="py-2 px-2 text-center w-1/3">
                        <span class="text-gray-500 block text-[9px] mb-3">Quality Inspection Auditor</span>
                        <div class="border-t border-black pt-0.5 font-bold uppercase text-[9px]">Stock Quality Officer</div>
                    </td>
                    <td class="py-2 px-2 text-center w-1/3">
                        <span class="text-gray-500 block text-[9px] mb-3">Company Receiver Sign & Stamp</span>
                        <div class="border-t border-black pt-0.5 font-bold uppercase text-[9px]">Manufacturer Representative</div>
                    </td>
                </tr>
            </table>
        `;
    }

    buildSingleDriverReportHtml(dateRangeStr, grandTotalPieces) {
        const now = new Date();
        const printedStr = `${now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const driverName = this.claims[0]?.driver_name || 'Driver';
        const truckName = this.claims[0]?.truck_name || 'Vehicle';
        const driverPhone = this.claims[0]?.live_driver_phone || '';

        // Build itemized list with claim date and shop
        const itemsByClaimId = new Map();
        this.claimItems.forEach(i => {
            if (!itemsByClaimId.has(i.claim_id)) itemsByClaimId.set(i.claim_id, []);
            itemsByClaimId.get(i.claim_id).push(i);
        });

        let rowIndex = 0;
        let totalDriverPcs = 0;
        const rowsHtmlArr = [];

        this.claims.forEach(c => {
            const cItems = itemsByClaimId.get(c.id) || [];
            cItems.forEach(item => {
                rowIndex++;
                const qty = parseInt(item.quantity, 10) || 1;
                totalDriverPcs += qty;

                rowsHtmlArr.push(`
                    <tr>
                        <td class="p-1 px-1 text-center font-mono text-[10px]">${rowIndex}</td>
                        <td class="p-1 px-2 font-mono text-[10px]">${this.escapeHtml(c.claim_date)}</td>
                        <td class="p-1 px-2 font-mono font-bold text-[10px]">${this.escapeHtml(c.claim_code || `CLM-${c.id}`)}</td>
                        <td class="p-1 px-2 font-bold uppercase text-[10px]">${this.escapeHtml(item.manufacturer || 'General')}</td>
                        <td class="p-1 px-2 font-bold text-[11px] text-black">${this.escapeHtml(item.display_name)}</td>
                        <td class="p-1 px-2 text-[10px]">${this.escapeHtml(c.customer_shop || '—')}</td>
                        <td class="p-1 px-2 text-right font-mono font-bold text-[11px]">${qty}</td>
                    </tr>
                `);
            });
        });

        return `
            <!-- Compact Official Excel Header Box -->
            <table class="excel-table text-left mb-1">
                <thead>
                    <tr>
                        <th colspan="4" class="py-1 px-2 text-center text-xs font-black uppercase bg-slate-100 tracking-wider">
                            WAREHOUSE MANAGEMENT SYSTEM — DRIVER WARRANTY CLAIM RETURN CHIT
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="text-[11px]">
                        <td class="p-1 px-2 w-1/4"><strong>Driver:</strong> <span class="font-bold text-black">${this.escapeHtml(driverName)}</span> ${driverPhone ? `(${this.escapeHtml(driverPhone)})` : ''}</td>
                        <td class="p-1 px-2 w-1/4"><strong>Truck:</strong> <span class="font-bold">${this.escapeHtml(truckName)}</span></td>
                        <td class="p-1 px-2 w-1/4"><strong>Period:</strong> <span class="font-mono">${this.escapeHtml(dateRangeStr)}</span></td>
                        <td class="p-1 px-2 w-1/4"><strong>Total Defect Pieces:</strong> <span class="font-mono font-bold text-black">${totalDriverPcs} pcs</span></td>
                    </tr>
                    <tr class="text-[10px] bg-slate-50/50">
                        <td colspan="3" class="p-1 px-2">
                            <strong>Chit Purpose:</strong> Daily driver defect returns reconciliation & replacement balance verification.
                        </td>
                        <td class="p-1 px-2 text-right">
                            <span class="text-[9px] text-gray-600 font-mono">Printed: ${printedStr}</span>
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Itemized Driver Table -->
            <div class="w-full overflow-x-auto">
                <table class="excel-table text-left text-xs">
                    <thead>
                        <tr class="bg-slate-200 text-black font-bold uppercase text-[10px]">
                            <th class="py-1 px-1 text-center w-8">#</th>
                            <th class="py-1 px-2 w-20">Date</th>
                            <th class="py-1 px-2 w-28">Claim Code</th>
                            <th class="py-1 px-2 w-24">Brand</th>
                            <th class="py-1 px-2">Product Specification / Name</th>
                            <th class="py-1 px-2 w-32">Customer / Shop</th>
                            <th class="py-1 px-2 text-right w-20">Qty (Pcs)</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white text-black font-medium text-[11px]">
                        ${rowsHtmlArr.join('') || '<tr><td colspan="7" class="p-4 text-center text-xs">No claim items recorded for this driver.</td></tr>'}
                    </tbody>
                    <tfoot>
                        <tr class="bg-slate-100 font-bold border-t-2 border-b-2 border-black text-black text-[11px]">
                            <td colspan="6" class="py-1 px-2 text-right uppercase">
                                Total Units Returned by Driver:
                            </td>
                            <td class="py-1 px-2 text-right font-mono font-bold">
                                ${totalDriverPcs} pcs
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- Signatures Block -->
            <table class="excel-table text-[10px] mt-2">
                <tr>
                    <td class="py-2 px-2 text-center w-1/2">
                        <span class="text-gray-500 block text-[9px] mb-3">Driver / Salesman Sign-off</span>
                        <div class="border-t border-black pt-0.5 font-bold uppercase text-[9px]">${this.escapeHtml(driverName)} (Driver)</div>
                    </td>
                    <td class="py-2 px-2 text-center w-1/2">
                        <span class="text-gray-500 block text-[9px] mb-3">Warehouse Stock Receiving Signature</span>
                        <div class="border-t border-black pt-0.5 font-bold uppercase text-[9px]">Warehouse Stock Receiver</div>
                    </td>
                </tr>
            </table>
        `;
    }

    buildFullCompleteReportHtml(dateRangeStr, grandTotalPieces) {
        // Section 1: Combined Factory Summary
        const combinedHtml = this.buildCombinedCompanyReportHtml(dateRangeStr, grandTotalPieces);

        // Group claims by Driver
        const claimsByDriver = new Map();
        this.claims.forEach(c => {
            const dName = c.driver_name || 'Unassigned Driver';
            if (!claimsByDriver.has(dName)) claimsByDriver.set(dName, []);
            claimsByDriver.get(dName).push(c);
        });

        const itemsByClaimId = new Map();
        this.claimItems.forEach(i => {
            if (!itemsByClaimId.has(i.claim_id)) itemsByClaimId.set(i.claim_id, []);
            itemsByClaimId.get(i.claim_id).push(i);
        });

        let driversSectionsHtml = '';

        claimsByDriver.forEach((dClaims, dName) => {
            let dTotal = 0;
            let idx = 0;
            const dRows = [];

            dClaims.forEach(c => {
                const cItems = itemsByClaimId.get(c.id) || [];
                cItems.forEach(item => {
                    idx++;
                    const qty = parseInt(item.quantity, 10) || 1;
                    dTotal += qty;
                    dRows.push(`
                        <tr>
                            <td class="p-1 px-1 text-center font-mono text-[10px]">${idx}</td>
                            <td class="p-1 px-2 font-mono text-[10px]">${this.escapeHtml(c.claim_date)}</td>
                            <td class="p-1 px-2 font-mono font-bold text-[10px]">${this.escapeHtml(c.claim_code || `CLM-${c.id}`)}</td>
                            <td class="p-1 px-2 font-bold uppercase text-[10px]">${this.escapeHtml(item.manufacturer || 'General')}</td>
                            <td class="p-1 px-2 font-bold text-[11px] text-black">${this.escapeHtml(item.display_name)}</td>
                            <td class="p-1 px-2 text-[10px]">${this.escapeHtml(c.customer_shop || '—')}</td>
                            <td class="p-1 px-2 text-right font-mono font-bold text-[11px]">${qty}</td>
                        </tr>
                    `);
                });
            });

            driversSectionsHtml += `
                <div class="mt-4 pt-2 border-t-2 border-black">
                    <div class="bg-slate-100 p-1.5 border border-black mb-1 flex items-center justify-between">
                        <span class="font-bold text-xs uppercase text-black">Driver Breakdown: ${this.escapeHtml(dName)} (${dClaims[0]?.truck_name || 'Vehicle'})</span>
                        <span class="font-mono font-bold text-xs text-black">Subtotal: ${dTotal} pcs</span>
                    </div>
                    <table class="excel-table text-left text-xs mb-1">
                        <thead>
                            <tr class="bg-slate-200 text-black font-bold uppercase text-[10px]">
                                <th class="py-1 px-1 text-center w-8">#</th>
                                <th class="py-1 px-2 w-20">Date</th>
                                <th class="py-1 px-2 w-28">Claim Code</th>
                                <th class="py-1 px-2 w-24">Brand</th>
                                <th class="py-1 px-2">Product Name</th>
                                <th class="py-1 px-2 w-32">Shop</th>
                                <th class="py-1 px-2 text-right w-20">Qty (Pcs)</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white text-black font-medium text-[11px]">
                            ${dRows.join('')}
                        </tbody>
                        <tfoot>
                            <tr class="bg-slate-50 font-bold border-t border-black text-black text-[11px]">
                                <td colspan="6" class="py-1 px-2 text-right uppercase">Subtotal for ${this.escapeHtml(dName)}:</td>
                                <td class="py-1 px-2 text-right font-mono font-bold">${dTotal} pcs</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        });

        return `
            <div>
                ${combinedHtml}
                <div class="mt-4">
                    <h3 class="text-xs font-black uppercase text-center tracking-wider bg-slate-900 text-white p-1 mb-2">
                        INDIVIDUAL DRIVER RETURN BREAKDOWN SHEETS
                    </h3>
                    ${driversSectionsHtml}
                </div>
            </div>
        `;
    }

    showError(msg) {
        if (this.loadingState) this.loadingState.classList.add('hidden');
        if (this.reportPaper) this.reportPaper.classList.add('hidden');
        if (this.claimsReportPaper) this.claimsReportPaper.classList.add('hidden');
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
    const previewController = new WarehouseReportPreviewController();
    previewController.init();
});
