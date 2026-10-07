/**
 * Realistic Master & Demo Seed Data for Tire & Tube Warehouse
 */
import { dbManager } from '../db.js';
import { getTodayDateStr } from '../utils.js';

export const seedData = {
    /**
     * Check if master data already exists
     */
    hasData() {
        const productCount = dbManager.queryOne('SELECT COUNT(*) AS cnt FROM products');
        return productCount && productCount.cnt > 0;
    },

    /**
     * Seed baseline Master Data (Categories, Products, Initial Stock, Drivers, Trucks)
     */
    seedMasterData() {
        const today = getTodayDateStr();

        return dbManager.transaction((mgr) => {
            // 1. Categories
            mgr.run("INSERT INTO categories (id, name, description, active) VALUES (1, 'Tires', 'Heavy duty commercial & truck tires', 1)");
            mgr.run("INSERT INTO categories (id, name, description, active) VALUES (2, 'Tubes', 'Inner tubes for commercial truck tires', 1)");
            mgr.run("INSERT INTO categories (id, name, description, active) VALUES (3, 'Flaps & Accessories', 'Tire flaps, valves, and accessories', 1)");

            // 2. Drivers
            mgr.run("INSERT INTO drivers (id, name, phone, active, notes) VALUES (1, 'Ali Khan', '+1 (555) 234-5678', 1, 'Senior route driver')");
            mgr.run("INSERT INTO drivers (id, name, phone, active, notes) VALUES (2, 'John Miller', '+1 (555) 345-6789', 1, 'North county sales driver')");
            mgr.run("INSERT INTO drivers (id, name, phone, active, notes) VALUES (3, 'Carlos Rodriguez', '+1 (555) 456-7890', 1, 'Metro delivery driver')");

            // 3. Trucks
            mgr.run("INSERT INTO trucks (id, name, registration_number, driver_id, active, notes) VALUES (1, 'Truck 1', 'WH-TRK-01', 1, 1, 'Isuzu 5-Ton Delivery Truck')");
            mgr.run("INSERT INTO trucks (id, name, registration_number, driver_id, active, notes) VALUES (2, 'Truck 2', 'WH-TRK-02', 2, 1, 'Hino 7-Ton Delivery Truck')");
            mgr.run("INSERT INTO trucks (id, name, registration_number, driver_id, active, notes) VALUES (3, 'Truck 3', 'WH-TRK-03', 3, 1, 'Mitsubishi Fuso 5-Ton')");

            // 4. Products
            const products = [
                { id: 1, sku: 'TIR-900-20', name: '900-20 Tire', catId: 1, brand: 'Bridgestone', size: '900-20', type: 'Radial', unit: 'pcs', cost: 120, sale: 165, min: 15, initialQty: 100 },
                { id: 2, sku: 'TIR-1000-20', name: '1000-20 Tire', catId: 1, brand: 'Michelin', size: '1000-20', type: 'Radial', unit: 'pcs', cost: 145, sale: 195, min: 10, initialQty: 80 },
                { id: 3, sku: 'TIR-11R225', name: '11R22.5 Tire', catId: 1, brand: 'Goodyear', size: '11R22.5', type: 'Tubeless', unit: 'pcs', cost: 175, sale: 235, min: 8, initialQty: 50 },
                { id: 4, sku: 'TUB-900-20', name: '900-20 Tube', catId: 2, brand: 'Nexen', size: '900-20', type: 'Butyl', unit: 'pcs', cost: 14, sale: 24, min: 20, initialQty: 150 },
                { id: 5, sku: 'TUB-1000-20', name: '1000-20 Tube', catId: 2, brand: 'Nexen', size: '1000-20', type: 'Butyl', unit: 'pcs', cost: 18, sale: 30, min: 15, initialQty: 120 },
                { id: 6, sku: 'FLP-20', name: '20-Inch Flap', catId: 3, brand: 'Standard', size: '20-inch', type: 'Rubber', unit: 'pcs', cost: 7, sale: 14, min: 25, initialQty: 90 }
            ];

            products.forEach(p => {
                mgr.run(`
                    INSERT INTO products (
                        id, sku, name, category_id, brand, size, type, unit,
                        cost_price, sale_price, minimum_stock, active, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Standard warehouse inventory')
                `, [p.id, p.sku, p.name, p.catId, p.brand, p.size, p.type, p.unit, p.cost, p.sale, p.min]);

                // Initial opening stock transaction
                mgr.run(`
                    INSERT INTO inventory_transactions (
                        product_id, transaction_type, quantity, reference_type,
                        reference_id, transaction_date, notes, created_at
                    ) VALUES (?, 'INITIAL_STOCK', ?, 'INITIAL', NULL, ?, 'Warehouse opening stock balance', datetime("now", "localtime"))
                `, [p.id, p.initialQty, today]);
            });
        });
    },

    /**
     * Seed realistic daily workflow scenario matching business specs
     */
    seedDemoDay(dateStr = null) {
        const date = dateStr || getTodayDateStr();

        return dbManager.transaction((mgr) => {
            // --- TRUCK 1: Closed & Matched Day ---
            // Morning Loading:
            // 20 x 900-20 Tire, 10 x 1000-20 Tire, 15 x 900-20 Tube
            const d1 = mgr.run(`
                INSERT INTO dispatches (truck_id, driver_id, dispatch_date, status, notes)
                VALUES (1, 1, ?, 'CLOSED', 'Morning dispatch Route A')
            `, [date]);
            const d1Id = d1.lastInsertRowId;

            const t1Items = [
                { prodId: 1, loaded: 20, sold: 14, phys: 6, price: 165 },
                { prodId: 2, loaded: 10, sold: 6, phys: 4, price: 195 },
                { prodId: 4, loaded: 15, sold: 10, phys: 5, price: 24 }
            ];

            t1Items.forEach(i => {
                mgr.run('INSERT INTO dispatch_items (dispatch_id, product_id, quantity) VALUES (?, ?, ?)', [d1Id, i.prodId, i.loaded]);
                mgr.run("INSERT INTO inventory_transactions (product_id, transaction_type, quantity, reference_type, reference_id, transaction_date, notes) VALUES (?, 'DISPATCH', ?, 'DISPATCH', ?, ?, 'Truck 1 morning loading')", [i.prodId, -i.loaded, d1Id, date]);
            });

            // Truck 1 Sales:
            const s1 = mgr.run(`
                INSERT INTO sales (dispatch_id, truck_id, sale_date, status, notes)
                VALUES (?, 1, ?, 'RECORDED', 'Route A regular shop deliveries')
            `, [d1Id, date]);
            const s1Id = s1.lastInsertRowId;

            t1Items.forEach(i => {
                mgr.run('INSERT INTO sale_items (sale_id, product_id, quantity, sale_price) VALUES (?, ?, ?, ?)', [s1Id, i.prodId, i.sold, i.price]);
            });

            // Truck 1 Return:
            const r1 = mgr.run(`
                INSERT INTO returns (dispatch_id, truck_id, return_date, status, mismatch_reason, notes, closed_at)
                VALUES (?, 1, ?, 'CLOSED', '', 'All items physically counted and matched perfectly', datetime('now', 'localtime'))
            `, [d1Id, date]);
            const r1Id = r1.lastInsertRowId;

            t1Items.forEach(i => {
                const expected = i.loaded - i.sold;
                const diff = i.phys - expected; // 0
                mgr.run('INSERT INTO return_items (return_id, product_id, physical_quantity, expected_quantity, difference) VALUES (?, ?, ?, ?, ?)', [r1Id, i.prodId, i.phys, expected, diff]);
                mgr.run("INSERT INTO inventory_transactions (product_id, transaction_type, quantity, reference_type, reference_id, transaction_date, notes) VALUES (?, 'PHYSICAL_RETURN', ?, 'RETURN', ?, ?, 'Truck 1 evening physical return')", [i.prodId, i.phys, r1Id, date]);
            });

            // --- TRUCK 2: Discrepancy / Mismatch Day ---
            // Morning Loading:
            // 15 x 900-20 Tire, 8 x 1000-20 Tire
            const d2 = mgr.run(`
                INSERT INTO dispatches (truck_id, driver_id, dispatch_date, status, notes)
                VALUES (2, 2, ?, 'MISMATCH_CLOSED', 'North County Route')
            `, [date]);
            const d2Id = d2.lastInsertRowId;

            const t2Items = [
                { prodId: 1, loaded: 15, sold: 10, phys: 4, price: 165 }, // Expected: 5, Phys: 4, Diff: -1
                { prodId: 2, loaded: 8, sold: 5, phys: 3, price: 195 }    // Expected: 3, Phys: 3, Diff: 0
            ];

            t2Items.forEach(i => {
                mgr.run('INSERT INTO dispatch_items (dispatch_id, product_id, quantity) VALUES (?, ?, ?)', [d2Id, i.prodId, i.loaded]);
                mgr.run("INSERT INTO inventory_transactions (product_id, transaction_type, quantity, reference_type, reference_id, transaction_date, notes) VALUES (?, 'DISPATCH', ?, 'DISPATCH', ?, ?, 'Truck 2 morning loading')", [i.prodId, -i.loaded, d2Id, date]);
            });

            // Truck 2 Sales:
            const s2 = mgr.run(`
                INSERT INTO sales (dispatch_id, truck_id, sale_date, status, notes)
                VALUES (?, 2, ?, 'RECORDED', 'North shop sales')
            `, [d2Id, date]);
            const s2Id = s2.lastInsertRowId;

            t2Items.forEach(i => {
                mgr.run('INSERT INTO sale_items (sale_id, product_id, quantity, sale_price) VALUES (?, ?, ?, ?)', [s2Id, i.prodId, i.sold, i.price]);
            });

            // Truck 2 Return:
            const r2 = mgr.run(`
                INSERT INTO returns (dispatch_id, truck_id, return_date, status, mismatch_reason, notes, closed_at)
                VALUES (?, 2, ?, 'MISMATCH_CLOSED', 'Missing Product', '1 tire unaccounted for during evening return count; investigating with driver.', datetime('now', 'localtime'))
            `, [d2Id, date]);
            const r2Id = r2.lastInsertRowId;

            t2Items.forEach(i => {
                const expected = i.loaded - i.sold;
                const diff = i.phys - expected;
                mgr.run('INSERT INTO return_items (return_id, product_id, physical_quantity, expected_quantity, difference) VALUES (?, ?, ?, ?, ?)', [r2Id, i.prodId, i.phys, expected, diff]);
                mgr.run("INSERT INTO inventory_transactions (product_id, transaction_type, quantity, reference_type, reference_id, transaction_date, notes) VALUES (?, 'PHYSICAL_RETURN', ?, 'RETURN', ?, ?, 'Truck 2 evening physical return')", [i.prodId, i.phys, r2Id, date]);
            });

            // --- TRUCK 3: On Route (Loaded + Sales entered, Return pending) ---
            const d3 = mgr.run(`
                INSERT INTO dispatches (truck_id, driver_id, dispatch_date, status, notes)
                VALUES (3, 3, ?, 'ON_ROUTE', 'Metro Central Route')
            `, [date]);
            const d3Id = d3.lastInsertRowId;

            const t3Items = [
                { prodId: 1, loaded: 12, sold: 8, price: 165 },
                { prodId: 3, loaded: 10, sold: 7, price: 235 },
                { prodId: 5, loaded: 15, sold: 10, price: 30 }
            ];

            t3Items.forEach(i => {
                mgr.run('INSERT INTO dispatch_items (dispatch_id, product_id, quantity) VALUES (?, ?, ?)', [d3Id, i.prodId, i.loaded]);
                mgr.run("INSERT INTO inventory_transactions (product_id, transaction_type, quantity, reference_type, reference_id, transaction_date, notes) VALUES (?, 'DISPATCH', ?, 'DISPATCH', ?, ?, 'Truck 3 morning loading')", [i.prodId, -i.loaded, d3Id, date]);
            });

            const s3 = mgr.run(`
                INSERT INTO sales (dispatch_id, truck_id, sale_date, status, notes)
                VALUES (?, 3, ?, 'RECORDED', 'Midday sales sync from metro stops')
            `, [d3Id, date]);
            const s3Id = s3.lastInsertRowId;

            t3Items.forEach(i => {
                mgr.run('INSERT INTO sale_items (sale_id, product_id, quantity, sale_price) VALUES (?, ?, ?, ?)', [s3Id, i.prodId, i.sold, i.price]);
            });
        });
    }
};
