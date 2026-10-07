/**
 * Product and Category Management Service
 */
import { dbManager } from '../db.js';

export const productService = {
    // --- Categories ---
    getCategories(includeInactive = false) {
        const sql = includeInactive
            ? 'SELECT * FROM categories ORDER BY name ASC'
            : 'SELECT * FROM categories WHERE active = 1 ORDER BY name ASC';
        return dbManager.query(sql);
    },

    getCategoryById(id) {
        return dbManager.queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    },

    createCategory({ name, description = '', active = 1 }) {
        if (!name || !name.trim()) throw new Error('Category name is required');
        const trimmed = name.trim();
        const existing = dbManager.queryOne('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [trimmed]);
        if (existing) throw new Error(`Category "${trimmed}" already exists`);

        const result = dbManager.run(
            'INSERT INTO categories (name, description, active, created_at, updated_at) VALUES (?, ?, ?, datetime("now", "localtime"), datetime("now", "localtime"))',
            [trimmed, description.trim(), active ? 1 : 0]
        );
        dbManager.notifyChange('CATEGORY_CREATED', { id: result.lastInsertRowId });
        return result.lastInsertRowId;
    },

    updateCategory(id, { name, description, active }) {
        const existing = this.getCategoryById(id);
        if (!existing) throw new Error('Category not found');

        const trimmed = name ? name.trim() : existing.name;
        const dupe = dbManager.queryOne('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?', [trimmed, id]);
        if (dupe) throw new Error(`Category "${trimmed}" already exists`);

        dbManager.run(
            'UPDATE categories SET name = ?, description = ?, active = ?, updated_at = datetime("now", "localtime") WHERE id = ?',
            [
                trimmed,
                description !== undefined ? description.trim() : existing.description,
                active !== undefined ? (active ? 1 : 0) : existing.active,
                id
            ]
        );
        dbManager.notifyChange('CATEGORY_UPDATED', { id });
    },

    toggleCategoryActive(id) {
        const cat = this.getCategoryById(id);
        if (!cat) throw new Error('Category not found');
        const newStatus = cat.active ? 0 : 1;
        dbManager.run('UPDATE categories SET active = ?, updated_at = datetime("now", "localtime") WHERE id = ?', [newStatus, id]);
        dbManager.notifyChange('CATEGORY_UPDATED', { id });
        return newStatus;
    },

    // --- Products ---
    getProducts({ includeInactive = false, categoryId = null, searchQuery = '' } = {}) {
        let sql = `
            SELECT p.*, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (!includeInactive) {
            sql += ' AND p.active = 1';
        }
        if (categoryId) {
            sql += ' AND p.category_id = ?';
            params.push(categoryId);
        }
        if (searchQuery && searchQuery.trim()) {
            const q = `%${searchQuery.trim()}%`;
            sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ? OR p.size LIKE ?)';
            params.push(q, q, q, q);
        }

        sql += ' ORDER BY p.name ASC';
        return dbManager.query(sql, params);
    },

    getProductById(id) {
        return dbManager.queryOne(`
            SELECT p.*, c.name AS category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        `, [id]);
    },

    getProductBySku(sku) {
        if (!sku) return null;
        return dbManager.queryOne('SELECT * FROM products WHERE UPPER(sku) = UPPER(?)', [sku.trim()]);
    },

    createProduct({
        sku,
        name,
        category_id = null,
        brand = '',
        size = '',
        type = '',
        unit = 'pcs',
        cost_price = 0,
        sale_price = 0,
        minimum_stock = 5,
        active = 1,
        notes = '',
        initial_stock = 0
    }) {
        if (!name || !name.trim()) throw new Error('Product name is required');
        if (!sku || !sku.trim()) throw new Error('SKU / Product Code is required');

        const trimmedSku = sku.trim();
        const trimmedName = name.trim();

        const existing = this.getProductBySku(trimmedSku);
        if (existing) throw new Error(`Product with SKU "${trimmedSku}" already exists`);

        return dbManager.transaction((mgr) => {
            const result = mgr.run(`
                INSERT INTO products (
                    sku, name, category_id, brand, size, type, unit,
                    cost_price, sale_price, minimum_stock, active, notes,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now", "localtime"), datetime("now", "localtime"))
            `, [
                trimmedSku,
                trimmedName,
                category_id || null,
                brand ? brand.trim() : '',
                size ? size.trim() : '',
                type ? type.trim() : '',
                unit ? unit.trim() : 'pcs',
                Number(cost_price) || 0,
                Number(sale_price) || 0,
                parseInt(minimum_stock, 10) || 0,
                active ? 1 : 0,
                notes ? notes.trim() : ''
            ]);

            const productId = result.lastInsertRowId;

            // Record initial stock if provided
            const initQty = parseInt(initial_stock, 10);
            if (initQty > 0) {
                const today = new Date().toISOString().split('T')[0];
                mgr.run(`
                    INSERT INTO inventory_transactions (
                        product_id, transaction_type, quantity, reference_type,
                        reference_id, transaction_date, notes, created_at
                    ) VALUES (?, 'INITIAL_STOCK', ?, 'INITIAL', NULL, ?, 'Initial warehouse opening stock', datetime("now", "localtime"))
                `, [productId, initQty, today]);
            }

            return productId;
        });
    },

    updateProduct(id, data) {
        const existing = this.getProductById(id);
        if (!existing) throw new Error('Product not found');

        const trimmedSku = data.sku ? data.sku.trim() : existing.sku;
        const dupe = dbManager.queryOne('SELECT id FROM products WHERE UPPER(sku) = UPPER(?) AND id != ?', [trimmedSku, id]);
        if (dupe) throw new Error(`Another product with SKU "${trimmedSku}" already exists`);

        dbManager.run(`
            UPDATE products SET
                sku = ?,
                name = ?,
                category_id = ?,
                brand = ?,
                size = ?,
                type = ?,
                unit = ?,
                cost_price = ?,
                sale_price = ?,
                minimum_stock = ?,
                active = ?,
                notes = ?,
                updated_at = datetime("now", "localtime")
            WHERE id = ?
        `, [
            trimmedSku,
            data.name ? data.name.trim() : existing.name,
            data.category_id !== undefined ? (data.category_id || null) : existing.category_id,
            data.brand !== undefined ? data.brand.trim() : existing.brand,
            data.size !== undefined ? data.size.trim() : existing.size,
            data.type !== undefined ? data.type.trim() : existing.type,
            data.unit !== undefined ? data.unit.trim() : existing.unit,
            data.cost_price !== undefined ? Number(data.cost_price) || 0 : existing.cost_price,
            data.sale_price !== undefined ? Number(data.sale_price) || 0 : existing.sale_price,
            data.minimum_stock !== undefined ? parseInt(data.minimum_stock, 10) || 0 : existing.minimum_stock,
            data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
            data.notes !== undefined ? data.notes.trim() : existing.notes,
            id
        ]);

        dbManager.notifyChange('PRODUCT_UPDATED', { id });
    },

    toggleProductActive(id) {
        const prod = this.getProductById(id);
        if (!prod) throw new Error('Product not found');
        const newStatus = prod.active ? 0 : 1;
        dbManager.run('UPDATE products SET active = ?, updated_at = datetime("now", "localtime") WHERE id = ?', [newStatus, id]);
        dbManager.notifyChange('PRODUCT_UPDATED', { id });
        return newStatus;
    }
};
