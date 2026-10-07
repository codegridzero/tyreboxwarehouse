/**
 * Comprehensive Product Modal & UI Flow Verification
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8');
const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf-8');

console.log('=== VERIFYING PRODUCT MODAL & UI CONTROLS ===\n');

// 1. Verify all required HTML IDs exist
const requiredIds = [
    'btn-open-add-product',
    'btn-empty-add',
    'product-modal',
    'product-modal-card',
    'modal-title',
    'modal-subtitle',
    'btn-close-modal',
    'btn-cancel-modal',
    'product-form',
    'form-product-id',
    'form-product-type',
    'custom-type-container',
    'form-custom-type',
    'label-product-number',
    'form-product-number',
    'label-vehicle-name',
    'form-vehicle-name',
    'label-bundle-qty',
    'form-bundle-qty',
    'tire-specific-fields',
    'form-position',
    'form-strength',
    'form-manufacturer',
    'form-notes',
    'product-image-drop-zone',
    'form-product-images-input',
    'product-images-preview-grid',
    'product-images-count-badge',
    'btn-save-product',
    'products-table-head',
    'products-table-body',
    'subtab-prod-all',
    'subtab-prod-tires-tubes',
    'subtab-prod-chains',
    'subtab-prod-oil',
    'subtab-prod-rims',
    'subtab-prod-spokes',
    'subtab-prod-batteries'
];

for (const id of requiredIds) {
    if (!indexHtml.includes(`id="${id}"`)) {
        throw new Error(`Missing required ID in index.html: #${id}`);
    }
    console.log(`✓ HTML ID exists: #${id}`);
}

// 2. Verify all JS method bindings in app.js
const requiredJsSnippets = [
    'if (btnOpenAddProduct) btnOpenAddProduct.addEventListener(\'click\', () => this.openAddProductModal());',
    'if (btnEmptyAddProduct) btnEmptyAddProduct.addEventListener(\'click\', () => this.openAddProductModal());',
    'if (btnCloseProductModal) btnCloseProductModal.addEventListener(\'click\', () => this.closeProductModal());',
    'if (btnCancelProductModal) btnCancelProductModal.addEventListener(\'click\', () => this.closeProductModal());',
    'openAddProductModal() {',
    'openEditProductModal(id) {',
    'showProductModal() {',
    'closeProductModal() {',
    'handleProductFormSubmit(e) {',
    'deleteProduct(id) {',
    'updateProductFormFieldsForType(type) {',
    'switchProductSubtab(tabKey) {'
];

for (const snippet of requiredJsSnippets) {
    if (!appJs.includes(snippet)) {
        throw new Error(`Missing JS method/binding in app.js: ${snippet}`);
    }
    console.log(`✓ JS binding exists: ${snippet.slice(0, 50)}...`);
}

console.log('\n🎉 ALL PRODUCT MODAL CONTROLS, IDS & BINDINGS VERIFIED 100% OK!\n');
