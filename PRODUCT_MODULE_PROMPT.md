# Master Specification & Development Prompt: Enterprise Product Management Module (PHP + SQL Backend)

---

## Task Overview
Build a complete, standalone, production-ready **Product Management Module** for an automotive tire, tube, and motorcycle spare parts warehouse management system.
- **Backend**: Native PHP (8.0+) with PDO (MySQL / SQLite compatible), prepared statements, and JSON REST API.
- **Frontend**: Responsive Single-Page UI (HTML5, Tailwind CSS / Vanilla CSS, JavaScript ES6+), async REST API communication, dynamic client-side filtering, and responsive modals.

---

## 1. Database Schema & Architecture

### Table: `products`
```sql
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_type VARCHAR(50) NOT NULL DEFAULT 'Tire',
    product_number VARCHAR(100) NOT NULL,
    vehicle_name VARCHAR(100) NOT NULL,
    position VARCHAR(50) DEFAULT 'Nill',
    strength VARCHAR(50) DEFAULT 'Nill',
    category VARCHAR(50) DEFAULT 'ANT',
    bundle_qty INT DEFAULT 10,
    manufacturer VARCHAR(100) DEFAULT '',
    notes TEXT,
    images LONGTEXT, -- JSON Array of image URLs or Base64 strings: ["uploads/products/img1.jpg", "uploads/products/img2.jpg"]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_type (product_type),
    INDEX idx_category (category),
    INDEX idx_product_number (product_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Initial Seed Data:
```sql
INSERT INTO products (product_type, product_number, vehicle_name, position, strength, category, bundle_qty, manufacturer, notes, images) VALUES
('Tire', '2.25.17', 'Honda 70', 'Front', '2P', 'ANT', 10, 'Servis', 'Standard front motorcycle tire', '[]'),
('Tire', '2.50.17', 'Honda 70', 'Rear', '6P', 'DTL', 10, 'Panther', 'Heavy duty rear tire', '[]'),
('Tube', '2.50.17', 'Honda 70', 'Nill', 'Nill', 'MM Venture', 50, 'Giga', 'Premium butyl tube', '[]'),
('Chain', '428H-108L Gold Chain', 'Honda 70', 'Nill', 'Nill', 'Nill', 10, 'Diamond', 'High strength roller chain', '[]'),
('Oil', 'Havoline 20W-50 4T 0.7L', 'Honda 70 / 4T', 'Nill', 'Nill', 'Nill', 24, 'Caltex', 'Premium 4-Stroke Engine Oil', '[]'),
('Rim', '17x1.40 Chrome Alloy Rim', 'Honda CD125', 'Nill', 'Nill', 'Nill', 10, 'Union', 'Chrome plated alloy rim', '[]'),
('Spoke', '36H 10G Heavy Spokes Set', 'Honda 70 Rear', 'Nill', 'Nill', 'Nill', 50, 'Crown', 'Heavy gauge zinc coated spokes', '[]'),
('Battery', '12V 7Ah Dry Battery', 'Honda 125', 'Nill', 'Nill', 'Nill', 10, 'Osaka', 'Maintenance free motorcycle battery', '[]');
```

---

## 2. Backend REST API (`api.php` or `products_api.php`)

The PHP backend must expose clean JSON endpoints with CORS headers, robust error handling, and PDO prepared statements:

```php
<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Database Connection Factory (MySQL or SQLite)
function getDB() {
    $host = 'localhost';
    $db   = 'warehouse_db';
    $user = 'db_user';
    $pass = 'db_password';
    $charset = 'utf8mb4';

    $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    return new PDO($dsn, $user, $pass, $options);
}
```

### Endpoints Required:

1. **`GET ?action=get_products`**
   - Retrieves all products sorted by `id DESC`.
   - Response format:
     ```json
     {
       "success": true,
       "data": [
         {
           "id": 1,
           "product_type": "Tire",
           "product_number": "2.25.17",
           "vehicle_name": "Honda 70",
           "position": "Front",
           "strength": "2P",
           "category": "ANT",
           "bundle_qty": 10,
           "manufacturer": "Servis",
           "notes": "Standard front tire",
           "images": "[\"/uploads/products/1_0.jpg\"]",
           "created_at": "2026-10-07 10:00:00"
         }
       ]
     }
     ```

2. **`POST ?action=save_product`**
   - Accepts JSON payload or POST form-data.
   - Handles both **INSERT** (when `id` is null/empty) and **UPDATE** (when `id` is provided).
   - Validation:
     - `product_number` is required.
     - `vehicle_name` is required.
     - `bundle_qty` must be a positive integer or default.
     - `images` accepts a JSON string or an array of image URLs/Base64 strings.
   - Response format:
     ```json
     {
       "success": true,
       "message": "Product saved successfully",
       "data": { ...saved_product_object... }
     }
     ```

3. **`POST ?action=delete_product`**
   - Accepts JSON `{ "id": 1 }`.
   - Deletes product by primary key.
   - Response format:
     ```json
     {
       "success": true,
       "message": "Product deleted successfully"
     }
     ```

4. **`POST ?action=upload_product_images` (Optional / File upload)**
   - Accepts multipart file upload array `files[]`.
   - Saves files to `/uploads/products/` with UUID/timestamp names.
   - Returns uploaded URLs.

---

## 3. Frontend UI Specifications & Components

### A. Header Bar
- **Page Title**: "Product Management"
- **Subtitle**: "Manage tires, tubes, chains, engine oil, rims, spokes & batteries catalog"
- **Action Button**: `+ Add New Product` (Blue primary button `#0284c7` / Tailwind `bg-sky-600` hover `bg-sky-700`).

