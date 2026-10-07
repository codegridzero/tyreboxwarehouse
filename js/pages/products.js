/**
 * Products & Categories Management Screen
 */
import { productService } from '../services/productService.js';
import { formatCurrency, formatNumber, escapeHtml } from '../utils.js';
import { modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export const productsPage = {
    render(container, workingDate, urlParams = {}) {
        const activeTab = urlParams.tab || 'products';
        const categories = productService.getCategories(true);
        const products = productService.getProducts({ includeInactive: true });

        let tabContentHtml = '';

        if (activeTab === 'categories') {
            tabContentHtml = `
                <!-- Categories View -->
                <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                    <div class="p-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wider">Product Categories</h3>
                            <p class="text-xs text-gray-500">Manage categories for tire, tube, and accessory groupings</p>
                        </div>
                        <button type="button" id="btn-add-category" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                            + New Category
                        </button>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                            <thead class="bg-gray-50 text-gray-500 uppercase font-semibold">
                                <tr>
                                    <th class="px-4 py-3">Category Name</th>
                                    <th class="px-4 py-3">Description</th>
                                    <th class="px-4 py-3 text-center">Status</th>
                                    <th class="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 bg-white">
                                ${categories.map(c => `
                                    <tr class="table-row-hover">
                                        <td class="px-4 py-3 font-bold text-gray-900 text-sm">${c.name}</td>
                                        <td class="px-4 py-3 text-gray-600">${c.description || '—'}</td>
                                        <td class="px-4 py-3 text-center">
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}">
                                                ${c.active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3 text-right space-x-2">
                                            <button type="button" data-action="edit-cat" data-id="${c.id}" class="text-xs font-semibold text-sky-600 hover:underline">Edit</button>
                                            <button type="button" data-action="toggle-cat" data-id="${c.id}" class="text-xs font-semibold text-gray-500 hover:text-gray-800">
                                                ${c.active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else {
            // Products List View
            tabContentHtml = `
                <!-- Products Filters & Action Bar -->
                <div class="bg-white p-4 rounded-xl shadow-xs border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div class="flex items-center space-x-3 w-full sm:w-auto">
                        <div class="relative w-full sm:w-64">
                            <input type="text" id="prod-search-input" placeholder="Search SKU, name, brand, size..." class="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500">
                            <svg class="w-4 h-4 text-gray-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        </div>
                        <select id="prod-cat-filter" class="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white">
                            <option value="">All Categories</option>
                            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>

                    <div class="flex items-center space-x-2 w-full sm:w-auto justify-end">
                        <button type="button" id="btn-add-product" class="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                            + Add New Product
                        </button>
                    </div>
                </div>

                <!-- Products Table -->
                <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                            <thead class="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                                <tr>
                                    <th class="px-4 py-3.5">SKU</th>
                                    <th class="px-4 py-3.5">Product Name</th>
                                    <th class="px-4 py-3.5">Category</th>
                                    <th class="px-4 py-3.5">Brand & Size</th>
                                    <th class="px-4 py-3.5 text-right">Min Stock</th>
                                    <th class="px-4 py-3.5 text-right">Sale Price</th>
                                    <th class="px-4 py-3.5 text-center">Status</th>
                                    <th class="px-4 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 bg-white" id="prod-table-body">
                                ${products.map(p => `
                                    <tr class="table-row-hover" data-name="${p.name.toLowerCase()}" data-sku="${p.sku.toLowerCase()}" data-cat="${p.category_id}">
                                        <td class="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-gray-900">${p.sku}</td>
                                        <td class="px-4 py-3.5 whitespace-nowrap font-bold text-gray-900 text-sm">${p.name}</td>
                                        <td class="px-4 py-3.5 whitespace-nowrap text-gray-600">${p.category_name || '—'}</td>
                                        <td class="px-4 py-3.5 whitespace-nowrap text-gray-600">${p.brand || '—'} ${p.size ? `(${p.size})` : ''}</td>
                                        <td class="px-4 py-3.5 whitespace-nowrap text-right font-medium text-gray-600">${formatNumber(p.minimum_stock)} ${p.unit}</td>
                                        <td class="px-4 py-3.5 whitespace-nowrap text-right font-bold text-gray-900">${p.sale_price ? formatCurrency(p.sale_price) : '—'}</td>
                                        <td class="px-4 py-3.5 whitespace-nowrap text-center">
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${p.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}">
                                                ${p.active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3.5 whitespace-nowrap text-right space-x-2">
                                            <button type="button" data-action="edit-prod" data-id="${p.id}" class="text-xs font-semibold text-sky-600 hover:underline">Edit</button>
                                            <button type="button" data-action="toggle-prod" data-id="${p.id}" class="text-xs font-semibold text-gray-500 hover:text-gray-800">
                                                ${p.active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
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
                        <h2 class="text-2xl font-bold text-gray-900">Products & Categories Master</h2>
                        <p class="text-sm text-gray-500">Configure catalog products, SKU codes, pricing, and groupings</p>
                    </div>

                    <!-- Tab Switcher -->
                    <div class="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold">
                        <a href="#products?tab=products" class="px-3 py-1.5 rounded-lg transition ${activeTab === 'products' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}">
                            All Products (${products.length})
                        </a>
                        <a href="#products?tab=categories" class="px-3 py-1.5 rounded-lg transition ${activeTab === 'categories' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}">
                            Categories (${categories.length})
                        </a>
                    </div>
                </div>

                <!-- Tab Content -->
                ${tabContentHtml}
            </div>
        `;

        this.bindEvents(container, activeTab, categories, products);
    },

    bindEvents(container, activeTab, categories, products) {
        if (activeTab === 'categories') {
            const addCatBtn = container.querySelector('#btn-add-category');
            if (addCatBtn) addCatBtn.addEventListener('click', () => this.openCategoryModal());

            container.querySelectorAll('[data-action="edit-cat"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const catId = parseInt(btn.getAttribute('data-id'), 10);
                    const cat = productService.getCategoryById(catId);
                    this.openCategoryModal(cat);
                });
            });

            container.querySelectorAll('[data-action="toggle-cat"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const catId = parseInt(btn.getAttribute('data-id'), 10);
                    productService.toggleCategoryActive(catId);
                    toast.info('Category status updated');
                    window.location.reload();
                });
            });
        } else {
            const addProdBtn = container.querySelector('#btn-add-product');
            if (addProdBtn) addProdBtn.addEventListener('click', () => this.openProductModal(null, categories));

            const searchInput = container.querySelector('#prod-search-input');
            const catFilter = container.querySelector('#prod-cat-filter');
            const tableBody = container.querySelector('#prod-table-body');

            if (searchInput && tableBody) {
                const filterProducts = () => {
                    const q = searchInput.value.trim().toLowerCase();
                    const catId = catFilter.value;
                    const rows = tableBody.querySelectorAll('tr');

                    rows.forEach(r => {
                        const name = r.getAttribute('data-name') || '';
                        const sku = r.getAttribute('data-sku') || '';
                        const cat = r.getAttribute('data-cat') || '';

                        const matchesQ = !q || name.includes(q) || sku.includes(q);
                        const matchesC = !catId || cat === catId;

                        if (matchesQ && matchesC) r.classList.remove('hidden');
                        else r.classList.add('hidden');
                    });
                };

                searchInput.addEventListener('input', filterProducts);
                catFilter.addEventListener('change', filterProducts);
            }

            container.querySelectorAll('[data-action="edit-prod"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const prodId = parseInt(btn.getAttribute('data-id'), 10);
                    const prod = productService.getProductById(prodId);
                    this.openProductModal(prod, categories);
                });
            });

            container.querySelectorAll('[data-action="toggle-prod"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const prodId = parseInt(btn.getAttribute('data-id'), 10);
                    productService.toggleProductActive(prodId);
                    toast.info('Product status updated');
                    window.location.reload();
                });
            });
        }
    },

    openCategoryModal(category = null) {
        modal.show({
            title: category ? 'Edit Category' : 'Create Product Category',
            content: `
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Category Name <span class="text-red-500">*</span></label>
                        <input type="text" id="cat-name-input" value="${category ? escapeHtml(category.name) : ''}" placeholder="e.g. Tires, Tubes" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Description</label>
                        <textarea id="cat-desc-input" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs" placeholder="Brief description">${category ? escapeHtml(category.description || '') : ''}</textarea>
                    </div>
                    <div class="flex justify-end space-x-2 pt-3 border-t">
                        <button type="button" id="modal-cancel-cat" class="px-4 py-2 border rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="button" id="modal-save-cat" class="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs">${category ? 'Update Category' : 'Create Category'}</button>
                    </div>
                </div>
            `,
            onOpen: (modalEl, close) => {
                modalEl.querySelector('#modal-cancel-cat').addEventListener('click', close);
                modalEl.querySelector('#modal-save-cat').addEventListener('click', () => {
                    const name = modalEl.querySelector('#cat-name-input').value;
                    const description = modalEl.querySelector('#cat-desc-input').value;

                    try {
                        if (category) {
                            productService.updateCategory(category.id, { name, description });
                            toast.success('Category updated');
                        } else {
                            productService.createCategory({ name, description });
                            toast.success('Category created');
                        }
                        close();
                        window.location.reload();
                    } catch (err) {
                        toast.error(err.message);
                    }
                });
            }
        });
    },

    openProductModal(product = null, categories = []) {
        modal.show({
            title: product ? `Edit Product: ${product.name}` : 'Add New Product',
            size: 'max-w-2xl',
            content: `
                <div class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">SKU / Product Code <span class="text-red-500">*</span></label>
                            <input type="text" id="prod-sku-input" value="${product ? escapeHtml(product.sku) : ''}" placeholder="e.g. TIR-900-20" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono font-bold uppercase">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Product Name <span class="text-red-500">*</span></label>
                            <input type="text" id="prod-name-input" value="${product ? escapeHtml(product.name) : ''}" placeholder="e.g. 900-20 Tire" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Category</label>
                            <select id="prod-cat-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white">
                                <option value="">-- No Category --</option>
                                ${categories.map(c => `<option value="${c.id}" ${product && product.category_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Brand</label>
                            <input type="text" id="prod-brand-input" value="${product ? escapeHtml(product.brand || '') : ''}" placeholder="e.g. Bridgestone, Michelin" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Size / Dimension</label>
                            <input type="text" id="prod-size-input" value="${product ? escapeHtml(product.size || '') : ''}" placeholder="e.g. 900-20, 1000-20" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Unit of Measurement</label>
                            <input type="text" id="prod-unit-input" value="${product ? escapeHtml(product.unit || 'pcs') : 'pcs'}" placeholder="e.g. pcs, set" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Minimum Stock Level</label>
                            <input type="number" id="prod-min-stock-input" value="${product ? product.minimum_stock : 5}" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-bold">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 mb-1">Standard Sale Price ($)</label>
                            <input type="number" step="0.01" id="prod-sale-price-input" value="${product ? product.sale_price : ''}" placeholder="0.00" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs">
                        </div>
                    </div>

                    ${!product ? `
                        <div>
                            <label class="block text-xs font-bold text-emerald-800 mb-1">Initial Opening Stock (Optional)</label>
                            <input type="number" id="prod-init-stock-input" min="0" placeholder="0" class="w-full px-3 py-2 border border-emerald-300 bg-emerald-50 rounded-lg text-xs font-bold">
                            <span class="text-[11px] text-gray-500">Will automatically create an opening inventory balance transaction.</span>
                        </div>
                    ` : ''}

                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Notes / Specifications</label>
                        <input type="text" id="prod-notes-input" value="${product ? escapeHtml(product.notes || '') : ''}" placeholder="Additional product notes" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs">
                    </div>

                    <div class="flex justify-end space-x-2 pt-3 border-t">
                        <button type="button" id="modal-cancel-prod" class="px-4 py-2 border rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="button" id="modal-save-prod" class="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs">${product ? 'Update Product' : 'Create Product'}</button>
                    </div>
                </div>
            `,
            onOpen: (modalEl, close) => {
                modalEl.querySelector('#modal-cancel-prod').addEventListener('click', close);
                modalEl.querySelector('#modal-save-prod').addEventListener('click', () => {
                    const sku = modalEl.querySelector('#prod-sku-input').value;
                    const name = modalEl.querySelector('#prod-name-input').value;
                    const category_id = modalEl.querySelector('#prod-cat-select').value ? parseInt(modalEl.querySelector('#prod-cat-select').value, 10) : null;
                    const brand = modalEl.querySelector('#prod-brand-input').value;
                    const size = modalEl.querySelector('#prod-size-input').value;
                    const unit = modalEl.querySelector('#prod-unit-input').value || 'pcs';
                    const minimum_stock = parseInt(modalEl.querySelector('#prod-min-stock-input').value, 10) || 0;
                    const sale_price = parseFloat(modalEl.querySelector('#prod-sale-price-input').value) || 0;
                    const notes = modalEl.querySelector('#prod-notes-input').value;

                    const initInput = modalEl.querySelector('#prod-init-stock-input');
                    const initial_stock = initInput ? (parseInt(initInput.value, 10) || 0) : 0;

                    try {
                        if (product) {
                            productService.updateProduct(product.id, {
                                sku, name, category_id, brand, size, unit, minimum_stock, sale_price, notes
                            });
                            toast.success('Product updated');
                        } else {
                            productService.createProduct({
                                sku, name, category_id, brand, size, unit, minimum_stock, sale_price, notes, initial_stock
                            });
                            toast.success('Product created');
                        }
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
