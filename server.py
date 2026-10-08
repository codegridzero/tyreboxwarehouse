#!/usr/bin/env python3
"""
Enterprise Python Backend Server for Warehouse Management System
- Zero external dependencies (uses Python built-in http.server, sqlite3, json)
- Persistent server-side SQLite file database (warehouse.sqlite)
- Full REST API for Products, Drivers, Trucks, Daily Shifts, and Warranty Claims
- High performance static file server with anti-cache headers for instant updates
"""

import http.server
import socketserver
import sqlite3
import json
import os
import sys
import urllib.parse
from datetime import datetime

PORT = int(os.environ.get('PORT', 8080))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, 'warehouse.sqlite')

# Ensure Database Schema and Migrations
def init_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("PRAGMA foreign_keys = ON;")
    cursor.execute("PRAGMA journal_mode = WAL;")

    # 1. Products Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_type TEXT NOT NULL,
            product_number TEXT NOT NULL,
            vehicle_name TEXT NOT NULL,
            position TEXT NOT NULL,
            strength TEXT NOT NULL,
            category TEXT NOT NULL,
            bundle_qty INTEGER DEFAULT 10,
            manufacturer TEXT,
            notes TEXT,
            images TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # 2. Drivers Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS drivers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            license_number TEXT,
            active INTEGER DEFAULT 1,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # 3. Trucks Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trucks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            registration_number TEXT,
            driver_id INTEGER,
            active INTEGER DEFAULT 1,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # 4. Daily Shifts Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shift_code TEXT,
            shift_date TEXT NOT NULL,
            truck_id INTEGER,
            truck_name TEXT,
            driver_name TEXT,
            status TEXT DEFAULT 'Open',
            total_dispatch INTEGER DEFAULT 0,
            total_sales INTEGER DEFAULT 0,
            total_return INTEGER DEFAULT 0,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # 5. Shift Items Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS shift_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shift_id INTEGER NOT NULL,
            product_id INTEGER,
            display_name TEXT NOT NULL,
            dispatch_qty INTEGER NOT NULL DEFAULT 0,
            sale_qty INTEGER DEFAULT NULL,
            return_qty INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (shift_id) REFERENCES daily_shifts(id) ON DELETE CASCADE
        );
    """)

    # 6. Claims Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            claim_code TEXT UNIQUE,
            claim_date TEXT NOT NULL,
            driver_id INTEGER,
            driver_name TEXT NOT NULL,
            truck_id INTEGER,
            truck_name TEXT,
            customer_shop TEXT,
            total_items INTEGER DEFAULT 0,
            status TEXT DEFAULT 'Received',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # 7. Claim Items Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS claim_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            claim_id INTEGER NOT NULL,
            product_id INTEGER,
            display_name TEXT NOT NULL,
            manufacturer TEXT,
            product_type TEXT,
            quantity INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
        );
    """)

    conn.commit()

    # Seed initial data if products is empty
    count = cursor.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    if count == 0:
        cursor.execute("""
            INSERT INTO drivers (name, phone, license_number, active, notes) VALUES
            ('Muhammad Ali', '0300-1234567', 'LIC-98721', 1, 'Main city route'),
            ('Tariq Mahmood', '0321-7654321', 'CNIC-35201-1234567-1', 1, 'North highway route'),
            ('Rashid Khan', '0345-9876543', 'LIC-44109', 1, 'South distribution route');
        """)
        cursor.execute("""
            INSERT INTO trucks (name, registration_number, driver_id, active, notes) VALUES
            ('Hino 500 Heavy', 'LES-24-1029', 1, 1, 'Heavy duty 5 Ton truck'),
            ('Master Foton 3.5T', 'LHR-8842', 2, 1, 'Medium distribution vehicle'),
            ('Shahzore Blue', 'KHI-5512', 3, 1, 'City distribution truck');
        """)
        cursor.execute("""
            INSERT INTO products (product_type, product_number, vehicle_name, position, strength, category, bundle_qty, manufacturer, notes, images) VALUES
            ('Tire', '2.25.17', 'Honda 70', 'Front', '2P', 'ANT', 10, 'Servis', 'Standard front motorcycle tire', '[]'),
            ('Tire', '2.50.17', 'Honda 70', 'Rear', '6P', 'DTL', 10, 'Panther', 'Heavy duty rear tire', '[]'),
            ('Tube', '2.50.17', 'Honda 70', 'Nill', 'Nill', 'MM Venture', 50, 'Giga', 'Premium butyl tube', '[]'),
            ('Chain', '428H-108L Gold Chain', 'Honda 70', 'Nill', 'Nill', 'Nill', 10, 'Diamond', 'High strength roller chain', '[]'),
            ('Oil', 'Havoline 20W-50 4T 0.7L', 'Honda 70 / 4T', 'Nill', 'Nill', 'Nill', 24, 'Caltex', 'Premium 4-Stroke Engine Oil', '[]'),
            ('Rim', '17x1.40 Chrome Alloy Rim', 'Honda CD125', 'Nill', 'Nill', 'Nill', 10, 'Union', 'Chrome plated alloy rim', '[]'),
            ('Spoke', '36H 10G Heavy Spokes Set', 'Honda 70 Rear', 'Nill', 'Nill', 'Nill', 50, 'Crown', 'Heavy gauge zinc coated spokes', '[]'),
            ('Battery', '12V 7Ah Dry Battery', 'Honda 125', 'Nill', 'Nill', 'Nill', 10, 'Osaka', 'Maintenance free motorcycle battery', '[]');
        """)
        conn.commit()

    conn.close()

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def rows_to_dicts(rows):
    return [dict(r) for r in rows]

class WarehouseRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent browser caching of HTML and JS code so updates apply immediately
        if self.path.endswith('.js') or self.path.endswith('.html') or self.path.startswith('/api'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, data, status_code=200):
        body = json.dumps(data, ensure_ascii=False, default=str).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def parse_payload(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            raw = self.rfile.read(content_length).decode('utf-8')
            try:
                return json.loads(raw)
            except Exception:
                return urllib.parse.parse_qs(raw)
        return {}

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)
        action = query.get('action', [''])[0]

        if path.startswith('/api') or action:
            self.handle_api_get(path, action, query)
        else:
            super().do_GET()

    def handle_api_get(self, path, action, query):
        conn = get_db()
        cursor = conn.cursor()
        try:
            if action == 'bootstrap' or action == 'get_all' or path == '/api/bootstrap':
                products = rows_to_dicts(cursor.execute("SELECT * FROM products ORDER BY id DESC").fetchall())
                drivers = rows_to_dicts(cursor.execute("SELECT * FROM drivers ORDER BY name ASC").fetchall())
                trucks = rows_to_dicts(cursor.execute("SELECT * FROM trucks ORDER BY name ASC").fetchall())
                shifts = rows_to_dicts(cursor.execute("SELECT * FROM daily_shifts ORDER BY shift_date DESC, id DESC").fetchall())
                
                # Attach shift items
                shift_ids = [s['id'] for s in shifts]
                shift_items_map = {}
                if shift_ids:
                    placeholders = ','.join('?' * len(shift_ids))
                    items = rows_to_dicts(cursor.execute(f"SELECT * FROM shift_items WHERE shift_id IN ({placeholders}) ORDER BY id ASC", shift_ids).fetchall())
                    for it in items:
                        shift_items_map.setdefault(it['shift_id'], []).append(it)
                for s in shifts:
                    s['items'] = shift_items_map.get(s['id'], [])

                # Attach claims with items
                claims = rows_to_dicts(cursor.execute("""
                    SELECT c.*, d.name as live_driver_name, t.name as live_truck_name
                    FROM claims c
                    LEFT JOIN drivers d ON c.driver_id = d.id
                    LEFT JOIN trucks t ON c.truck_id = t.id
                    ORDER BY c.claim_date DESC, c.id DESC
                """).fetchall())
                claim_ids = [c['id'] for c in claims]
                claim_items_map = {}
                if claim_ids:
                    placeholders = ','.join('?' * len(claim_ids))
                    c_items = rows_to_dicts(cursor.execute(f"SELECT * FROM claim_items WHERE claim_id IN ({placeholders}) ORDER BY id ASC", claim_ids).fetchall())
                    for cit in c_items:
                        claim_items_map.setdefault(cit['claim_id'], []).append(cit)
                for c in claims:
                    c['items'] = claim_items_map.get(c['id'], [])

                self.send_json({
                    'success': True,
                    'data': {
                        'products': products,
                        'drivers': drivers,
                        'trucks': trucks,
                        'shifts': shifts,
                        'claims': claims
                    }
                })

            elif action == 'get_products' or path == '/api/products':
                products = rows_to_dicts(cursor.execute("SELECT * FROM products ORDER BY id DESC").fetchall())
                self.send_json({'success': True, 'data': products})

            elif action == 'get_drivers' or path == '/api/drivers':
                drivers = rows_to_dicts(cursor.execute("SELECT * FROM drivers ORDER BY name ASC").fetchall())
                self.send_json({'success': True, 'data': drivers})

            elif action == 'get_trucks' or path == '/api/trucks':
                trucks = rows_to_dicts(cursor.execute("SELECT * FROM trucks ORDER BY name ASC").fetchall())
                self.send_json({'success': True, 'data': trucks})

            elif action == 'get_shifts' or path == '/api/shifts':
                shifts = rows_to_dicts(cursor.execute("SELECT * FROM daily_shifts ORDER BY shift_date DESC, id DESC").fetchall())
                for s in shifts:
                    s['items'] = rows_to_dicts(cursor.execute("SELECT * FROM shift_items WHERE shift_id = ? ORDER BY id ASC", (s['id'],)).fetchall())
                self.send_json({'success': True, 'data': shifts})

            elif action == 'get_claims' or path == '/api/claims':
                claims = rows_to_dicts(cursor.execute("""
                    SELECT c.*, d.name as live_driver_name, t.name as live_truck_name
                    FROM claims c
                    LEFT JOIN drivers d ON c.driver_id = d.id
                    LEFT JOIN trucks t ON c.truck_id = t.id
                    ORDER BY c.claim_date DESC, c.id DESC
                """).fetchall())
                for c in claims:
                    c['items'] = rows_to_dicts(cursor.execute("SELECT * FROM claim_items WHERE claim_id = ? ORDER BY id ASC", (c['id'],)).fetchall())
                self.send_json({'success': True, 'data': claims})

            else:
                self.send_json({'success': True, 'message': 'Warehouse Python API Online', 'time': datetime.now().isoformat()})
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)}, 500)
        finally:
            conn.close()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)
        action = query.get('action', [''])[0]
        payload = self.parse_payload()
        if not action and 'action' in payload:
            action = payload['action']

        conn = get_db()
        cursor = conn.cursor()

        try:
            # 1. PRODUCTS CRUD
            if action == 'save_product' or path == '/api/products/save':
                p_id = payload.get('id')
                p_type = str(payload.get('product_type', 'Tire')).strip()
                p_num = str(payload.get('product_number', '')).strip()
                p_veh = str(payload.get('vehicle_name', '')).strip()
                p_pos = str(payload.get('position', 'Nill')).strip()
                p_str = str(payload.get('strength', 'Nill')).strip()
                p_cat = str(payload.get('category', 'ANT')).strip()
                p_bnd = int(payload.get('bundle_qty', 10) or 10)
                p_mfg = str(payload.get('manufacturer', '')).strip()
                p_notes = str(payload.get('notes', '')).strip()
                p_imgs = payload.get('images', '[]')
                if isinstance(p_imgs, list):
                    p_imgs = json.dumps(p_imgs)

                if not p_num:
                    return self.send_json({'success': False, 'error': 'Product number / size is required'}, 400)

                if p_id:
                    cursor.execute("""
                        UPDATE products SET
                            product_type = ?, product_number = ?, vehicle_name = ?, position = ?,
                            strength = ?, category = ?, bundle_qty = ?, manufacturer = ?, notes = ?, images = ?
                        WHERE id = ?
                    """, (p_type, p_num, p_veh, p_pos, p_str, p_cat, p_bnd, p_mfg, p_notes, p_imgs, p_id))
                else:
                    cursor.execute("""
                        INSERT INTO products 
                            (product_type, product_number, vehicle_name, position, strength, category, bundle_qty, manufacturer, notes, images)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (p_type, p_num, p_veh, p_pos, p_str, p_cat, p_bnd, p_mfg, p_notes, p_imgs))
                    p_id = cursor.lastrowid

                conn.commit()
                saved = dict(cursor.execute("SELECT * FROM products WHERE id = ?", (p_id,)).fetchone())
                self.send_json({'success': True, 'data': saved})

            elif action == 'delete_product' or path == '/api/products/delete':
                p_id = payload.get('id')
                cursor.execute("DELETE FROM products WHERE id = ?", (p_id,))
                conn.commit()
                self.send_json({'success': True, 'message': 'Product deleted'})

            # 2. DRIVERS CRUD
            elif action == 'save_driver' or path == '/api/drivers/save':
                d_id = payload.get('id')
                name = str(payload.get('name', '')).strip()
                phone = str(payload.get('phone', '')).strip()
                lic = str(payload.get('license_number', '')).strip()
                active = int(payload.get('active', 1))
                notes = str(payload.get('notes', '')).strip()

                if not name:
                    return self.send_json({'success': False, 'error': 'Driver name is required'}, 400)

                if d_id:
                    cursor.execute("""
                        UPDATE drivers SET name = ?, phone = ?, license_number = ?, active = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (name, phone, lic, active, notes, d_id))
                else:
                    cursor.execute("""
                        INSERT INTO drivers (name, phone, license_number, active, notes)
                        VALUES (?, ?, ?, ?, ?)
                    """, (name, phone, lic, active, notes))
                    d_id = cursor.lastrowid

                conn.commit()
                saved = dict(cursor.execute("SELECT * FROM drivers WHERE id = ?", (d_id,)).fetchone())
                self.send_json({'success': True, 'data': saved})

            elif action == 'delete_driver' or path == '/api/drivers/delete':
                d_id = payload.get('id')
                cursor.execute("DELETE FROM drivers WHERE id = ?", (d_id,))
                conn.commit()
                self.send_json({'success': True, 'message': 'Driver deleted'})

            # 3. TRUCKS CRUD
            elif action == 'save_truck' or path == '/api/trucks/save':
                t_id = payload.get('id')
                name = str(payload.get('name', '')).strip()
                reg = str(payload.get('registration_number', '')).strip()
                driver_id = payload.get('driver_id')
                active = int(payload.get('active', 1))
                notes = str(payload.get('notes', '')).strip()

                if not name:
                    return self.send_json({'success': False, 'error': 'Truck name is required'}, 400)

                if t_id:
                    cursor.execute("""
                        UPDATE trucks SET name = ?, registration_number = ?, driver_id = ?, active = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (name, reg, driver_id, active, notes, t_id))
                else:
                    cursor.execute("""
                        INSERT INTO trucks (name, registration_number, driver_id, active, notes)
                        VALUES (?, ?, ?, ?, ?)
                    """, (name, reg, driver_id, active, notes))
                    t_id = cursor.lastrowid

                conn.commit()
                saved = dict(cursor.execute("SELECT * FROM trucks WHERE id = ?", (t_id,)).fetchone())
                self.send_json({'success': True, 'data': saved})

            elif action == 'delete_truck' or path == '/api/trucks/delete':
                t_id = payload.get('id')
                cursor.execute("DELETE FROM trucks WHERE id = ?", (t_id,))
                conn.commit()
                self.send_json({'success': True, 'message': 'Truck deleted'})

            # 4. DAILY SHIFTS CRUD
            elif action == 'save_shift' or path == '/api/shifts/save':
                s_id = payload.get('id')
                date = str(payload.get('shift_date', datetime.now().strftime('%Y-%m-%d'))).strip()
                truck_id = payload.get('truck_id')
                truck_name = str(payload.get('truck_name', '')).strip()
                driver_name = str(payload.get('driver_name', '')).strip()
                status = str(payload.get('status', 'Open')).strip()
                dispatch = int(payload.get('total_dispatch', 0) or 0)
                sales = int(payload.get('total_sales', 0) or 0)
                returns = int(payload.get('total_return', 0) or 0)
                notes = str(payload.get('notes', '')).strip()
                items = payload.get('items', [])

                if s_id:
                    cursor.execute("""
                        UPDATE daily_shifts SET
                            shift_date = ?, truck_id = ?, truck_name = ?, driver_name = ?, status = ?,
                            total_dispatch = ?, total_sales = ?, total_return = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (date, truck_id, truck_name, driver_name, status, dispatch, sales, returns, notes, s_id))
                    cursor.execute("DELETE FROM shift_items WHERE shift_id = ?", (s_id,))
                else:
                    date_clean = date.replace('-', '')
                    count_today = cursor.execute("SELECT COUNT(*) FROM daily_shifts WHERE shift_date = ?", (date,)).fetchone()[0]
                    code = f"SH-{date_clean}-{str(count_today + 1).zfill(2)}"
                    cursor.execute("""
                        INSERT INTO daily_shifts
                            (shift_code, shift_date, truck_id, truck_name, driver_name, status, total_dispatch, total_sales, total_return, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (code, date, truck_id, truck_name, driver_name, status, dispatch, sales, returns, notes))
                    s_id = cursor.lastrowid

                for it in items:
                    p_id = it.get('product_id')
                    disp = str(it.get('display_name', 'Product')).strip()
                    d_qty = int(it.get('dispatch_qty', 0) or 0)
                    s_qty = int(it['sale_qty']) if it.get('sale_qty') is not None and str(it.get('sale_qty')).strip() != '' else None
                    r_qty = int(it.get('return_qty', 0) or 0)
                    cursor.execute("""
                        INSERT INTO shift_items (shift_id, product_id, display_name, dispatch_qty, sale_qty, return_qty)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (s_id, p_id, disp, d_qty, s_qty, r_qty))

                conn.commit()
                saved_shift = dict(cursor.execute("SELECT * FROM daily_shifts WHERE id = ?", (s_id,)).fetchone())
                saved_shift['items'] = rows_to_dicts(cursor.execute("SELECT * FROM shift_items WHERE shift_id = ? ORDER BY id ASC", (s_id,)).fetchall())
                self.send_json({'success': True, 'data': saved_shift})

            elif action == 'delete_shift' or path == '/api/shifts/delete':
                s_id = payload.get('id')
                cursor.execute("DELETE FROM shift_items WHERE shift_id = ?", (s_id,))
                cursor.execute("DELETE FROM daily_shifts WHERE id = ?", (s_id,))
                conn.commit()
                self.send_json({'success': True, 'message': 'Shift deleted'})

            # 5. CLAIMS CRUD
            elif action == 'save_claim' or path == '/api/claims/save':
                c_id = payload.get('id')
                date = str(payload.get('claim_date', datetime.now().strftime('%Y-%m-%d'))).strip()
                driver_id = int(payload.get('driver_id', 0) or 0)
                driver_name = str(payload.get('driver_name', 'Driver')).strip()
                truck_id = payload.get('truck_id')
                truck_name = str(payload.get('truck_name', '')).strip()
                shop = str(payload.get('customer_shop', '')).strip()
                notes = str(payload.get('notes', '')).strip()
                items = payload.get('items', [])

                if not driver_id or not date:
                    return self.send_json({'success': False, 'error': 'Claim date and driver are required'}, 400)

                if not items:
                    return self.send_json({'success': False, 'error': 'Please add at least one claim item'}, 400)

                total_items = sum(int(it.get('quantity', 1) or 1) for it in items)

                if c_id:
                    cursor.execute("""
                        UPDATE claims SET
                            claim_date = ?, driver_id = ?, driver_name = ?, truck_id = ?, truck_name = ?,
                            customer_shop = ?, total_items = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (date, driver_id, driver_name, truck_id, truck_name, shop, total_items, notes, c_id))
                    cursor.execute("DELETE FROM claim_items WHERE claim_id = ?", (c_id,))
                else:
                    date_clean = date.replace('-', '')
                    seq = 1
                    candidate_code = f"CLM-{date_clean}-{str(seq).zfill(2)}"
                    while cursor.execute("SELECT COUNT(*) FROM claims WHERE claim_code = ?", (candidate_code,)).fetchone()[0] > 0:
                        seq += 1
                        candidate_code = f"CLM-{date_clean}-{str(seq).zfill(2)}"

                    cursor.execute("""
                        INSERT INTO claims
                            (claim_code, claim_date, driver_id, driver_name, truck_id, truck_name, customer_shop, total_items, status, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Received', ?)
                    """, (candidate_code, date, driver_id, driver_name, truck_id, truck_name, shop, total_items, notes))
                    c_id = cursor.lastrowid

                for it in items:
                    p_id = it.get('product_id')
                    disp = str(it.get('display_name', 'Product')).strip()
                    mfg = str(it.get('manufacturer', 'General')).strip()
                    p_type = str(it.get('product_type', 'Part')).strip()
                    qty = max(1, int(it.get('quantity', 1) or 1))
                    cursor.execute("""
                        INSERT INTO claim_items (claim_id, product_id, display_name, manufacturer, product_type, quantity)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (c_id, p_id, disp, mfg, p_type, qty))

                conn.commit()
                saved_claim = dict(cursor.execute("SELECT * FROM claims WHERE id = ?", (c_id,)).fetchone())
                saved_claim['items'] = rows_to_dicts(cursor.execute("SELECT * FROM claim_items WHERE claim_id = ?", (c_id,)).fetchall())
                self.send_json({'success': True, 'data': saved_claim})

            elif action == 'delete_claim' or path == '/api/claims/delete':
                c_id = payload.get('id')
                cursor.execute("DELETE FROM claim_items WHERE claim_id = ?", (c_id,))
                cursor.execute("DELETE FROM claims WHERE id = ?", (c_id,))
                conn.commit()
                self.send_json({'success': True, 'message': 'Claim deleted'})

            else:
                self.send_json({'success': False, 'error': f'Unknown action: {action}'}, 400)

        except Exception as e:
            conn.rollback()
            self.send_json({'success': False, 'error': str(e)}, 500)
        finally:
            conn.close()

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    print(f"==================================================")
    print(f"✓ Warehouse Python Server running at http://localhost:{port}")
    print(f"✓ Database file: {DB_FILE}")
    print(f"==================================================")
    with ReusableTCPServer(("", port), WarehouseRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.server_close()