---

### B. Category Navigation Sub-Tabs
Horizontal sub-tab bar with live item count badges for each category:
1. `📦 All Catalog` -> `<span id="badge-count-all">0</span>`
2. `🚗 Tires & Tubes` -> `<span id="badge-count-tires-tubes">0</span>` (Filters `Tire` and `Tube`)
3. `⛓️ Chains` -> `<span id="badge-count-chains">0</span>` (Filters `Chain`)
4. `🛢️ Engine Oil` -> `<span id="badge-count-oil">0</span>` (Filters `Oil`)
5. `⚙️ Rims` -> `<span id="badge-count-rims">0</span>` (Filters `Rim`)
6. `🚲 Spokes` -> `<span id="badge-count-spokes">0</span>` (Filters `Spoke`)
7. `🔋 Batteries` -> `<span id="badge-count-batteries">0</span>` (Filters `Battery`)
8. `🔧 Spare Parts & Cables` -> `<span id="badge-count-spareparts">0</span>` (Filters `Spare Parts`)

---

### C. Search & Filter Bar
1. **Search Bar**: Instant real-time search input with search icon.
   - Matches: Product Number, Size, Vehicle Name, Manufacturer, Notes, Strength, Category, Type, and Composite Display Name.
2. **Filter by Type**: Dropdown (`All Types`, `Tire`, `Tube`, `Chain`, `Oil`, `Rim`, `Spoke`, `Battery`).
3. **Filter by Category**: Dropdown (`All Categories`, `ANT (General)`, `DTL (Diamond)`, `MM Venture (kmoto)`, `Nill (None)`).
4. **Filter by Photos**: Dropdown (`All Products`, `With Photos Only`, `Without Photos`).
5. **Live Total Count**: Indicator showing `Total Products: <strong id="total-count-badge">X</strong>`.

---

### D. Dynamic Adaptive Data Tables

The table switches layout adaptively based on the active subtab:

#### Layout 1: All Catalog & Tires/Tubes View (13 Columns)
1. **`#`**: Row serial number (descending from total count).
2. **`Photo`**: Square thumbnail (32x32px).
   - If product has multiple photos, show `+N` badge (e.g. `+2`).
   - Clicking opens the **Fullscreen Image Lightbox Gallery**.
   - If no photos, show a placeholder image icon.
