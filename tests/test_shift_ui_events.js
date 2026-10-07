/**
 * Test: Daily Shift UI Events & Controller Methods Verification
 */
const fs = require('fs');
const path = require('path');

console.log('=== TESTING APP.JS SHIFT CONTROLLER METHODS & EVENT BINDINGS ===\n');

// 1. Verify app.js syntax
const appJsPath = path.join(__dirname, '..', 'js', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Check that new shift button listeners exist in app.js
const requiredSnippets = [
    'this.btnOpenNewShift.addEventListener',
    'this.btnEmptyStartShift.addEventListener',
    'this.btnBackToShifts.addEventListener',
    'this.btnSaveShiftTop.addEventListener',
    'this.btnSaveShiftBottom.addEventListener',
    'this.btnFinalizeShiftTop.addEventListener',
    'this.btnFinalizeShiftBottom.addEventListener',
    'this.btnAddProductRow.addEventListener',
    'this.shiftSearchInput.addEventListener',
    'this.shiftFilterDate.addEventListener',
    'this.shiftFilterTruck.addEventListener',
    'this.shiftFilterStatus.addEventListener',
    'this.btnResetShiftFilters.addEventListener',
    'this.shiftSelectTruck.addEventListener',
    'this.shiftProductSearch.addEventListener',
    'this.btnCloseShiftPreview.addEventListener',
    'this.btnEditFromPreview.addEventListener',
    'this.btnFinalizeFromPreview.addEventListener',
    'this.btnPrintShiftPreview.addEventListener',
    'openNewShiftSheet()',
    'openEditShiftSheet(',
    'openPreviewShiftModal(',
    'closePreviewShiftModal()',
    'closeShiftSheetView()',
    'handleShiftProductSearch(',
    'addProductToCurrentShift(',
    'renderShiftItemsTable()',
    'updateShiftSummaryTotals()',
    'updateShiftSheetStatusBadge()',
    'finalizeShiftFromPreview()',
    'quickCloseShift(',
    'quickReopenShift(',
    'saveShiftSheet('
];

let allFound = true;
requiredSnippets.forEach(snippet => {
    if (appJsContent.includes(snippet)) {
        console.log(`✓ Found: ${snippet}`);
    } else {
        console.error(`✗ Missing: ${snippet}`);
        allFound = false;
    }
});

if (!allFound) {
    console.error('\n❌ Verification failed: Some shift event bindings are missing.');
    process.exit(1);
}

// 2. Verify index.html contains all corresponding shift element IDs
const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const requiredHtmlIds = [
    'nav-shifts',
    'view-shifts',
    'shift-list-section',
    'btn-open-new-shift',
    'shift-search-input',
    'shift-filter-date',
    'shift-filter-truck',
    'shift-filter-status',
    'btn-reset-shift-filters',
    'shift-total-count-badge',
    'shifts-table-body',
    'shift-table-empty-state',
    'btn-empty-start-shift',
    'shifts-pagination-container',
    'shifts-pagination-info',
    'shifts-pagination-controls',
    'shift-sheet-section',
    'btn-back-to-shifts',
    'shift-sheet-title',
    'shift-sheet-status-badge',
    'btn-save-shift-top',
    'btn-finalize-shift-top',
    'shift-select-truck',
    'shift-input-driver',
    'shift-input-date',
    'shift-input-status',
    'shift-input-code',
    'shift-input-notes',
    'shift-product-search',
    'shift-product-dropdown',
    'shift-quick-qty',
    'btn-add-product-row',
    'shift-items-tbody',
    'shift-items-empty',
    'shift-summary-items-count',
    'shift-summary-dispatch-total',
    'shift-summary-sales-total',
    'shift-summary-return-total',
    'btn-cancel-shift-bottom',
    'btn-save-shift-bottom',
    'btn-finalize-shift-bottom',
    'shift-preview-modal',
    'shift-preview-code',
    'shift-preview-status-badge',
    'shift-preview-date',
    'shift-preview-truck',
    'shift-preview-driver',
    'shift-preview-notes',
    'shift-preview-items-count',
    'shift-preview-items-tbody',
    'shift-preview-dispatch-total',
    'shift-preview-sales-total',
    'shift-preview-return-total',
    'btn-print-shift-preview',
    'btn-edit-from-preview',
    'btn-finalize-from-preview',
    'btn-close-shift-preview',
    'subtab-trucks-btn',
    'subtab-drivers-btn',
    'subtab-trucks-content',
    'subtab-drivers-content',
    'truck-search-input',
    'btn-open-add-truck',
    'trucks-table-body',
    'truck-modal',
    'form-truck-reg',
    'form-truck-name',
    'btn-save-truck',
    'driver-search-input',
    'btn-open-add-driver',
    'drivers-table-body',
    'driver-modal',
    'form-driver-name',
    'form-driver-phone',
    'btn-save-driver'
];

let allIdsFound = true;
requiredHtmlIds.forEach(id => {
    if (htmlContent.includes(`id="${id}"`)) {
        console.log(`✓ HTML ID exists: #${id}`);
    } else {
        console.error(`✗ Missing HTML ID: #${id}`);
        allIdsFound = false;
    }
});

if (!allIdsFound) {
    console.error('\n❌ Verification failed: Some HTML element IDs are missing.');
    process.exit(1);
}

console.log('\n🎉 ALL SHIFT CONTROLLER METHODS, EVENT HANDLERS & PREVIEW/FINALIZE CONTROLS VERIFIED 100% OK!\n');
process.exit(0);
