/**
 * Utility functions for Tire & Tube Warehouse Management System
 */

export function getTodayDateStr() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const date = new Date(parts[0], parts[1] - 1, parts[2]);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
        return dateStr;
    } catch {
        return dateStr;
    }
}

export function formatDateTime(isoStr) {
    if (!isoStr) return '—';
    try {
        const date = new Date(isoStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return isoStr;
    }
}

export function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString('en-US');
}

export function formatCurrency(num) {
    if (num === null || num === undefined || isNaN(num)) return '$0.00';
    return '$' + Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Format product name in simple standard format for Reports & Previews:
 * Format: [Category] [Product Number/Size] [Strength] [Product Type]
 * Example: "DTL 2.50.17 6P Tire", "ANT 2.25.17 4P Tire", "428H-104L Chain"
 */
export function formatReportProductName(prodOrItem, productLookup = null) {
    if (!prodOrItem) return '';

    let p = prodOrItem;
    if (productLookup) {
        if (typeof productLookup === 'function' && prodOrItem.product_id) {
            const found = productLookup(prodOrItem.product_id);
            if (found) p = found;
        } else if (Array.isArray(productLookup) && prodOrItem.product_id) {
            const found = productLookup.find(x => x.id === prodOrItem.product_id);
            if (found) p = found;
        }
    }

    const cat = (p.category && p.category !== 'Nill' && p.category !== 'None') ? String(p.category).trim() : '';
    const num = (p.product_number || p.size || '').trim();
    const strength = (p.strength && p.strength !== 'Nill' && p.strength !== 'None') ? String(p.strength).trim() : '';
    const type = (p.product_type || p.type || '').trim();

    if (cat || num || strength || type) {
        return [cat, num, strength, type].filter(Boolean).join(' ');
    }

    // Fallback to name or display_name
    return p.display_name || p.name || p.product_name || '';
}

export function getStatusBadge(status) {
    const s = String(status || '').toUpperCase();
    switch (s) {
        case 'MATCHED':
        case 'CLOSED':
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                <svg class="mr-1 h-3 w-3 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                ${escapeHtml(s)}
            </span>`;
        case 'MISMATCH':
        case 'MISMATCH_CLOSED':
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
                <svg class="mr-1 h-3 w-3 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                ${s === 'MISMATCH_CLOSED' ? 'MISMATCH (CLOSED)' : 'MISMATCH'}
            </span>`;
        case 'ON_ROUTE':
        case 'ON ROUTE':
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                <svg class="mr-1 h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7h-3v5h4.05a2.5 2.5 0 014.9 0H20a1 1 0 001-1v-3.586a1 1 0 00-.293-.707l-2.414-2.414A1 1 0 0017.586 4H14v3z"/></svg>
                ON ROUTE
            </span>`;
        case 'LOADED':
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
                <svg class="mr-1 h-3 w-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clip-rule="evenodd"/></svg>
                LOADED
            </span>`;
        case 'RETURNED':
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                <svg class="mr-1 h-3 w-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
                RETURNED
            </span>`;
        case 'DRAFT':
        case 'PENDING':
        default:
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300">
                ${escapeHtml(s || 'PENDING')}
            </span>`;
    }
}

export function getStockStatusBadge(currentStock, minStock) {
    if (currentStock <= 0) {
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">Out of Stock</span>`;
    }
    if (currentStock <= minStock) {
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">Low Stock</span>`;
    }
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">Normal</span>`;
}

/**
 * Trigger browser file download of CSV data
 */
export function downloadCSV(filename, rows, headers) {
    if (!rows || !rows.length) return;
    const headerKeys = headers ? Object.keys(headers) : Object.keys(rows[0]);
    const headerLabels = headers ? Object.values(headers) : headerKeys;

    let csvContent = headerLabels.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\n';

    rows.forEach(row => {
        const line = headerKeys.map(k => {
            let val = row[k];
            if (val === null || val === undefined) val = '';
            return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',');
        csvContent += line + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Trigger browser file download of JSON data
 */
export function downloadJSON(filename, data) {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Read text/json from uploaded file
 */
export function readUploadedFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}