3. **`Display Name`**: Composite styled badge title formatted as:
   - `[Category Badge] [Product Number] [Strength Badge] [Vehicle Name] [(Manufacturer)]`
   - Example: `[ANT] 2.25.17 [2P] Honda 70 (Servis)`
4. **`Type`**: Color-coded badges:
   - `Tire`: Indigo badge (`bg-indigo-100 text-indigo-800 border-indigo-200`)
   - `Tube`: Purple badge (`bg-purple-100 text-purple-800 border-purple-200`)
   - `Chain`: Amber badge (`bg-amber-100 text-amber-800 border-amber-200`)
   - `Oil`: Emerald badge (`bg-emerald-100 text-emerald-800 border-emerald-200`)
   - `Rim`: Blue badge (`bg-blue-100 text-blue-800 border-blue-200`)
   - `Spoke`: Cyan badge (`bg-cyan-100 text-cyan-800 border-cyan-200`)
   - `Battery`: Rose badge (`bg-rose-100 text-rose-800 border-rose-200`)
   - `Custom`: Slate badge (`bg-slate-100 text-slate-800 border-slate-200`)
5. **`Number / Size`**: Monospace bold font.
6. **`Vehicle`**: Vehicle name (e.g. `Honda 70`, `CD125`).
7. **`Position`**: Badges (`Front`, `Rear`, `Both`, or `—` for Nill).
8. **`Strength`**: Badges (`2P`, `4P`, `6P`, `8P`, `10P`, `12P`, `14P`, `16P`, or `—` for Nill).
9. **`Category`**: Badges (`ANT (Gen)`, `DTL (Dia)`, `MM Venture`, or `—` for Nill).
10. **`Bundle`**: Bundle count badge with dynamic unit:
    - `cans` for Oil (e.g. `24 cans`)
    - `sets` for Spokes (e.g. `50 sets`)
    - `pcs` for others (e.g. `10 pcs`)
11. **`Manufacturer`**: Brand name (`Servis`, `Panther`, `Caltex`, etc.).
12. **`Notes`**: Truncated notes with hover tooltip.
13. **`Actions`**:
    - `Edit` (Sky blue link, opens modal in edit mode).
    - `Delete` (Red link, prompts confirmation dialog).

#### Layout 2: Specific Spare Parts Subtabs (Chains, Oil, Rims, Spokes, Batteries) (7 Columns)
A clean, focused layout:
1. `#`
2. `Photo`
3. `Product Name / Model`
4. `Vehicle / Compatible`
5. `Bundle / Pack Quantity`
6. `Category / Type`
7. `Actions` (`Edit`, `Delete`)

#### Empty State:
When 0 products match search or database is empty, display:
- Product box illustration icon.
- "No Products Found" heading.
- "Click the button below to add your first product with photos." description.
- `+ Add First Product` button.

---

### E. Pagination Controls
- 20 products per page (`pageSize = 20`).
- Info label: `Showing 1 to 20 of 85 products (Page 1 of 5)`.
- Buttons:
  - `« First`
  - `‹ Prev`
  - Numbered page pills (`1`, `2`, `3`, `4`, `5`...) with active highlight on current page.
  - `Next ›`
  - `Last »`

---

## 4. Add / Edit Product Modal Specification

### Modal Header:
- Title: `Add New Product` (changes to `Edit Product` during edit).
- Subtitle: `Fill in product details, specifications, and upload pictures.`
- Close button (`✕`).

### Form Fields:
1. **Product Type** (Select dropdown):
   - Options: `🚗 Tire`, `⚪ Tube`, `⛓️ Chain`, `🛢️ Oil (Engine Oil)`, `⚙️ Rim`, `🚲 Spoke`, `🔋 Battery`, `🔧 Spare Parts & Cables`, `➕ Custom Type...`
   - When `Custom Type...` is selected, dynamically show `<input type="text" id="form-custom-type" placeholder="Enter custom type name (e.g. Flap, Spark Plug)">`.
2. **Product Number / Size** (Required text input, e.g. `2.25.17`, `428H-108L`, `Havoline 20W-50`).
3. **Vehicle Name** (Required text input, e.g. `Honda 70`, `CD125`, `Rickshaw`, `Truck`).
4. **Bundle Quantity** (Optional number input, pcs/pack):
   - Auto-defaults: `10` for Tire/Chain/Rim/Battery, `50` for Tube/Spoke, `24` for Oil.
5. **Tire & Tube Specific Section** (Can collapse/hide when non-tire/tube type selected):
   - **Position / Side** (Select: `Nill`, `Front`, `Rear`, `Front / Rear (Both)`).
   - **Strength** (Select: `Nill`, `2P`, `4P`, `6P`, `8P`, `10P`, `12P`, `14P`, `16P`).
   - **Category Radio Buttons** (4 grid options):
     - `ANT (General)`
     - `DTL (Diamond)`
     - `MM Venture (kmoto)`
     - `Nill (None)`
   - **Manufacturer Name** (Text input, e.g. `Panther`, `Servis`, `Diamond`, `Caltex`, `General`).
   - **Product Notes / Remarks** (Textarea, 2 rows).

6. **Multiple Product Photos Upload & Drop Zone**:
   - Drag & Drop zone + hidden file input (`multiple accept="image/*"`).
   - Supports selecting/dropping multiple images.
   - Shows badge: `<span id="product-images-count-badge">X photos</span>`.
   - **Live Preview Grid**:
     - Displays thumbnails of all selected/saved images in a responsive grid (`grid-cols-4 sm:grid-cols-6`).
     - Each thumbnail has a delete button (`✕`) in the top-right corner to remove the individual photo.

### Modal Footer:
- `Cancel` button (Closes modal without changes).
- `Save Product` / `Update Product` button (Submits form to backend via AJAX, validates fields, shows toast alert, and refreshes table).

---

## 5. Fullscreen Image Lightbox Gallery

When clicking on any product photo thumbnail:
1. Opens fullscreen modal with dark blurred backdrop (`bg-slate-950/90`).
2. Main large image displayed in center (`max-h-[75vh] object-contain`).
3. Title at top: Product Number + Display Name.
4. Counter badge: `Photo 1 of 3`.
5. Navigation controls:
   - `‹` Previous button (left)
   - `›` Next button (right)
   - Bottom horizontal thumbnail carousel strip to jump directly to any photo.
   - Close (`✕`) button at top right.
   - Keyboard support: Left Arrow (`←`), Right Arrow (`→`), and `Escape` to close.

---

## 6. JavaScript Client Architecture (`products.js`)

Implement a clean class or module managing all operations:
- `loadProducts()`: Calls `GET api.php?action=get_products` and stores state in memory.
- `renderProductsTable()`: Filters array by active sub-tab, search query, type filter, category filter, photo filter, and applies pagination slice.
- `updateProductCategoryCounts()`: Recalculates count badges for all 8 subtabs in real-time.
- `getProductDisplayName(product)`: Returns formatted string `[Category] [Product Number] [Strength] [Vehicle] [(Manufacturer)]`.
- `matchesProductSearch(product, query)`: Multi-token search matching across all product attributes.
- `openAddProductModal()`: Resets form, sets default values according to active sub-tab, clears image array.
- `openEditProductModal(id)`: Loads product data, populates form fields, renders image previews.
- `handleProductFormSubmit(e)`: Form validation, collects fields and image array, dispatches `POST api.php?action=save_product`.
- `deleteProduct(id)`: Dispatches `POST api.php?action=delete_product` with confirmation.
- `openLightbox(product, startIndex)`: Opens gallery modal for multi-image viewing.
- `showToast(message, type)`: Non-blocking animated toast alerts (`success`, `error`, `info`).

---

## Deliverables Expected from AI:
1. Complete, executable SQL queries for table creation and sample data.
2. Complete PHP backend code (`api.php`) with PDO prepared statements and JSON responses.
3. Complete HTML page markup including top navigation, sub-tabs, filters, tables, add/edit modal, and image lightbox.
4. Complete JavaScript code with zero placeholder comments, handling all form lifecycle, AJAX calls, validations, search filters, pagination, and lightbox interactions.
