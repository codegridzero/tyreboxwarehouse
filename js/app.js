/**
 * Warehouse System - Main Application Controller
 * Handles Navigation, Product Catalog (Multi-Image Upload, 2P, Nill options, Categories: ANT / DTL / MM Venture),
 * and Drivers & Fleet Management.
 */
import { dbManager } from './db.js';
import { getTodayDateStr, formatDate, formatDateTime, formatNumber, formatReportProductName, escapeHtml } from './utils.js';

class WarehouseApp {
    constructor() {
        this.currentTab = 'products';

        // Products State
        this.products = [];
        this.editingProductId = null;
        this.currentProductImages = []; // Array of base64 image strings for active form

        // Lightbox State
        this.lightboxImages = [];
        this.lightboxCurrentIndex = 0;
        this.lightboxProductTitle = '';

        // Drivers & Trucks State
        this.drivers = [];
        this.editingDriverId = null;

        // Daily Shifts State
        this.shifts = [];
        this.currentShiftId = null;
        this.currentShiftItems = []; // [{ product_id, display_name, dispatch_qty, sale_qty, return_qty }]
        this.selectedShiftProduct = null;
        this.shiftsPageSize = 10;
        this.shiftsCurrentPage = 1;

        // Navigation elements
        this.navProducts = document.getElementById('nav-products');
        this.navShifts = document.getElementById('nav-shifts');
        this.navDrivers = document.getElementById('nav-drivers');
        this.viewProducts = document.getElementById('view-products');
        this.viewShifts = document.getElementById('view-shifts');
        this.viewDrivers = document.getElementById('view-drivers');
        this.sidebarProductCount = document.getElementById('sidebar-product-count');
        this.sidebarShiftCount = document.getElementById('sidebar-shift-count');
        this.sidebarDriverCount = document.getElementById('sidebar-driver-count');

        // Products DOM elements
        this.productTableBody = document.getElementById('products-table-body');
        this.productTableHead = document.getElementById('products-table-head');
        this.productEmptyState = document.getElementById('table-empty-state');
        this.productModal = document.getElementById('product-modal');
        this.productModalCard = document.getElementById('product-modal-card');
        this.productForm = document.getElementById('product-form');
        this.productModalTitle = document.getElementById('modal-title');
        this.productTotalBadge = document.getElementById('total-count-badge');

        // Product Subtabs State
        this.currentProductTab = 'all';
        this.badgeCountAll = document.getElementById('badge-count-all');
        this.badgeCountTiresTubes = document.getElementById('badge-count-tires-tubes');
        this.badgeCountChains = document.getElementById('badge-count-chains');
        this.badgeCountOil = document.getElementById('badge-count-oil');
        this.badgeCountRims = document.getElementById('badge-count-rims');
        this.badgeCountSpokes = document.getElementById('badge-count-spokes');
        this.badgeCountBatteries = document.getElementById('badge-count-batteries');
        this.badgeCountSpareParts = document.getElementById('badge-count-spareparts');

        // Product Form Dynamic Elements
        this.tireSpecificFields = document.getElementById('tire-specific-fields');
        this.labelProductNumber = document.getElementById('label-product-number');
        this.labelVehicleName = document.getElementById('label-vehicle-name');
        this.labelBundleQty = document.getElementById('label-bundle-qty');

        // Product Images Controls
        this.imageDropZone = document.getElementById('product-image-drop-zone');
        this.imageFileInput = document.getElementById('form-product-images-input');
        this.imagePreviewGrid = document.getElementById('product-images-preview-grid');
        this.imageCountBadge = document.getElementById('product-images-count-badge');

        // Product Form Controls
        this.typeSelect = document.getElementById('form-product-type');
        this.customTypeContainer = document.getElementById('custom-type-container');
        this.customTypeInput = document.getElementById('form-custom-type');
        this.numberInput = document.getElementById('form-product-number');
        this.vehicleInput = document.getElementById('form-vehicle-name');
        this.positionSelect = document.getElementById('form-position');
        this.strengthSelect = document.getElementById('form-strength');
        this.bundleQtyInput = document.getElementById('form-bundle-qty');
        this.manufacturerInput = document.getElementById('form-manufacturer');
        this.notesInput = document.getElementById('form-notes');

        // Product Filters
        this.productSearchInput = document.getElementById('search-input');
        this.filterType = document.getElementById('filter-type');
        this.filterCategory = document.getElementById('filter-category');
        this.filterPhotos = document.getElementById('filter-photos');

        // Products Pagination State (20 products per page)
        this.productsPageSize = 20;
        this.productsCurrentPage = 1;
        this.productsPaginationContainer = document.getElementById('products-pagination-container');
        this.productsPaginationInfo = document.getElementById('products-pagination-info');
        this.productsPaginationControls = document.getElementById('products-pagination-controls');

        // Lightbox DOM elements
        this.lightboxModal = document.getElementById('image-lightbox-modal');
        this.lightboxMainImg = document.getElementById('lightbox-main-img');
        this.lightboxTitle = document.getElementById('lightbox-title');
        this.lightboxCounter = document.getElementById('lightbox-counter');
        this.lightboxThumbnailsStrip = document.getElementById('lightbox-thumbnails-strip');
        this.btnPrevLightbox = document.getElementById('btn-prev-lightbox');
        this.btnNextLightbox = document.getElementById('btn-next-lightbox');
        this.btnCloseLightbox = document.getElementById('btn-close-lightbox');

        // Trucks & Drivers Sub-tab Switchers
        this.subtabTrucksBtn = document.getElementById('subtab-trucks-btn');
        this.subtabDriversBtn = document.getElementById('subtab-drivers-btn');
        this.subtabTrucksContent = document.getElementById('subtab-trucks-content');
        this.subtabDriversContent = document.getElementById('subtab-drivers-content');
        this.truckTotalBadge = document.getElementById('truck-total-count-badge');
        this.driverTotalBadge = document.getElementById('driver-total-count-badge');
        this.currentSubtab = 'trucks';

        // Trucks DOM elements
        this.truckSearchInput = document.getElementById('truck-search-input');
        this.btnOpenAddTruck = document.getElementById('btn-open-add-truck');
        this.btnEmptyAddTruck = document.getElementById('btn-empty-add-truck');
        this.trucksTableBody = document.getElementById('trucks-table-body');
        this.truckEmptyState = document.getElementById('truck-table-empty-state');
        this.truckModal = document.getElementById('truck-modal');
        this.truckModalCard = document.getElementById('truck-modal-card');
        this.truckModalTitle = document.getElementById('truck-modal-title');
        this.btnCloseTruckModal = document.getElementById('btn-close-truck-modal');
        this.btnCancelTruckModal = document.getElementById('btn-cancel-truck-modal');
        this.truckForm = document.getElementById('truck-form');
        this.formTruckId = document.getElementById('form-truck-id');
        this.truckRegInput = document.getElementById('form-truck-reg');
        this.truckNameInput = document.getElementById('form-truck-name');
        this.btnSaveTruck = document.getElementById('btn-save-truck');
        this.trucks = [];
        this.editingTruckId = null;

        // Drivers DOM elements
        this.driverSearchInput = document.getElementById('driver-search-input');
        this.btnOpenAddDriver = document.getElementById('btn-open-add-driver');
        this.btnEmptyAddDriver = document.getElementById('btn-empty-add-driver');
        this.driverTableBody = document.getElementById('drivers-table-body');
        this.driverEmptyState = document.getElementById('driver-table-empty-state');
        this.driverModal = document.getElementById('driver-modal');
        this.driverModalCard = document.getElementById('driver-modal-card');
        this.driverModalTitle = document.getElementById('driver-modal-title');
        this.btnCloseDriverModal = document.getElementById('btn-close-driver-modal');
        this.btnCancelDriverModal = document.getElementById('btn-cancel-driver-modal');
        this.driverForm = document.getElementById('driver-form');
        this.formDriverId = document.getElementById('form-driver-id');
        this.driverNameInput = document.getElementById('form-driver-name');
        this.driverPhoneInput = document.getElementById('form-driver-phone');
        this.btnSaveDriver = document.getElementById('btn-save-driver');
        this.drivers = [];
        this.editingDriverId = null;

        // Daily Shifts DOM elements (List View)
        this.shiftListSection = document.getElementById('shift-list-section');
        this.shiftsTableBody = document.getElementById('shifts-table-body');
        this.shiftEmptyState = document.getElementById('shift-table-empty-state');
        this.shiftTotalBadge = document.getElementById('shift-total-count-badge');
        this.shiftSearchInput = document.getElementById('shift-search-input');
        this.shiftFilterDate = document.getElementById('shift-filter-date');
        this.shiftFilterTruck = document.getElementById('shift-filter-truck');
        this.shiftFilterStatus = document.getElementById('shift-filter-status');
        this.btnResetShiftFilters = document.getElementById('btn-reset-shift-filters');
        this.btnOpenNewShift = document.getElementById('btn-open-new-shift');
        this.btnEmptyStartShift = document.getElementById('btn-empty-start-shift');
        this.shiftsPaginationContainer = document.getElementById('shifts-pagination-container');
        this.shiftsPaginationInfo = document.getElementById('shifts-pagination-info');
        this.shiftsPaginationControls = document.getElementById('shifts-pagination-controls');

        // Daily Shift Sheet DOM elements (Create / Edit View)
        this.shiftSheetSection = document.getElementById('shift-sheet-section');
        this.shiftSheetTitle = document.getElementById('shift-sheet-title');
        this.shiftSheetStatusBadge = document.getElementById('shift-sheet-status-badge');
        this.btnBackToShifts = document.getElementById('btn-back-to-shifts');
        this.btnSaveShiftTop = document.getElementById('btn-save-shift-top');
        this.btnFinalizeShiftTop = document.getElementById('btn-finalize-shift-top');
        this.shiftSelectTruck = document.getElementById('shift-select-truck');
        this.shiftInputDriver = document.getElementById('shift-input-driver');
        this.shiftInputDate = document.getElementById('shift-input-date');
        this.shiftInputStatus = document.getElementById('shift-input-status');
        this.shiftInputCode = document.getElementById('shift-input-code');
        this.shiftInputNotes = document.getElementById('shift-input-notes');
        this.shiftProductSearch = document.getElementById('shift-product-search');
        this.shiftProductDropdown = document.getElementById('shift-product-dropdown');
        this.shiftSelectedProductPreview = document.getElementById('shift-selected-product-preview');
        this.shiftQuickQty = document.getElementById('shift-quick-qty');
        this.btnAddProductRow = document.getElementById('btn-add-product-row');
        this.shiftItemsTbody = document.getElementById('shift-items-tbody');
        this.shiftItemsEmpty = document.getElementById('shift-items-empty');
        this.shiftSummaryItems = document.getElementById('shift-summary-items-count');
        this.shiftSummaryDispatch = document.getElementById('shift-summary-dispatch-total');
        this.shiftSummarySales = document.getElementById('shift-summary-sales-total');
        this.shiftSummaryReturn = document.getElementById('shift-summary-return-total');
        this.btnCancelShiftBottom = document.getElementById('btn-cancel-shift-bottom');
        this.btnSaveShiftBottom = document.getElementById('btn-save-shift-bottom');
        this.btnFinalizeShiftBottom = document.getElementById('btn-finalize-shift-bottom');

        // Shift Report Read-Only Preview Modal DOM elements
        this.shiftPreviewModal = document.getElementById('shift-preview-modal');
        this.shiftPreviewCode = document.getElementById('shift-preview-code');
        this.shiftPreviewStatusBadge = document.getElementById('shift-preview-status-badge');
        this.shiftPreviewDate = document.getElementById('shift-preview-date');
        this.shiftPreviewTruck = document.getElementById('shift-preview-truck');
        this.shiftPreviewDriver = document.getElementById('shift-preview-driver');
        this.shiftPreviewNotes = document.getElementById('shift-preview-notes');
        this.shiftPreviewItemsCount = document.getElementById('shift-preview-items-count');
        this.shiftPreviewItemsTbody = document.getElementById('shift-preview-items-tbody');
        this.shiftPreviewDispatchTotal = document.getElementById('shift-preview-dispatch-total');
        this.shiftPreviewSalesTotal = document.getElementById('shift-preview-sales-total');
        this.shiftPreviewReturnTotal = document.getElementById('shift-preview-return-total');
        this.btnPrintShiftPreview = document.getElementById('btn-print-shift-preview');
        this.btnEditFromPreview = document.getElementById('btn-edit-from-preview');
        this.btnFinalizeFromPreview = document.getElementById('btn-finalize-from-preview');
        this.btnCloseShiftPreview = document.getElementById('btn-close-shift-preview');
        this.btnCloseShiftPreviewBottom = document.getElementById('btn-close-shift-preview-bottom');
        this.previewingShiftId = null;

        // Warranty Claims DOM elements
        this.navClaims = document.getElementById('nav-claims');
        this.sidebarClaimCount = document.getElementById('sidebar-claim-count');
        this.viewClaims = document.getElementById('view-claims');
        this.btnOpenPrintClaimsModal = document.getElementById('btn-open-print-claims-modal');
        this.btnOpenAddClaim = document.getElementById('btn-open-add-claim');
        this.btnEmptyAddClaim = document.getElementById('btn-empty-add-claim');
        
        // Claim Latest Date Graphical Overview elements
        this.claimLatestDateBadge = document.getElementById('claim-latest-date-badge');
        this.claimLatestTotalPcs = document.getElementById('claim-latest-total-pcs');
        this.claimLatestTotalRecords = document.getElementById('claim-latest-total-records');
        this.claimsLatestDriversGrid = document.getElementById('claims-latest-drivers-grid');
        this.claimsLogDateLabel = document.getElementById('claims-log-date-label');

        // Claim Filter elements (in Company Monthly Summary subtab)
        this.claimFilterFrom = document.getElementById('claim-filter-from');
        this.claimFilterTo = document.getElementById('claim-filter-to');
        this.claimFilterDriver = document.getElementById('claim-filter-driver');
        this.btnShareClaimsReport = document.getElementById('btn-share-claims-report');
        this.btnClaimFilterReset = document.getElementById('btn-claim-filter-reset');
        this.btnClaimPeriodAll = document.getElementById('btn-claim-period-all');
        this.btnClaimPeriodMonth = document.getElementById('btn-claim-period-month');
        this.btnClaimPeriodLast = document.getElementById('btn-claim-period-last');
        this.claimsSummaryFilterBadge = document.getElementById('claims-summary-filter-badge');

        // Claim Subtabs & Tables
        this.tabBtnClaimLog = document.getElementById('tab-btn-claim-log');
        this.tabBtnClaimSummary = document.getElementById('tab-btn-claim-summary');
        this.badgeClaimsTableCount = document.getElementById('badge-claims-table-count');
        this.containerClaimsLogTable = document.getElementById('container-claims-log-table');
        this.containerClaimsSummaryTable = document.getElementById('container-claims-summary-table');
        this.claimsTableTbody = document.getElementById('claims-table-tbody');
        this.claimsEmptyState = document.getElementById('claims-empty-state');
        this.claimsSummaryTableTbody = document.getElementById('claims-summary-table-tbody');
        this.claimsSummaryFootPcs = document.getElementById('claims-summary-foot-pcs');
        this.btnPrintSummaryExcel = document.getElementById('btn-print-summary-excel');

        // Claim Add / Edit Modal
        this.claimModal = document.getElementById('claim-modal');
        this.claimModalCard = document.getElementById('claim-modal-card');
        this.claimModalTitle = document.getElementById('claim-modal-title');
        this.claimForm = document.getElementById('claim-form');
        this.formClaimId = document.getElementById('form-claim-id');
        this.formClaimDate = document.getElementById('form-claim-date');
        this.formClaimDriver = document.getElementById('form-claim-driver');
        this.formClaimTruck = document.getElementById('form-claim-truck');
        this.formClaimShop = document.getElementById('form-claim-shop');
        this.formClaimNotes = document.getElementById('form-claim-notes');

        // Claim Product Search Autocomplete & Table elements
        this.claimProductSearch = document.getElementById('claim-product-search');
        this.claimProductDropdown = document.getElementById('claim-product-dropdown');
        this.claimQuickQty = document.getElementById('claim-quick-qty');
        this.btnAddClaimProductRow = document.getElementById('btn-add-claim-product-row');
        this.claimSelectedProductBox = document.getElementById('claim-selected-product-box');
        this.claimSelectedProductLabel = document.getElementById('claim-selected-product-label');
        this.claimItemsTbody = document.getElementById('claim-items-tbody');
        this.formClaimItemsCountBadge = document.getElementById('form-claim-items-count-badge');
        this.formClaimTotalPieces = document.getElementById('form-claim-total-pieces');
        this.btnCloseClaimModal = document.getElementById('btn-close-claim-modal');
        this.btnCancelClaimModal = document.getElementById('btn-cancel-claim-modal');

        this.selectedClaimProduct = null;
        this.currentClaimItems = []; // [{ product_id, display_name, manufacturer, product_type, quantity }]

        // Claim Print Modal
        this.claimPrintModal = document.getElementById('claim-print-modal');
        this.claimPrintModalCard = document.getElementById('claim-print-modal-card');
        this.btnCloseClaimPrintModal = document.getElementById('btn-close-claim-print-modal');
        this.btnCancelClaimPrintModal = document.getElementById('btn-cancel-claim-print-modal');
        this.btnGenerateClaimPrint = document.getElementById('btn-generate-claim-print');
        this.printDriverSelectContainer = document.getElementById('print-driver-select-container');
        this.printClaimDriverSelect = document.getElementById('print-claim-driver-select');
        this.printClaimFromDate = document.getElementById('print-claim-from-date');
        this.printClaimToDate = document.getElementById('print-claim-to-date');
        this.printRangeMonth = document.getElementById('print-range-month');
        this.printRangeLast = document.getElementById('print-range-last');
        this.printRangeAll = document.getElementById('print-range-all');

        // Claim View Details Modal
        this.claimViewModal = document.getElementById('claim-view-modal');
        this.claimViewModalCard = document.getElementById('claim-view-modal-card');
        this.btnCloseClaimViewModal = document.getElementById('btn-close-claim-view-modal');
        this.btnCloseClaimViewModalBottom = document.getElementById('btn-close-claim-view-modal-bottom');
        this.viewClaimCode = document.getElementById('view-claim-code');
        this.viewClaimDate = document.getElementById('view-claim-date');
        this.viewClaimDriver = document.getElementById('view-claim-driver');
        this.viewClaimTruck = document.getElementById('view-claim-truck');
        this.viewClaimShop = document.getElementById('view-claim-shop');
        this.viewClaimItemsTbody = document.getElementById('view-claim-items-tbody');
        this.viewClaimTotalPcs = document.getElementById('view-claim-total-pcs');
        this.viewClaimNotesText = document.getElementById('view-claim-notes-text');
        this.viewClaimNotesBox = document.getElementById('view-claim-notes-box');

        this.claims = [];
        this.claimsSubtab = 'log'; // 'log' | 'summary'

        // Database Export / Import DOM elements
        this.btnExportDb = document.getElementById('btn-export-db');
        this.btnImportDb = document.getElementById('btn-import-db');
        this.importDbFileInput = document.getElementById('import-db-file-input');
    }

    async init() {
        try {
            console.log('Initializing SQLite WASM Database...');
            await dbManager.init();

            // Setup event listeners
            this.bindEvents();

            // Setup initial route / tab
            this.handleRouting();

            // Load initial data
            this.loadProducts();
            this.loadShifts();
            this.loadTrucks();
            this.loadDrivers();
            this.loadClaims();

            // Hide loading screen, show app root
            const loadingEl = document.getElementById('app-loading');
            const rootEl = document.getElementById('app-root');
            if (loadingEl) loadingEl.classList.add('hidden');
            if (rootEl) rootEl.classList.remove('hidden');
        } catch (err) {
            console.error('Error starting app:', err);
            alert('Failed to initialize database: ' + err.message);
        }
    }

    // ================= ROUTING & TAB SWITCHING =================
    handleRouting() {
        const hash = (window.location.hash || '').replace('#', '') || 'products';
        if (hash === 'shifts' || hash === 'daily-shift') {
            this.switchTab('shifts');
        } else if (hash === 'drivers' || hash === 'trucks') {
            this.switchTab('drivers');
        } else if (hash === 'claims' || hash === 'warranty' || hash === 'returns') {
            this.switchTab('claims');
        } else {
            this.switchTab('products');
        }
    }

    switchTab(tab) {
        this.currentTab = tab;

        const setNavActive = (linkEl, isActive, countEl) => {
            if (!linkEl) return;
            const svg = linkEl.querySelector('svg');

            if (isActive) {
                linkEl.className = 'sidebar-nav-item flex items-center px-3.5 py-2.5 text-sm font-bold rounded-lg bg-slate-800 text-sky-400 border-l-4 border-sky-400 shadow-xs transition';
                if (svg) svg.setAttribute('class', 'w-5 h-5 mr-3 text-sky-400');
                if (countEl) countEl.className = 'ml-auto bg-slate-700 text-sky-200 text-xs px-2 py-0.5 rounded-full font-mono';
            } else {
                linkEl.className = 'sidebar-nav-item flex items-center px-3.5 py-2.5 text-sm font-medium rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 border-l-0 transition';
                if (svg) svg.setAttribute('class', 'w-5 h-5 mr-3 text-slate-400');
                if (countEl) countEl.className = 'ml-auto bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full font-mono';
            }
        };

        if (tab === 'shifts') {
            setNavActive(this.navProducts, false, this.sidebarProductCount);
            setNavActive(this.navShifts, true, this.sidebarShiftCount);
            setNavActive(this.navDrivers, false, this.sidebarDriverCount);
            setNavActive(this.navClaims, false, this.sidebarClaimCount);

            if (this.viewProducts) this.viewProducts.classList.add('hidden');
            if (this.viewDrivers) this.viewDrivers.classList.add('hidden');
            if (this.viewClaims) this.viewClaims.classList.add('hidden');
            if (this.viewShifts) this.viewShifts.classList.remove('hidden');
            this.loadShifts();
        } else if (tab === 'drivers') {
            setNavActive(this.navProducts, false, this.sidebarProductCount);
            setNavActive(this.navShifts, false, this.sidebarShiftCount);
            setNavActive(this.navDrivers, true, this.sidebarDriverCount);
            setNavActive(this.navClaims, false, this.sidebarClaimCount);

            if (this.viewProducts) this.viewProducts.classList.add('hidden');
            if (this.viewShifts) this.viewShifts.classList.add('hidden');
            if (this.viewClaims) this.viewClaims.classList.add('hidden');
            if (this.viewDrivers) this.viewDrivers.classList.remove('hidden');
            this.loadTrucks();
            this.loadDrivers();
        } else if (tab === 'claims') {
            setNavActive(this.navProducts, false, this.sidebarProductCount);
            setNavActive(this.navShifts, false, this.sidebarShiftCount);
            setNavActive(this.navDrivers, false, this.sidebarDriverCount);
            setNavActive(this.navClaims, true, this.sidebarClaimCount);

            if (this.viewProducts) this.viewProducts.classList.add('hidden');
            if (this.viewShifts) this.viewShifts.classList.add('hidden');
            if (this.viewDrivers) this.viewDrivers.classList.add('hidden');
            if (this.viewClaims) this.viewClaims.classList.remove('hidden');
            this.loadClaims();
        } else {
            setNavActive(this.navProducts, true, this.sidebarProductCount);
            setNavActive(this.navShifts, false, this.sidebarShiftCount);
            setNavActive(this.navDrivers, false, this.sidebarDriverCount);
            setNavActive(this.navClaims, false, this.sidebarClaimCount);

            if (this.viewShifts) this.viewShifts.classList.add('hidden');
            if (this.viewDrivers) this.viewDrivers.classList.add('hidden');
            if (this.viewClaims) this.viewClaims.classList.add('hidden');
            if (this.viewProducts) this.viewProducts.classList.remove('hidden');
            this.loadProducts();
        }
    }

    bindEvents() {
        // Hash Routing
        window.addEventListener('hashchange', () => this.handleRouting());

        // Navigation clicks
        if (this.navProducts) {
            this.navProducts.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.hash = 'products';
            });
        }

        if (this.navShifts) {
            this.navShifts.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.hash = 'shifts';
            });
        }

        if (this.navDrivers) {
            this.navDrivers.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.hash = 'drivers';
            });
        }

        if (this.navClaims) {
            this.navClaims.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.hash = 'claims';
            });
        }

        // ================= PRODUCT EVENTS =================
        const btnOpenAddProduct = document.getElementById('btn-open-add-product');
        const btnEmptyAddProduct = document.getElementById('btn-empty-add');
        const btnCloseProductModal = document.getElementById('btn-close-modal');
        const btnCancelProductModal = document.getElementById('btn-cancel-modal');

        if (btnOpenAddProduct) btnOpenAddProduct.addEventListener('click', () => this.openAddProductModal());
        if (btnEmptyAddProduct) btnEmptyAddProduct.addEventListener('click', () => this.openAddProductModal());
        if (btnCloseProductModal) btnCloseProductModal.addEventListener('click', () => this.closeProductModal());
        if (btnCancelProductModal) btnCancelProductModal.addEventListener('click', () => this.closeProductModal());

        if (this.productModal) {
            this.productModal.addEventListener('click', (e) => {
                if (e.target === this.productModal) this.closeProductModal();
            });
        }

        // Image Drop Zone & File Input
        if (this.imageDropZone && this.imageFileInput) {
            this.imageDropZone.addEventListener('click', () => this.imageFileInput.click());

            this.imageFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    this.handleImageFiles(e.target.files);
                    this.imageFileInput.value = '';
                }
            });

            this.imageDropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.imageDropZone.classList.add('border-sky-500', 'bg-sky-50/70');
            });

            this.imageDropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                this.imageDropZone.classList.remove('border-sky-500', 'bg-sky-50/70');
            });

            this.imageDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.imageDropZone.classList.remove('border-sky-500', 'bg-sky-50/70');
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    this.handleImageFiles(e.dataTransfer.files);
                }
            });
        }

        // Product Category Subtabs
        document.querySelectorAll('.product-subtab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-product-tab') || 'all';
                this.switchProductSubtab(tab);
            });
        });

        if (this.typeSelect) {
            this.typeSelect.addEventListener('change', () => {
                if (this.typeSelect.value === '__custom__') {
                    this.customTypeContainer.classList.remove('hidden');
                    this.customTypeInput.required = true;
                    this.customTypeInput.focus();
                } else {
                    this.customTypeContainer.classList.add('hidden');
                    this.customTypeInput.required = false;
                }

                this.updateProductFormFieldsForType(this.typeSelect.value);

                if (!this.editingProductId && this.bundleQtyInput) {
                    if (this.typeSelect.value === 'Tire') {
                        this.bundleQtyInput.value = '10';
                    } else if (this.typeSelect.value === 'Tube') {
                        this.bundleQtyInput.value = '50';
                    } else if (this.typeSelect.value === 'Chain') {
                        this.bundleQtyInput.value = '10';
                    } else if (this.typeSelect.value === 'Oil') {
                        this.bundleQtyInput.value = '24';
                    } else if (this.typeSelect.value === 'Rim') {
                        this.bundleQtyInput.value = '10';
                    } else if (this.typeSelect.value === 'Spoke') {
                        this.bundleQtyInput.value = '50';
                    } else if (this.typeSelect.value === 'Battery') {
                        this.bundleQtyInput.value = '10';
                    }
                }
            });
        }

        if (this.productForm) this.productForm.addEventListener('submit', (e) => this.handleProductFormSubmit(e));
        if (this.productSearchInput) this.productSearchInput.addEventListener('input', () => {
            this.productsCurrentPage = 1;
            this.renderProductsTable();
        });
        if (this.filterType) this.filterType.addEventListener('change', () => {
            this.productsCurrentPage = 1;
            this.renderProductsTable();
        });
        if (this.filterCategory) this.filterCategory.addEventListener('change', () => {
            this.productsCurrentPage = 1;
            this.renderProductsTable();
        });
        if (this.filterPhotos) this.filterPhotos.addEventListener('change', () => {
            this.productsCurrentPage = 1;
            this.renderProductsTable();
        });

        // ================= LIGHTBOX EVENTS =================
        if (this.btnCloseLightbox) this.btnCloseLightbox.addEventListener('click', () => this.closeLightbox());
        if (this.btnPrevLightbox) this.btnPrevLightbox.addEventListener('click', () => this.prevLightboxImage());
        if (this.btnNextLightbox) this.btnNextLightbox.addEventListener('click', () => this.nextLightboxImage());

        if (this.lightboxModal) {
            this.lightboxModal.addEventListener('click', (e) => {
                if (e.target === this.lightboxModal) this.closeLightbox();
            });
        }

        // ================= TRUCKS & DRIVERS SUB-TAB & CRUD EVENTS =================
        if (this.subtabTrucksBtn) this.subtabTrucksBtn.addEventListener('click', () => this.switchSubtab('trucks'));
        if (this.subtabDriversBtn) this.subtabDriversBtn.addEventListener('click', () => this.switchSubtab('drivers'));

        // Trucks Events
        if (this.btnOpenAddTruck) this.btnOpenAddTruck.addEventListener('click', () => this.openAddTruckModal());
        if (this.btnEmptyAddTruck) this.btnEmptyAddTruck.addEventListener('click', () => this.openAddTruckModal());
        if (this.btnCloseTruckModal) this.btnCloseTruckModal.addEventListener('click', () => this.closeTruckModal());
        if (this.btnCancelTruckModal) this.btnCancelTruckModal.addEventListener('click', () => this.closeTruckModal());
        if (this.truckModal) {
            this.truckModal.addEventListener('click', (e) => {
                if (e.target === this.truckModal) this.closeTruckModal();
            });
        }
        if (this.truckForm) this.truckForm.addEventListener('submit', (e) => this.handleTruckFormSubmit(e));
        if (this.truckSearchInput) this.truckSearchInput.addEventListener('input', () => this.renderTrucksTable());

        // Drivers Events
        if (this.btnOpenAddDriver) this.btnOpenAddDriver.addEventListener('click', () => this.openAddDriverModal());
        if (this.btnEmptyAddDriver) this.btnEmptyAddDriver.addEventListener('click', () => this.openAddDriverModal());
        if (this.btnCloseDriverModal) this.btnCloseDriverModal.addEventListener('click', () => this.closeDriverModal());
        if (this.btnCancelDriverModal) this.btnCancelDriverModal.addEventListener('click', () => this.closeDriverModal());
        if (this.driverModal) {
            this.driverModal.addEventListener('click', (e) => {
                if (e.target === this.driverModal) this.closeDriverModal();
            });
        }
        if (this.driverForm) this.driverForm.addEventListener('submit', (e) => this.handleDriverFormSubmit(e));
        if (this.driverSearchInput) this.driverSearchInput.addEventListener('input', () => this.renderDriversTable());

        // ================= DAILY SHIFTS EVENTS =================
        if (this.btnOpenNewShift) {
            this.btnOpenNewShift.addEventListener('click', () => this.openNewShiftSheet());
        }
        if (this.btnEmptyStartShift) {
            this.btnEmptyStartShift.addEventListener('click', () => this.openNewShiftSheet());
        }
        if (this.btnBackToShifts) {
            this.btnBackToShifts.addEventListener('click', () => this.closeShiftSheetView());
        }
        if (this.btnCancelShiftBottom) {
            this.btnCancelShiftBottom.addEventListener('click', () => this.closeShiftSheetView());
        }
        if (this.btnSaveShiftTop) {
            this.btnSaveShiftTop.addEventListener('click', () => this.saveShiftSheet(false));
        }
        if (this.btnFinalizeShiftTop) {
            this.btnFinalizeShiftTop.addEventListener('click', () => this.saveShiftSheet(true));
        }
        if (this.btnSaveShiftBottom) {
            this.btnSaveShiftBottom.addEventListener('click', () => this.saveShiftSheet(false));
        }
        if (this.btnFinalizeShiftBottom) {
            this.btnFinalizeShiftBottom.addEventListener('click', () => this.saveShiftSheet(true));
        }
        if (this.shiftInputStatus) {
            this.shiftInputStatus.addEventListener('change', () => this.updateShiftSheetStatusBadge());
        }

        // Shift List Filters
        if (this.shiftSearchInput) {
            this.shiftSearchInput.addEventListener('input', () => {
                this.shiftsCurrentPage = 1;
                this.renderShiftsTable();
            });
        }
        if (this.shiftFilterDate) {
            this.shiftFilterDate.addEventListener('change', () => {
                this.shiftsCurrentPage = 1;
                this.renderShiftsTable();
            });
        }
        if (this.shiftFilterTruck) {
            this.shiftFilterTruck.addEventListener('change', () => {
                this.shiftsCurrentPage = 1;
                this.renderShiftsTable();
            });
        }
        if (this.shiftFilterStatus) {
            this.shiftFilterStatus.addEventListener('change', () => {
                this.shiftsCurrentPage = 1;
                this.renderShiftsTable();
            });
        }
        if (this.btnResetShiftFilters) {
            this.btnResetShiftFilters.addEventListener('click', () => {
                if (this.shiftSearchInput) this.shiftSearchInput.value = '';
                if (this.shiftFilterDate) this.shiftFilterDate.value = '';
                if (this.shiftFilterTruck) this.shiftFilterTruck.value = '';
                if (this.shiftFilterStatus) this.shiftFilterStatus.value = '';
                this.shiftsCurrentPage = 1;
                this.renderShiftsTable();
            });
        }

        // Truck selection updates driver in Shift Sheet
        if (this.shiftSelectTruck) {
            this.shiftSelectTruck.addEventListener('change', () => {
                if (this.shiftInputDriver) {
                    const opt = this.shiftSelectTruck.options[this.shiftSelectTruck.selectedIndex];
                    this.shiftInputDriver.value = (opt && opt.getAttribute('data-driver')) || '';
                }
            });
        }

        // Shift Product Search & Autocomplete
        if (this.shiftProductSearch) {
            this.shiftProductSearch.addEventListener('input', (e) => {
                this.handleShiftProductSearch(e.target.value);
            });
            this.shiftProductSearch.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const qty = this.shiftQuickQty ? parseInt(this.shiftQuickQty.value, 10) || 10 : 10;
                    if (this.selectedShiftProduct) {
                        this.addProductToCurrentShift(this.selectedShiftProduct, qty);
                    }
                }
            });
        }

        // Add Product Row to Shift Button
        if (this.btnAddProductRow) {
            this.btnAddProductRow.addEventListener('click', () => {
                const qty = this.shiftQuickQty ? parseInt(this.shiftQuickQty.value, 10) || 10 : 10;
                if (this.selectedShiftProduct) {
                    this.addProductToCurrentShift(this.selectedShiftProduct, qty);
                } else {
                    const q = (this.shiftProductSearch ? this.shiftProductSearch.value : '').trim();
                    if (q) {
                        const match = this.products.find(p => this.matchesProductSearch(p, q));
                        if (match) {
                            this.addProductToCurrentShift(match, qty);
                            return;
                        }
                    }
                    this.showToast('Please search and select a product first', 'warning');
                    if (this.shiftProductSearch) this.shiftProductSearch.focus();
                }
            });
        }

        // Shift Report Read-Only Preview Modal Events
        if (this.btnCloseShiftPreview) this.btnCloseShiftPreview.addEventListener('click', () => this.closePreviewShiftModal());
        if (this.btnCloseShiftPreviewBottom) this.btnCloseShiftPreviewBottom.addEventListener('click', () => this.closePreviewShiftModal());
        if (this.btnEditFromPreview) {
            this.btnEditFromPreview.addEventListener('click', () => {
                const id = this.previewingShiftId;
                this.closePreviewShiftModal();
                if (id) this.openEditShiftSheet(id);
            });
        }
        if (this.btnFinalizeFromPreview) {
            this.btnFinalizeFromPreview.addEventListener('click', () => {
                this.finalizeShiftFromPreview();
            });
        }
        if (this.btnPrintShiftPreview) {
            this.btnPrintShiftPreview.addEventListener('click', () => {
                window.print();
            });
        }
        if (this.shiftPreviewModal) {
            this.shiftPreviewModal.addEventListener('click', (e) => {
                if (e.target === this.shiftPreviewModal) this.closePreviewShiftModal();
            });
        }

        // Close search dropdown on clicking outside
        document.addEventListener('click', (e) => {
            if (this.shiftProductDropdown && !this.shiftProductDropdown.contains(e.target) && e.target !== this.shiftProductSearch) {
                this.shiftProductDropdown.classList.add('hidden');
            }
        });

        // Database Export / Import Events
        if (this.btnExportDb) {
            this.btnExportDb.addEventListener('click', () => this.exportDatabaseFile());
        }
        if (this.btnImportDb) {
            this.btnImportDb.addEventListener('click', () => {
                if (this.importDbFileInput) {
                    this.importDbFileInput.value = '';
                    this.importDbFileInput.click();
                }
            });
        }
        if (this.importDbFileInput) {
            this.importDbFileInput.addEventListener('change', (e) => this.handleDatabaseImport(e));
        }

        // ================= CLAIMS & WARRANTY EVENTS =================
        // Subtab Navigation
        if (this.tabBtnClaimLog) this.tabBtnClaimLog.addEventListener('click', () => this.switchClaimsSubtab('log'));
        if (this.tabBtnClaimSummary) this.tabBtnClaimSummary.addEventListener('click', () => this.switchClaimsSubtab('summary'));

        // Claim Filter Controls (Inside Company Summary Tab)
        if (this.claimFilterFrom) this.claimFilterFrom.addEventListener('change', () => this.applyCompanySummaryFilters());
        if (this.claimFilterTo) this.claimFilterTo.addEventListener('change', () => this.applyCompanySummaryFilters());
        if (this.claimFilterDriver) this.claimFilterDriver.addEventListener('change', () => this.applyCompanySummaryFilters());
        if (this.btnShareClaimsReport) this.btnShareClaimsReport.addEventListener('click', () => this.handleShareClaimsReport());
        if (this.btnClaimFilterReset) this.btnClaimFilterReset.addEventListener('click', () => this.resetCompanySummaryFilters());
        
        if (this.btnClaimPeriodAll) this.btnClaimPeriodAll.addEventListener('click', () => this.setCompanySummaryFilterPeriod('all'));
        if (this.btnClaimPeriodMonth) this.btnClaimPeriodMonth.addEventListener('click', () => this.setCompanySummaryFilterPeriod('month'));
        if (this.btnClaimPeriodLast) this.btnClaimPeriodLast.addEventListener('click', () => this.setCompanySummaryFilterPeriod('last'));

        // Add Claim Modal Actions
        if (this.btnOpenAddClaim) this.btnOpenAddClaim.addEventListener('click', () => this.openAddClaimModal());
        if (this.btnEmptyAddClaim) this.btnEmptyAddClaim.addEventListener('click', () => this.openAddClaimModal());
        if (this.btnCloseClaimModal) this.btnCloseClaimModal.addEventListener('click', () => this.closeAddClaimModal());
        if (this.btnCancelClaimModal) this.btnCancelClaimModal.addEventListener('click', () => this.closeAddClaimModal());
        if (this.claimModal) {
            this.claimModal.addEventListener('click', (e) => {
                if (e.target === this.claimModal) this.closeAddClaimModal();
            });
        }
        if (this.formClaimDriver) this.formClaimDriver.addEventListener('change', () => this.handleClaimDriverChange());
        if (this.claimForm) this.claimForm.addEventListener('submit', (e) => this.handleClaimFormSubmit(e));

        // Claim Product Autocomplete & Add Actions
        if (this.claimProductSearch) {
            this.claimProductSearch.addEventListener('input', (e) => {
                this.handleClaimProductSearch(e.target.value);
            });
            this.claimProductSearch.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addSelectedProductToClaim();
                }
            });
        }

        if (this.claimQuickQty) {
            this.claimQuickQty.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addSelectedProductToClaim();
                }
            });
        }

        if (this.btnAddClaimProductRow) {
            this.btnAddClaimProductRow.addEventListener('click', () => this.addSelectedProductToClaim());
        }

        document.addEventListener('click', (e) => {
            if (this.claimProductDropdown && !this.claimProductDropdown.contains(e.target) && e.target !== this.claimProductSearch) {
                this.claimProductDropdown.classList.add('hidden');
            }
        });

        // Print Claims Modal Actions
        if (this.btnOpenPrintClaimsModal) this.btnOpenPrintClaimsModal.addEventListener('click', () => this.openClaimPrintModal());
        if (this.btnPrintSummaryExcel) this.btnPrintSummaryExcel.addEventListener('click', () => this.openClaimPrintModal());
        if (this.btnCloseClaimPrintModal) this.btnCloseClaimPrintModal.addEventListener('click', () => this.closeClaimPrintModal());
        if (this.btnCancelClaimPrintModal) this.btnCancelClaimPrintModal.addEventListener('click', () => this.closeClaimPrintModal());
        if (this.claimPrintModal) {
            this.claimPrintModal.addEventListener('click', (e) => {
                if (e.target === this.claimPrintModal) this.closeClaimPrintModal();
            });
        }
        
        document.querySelectorAll('input[name="claim_report_mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handleClaimPrintModeChange(e.target.value));
        });

        if (this.printRangeMonth) this.printRangeMonth.addEventListener('click', () => this.setClaimPrintRange('month'));
        if (this.printRangeLast) this.printRangeLast.addEventListener('click', () => this.setClaimPrintRange('last'));
        if (this.printRangeAll) this.printRangeAll.addEventListener('click', () => this.setClaimPrintRange('all'));
        if (this.btnGenerateClaimPrint) this.btnGenerateClaimPrint.addEventListener('click', () => this.executePrintClaims());

        // View Claim Details Modal Actions
        if (this.btnCloseClaimViewModal) this.btnCloseClaimViewModal.addEventListener('click', () => this.closeClaimViewModal());
        if (this.btnCloseClaimViewModalBottom) this.btnCloseClaimViewModalBottom.addEventListener('click', () => this.closeClaimViewModal());
        if (this.claimViewModal) {
            this.claimViewModal.addEventListener('click', (e) => {
                if (e.target === this.claimViewModal) this.closeClaimViewModal();
            });
        }

        // Global Keyboard Shortcuts (Escape & Arrow Keys)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeLightbox();
                this.closeProductModal();
                this.closeDriverModal();
                this.closePreviewShiftModal();
                this.closeAddClaimModal();
                this.closeClaimPrintModal();
                this.closeClaimViewModal();
            } else if (this.lightboxModal && !this.lightboxModal.classList.contains('hidden')) {
                if (e.key === 'ArrowLeft') this.prevLightboxImage();
                if (e.key === 'ArrowRight') this.nextLightboxImage();
            }
        });
    }

    // ================= IMAGE PROCESSING METHODS =================
    async handleImageFiles(fileList) {
        const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) {
            this.showToast('Please select valid image files (PNG, JPG, WebP)', 'error');
            return;
        }

        for (const file of files) {
            try {
                const compressedBase64 = await this.compressImageFile(file);
                this.currentProductImages.push(compressedBase64);
            } catch (err) {
                console.warn('Could not compress image file:', file.name, err);
            }
        }

        this.renderProductImagePreviews();
    }

    compressImageFile(file, maxDimension = 1200, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxDimension) {
                            height = Math.round((height * maxDimension) / width);
                            width = maxDimension;
                        }
                    } else {
                        if (height > maxDimension) {
                            width = Math.round((width * maxDimension) / height);
                            height = maxDimension;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    renderProductImagePreviews() {
        if (!this.imagePreviewGrid || !this.imageCountBadge) return;

        const count = this.currentProductImages.length;
        this.imageCountBadge.textContent = `${count} photo${count === 1 ? '' : 's'}`;

        if (count === 0) {
            this.imagePreviewGrid.innerHTML = '';
            this.imagePreviewGrid.classList.add('hidden');
            return;
        }

        this.imagePreviewGrid.classList.remove('hidden');
        this.imagePreviewGrid.innerHTML = this.currentProductImages.map((imgSrc, index) => {
            return `
                <div class="relative group rounded-lg overflow-hidden border border-gray-200 bg-slate-100 aspect-square shadow-xs">
                    <img src="${imgSrc}" alt="Preview ${index + 1}" class="w-full h-full object-cover">
                    
                    <!-- Remove Button -->
                    <button type="button" data-action="remove-image" data-index="${index}" class="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-[11px] font-bold shadow-md transition transform group-hover:scale-110">
                        &times;
                    </button>

                    <div class="absolute bottom-0 inset-x-0 bg-black/50 text-[9px] text-white text-center py-0.5 font-mono">
                        #${index + 1}
                    </div>
                </div>
            `;
        }).join('');

        this.imagePreviewGrid.querySelectorAll('[data-action="remove-image"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'), 10);
                this.currentProductImages.splice(index, 1);
                this.renderProductImagePreviews();
            });
        });
    }

    // ================= LIGHTBOX GALLERY METHODS =================
    openLightbox(product, startIndex = 0) {
        let images = [];
        try {
            images = JSON.parse(product.images || '[]');
        } catch (e) {
            images = [];
        }

        if (!Array.isArray(images) || images.length === 0) {
            this.showToast('No photos available for this product', 'info');
            return;
        }

        this.lightboxImages = images;
        this.lightboxCurrentIndex = startIndex >= 0 && startIndex < images.length ? startIndex : 0;
        this.lightboxProductTitle = `${product.product_number} — ${product.vehicle_name} (${product.product_type})`;

        this.lightboxTitle.textContent = this.lightboxProductTitle;
        this.updateLightboxDisplay();

        if (this.lightboxModal) {
            this.lightboxModal.classList.remove('hidden');
            requestAnimationFrame(() => {
                this.lightboxModal.classList.remove('opacity-0');
                this.lightboxModal.classList.add('opacity-100');
            });
        }
    }

    updateLightboxDisplay() {
        if (this.lightboxImages.length === 0) return;

        const currentSrc = this.lightboxImages[this.lightboxCurrentIndex];
        this.lightboxMainImg.src = currentSrc;
        this.lightboxCounter.textContent = `Photo ${this.lightboxCurrentIndex + 1} of ${this.lightboxImages.length}`;

        if (this.lightboxImages.length <= 1) {
            this.btnPrevLightbox.classList.add('hidden');
            this.btnNextLightbox.classList.add('hidden');
        } else {
            this.btnPrevLightbox.classList.remove('hidden');
            this.btnNextLightbox.classList.remove('hidden');
        }

        if (this.lightboxImages.length > 1) {
            this.lightboxThumbnailsStrip.classList.remove('hidden');
            this.lightboxThumbnailsStrip.innerHTML = this.lightboxImages.map((src, i) => {
                const isActive = i === this.lightboxCurrentIndex;
                return `
                    <button type="button" data-index="${i}" class="w-12 h-12 rounded-lg overflow-hidden border-2 transition ${isActive ? 'border-sky-400 scale-105 shadow-md' : 'border-white/20 opacity-60 hover:opacity-100'}">
                        <img src="${src}" alt="Thumb ${i + 1}" class="w-full h-full object-cover">
                    </button>
                `;
            }).join('');

            this.lightboxThumbnailsStrip.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.lightboxCurrentIndex = parseInt(btn.getAttribute('data-index'), 10);
                    this.updateLightboxDisplay();
                });
            });
        } else {
            this.lightboxThumbnailsStrip.classList.add('hidden');
            this.lightboxThumbnailsStrip.innerHTML = '';
        }
    }

    nextLightboxImage() {
        if (this.lightboxImages.length <= 1) return;
        this.lightboxCurrentIndex = (this.lightboxCurrentIndex + 1) % this.lightboxImages.length;
        this.updateLightboxDisplay();
    }

    prevLightboxImage() {
        if (this.lightboxImages.length <= 1) return;
        this.lightboxCurrentIndex = (this.lightboxCurrentIndex - 1 + this.lightboxImages.length) % this.lightboxImages.length;
        this.updateLightboxDisplay();
    }

    closeLightbox() {
        if (!this.lightboxModal) return;
        this.lightboxModal.classList.remove('opacity-100');
        this.lightboxModal.classList.add('opacity-0');
        setTimeout(() => {
            this.lightboxModal.classList.add('hidden');
            if (this.lightboxMainImg) this.lightboxMainImg.src = '';
        }, 150);
    }

    // ================= PRODUCT METHODS =================
    getProductDisplayName(p) {
        if (p.product_type === 'Tire' || p.product_type === 'Tube') {
            const cat = (p.category && p.category !== 'Nill' && p.category !== 'None') ? p.category : '';
            const num = p.product_number || '';
            const strength = (p.strength && p.strength !== 'Nill' && p.strength !== 'None') ? p.strength : '';
            const pos = (p.position && p.position !== 'Nill' && p.position !== 'None') ? p.position : '';
            const veh = p.vehicle_name || '';
            const mfg = p.manufacturer || '';

            return [cat, num, strength, pos, veh, mfg].filter(Boolean).join(' ');
        } else {
            // For Chain, Oil, Rim, Spoke, Battery, Custom spare parts
            const num = p.product_number || '';
            const veh = p.vehicle_name ? `(${p.vehicle_name})` : '';
            return [num, veh].filter(Boolean).join(' ');
        }
    }

    getReportProductSimpleName(p) {
        if (!p) return '';
        const cat = (p.category && p.category !== 'Nill' && p.category !== 'None') ? String(p.category).trim() : '';
        const num = (p.product_number || p.size || '').trim();
        const strength = (p.strength && p.strength !== 'Nill' && p.strength !== 'None') ? String(p.strength).trim() : '';
        const type = (p.product_type || p.type || '').trim();

        if (cat || num || strength || type) {
            return [cat, num, strength, type].filter(Boolean).join(' ');
        }
        return p.display_name || p.name || '';
    }

    matchesProductSearch(p, query) {
        if (!query) return true;
        const cleanQuery = query.trim().toLowerCase();
        if (!cleanQuery) return true;

        const tokens = cleanQuery.split(/\s+/).filter(Boolean);
        if (tokens.length === 0) return true;

        const disp = this.getProductDisplayName(p).toLowerCase();
        const num = (p.product_number || '').toLowerCase();
        const veh = (p.vehicle_name || '').toLowerCase();
        const mfg = (p.manufacturer || '').toLowerCase();
        const typ = (p.product_type || '').toLowerCase();
        const str = (p.strength || '').toLowerCase();
        const pos = (p.position || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const nts = (p.notes || '').toLowerCase();
        const bdl = p.bundle_qty ? String(p.bundle_qty) : '';

        // Stripped variations for dot/hyphen tolerance (e.g. 2.25.17, 25.17, 22517, 2-25-17)
        const numClean = num.replace(/[^a-z0-9]/g, '');
        const numNoDots = num.replace(/\./g, '');
        const dispClean = disp.replace(/[^a-z0-9]/g, '');

        const combined = `${disp} ${num} ${numClean} ${numNoDots} ${veh} ${mfg} ${typ} ${str} ${pos} ${cat} ${nts} ${bdl} ${bdl ? bdl + 'pcs' : ''}`.toLowerCase();
        const combinedClean = combined.replace(/[^a-z0-9\s]/g, '');

        // Every search token must match in the product's attributes in any order
        return tokens.every(token => {
            const tokenClean = token.replace(/[^a-z0-9]/g, '');

            // Exact substring check
            if (combined.includes(token)) return true;

            // Dot/dash-insensitive check
            if (tokenClean && combinedClean.includes(tokenClean)) return true;

            // Check if token matches part of product number (e.g. '25.17' matching '2.25.17')
            if (num.includes(token) || (tokenClean && numClean.includes(tokenClean))) return true;

            // Direct field checks
            if (disp.includes(token) || (tokenClean && dispClean.includes(tokenClean))) return true;
            if (veh.includes(token) || mfg.includes(token) || typ.includes(token) ||
                str.includes(token) || pos.includes(token) || cat.includes(token) || nts.includes(token)) {
                return true;
            }

            return false;
        });
    }

    updateProductFormFieldsForType(type) {
        const isTireOrTube = (type === 'Tire' || type === 'Tube');

        if (this.tireSpecificFields) {
            if (isTireOrTube) {
                this.tireSpecificFields.classList.remove('hidden');
            } else {
                this.tireSpecificFields.classList.add('hidden');
            }
        }

        if (this.labelProductNumber) {
            if (isTireOrTube) {
                this.labelProductNumber.innerHTML = 'Product Number / Size <span class="text-red-500">*</span>';
                if (this.numberInput) this.numberInput.placeholder = 'e.g. 2.25.17 or 900-20 or 2.50-18';
            } else if (type === 'Chain') {
                this.labelProductNumber.innerHTML = 'Product Name / Model <span class="text-red-500">*</span>';
                if (this.numberInput) this.numberInput.placeholder = 'e.g. 428H-108L Gold Chain, 428-100L Roller Chain';
            } else if (type === 'Oil') {
                this.labelProductNumber.innerHTML = 'Product Name & Grade <span class="text-red-500">*</span>';
                if (this.numberInput) this.numberInput.placeholder = 'e.g. 20W-50 4T Engine Oil 0.7L / 1.0L, 10W-40';
            } else if (type === 'Rim') {
                this.labelProductNumber.innerHTML = 'Product Name / Size <span class="text-red-500">*</span>';
                if (this.numberInput) this.numberInput.placeholder = 'e.g. 17x1.40 Chrome Alloy Rim, 18-inch Steel Rim';
            } else if (type === 'Spoke') {
                this.labelProductNumber.innerHTML = 'Product Name / Size <span class="text-red-500">*</span>';
                if (this.numberInput) this.numberInput.placeholder = 'e.g. 36H 10G Heavy Spokes Set, 9G x 161mm';
            } else if (type === 'Battery') {
                this.labelProductNumber.innerHTML = 'Product Name / Model <span class="text-red-500">*</span>';
                if (this.numberInput) this.numberInput.placeholder = 'e.g. 12V 7Ah Dry Battery, 12N9-4B-1 Lead Acid';
            } else {
                this.labelProductNumber.innerHTML = 'Product Name / Number <span class="text-red-500">*</span>';
                if (this.numberInput) this.numberInput.placeholder = 'Enter product name or number';
            }
        }

        if (this.labelVehicleName) {
            if (type === 'Oil') {
                this.labelVehicleName.innerHTML = 'Vehicle / Engine Type <span class="text-red-500">*</span>';
                if (this.vehicleInput) this.vehicleInput.placeholder = 'e.g. Honda 70, 4-Stroke Motorcycle, Universal';
            } else {
                this.labelVehicleName.innerHTML = 'Vehicle Name <span class="text-red-500">*</span>';
                if (this.vehicleInput) this.vehicleInput.placeholder = 'e.g. Honda 70, CD125, YBR, Rickshaw, Truck';
            }
        }

        if (this.labelBundleQty) {
            if (type === 'Oil') {
                this.labelBundleQty.innerHTML = 'Bundle / Carton Quantity <span class="text-gray-400 font-normal">(Bottles/Carton)</span>';
                if (this.bundleQtyInput) this.bundleQtyInput.placeholder = 'e.g. 12 or 24 bottles';
            } else if (type === 'Spoke') {
                this.labelBundleQty.innerHTML = 'Bundle Quantity <span class="text-gray-400 font-normal">(Sets/Bundle)</span>';
                if (this.bundleQtyInput) this.bundleQtyInput.placeholder = 'e.g. 20 or 50 sets';
            } else if (type === 'Battery') {
                this.labelBundleQty.innerHTML = 'Bundle / Packing Quantity <span class="text-gray-400 font-normal">(Units/Carton)</span>';
                if (this.bundleQtyInput) this.bundleQtyInput.placeholder = 'e.g. 10 or 20 pcs';
            } else {
                this.labelBundleQty.innerHTML = 'Bundle Quantity (Pcs/Bundle / Pack) <span class="text-gray-400 font-normal">(Optional)</span>';
                if (this.bundleQtyInput) this.bundleQtyInput.placeholder = 'e.g. 5 (Tire), 10 (Chain), 50 (Tube)';
            }
        }
    }

    switchProductSubtab(tabKey) {
        this.currentProductTab = tabKey;

        // Update active subtab styles
        document.querySelectorAll('.product-subtab-btn').forEach(btn => {
            const btnTab = btn.getAttribute('data-product-tab');
            const countBadge = btn.querySelector('span[id^="badge-count-"]');

            if (btnTab === tabKey) {
                btn.className = 'product-subtab-btn px-3.5 py-2 rounded-lg font-bold text-xs transition flex items-center space-x-1.5 bg-sky-600 text-white shadow-xs cursor-pointer';
                if (countBadge) countBadge.className = 'px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono';
            } else {
                btn.className = 'product-subtab-btn px-3.5 py-2 rounded-lg font-bold text-xs transition flex items-center space-x-1.5 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 cursor-pointer';
                if (countBadge) countBadge.className = 'px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 text-gray-700 font-mono';
            }
        });

        this.productsCurrentPage = 1;
        this.renderProductsTable();
    }

    updateProductCategoryCounts() {
        if (!this.products) return;

        const countAll = this.products.length;
        const countTiresTubes = this.products.filter(p => p.product_type === 'Tire' || p.product_type === 'Tube').length;
        const countChains = this.products.filter(p => p.product_type === 'Chain').length;
        const countOil = this.products.filter(p => p.product_type === 'Oil').length;
        const countRims = this.products.filter(p => p.product_type === 'Rim').length;
        const countSpokes = this.products.filter(p => p.product_type === 'Spoke').length;
        const countBatteries = this.products.filter(p => p.product_type === 'Battery').length;
        const countSpareParts = this.products.filter(p => p.product_type === 'Spare Parts').length;

        if (this.badgeCountAll) this.badgeCountAll.textContent = countAll;
        if (this.badgeCountTiresTubes) this.badgeCountTiresTubes.textContent = countTiresTubes;
        if (this.badgeCountChains) this.badgeCountChains.textContent = countChains;
        if (this.badgeCountOil) this.badgeCountOil.textContent = countOil;
        if (this.badgeCountRims) this.badgeCountRims.textContent = countRims;
        if (this.badgeCountSpokes) this.badgeCountSpokes.textContent = countSpokes;
        if (this.badgeCountBatteries) this.badgeCountBatteries.textContent = countBatteries;
        if (this.badgeCountSpareParts) this.badgeCountSpareParts.textContent = countSpareParts;
    }

    async loadProducts() {
        try {
            this.products = dbManager.query('SELECT * FROM products ORDER BY id DESC');
            if ((!this.products || this.products.length === 0) && typeof fetch !== 'undefined') {
                try {
                    const resp = await fetch(`warehouse.sqlite?t=${Date.now()}`);
                    if (resp.ok) {
                        const ab = await resp.arrayBuffer();
                        if (ab && ab.byteLength > 0) {
                            await dbManager.importDatabase(ab);
                            this.products = dbManager.query('SELECT * FROM products ORDER BY id DESC');
                            console.log('✓ Auto-synced products from warehouse.sqlite');
                        }
                    }
                } catch (e) {}
            }
            this.updateProductCategoryCounts();
            this.renderProductsTable();
        } catch (err) {
            console.warn('Error querying products table, refreshing schema:', err);
            dbManager.initFreshSchema();
            this.products = dbManager.query('SELECT * FROM products ORDER BY id DESC');
            this.updateProductCategoryCounts();
            this.renderProductsTable();
        }
    }

    renderProductsTable() {
        if (!this.productTableBody) return;

        const query = (this.productSearchInput ? this.productSearchInput.value : '').trim().toLowerCase();
        const typeFilter = this.filterType ? this.filterType.value : '';
        const catFilter = this.filterCategory ? this.filterCategory.value : '';
        const photoFilter = this.filterPhotos ? this.filterPhotos.value : '';

        const isSpecificNonTireTab = ['Chain', 'Oil', 'Rim', 'Spoke', 'Battery', 'Spare Parts'].includes(this.currentProductTab);

        // Update table head columns according to active subtab
        if (this.productTableHead) {
            if (isSpecificNonTireTab) {
                const typeLabel = this.currentProductTab === 'Oil' ? 'Engine Oil' : (this.currentProductTab === 'Battery' ? 'Battery' : this.currentProductTab);
                this.productTableHead.innerHTML = `
                    <tr>
                        <th class="px-2.5 py-2.5 text-center text-gray-400 w-10">#</th>
                        <th class="px-2 py-2.5 text-center w-12">Photo</th>
                        <th class="px-3 py-2.5 text-sky-950 font-extrabold whitespace-nowrap">Product Name / Model</th>
                        <th class="px-3 py-2.5 whitespace-nowrap">Vehicle / Compatible</th>
                        <th class="px-3 py-2.5 text-center whitespace-nowrap">Bundle / Pack Quantity</th>
                        <th class="px-3 py-2.5 whitespace-nowrap">Category / Type</th>
                        <th class="px-3 py-2.5 text-right whitespace-nowrap">Actions</th>
                    </tr>
                `;
            } else {
                this.productTableHead.innerHTML = `
                    <tr>
                        <th class="px-2 py-2.5 text-center text-gray-400 w-8">#</th>
                        <th class="px-1.5 py-2.5 text-center w-10">Photo</th>
                        <th class="px-2.5 py-2.5 text-sky-950 font-extrabold whitespace-nowrap">Display Name <span class="text-[10px] font-normal text-slate-400 font-sans">[Cat] [Size] [Strength] [Vehicle] [Mfg]</span></th>
                        <th class="px-2 py-2.5 whitespace-nowrap">Type</th>
                        <th class="px-2 py-2.5 whitespace-nowrap">Number / Size</th>
                        <th class="px-2 py-2.5 whitespace-nowrap">Vehicle</th>
                        <th class="px-2 py-2.5 whitespace-nowrap">Position</th>
                        <th class="px-2 py-2.5 whitespace-nowrap">Strength</th>
                        <th class="px-2 py-2.5 whitespace-nowrap">Category</th>
                        <th class="px-2 py-2.5 text-center whitespace-nowrap">Bundle</th>
                        <th class="px-2 py-2.5 whitespace-nowrap">Manufacturer</th>
                        <th class="px-2 py-2.5 whitespace-nowrap">Notes</th>
                        <th class="px-2.5 py-2.5 text-right whitespace-nowrap">Actions</th>
                    </tr>
                `;
            }
        }

        const filtered = this.products.filter(p => {
            // Subtab filter
            let matchesSubtab = true;
            if (this.currentProductTab === 'tires-tubes') {
                matchesSubtab = (p.product_type === 'Tire' || p.product_type === 'Tube');
            } else if (this.currentProductTab !== 'all') {
                matchesSubtab = (p.product_type === this.currentProductTab);
            }

            const num = (p.product_number || '').toLowerCase();
            const veh = (p.vehicle_name || '').toLowerCase();
            const mfg = (p.manufacturer || '').toLowerCase();
            const typ = (p.product_type || '').toLowerCase();
            const str = (p.strength || '').toLowerCase();
            const nts = (p.notes || '').toLowerCase();
            const disp = this.getProductDisplayName(p).toLowerCase();

            const matchesQuery = !query || this.matchesProductSearch(p, query);

            const matchesType = !typeFilter || p.product_type === typeFilter;
            
            // Category filter matching (handles ANT/General, DTL/Diamond, MM Venture, Nill)
            let matchesCat = true;
            if (catFilter) {
                if (catFilter === 'ANT') {
                    matchesCat = p.category === 'ANT' || p.category === 'General';
                } else if (catFilter === 'DTL') {
                    matchesCat = p.category === 'DTL' || p.category === 'Diamond';
                } else if (catFilter === 'MM Venture') {
                    matchesCat = p.category === 'MM Venture' || p.category === 'MM Venture (kmoto)';
                } else if (catFilter === 'Nill') {
                    matchesCat = p.category === 'Nill' || !p.category;
                } else {
                    matchesCat = p.category === catFilter;
                }
            }

            let images = [];
            try { images = JSON.parse(p.images || '[]'); } catch (e) { images = []; }
            const hasPhotos = Array.isArray(images) && images.length > 0;

            const matchesPhotos = !photoFilter ||
                (photoFilter === 'with-photos' && hasPhotos) ||
                (photoFilter === 'no-photos' && !hasPhotos);

            return matchesSubtab && matchesQuery && matchesType && matchesCat && matchesPhotos;
        });

        const totalItems = filtered.length;
        if (this.productTotalBadge) this.productTotalBadge.textContent = totalItems;
        if (this.sidebarProductCount) this.sidebarProductCount.textContent = this.products.length;

        if (totalItems === 0) {
            this.productTableBody.innerHTML = '';
            if (this.productEmptyState) this.productEmptyState.classList.remove('hidden');
            if (this.productsPaginationContainer) this.productsPaginationContainer.classList.add('hidden');
            return;
        }

        if (this.productEmptyState) this.productEmptyState.classList.add('hidden');
        if (this.productsPaginationContainer) this.productsPaginationContainer.classList.remove('hidden');

        // Pagination calculation (20 products per page)
        const totalPages = Math.ceil(totalItems / this.productsPageSize) || 1;
        if (this.productsCurrentPage > totalPages) this.productsCurrentPage = totalPages;
        if (this.productsCurrentPage < 1) this.productsCurrentPage = 1;

        const startIndex = (this.productsCurrentPage - 1) * this.productsPageSize;
        const endIndex = Math.min(startIndex + this.productsPageSize, totalItems);
        const paginatedProducts = filtered.slice(startIndex, endIndex);

        this.productTableBody.innerHTML = paginatedProducts.map((p, index) => {
            const rowNumber = totalItems - (startIndex + index);

            // 1. Type badge (with colors for all supported types)
            let typeBadge = '';
            if (p.product_type === 'Tire') {
                typeBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">Tire</span>`;
            } else if (p.product_type === 'Tube') {
                typeBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Tube</span>`;
            } else if (p.product_type === 'Chain') {
                typeBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">⛓️ Chain</span>`;
            } else if (p.product_type === 'Oil') {
                typeBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">🛢️ Oil</span>`;
            } else if (p.product_type === 'Rim') {
                typeBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">⚙️ Rim</span>`;
            } else if (p.product_type === 'Spoke') {
                typeBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">🚲 Spoke</span>`;
            } else if (p.product_type === 'Battery') {
                typeBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">🔋 Battery</span>`;
            } else {
                typeBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">${this.escapeHtml(p.product_type)}</span>`;
            }

            // 2. Photos thumbnail cell
            let images = [];
            try { images = JSON.parse(p.images || '[]'); } catch (e) { images = []; }
            
            let photoCell = '';
            if (Array.isArray(images) && images.length > 0) {
                const firstImg = images[0];
                const extraCount = images.length > 1 ? `<span class="absolute -bottom-1 -right-1 bg-sky-600 text-white text-[8px] font-bold px-0.5 rounded-full shadow-xs">+${images.length - 1}</span>` : '';
                photoCell = `
                    <div class="flex items-center justify-center">
                        <button type="button" data-action="view-photos" data-id="${p.id}" title="Click to view ${images.length} photo(s)" class="relative w-8 h-8 rounded-md overflow-hidden border border-gray-200 shadow-xs hover:border-sky-500 hover:scale-105 transition cursor-pointer group">
                            <img src="${firstImg}" alt="Product" class="w-full h-full object-cover">
                            ${extraCount}
                        </button>
                    </div>
                `;
            } else {
                photoCell = `
                    <div class="flex items-center justify-center text-gray-300">
                        <svg class="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                    </div>
                `;
            }

            // 3. Bundle Qty badge
            const bQty = p.bundle_qty;
            let bundleQtyDisplay = '';
            if (bQty !== null && bQty !== undefined && bQty !== '' && !isNaN(Number(bQty)) && Number(bQty) > 0) {
                const unit = (p.product_type === 'Oil') ? 'cans' : ((p.product_type === 'Spoke') ? 'sets' : 'pcs');
                bundleQtyDisplay = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 font-mono">${bQty} <span class="text-[9px] text-slate-500 font-normal ml-0.5">${unit}</span></span>`;
            } else {
                bundleQtyDisplay = `<span class="text-gray-400 italic text-xs">—</span>`;
            }

            // Check if rendering clean dedicated 7-columns table for spare parts
            if (isSpecificNonTireTab) {
                return `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="px-2.5 py-3 whitespace-nowrap text-center text-gray-400 font-mono text-xs">${rowNumber}</td>
                        <td class="px-2 py-3 whitespace-nowrap text-center">${photoCell}</td>
                        <td class="px-3 py-3">
                            <div class="font-bold text-gray-900 text-sm tracking-tight">${this.escapeHtml(p.product_number)}</div>
                        </td>
                        <td class="px-3 py-3 whitespace-nowrap font-medium text-gray-800 text-xs">${this.escapeHtml(p.vehicle_name)}</td>
                        <td class="px-3 py-3 whitespace-nowrap text-center">${bundleQtyDisplay}</td>
                        <td class="px-3 py-3 whitespace-nowrap">${typeBadge}</td>
                        <td class="px-3 py-3 whitespace-nowrap text-right space-x-2 text-xs">
                            <button type="button" data-action="edit-product" data-id="${p.id}" class="text-sky-600 hover:text-sky-800 font-bold cursor-pointer">Edit</button>
                            <button type="button" data-action="delete-product" data-id="${p.id}" class="text-red-600 hover:text-red-800 font-bold ml-1 cursor-pointer">Delete</button>
                        </td>
                    </tr>
                `;
            }

            // Full Tire & Tube & All Catalog row layout
            let catBadge = '';
            const cat = p.category || 'Nill';
            if (cat === 'ANT' || cat === 'General') {
                catBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">ANT <span class="text-[9px] text-amber-700 font-normal">(Gen)</span></span>`;
            } else if (cat === 'DTL' || cat === 'Diamond') {
                catBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">DTL <span class="text-[9px] text-sky-600 font-normal">(Dia)</span></span>`;
            } else if (cat === 'MM Venture' || cat === 'MM Venture (kmoto)') {
                catBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">MM Venture</span>`;
            } else {
                catBadge = `<span class="text-gray-400 italic text-xs">—</span>`;
            }

            const pos = p.position || 'Nill';
            let posBadge = '';
            if (pos === 'Nill' || pos === 'None' || !pos) {
                posBadge = `<span class="text-gray-400 italic text-xs">—</span>`;
            } else if (pos.includes('Front') && pos.includes('Rear')) {
                posBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">Both</span>`;
            } else if (pos === 'Front') {
                posBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">Front</span>`;
            } else if (pos === 'Rear') {
                posBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Rear</span>`;
            } else {
                posBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">${this.escapeHtml(pos)}</span>`;
            }

            const str = p.strength || 'Nill';
            let strBadge = '';
            if (str === 'Nill' || str === 'None' || !str) {
                strBadge = `<span class="text-gray-400 italic text-xs">—</span>`;
            } else {
                strBadge = `<span class="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-bold text-gray-800 font-mono">${this.escapeHtml(str)}</span>`;
            }

            const catPart = (p.category && p.category !== 'Nill' && p.category !== 'None') ? p.category : '';
            const strengthPart = (p.strength && p.strength !== 'Nill' && p.strength !== 'None') ? p.strength : '';
            const mfgPart = p.manufacturer || '';
            const fullDisplayName = this.getProductDisplayName(p);

            const displayNameCell = `
                <div class="flex items-center flex-wrap gap-1 font-sans max-w-xs" title="${this.escapeHtml(fullDisplayName)}">
                    ${catPart ? `<span class="px-1 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 font-mono">${this.escapeHtml(catPart)}</span>` : ''}
                    <span class="font-bold text-gray-900 font-mono text-xs tracking-tight">${this.escapeHtml(p.product_number)}</span>
                    ${strengthPart ? `<span class="px-1 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 font-mono">${this.escapeHtml(strengthPart)}</span>` : ''}
                    <span class="text-slate-800 font-medium text-xs">${this.escapeHtml(p.vehicle_name)}</span>
                    ${mfgPart ? `<span class="text-slate-500 text-[11px]">(${this.escapeHtml(mfgPart)})</span>` : ''}
                </div>
            `;

            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-2 py-2 whitespace-nowrap text-center text-gray-400 font-mono text-[11px]">${rowNumber}</td>
                    <td class="px-1.5 py-2 whitespace-nowrap text-center">${photoCell}</td>
                    <td class="px-2.5 py-2">${displayNameCell}</td>
                    <td class="px-2 py-2 whitespace-nowrap">${typeBadge}</td>
                    <td class="px-2 py-2 whitespace-nowrap font-bold text-gray-900 font-mono text-xs">${this.escapeHtml(p.product_number)}</td>
                    <td class="px-2 py-2 whitespace-nowrap font-medium text-gray-800 text-xs">${this.escapeHtml(p.vehicle_name)}</td>
                    <td class="px-2 py-2 whitespace-nowrap">${posBadge}</td>
                    <td class="px-2 py-2 whitespace-nowrap">${strBadge}</td>
                    <td class="px-2 py-2 whitespace-nowrap">${catBadge}</td>
                    <td class="px-2 py-2 whitespace-nowrap text-center">${bundleQtyDisplay}</td>
                    <td class="px-2 py-2 whitespace-nowrap text-gray-600 text-xs">${p.manufacturer ? this.escapeHtml(p.manufacturer) : '<span class="text-gray-400 italic">—</span>'}</td>
                    <td class="px-2 py-2 text-gray-500 text-[11px] max-w-[100px] truncate" title="${p.notes ? this.escapeHtml(p.notes) : ''}">
                        ${p.notes ? this.escapeHtml(p.notes) : '<span class="text-gray-400 italic">—</span>'}
                    </td>
                    <td class="px-2.5 py-2 whitespace-nowrap text-right space-x-1.5 text-xs">
                        <button type="button" data-action="edit-product" data-id="${p.id}" class="text-sky-600 hover:text-sky-800 font-bold cursor-pointer">Edit</button>
                        <button type="button" data-action="delete-product" data-id="${p.id}" class="text-red-600 hover:text-red-800 font-bold ml-1.5 cursor-pointer">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Render pagination controls
        this.renderPagination(totalItems, totalPages, startIndex, endIndex);

        // View Photos Click
        this.productTableBody.querySelectorAll('[data-action="view-photos"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                const product = this.products.find(p => p.id === id);
                if (product) this.openLightbox(product, 0);
            });
        });

        // Edit Product Click
        this.productTableBody.querySelectorAll('[data-action="edit-product"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                this.openEditProductModal(id);
            });
        });

        // Delete Product Click
        this.productTableBody.querySelectorAll('[data-action="delete-product"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                this.deleteProduct(id);
            });
        });
    }

    renderPagination(totalItems, totalPages, startIndex, endIndex) {
        if (!this.productsPaginationInfo || !this.productsPaginationControls) return;

        // Info text
        this.productsPaginationInfo.innerHTML = `
            Showing <strong class="text-gray-900 font-bold">${startIndex + 1}</strong> to <strong class="text-gray-900 font-bold">${endIndex}</strong> of <strong class="text-sky-700 font-bold">${totalItems}</strong> products
            <span class="text-gray-400 ml-1.5 font-normal">(Page ${this.productsCurrentPage} of ${totalPages})</span>
        `;

        // Controls
        const isFirst = this.productsCurrentPage <= 1;
        const isLast = this.productsCurrentPage >= totalPages;

        let buttonsHtml = `
            <button type="button" data-page="1" ${isFirst ? 'disabled' : ''} class="px-2 py-1 rounded border ${isFirst ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50' : 'border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer'} text-xs font-semibold transition" title="First Page">
                « First
            </button>
            <button type="button" data-page="${this.productsCurrentPage - 1}" ${isFirst ? 'disabled' : ''} class="px-2.5 py-1 rounded border ${isFirst ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50' : 'border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer'} text-xs font-semibold transition" title="Previous Page">
                ‹ Prev
            </button>
        `;

        // Page number pill buttons
        const maxPills = 5;
        let startPage = Math.max(1, this.productsCurrentPage - Math.floor(maxPills / 2));
        let endPage = Math.min(totalPages, startPage + maxPills - 1);
        if (endPage - startPage + 1 < maxPills) {
            startPage = Math.max(1, endPage - maxPills + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === this.productsCurrentPage;
            buttonsHtml += `
                <button type="button" data-page="${i}" class="w-7 h-7 rounded border text-xs font-bold transition ${isActive ? 'bg-sky-600 text-white border-sky-600 shadow-xs' : 'border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer'}">
                    ${i}
                </button>
            `;
        }

        buttonsHtml += `
            <button type="button" data-page="${this.productsCurrentPage + 1}" ${isLast ? 'disabled' : ''} class="px-2.5 py-1 rounded border ${isLast ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50' : 'border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer'} text-xs font-semibold transition" title="Next Page">
                Next ›
            </button>
            <button type="button" data-page="${totalPages}" ${isLast ? 'disabled' : ''} class="px-2 py-1 rounded border ${isLast ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50' : 'border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer'} text-xs font-semibold transition" title="Last Page">
                Last »
            </button>
        `;

        this.productsPaginationControls.innerHTML = buttonsHtml;

        // Attach event listeners
        this.productsPaginationControls.querySelectorAll('button[data-page]').forEach(btn => {
            if (!btn.hasAttribute('disabled')) {
                btn.addEventListener('click', () => {
                    const page = parseInt(btn.getAttribute('data-page'), 10);
                    if (!isNaN(page) && page >= 1 && page <= totalPages && page !== this.productsCurrentPage) {
                        this.productsCurrentPage = page;
                        this.renderProductsTable();
                    }
                });
            }
        });
    }

    openAddProductModal() {
        this.editingProductId = null;
        this.currentProductImages = [];
        this.renderProductImagePreviews();

        if (this.productForm) this.productForm.reset();
        if (this.productModalTitle) this.productModalTitle.textContent = 'Add New Product';
        const saveBtn = document.getElementById('btn-save-product');
        if (saveBtn) saveBtn.textContent = 'Save Product';

        if (this.customTypeContainer) this.customTypeContainer.classList.add('hidden');
        if (this.customTypeInput) this.customTypeInput.required = false;

        // Pre-select product type based on active subtab
        const supportedTypes = ['Chain', 'Oil', 'Rim', 'Spoke', 'Battery', 'Tire', 'Tube'];
        if (supportedTypes.includes(this.currentProductTab)) {
            if (this.typeSelect) this.typeSelect.value = this.currentProductTab;
        } else {
            if (this.typeSelect) this.typeSelect.value = 'Tire';
        }

        const activeType = this.typeSelect ? this.typeSelect.value : 'Tire';
        this.updateProductFormFieldsForType(activeType);

        // Default radio to ANT
        if (this.productForm) {
            const antRadio = this.productForm.querySelector('input[name="product_category"][value="ANT"]');
            if (antRadio) antRadio.checked = true;
        }

        // Default Position & Strength
        if (this.positionSelect) this.positionSelect.value = 'Nill';
        if (this.strengthSelect) this.strengthSelect.value = '4P';

        if (this.bundleQtyInput) {
            if (activeType === 'Tire') this.bundleQtyInput.value = '10';
            else if (activeType === 'Tube') this.bundleQtyInput.value = '50';
            else if (activeType === 'Chain') this.bundleQtyInput.value = '10';
            else if (activeType === 'Oil') this.bundleQtyInput.value = '24';
            else if (activeType === 'Rim') this.bundleQtyInput.value = '10';
            else if (activeType === 'Spoke') this.bundleQtyInput.value = '50';
            else if (activeType === 'Battery') this.bundleQtyInput.value = '10';
            else this.bundleQtyInput.value = '10';
        }

        if (this.manufacturerInput) this.manufacturerInput.value = '';
        if (this.notesInput) this.notesInput.value = '';
        this.showProductModal();
        if (this.numberInput) this.numberInput.focus();
    }

    openEditProductModal(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) return;

        this.editingProductId = id;

        // Load existing images
        try {
            this.currentProductImages = JSON.parse(product.images || '[]');
            if (!Array.isArray(this.currentProductImages)) this.currentProductImages = [];
        } catch (e) {
            this.currentProductImages = [];
        }
        this.renderProductImagePreviews();

        if (this.productModalTitle) this.productModalTitle.textContent = 'Edit Product';
        const saveBtn = document.getElementById('btn-save-product');
        if (saveBtn) saveBtn.textContent = 'Update Product';

        // Product Type
        const standardTypes = ['Tire', 'Tube', 'Chain', 'Oil', 'Rim', 'Spoke', 'Battery'];
        if (standardTypes.includes(product.product_type)) {
            if (this.typeSelect) this.typeSelect.value = product.product_type;
            if (this.customTypeContainer) this.customTypeContainer.classList.add('hidden');
            if (this.customTypeInput) this.customTypeInput.required = false;
        } else {
            if (this.typeSelect) this.typeSelect.value = '__custom__';
            if (this.customTypeContainer) this.customTypeContainer.classList.remove('hidden');
            if (this.customTypeInput) {
                this.customTypeInput.value = product.product_type;
                this.customTypeInput.required = true;
            }
        }

        this.updateProductFormFieldsForType(product.product_type);

        if (this.numberInput) this.numberInput.value = product.product_number;
        if (this.vehicleInput) this.vehicleInput.value = product.vehicle_name;
        
        // Position
        if (this.positionSelect) {
            this.positionSelect.value = product.position || 'Nill';
        }

        // Strength
        if (this.strengthSelect) {
            this.strengthSelect.value = product.strength || 'Nill';
        }

        // Category (ANT, DTL, MM Venture, Nill)
        if (this.productForm) {
            let catVal = product.category || 'Nill';
            if (catVal === 'General') catVal = 'ANT';
            if (catVal === 'Diamond') catVal = 'DTL';

            const catRadio = this.productForm.querySelector(`input[name="product_category"][value="${catVal}"]`);
            if (catRadio) {
                catRadio.checked = true;
            } else {
                const nillRadio = this.productForm.querySelector('input[name="product_category"][value="Nill"]');
                if (nillRadio) nillRadio.checked = true;
            }
        }

        if (this.bundleQtyInput) {
            this.bundleQtyInput.value = (product.bundle_qty !== null && product.bundle_qty !== undefined && product.bundle_qty !== '') ? product.bundle_qty : '';
        }
        if (this.manufacturerInput) this.manufacturerInput.value = product.manufacturer || '';
        if (this.notesInput) this.notesInput.value = product.notes || '';

        this.showProductModal();
    }

    showProductModal() {
        if (!this.productModal || !this.productModalCard) return;
        this.productModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            this.productModal.classList.remove('opacity-0');
            this.productModal.classList.add('opacity-100');
            this.productModalCard.classList.remove('scale-95');
            this.productModalCard.classList.add('scale-100');
        });
    }

    closeProductModal() {
        if (!this.productModal || !this.productModalCard) return;
        this.productModal.classList.remove('opacity-100');
        this.productModal.classList.add('opacity-0');
        this.productModalCard.classList.remove('scale-100');
        this.productModalCard.classList.add('scale-95');
        setTimeout(() => {
            this.productModal.classList.add('hidden');
        }, 150);
    }

    handleProductFormSubmit(e) {
        e.preventDefault();

        let productType = this.typeSelect.value;
        if (productType === '__custom__') {
            productType = this.customTypeInput.value.trim();
            if (!productType) {
                this.showToast('Please enter custom product type name', 'error');
                this.customTypeInput.focus();
                return;
            }
        }

        const productNumber = this.numberInput.value.trim();
        if (!productNumber) {
            this.showToast('Product name / number / size is required', 'error');
            this.numberInput.focus();
            return;
        }

        const vehicleName = this.vehicleInput.value.trim();
        if (!vehicleName) {
            this.showToast('Vehicle name is required', 'error');
            this.vehicleInput.focus();
            return;
        }

        const isTireOrTube = (productType === 'Tire' || productType === 'Tube');

        const position = (isTireOrTube && this.positionSelect) ? this.positionSelect.value : 'Nill';
        const strength = (isTireOrTube && this.strengthSelect) ? this.strengthSelect.value : 'Nill';

        const catRadio = isTireOrTube ? this.productForm.querySelector('input[name="product_category"]:checked') : null;
        const category = catRadio ? catRadio.value : 'Nill';

        let bundleQty = null;
        if (this.bundleQtyInput && this.bundleQtyInput.value.trim() !== '') {
            const parsed = parseInt(this.bundleQtyInput.value.trim(), 10);
            if (!isNaN(parsed) && parsed > 0) {
                bundleQty = parsed;
            }
        }

        const manufacturer = (isTireOrTube && this.manufacturerInput) ? this.manufacturerInput.value.trim() : '';
        const notes = (isTireOrTube && this.notesInput) ? this.notesInput.value.trim() : '';

        // Convert current product images array to JSON string
        const imagesJson = JSON.stringify(this.currentProductImages || []);

        try {
            if (this.editingProductId) {
                dbManager.run(`
                    UPDATE products SET
                        product_type = ?,
                        product_number = ?,
                        vehicle_name = ?,
                        position = ?,
                        strength = ?,
                        category = ?,
                        bundle_qty = ?,
                        manufacturer = ?,
                        notes = ?,
                        images = ?
                    WHERE id = ?
                `, [productType, productNumber, vehicleName, position, strength, category, bundleQty, manufacturer, notes, imagesJson, this.editingProductId]);

                this.showToast(`Product "${productNumber}" updated successfully!`, 'success');
            } else {
                dbManager.run(`
                    INSERT INTO products (
                        product_type, product_number, vehicle_name,
                        position, strength, category, bundle_qty, manufacturer, notes, images
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [productType, productNumber, vehicleName, position, strength, category, bundleQty, manufacturer, notes, imagesJson]);

                this.showToast(`Product "${productNumber}" added with ${this.currentProductImages.length} photo(s)!`, 'success');
            }

            this.closeProductModal();
            this.loadProducts();
        } catch (err) {
            console.error('Database save error:', err);
            this.showToast('Failed to save product: ' + err.message, 'error');
        }
    }

    deleteProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) return;

        if (confirm(`Are you sure you want to delete product "${product.product_number}" (${product.vehicle_name})?`)) {
            try {
                dbManager.run('DELETE FROM products WHERE id = ?', [id]);
                this.showToast(`Product "${product.product_number}" deleted.`, 'info');
                this.loadProducts();
            } catch (err) {
                this.showToast('Failed to delete: ' + err.message, 'error');
            }
        }
    }

    // ================= DAILY SHIFTS & SALES METHODS =================
    loadShifts() {
        try {
            this.shifts = dbManager.query(`
                SELECT 
                    s.*,
                    t.name as truck_title,
                    t.registration_number as truck_reg
                FROM daily_shifts s
                LEFT JOIN trucks t ON s.truck_id = t.id
                ORDER BY s.shift_date DESC, s.id DESC;
            `);

            this.populateShiftTruckFilterDropdown();
            this.renderShiftsTable();
            if (this.sidebarShiftCount) this.sidebarShiftCount.textContent = this.shifts.length;
        } catch (err) {
            console.warn('Error querying daily_shifts table, initializing schema:', err);
            dbManager.initDailyShiftSchema();
            this.shifts = dbManager.query('SELECT * FROM daily_shifts ORDER BY shift_date DESC, id DESC;');
            this.populateShiftTruckFilterDropdown();
            this.renderShiftsTable();
        }
    }

    populateShiftTruckFilterDropdown() {
        let trucks = [];
        let drivers = [];
        try {
            trucks = dbManager.query(`SELECT id, name, registration_number FROM trucks ORDER BY id ASC;`);
        } catch (e) {
            trucks = [];
        }
        try {
            drivers = dbManager.query(`SELECT id, name, phone FROM drivers ORDER BY id ASC;`);
        } catch (e) {
            drivers = [];
        }

        // Populate Shift List Filter Dropdown
        if (this.shiftFilterTruck) {
            const currentVal = this.shiftFilterTruck.value;
            this.shiftFilterTruck.innerHTML = '<option value="">All Trucks / Vehicles</option>' +
                trucks.map(t => `<option value="${t.id}">${this.escapeHtml(t.registration_number ? t.registration_number + ' - ' : '')}${this.escapeHtml(t.name)}</option>`).join('');
            this.shiftFilterTruck.value = currentVal;
        }

        // Populate Shift Sheet Truck Dropdown (Stored Trucks Only)
        if (this.shiftSelectTruck) {
            const currentVal = this.shiftSelectTruck.value;
            this.shiftSelectTruck.innerHTML = '<option value="">-- Choose Truck --</option>' +
                trucks.map(t => `<option value="${t.id}" data-truck-name="${this.escapeHtml(t.name)}" data-truck-reg="${this.escapeHtml(t.registration_number || '')}">${this.escapeHtml(t.registration_number ? t.registration_number + ' - ' : '')}${this.escapeHtml(t.name)}</option>`).join('');
            if (currentVal) this.shiftSelectTruck.value = currentVal;
        }

        // Populate Shift Sheet Driver Dropdown (Stored Drivers Only)
        if (this.shiftInputDriver) {
            const currentVal = this.shiftInputDriver.value;
            this.shiftInputDriver.innerHTML = '<option value="">-- Choose Driver --</option>' +
                drivers.map(d => `<option value="${this.escapeHtml(d.name)}">${this.escapeHtml(d.name)}${d.phone ? ' (' + this.escapeHtml(d.phone) + ')' : ''}</option>`).join('');
            if (currentVal) this.shiftInputDriver.value = currentVal;
        }
    }

    renderShiftsTable() {
        if (!this.shiftsTableBody) return;

        const query = (this.shiftSearchInput ? this.shiftSearchInput.value : '').trim().toLowerCase();
        const dateFilter = this.shiftFilterDate ? this.shiftFilterDate.value : '';
        const truckFilter = this.shiftFilterTruck ? this.shiftFilterTruck.value : '';
        const statusFilter = this.shiftFilterStatus ? this.shiftFilterStatus.value : '';

        const filtered = this.shifts.filter(s => {
            const code = (s.shift_code || '').toLowerCase();
            const date = (s.shift_date || '').toLowerCase();
            const truck = (s.truck_name || s.truck_title || '').toLowerCase();
            const reg = (s.truck_reg || '').toLowerCase();
            const driver = (s.driver_name || '').toLowerCase();
            const notes = (s.notes || '').toLowerCase();

            const matchesQuery = !query ||
                code.includes(query) ||
                date.includes(query) ||
                truck.includes(query) ||
                reg.includes(query) ||
                driver.includes(query) ||
                notes.includes(query);

            const matchesDate = !dateFilter || s.shift_date === dateFilter;
            const matchesTruck = !truckFilter || String(s.truck_id) === String(truckFilter);
            const matchesStatus = !statusFilter || s.status === statusFilter;

            return matchesQuery && matchesDate && matchesTruck && matchesStatus;
        });

        const totalItems = filtered.length;
        if (this.shiftTotalBadge) this.shiftTotalBadge.textContent = totalItems;

        if (totalItems === 0) {
            this.shiftsTableBody.innerHTML = '';
            if (this.shiftEmptyState) this.shiftEmptyState.classList.remove('hidden');
            if (this.shiftsPaginationContainer) this.shiftsPaginationContainer.classList.add('hidden');
            return;
        }

        if (this.shiftEmptyState) this.shiftEmptyState.classList.add('hidden');
        if (this.shiftsPaginationContainer) this.shiftsPaginationContainer.classList.remove('hidden');

        // Pagination calculations
        const totalPages = Math.ceil(totalItems / this.shiftsPageSize) || 1;
        if (this.shiftsCurrentPage > totalPages) this.shiftsCurrentPage = totalPages;
        if (this.shiftsCurrentPage < 1) this.shiftsCurrentPage = 1;

        const startIndex = (this.shiftsCurrentPage - 1) * this.shiftsPageSize;
        const endIndex = Math.min(startIndex + this.shiftsPageSize, totalItems);
        const paginatedShifts = filtered.slice(startIndex, endIndex);

        this.shiftsTableBody.innerHTML = paginatedShifts.map((s, index) => {
            const rowNumber = totalItems - (startIndex + index);
            const isCompleted = s.status === 'Completed' || s.status === 'Closed';
            const statusBadge = isCompleted
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Completed</span>`
                : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">Open Shift</span>`;

            const truckDisplay = s.truck_title ? `${s.truck_title} <span class="text-gray-400 font-mono text-[10px]">(${s.truck_reg || ''})</span>` : (s.truck_name || '—');

            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-2 py-3 whitespace-nowrap text-center text-gray-400 font-mono text-[11px]">${rowNumber}</td>
                    
                    <!-- Shift Code -->
                    <td class="px-3 py-3 whitespace-nowrap font-bold text-sky-800 font-mono text-xs">
                        <span class="bg-sky-50 px-2 py-1 rounded border border-sky-200">${this.escapeHtml(s.shift_code || ('SH-' + s.id))}</span>
                    </td>

                    <!-- Date -->
                    <td class="px-3 py-3 whitespace-nowrap font-semibold text-gray-800 font-mono text-xs">${this.escapeHtml(s.shift_date)}</td>

                    <!-- Truck / Vehicle -->
                    <td class="px-3 py-3 whitespace-nowrap font-bold text-gray-900">${truckDisplay}</td>

                    <!-- Driver Name -->
                    <td class="px-3 py-3 whitespace-nowrap font-medium text-gray-700">${s.driver_name ? this.escapeHtml(s.driver_name) : '<span class="text-gray-400 italic">—</span>'}</td>

                    <!-- Total Dispatch Qty -->
                    <td class="px-3 py-3 whitespace-nowrap text-center">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono">
                            ${s.total_dispatch || 0} <span class="text-[10px] text-indigo-500 font-normal ml-0.5">pcs</span>
                        </span>
                    </td>

                    <!-- Total Sales Qty -->
                    <td class="px-3 py-3 whitespace-nowrap text-center">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                            ${s.total_sales || 0} <span class="text-[10px] text-emerald-500 font-normal ml-0.5">pcs</span>
                        </span>
                    </td>

                    <!-- Return After Sale -->
                    <td class="px-3 py-3 whitespace-nowrap text-center">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 font-mono">
                            ${s.total_return || 0} <span class="text-[10px] text-amber-700 font-normal ml-0.5">pcs</span>
                        </span>
                    </td>

                    <!-- Status -->
                    <td class="px-3 py-3 whitespace-nowrap text-center">${statusBadge}</td>

                    <!-- Actions -->
                    <td class="px-3 py-3 whitespace-nowrap text-right space-x-1.5 text-xs">
                        <a href="report-preview.html?id=${s.id}" target="_blank" data-action="preview-shift" data-id="${s.id}" class="inline-flex items-center text-indigo-700 hover:text-indigo-900 font-bold px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer" title="Preview report in new tab">
                            <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                            </svg>
                            Preview ↗
                        </a>
                        <button type="button" data-action="edit-shift" data-id="${s.id}" class="inline-flex items-center text-sky-600 hover:text-sky-800 font-bold px-2.5 py-1 rounded hover:bg-sky-50 transition cursor-pointer" title="Open sheet to edit or enter sales">
                            <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            ${isCompleted ? 'Edit' : 'Open Sheet'}
                        </button>
                        ${!isCompleted ? `
                        <button type="button" data-action="quick-close-shift" data-id="${s.id}" class="inline-flex items-center text-emerald-700 hover:text-emerald-900 font-bold px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer" title="Close and finalize shift report for today">
                            <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            Close Shift
                        </button>
                        ` : `
                        <button type="button" data-action="quick-reopen-shift" data-id="${s.id}" class="inline-flex items-center text-amber-700 hover:text-amber-900 font-bold px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer" title="Reopen this shift report">
                            Reopen
                        </button>
                        `}
                        <button type="button" data-action="delete-shift" data-id="${s.id}" class="text-red-600 hover:text-red-800 font-bold px-2 py-1 rounded hover:bg-red-50 transition ml-0.5 cursor-pointer" title="Delete shift report">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.renderShiftsPagination(totalItems, totalPages, startIndex, endIndex);

        // Preview Shift click
        this.shiftsTableBody.querySelectorAll('[data-action="preview-shift"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                this.openPreviewShiftModal(id);
            });
        });

        // Edit Shift click
        this.shiftsTableBody.querySelectorAll('[data-action="edit-shift"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                this.openEditShiftSheet(id);
            });
        });

        // Quick Close Shift click
        this.shiftsTableBody.querySelectorAll('[data-action="quick-close-shift"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                this.quickCloseShift(id);
            });
        });

        // Quick Reopen Shift click
        this.shiftsTableBody.querySelectorAll('[data-action="quick-reopen-shift"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                this.quickReopenShift(id);
            });
        });

        // Delete Shift click
        this.shiftsTableBody.querySelectorAll('[data-action="delete-shift"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                this.deleteShift(id);
            });
        });
    }

    openPreviewShiftModal(shiftId) {
        if (shiftId) {
            window.open(`report-preview.html?id=${shiftId}`, '_blank');
        }
    }

    closePreviewShiftModal() {
        if (this.shiftPreviewModal) this.shiftPreviewModal.classList.add('hidden');
        this.previewingShiftId = null;
    }

    renderShiftsPagination(totalItems, totalPages, startIndex, endIndex) {
        if (!this.shiftsPaginationInfo || !this.shiftsPaginationControls) return;

        this.shiftsPaginationInfo.innerHTML = `
            Showing <strong class="text-gray-900 font-bold">${startIndex + 1}</strong> to <strong class="text-gray-900 font-bold">${endIndex}</strong> of <strong class="text-sky-700 font-bold">${totalItems}</strong> reports
            <span class="text-gray-400 ml-1.5 font-normal">(Page ${this.shiftsCurrentPage} of ${totalPages})</span>
        `;

        const isFirst = this.shiftsCurrentPage <= 1;
        const isLast = this.shiftsCurrentPage >= totalPages;

        let buttonsHtml = `
            <button type="button" data-shift-page="1" ${isFirst ? 'disabled' : ''} class="px-2 py-1 rounded border ${isFirst ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50' : 'border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer'} text-xs font-semibold transition">
                « First
            </button>
            <button type="button" data-shift-page="${this.shiftsCurrentPage - 1}" ${isFirst ? 'disabled' : ''} class="px-2.5 py-1 rounded border ${isFirst ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50' : 'border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer'} text-xs font-semibold transition">
                ‹ Prev
            </button>
        `;

        const maxPills = 5;
        let startPage = Math.max(1, this.shiftsCurrentPage - Math.floor(maxPills / 2));
        let endPage = Math.min(totalPages, startPage + maxPills - 1);
        if (endPage - startPage + 1 < maxPills) {
            startPage = Math.max(1, endPage - maxPills + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === this.shiftsCurrentPage;
            buttonsHtml += `
                <button type="button" data-shift-page="${i}" class="w-7 h-7 rounded border text-xs font-bold transition ${isActive ? 'bg-sky-600 text-white border-sky-600 shadow-xs' : 'border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer'}">
                    ${i}
                </button>
            `;
        }

        buttonsHtml += `
            <button type="button" data-shift-page="${this.shiftsCurrentPage + 1}" ${isLast ? 'disabled' : ''} class="px-2.5 py-1 rounded border ${isLast ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50' : 'border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer'} text-xs font-semibold transition">
                Next ›
            </button>
            <button type="button" data-shift-page="${totalPages}" ${isLast ? 'disabled' : ''} class="px-2 py-1 rounded border ${isLast ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50' : 'border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer'} text-xs font-semibold transition">
                Last »
            </button>
        `;

        this.shiftsPaginationControls.innerHTML = buttonsHtml;

        this.shiftsPaginationControls.querySelectorAll('button[data-shift-page]').forEach(btn => {
            if (!btn.hasAttribute('disabled')) {
                btn.addEventListener('click', () => {
                    const page = parseInt(btn.getAttribute('data-shift-page'), 10);
                    if (!isNaN(page) && page >= 1 && page <= totalPages && page !== this.shiftsCurrentPage) {
                        this.shiftsCurrentPage = page;
                        this.renderShiftsTable();
                    }
                });
            }
        });
    }

    openNewShiftSheet() {
        this.currentShiftId = null;
        this.currentShiftItems = [];
        this.selectedShiftProduct = null;

        const today = new Date().toISOString().split('T')[0];
        const dateCompact = today.replace(/-/g, '');
        const shiftNum = String(this.shifts.length + 1).padStart(2, '0');

        if (this.shiftSheetTitle) this.shiftSheetTitle.textContent = 'New Daily Shift Report';
        if (this.shiftInputStatus) this.shiftInputStatus.value = 'Open';
        this.updateShiftSheetStatusBadge();

        this.populateShiftTruckFilterDropdown();

        if (this.shiftInputDate) this.shiftInputDate.value = today;
        if (this.shiftInputCode) this.shiftInputCode.value = `SH-${dateCompact}-${shiftNum}`;
        if (this.shiftInputNotes) this.shiftInputNotes.value = '';
        if (this.shiftProductSearch) this.shiftProductSearch.value = '';
        if (this.shiftQuickQty) this.shiftQuickQty.value = '10';

        // Reset selected product preview box
        this.renderSelectedShiftProductPreview(null);

        // Populate and auto-select first truck and driver if available
        this.populateShiftTruckFilterDropdown();
        if (this.shiftSelectTruck && this.shiftSelectTruck.options.length > 1) {
            this.shiftSelectTruck.selectedIndex = 1;
        }
        if (this.shiftInputDriver && this.shiftInputDriver.options.length > 1) {
            this.shiftInputDriver.selectedIndex = 1;
        }

        if (this.shiftListSection) this.shiftListSection.classList.add('hidden');
        if (this.shiftSheetSection) this.shiftSheetSection.classList.remove('hidden');

        this.renderShiftItemsTable();
    }

    openEditShiftSheet(shiftId) {
        const shift = this.shifts.find(s => s.id === shiftId);
        if (!shift) return;

        this.currentShiftId = shiftId;
        this.selectedShiftProduct = null;

        // Load items from database
        try {
            this.currentShiftItems = dbManager.query('SELECT * FROM shift_items WHERE shift_id = ? ORDER BY id ASC;', [shiftId]);
        } catch (e) {
            this.currentShiftItems = [];
        }

        if (this.shiftSheetTitle) this.shiftSheetTitle.textContent = `Edit Shift Sheet: ${shift.shift_code || ('SH-' + shift.id)}`;
        
        const isCompleted = shift.status === 'Completed' || shift.status === 'Closed';
        if (this.shiftInputStatus) this.shiftInputStatus.value = isCompleted ? 'Completed' : 'Open';
        this.updateShiftSheetStatusBadge();

        this.populateShiftTruckFilterDropdown();

        if (this.shiftSelectTruck) this.shiftSelectTruck.value = shift.truck_id || '';
        if (this.shiftInputDriver) this.shiftInputDriver.value = shift.driver_name || '';
        if (this.shiftInputDate) this.shiftInputDate.value = shift.shift_date || '';
        if (this.shiftInputCode) this.shiftInputCode.value = shift.shift_code || '';
        if (this.shiftInputNotes) this.shiftInputNotes.value = shift.notes || '';
        if (this.shiftProductSearch) this.shiftProductSearch.value = '';
        if (this.shiftQuickQty) this.shiftQuickQty.value = '10';

        // Reset selected product preview box
        this.renderSelectedShiftProductPreview(null);

        if (this.shiftListSection) this.shiftListSection.classList.add('hidden');
        if (this.shiftSheetSection) this.shiftSheetSection.classList.remove('hidden');

        this.renderShiftItemsTable();
    }

    updateShiftSheetStatusBadge() {
        const status = this.shiftInputStatus ? this.shiftInputStatus.value : 'Open';
        const isCompleted = status === 'Completed' || status === 'Closed';
        if (this.shiftSheetStatusBadge) {
            this.shiftSheetStatusBadge.textContent = isCompleted ? 'Completed / Closed Shift' : 'Open Shift';
            this.shiftSheetStatusBadge.className = isCompleted
                ? 'px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'px-2.5 py-1 rounded-md text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300';
        }
    }

    finalizeShiftFromPreview() {
        if (!this.previewingShiftId) return;
        const shift = this.shifts.find(s => s.id === this.previewingShiftId);
        if (!shift) return;

        if (confirm(`Are you sure you want to CLOSE & FINALIZE shift report "${shift.shift_code || ('SH-' + shift.id)}" (${shift.shift_date})?\n\nThis will mark today's shift as Completed.`)) {
            try {
                dbManager.run(`UPDATE daily_shifts SET status = 'Completed', updated_at = datetime('now', 'localtime') WHERE id = ?;`, [this.previewingShiftId]);
                this.showToast(`✓ Daily Shift "${shift.shift_code || ('SH-' + shift.id)}" finalized and closed!`, 'success');
                this.closePreviewShiftModal();
                this.loadShifts();
            } catch (err) {
                this.showToast('Failed to close shift: ' + err.message, 'error');
            }
        }
    }

    quickCloseShift(shiftId) {
        const shift = this.shifts.find(s => s.id === shiftId);
        if (!shift) return;

        if (confirm(`Are you sure you want to CLOSE & FINALIZE shift report "${shift.shift_code || ('SH-' + shift.id)}" (${shift.shift_date})?\n\nThis will mark today's shift as Completed.`)) {
            try {
                dbManager.run(`UPDATE daily_shifts SET status = 'Completed', updated_at = datetime('now', 'localtime') WHERE id = ?;`, [shiftId]);
                this.showToast(`✓ Daily Shift "${shift.shift_code || ('SH-' + shift.id)}" finalized and closed!`, 'success');
                this.loadShifts();
            } catch (err) {
                this.showToast('Failed to close shift: ' + err.message, 'error');
            }
        }
    }

    quickReopenShift(shiftId) {
        const shift = this.shifts.find(s => s.id === shiftId);
        if (!shift) return;

        if (confirm(`Reopen shift report "${shift.shift_code || ('SH-' + shift.id)}" (${shift.shift_date})?`)) {
            try {
                dbManager.run(`UPDATE daily_shifts SET status = 'Open', updated_at = datetime('now', 'localtime') WHERE id = ?;`, [shiftId]);
                this.showToast(`Daily Shift "${shift.shift_code || ('SH-' + shift.id)}" reopened.`, 'info');
                this.loadShifts();
            } catch (err) {
                this.showToast('Failed to reopen shift: ' + err.message, 'error');
            }
        }
    }

    closeShiftSheetView() {
        if (this.shiftSheetSection) this.shiftSheetSection.classList.add('hidden');
        if (this.shiftListSection) this.shiftListSection.classList.remove('hidden');
        this.loadShifts();
    }

    renderSelectedShiftProductPreview(product) {
        if (!this.shiftSelectedProductPreview) return;

        if (!product) {
            this.shiftSelectedProductPreview.innerHTML = `
                <div class="w-full h-[360px] sm:h-[400px] md:h-[420px] rounded-2xl bg-slate-50 border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                    <div class="w-20 h-20 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
                        <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <h4 class="text-sm font-extrabold text-gray-700 uppercase tracking-wider">All Product Photos Showcase</h4>
                    <p class="text-xs text-gray-500 max-w-sm mt-1">Search or select any product on the left to inspect all of its uploaded photos, tread patterns, brand, and strength.</p>
                </div>
            `;
            return;
        }

        let images = [];
        try { images = JSON.parse(product.images || '[]'); } catch (e) { images = []; }
        const hasImages = Array.isArray(images) && images.length > 0;
        const displayName = this.getProductDisplayName(product);

        let photosHtml = '';
        if (hasImages) {
            let gridClasses = 'grid-cols-1';
            let imgHeight = 'h-[360px] sm:h-[400px]';

            if (images.length === 2) {
                gridClasses = 'grid-cols-1 sm:grid-cols-2';
                imgHeight = 'h-[280px] sm:h-[340px]';
            } else if (images.length === 3) {
                gridClasses = 'grid-cols-1 sm:grid-cols-3';
                imgHeight = 'h-[240px] sm:h-[290px]';
            } else if (images.length >= 4) {
                gridClasses = 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4';
                imgHeight = 'h-[200px] sm:h-[250px]';
            }

            const cardsHtml = images.map((imgSrc, idx) => `
                <div class="relative group rounded-2xl border-2 border-indigo-200 overflow-hidden bg-slate-950/5 shadow-md flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-indigo-500 ${imgHeight}" data-showcase-idx="${idx}" title="Click Photo ${idx + 1} to Zoom Fullscreen">
                    <img src="${imgSrc}" alt="${this.escapeHtml(displayName)} - Photo ${idx + 1}" class="w-full h-full object-contain p-2 rounded-xl group-hover:scale-105 transition-transform duration-300">
                    
                    <!-- Photo Number Tag -->
                    <div class="absolute top-2.5 left-2.5 bg-slate-900/85 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg backdrop-blur-sm shadow-xs flex items-center space-x-1.5">
                        <svg class="w-3 h-3 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        <span>Photo ${idx + 1} of ${images.length}</span>
                    </div>

                    <!-- Hover Zoom Overlay -->
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center text-white text-xs font-bold space-x-1.5 backdrop-blur-[1px]">
                        <svg class="w-4 h-4 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
                        </svg>
                        <span>Click to Enlarge</span>
                    </div>
                </div>
            `).join('');

            photosHtml = `
                <div class="space-y-2.5">
                    <div class="flex items-center justify-between text-xs text-indigo-950 font-bold bg-indigo-50/80 px-3.5 py-2 rounded-xl border border-indigo-200">
                        <span class="flex items-center">
                            <svg class="w-4 h-4 mr-1.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            All ${images.length} Uploaded Photos of this Product
                        </span>
                        <span class="text-[11px] text-indigo-600 font-semibold">🔍 Click any photo for Fullscreen Zoom</span>
                    </div>
                    <div class="grid ${gridClasses} gap-3">
                        ${cardsHtml}
                    </div>
                </div>
            `;
        } else {
            photosHtml = `
                <div class="w-full h-[320px] rounded-2xl bg-slate-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                    <svg class="w-16 h-16 mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span class="text-sm font-bold uppercase text-gray-500">No Photos Uploaded</span>
                    <span class="text-xs text-gray-400 mt-1">You can upload photos for this product in the Products tab</span>
                </div>
            `;
        }

        const categoryBadge = product.category ? `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-100 text-sky-900 border border-sky-300">Category: ${this.escapeHtml(product.category)}</span>` : '';
        const bundleBadge = product.bundle_qty ? `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-300 font-mono">📦 Bundle: ${product.bundle_qty} pcs</span>` : '';
        const typeBadge = `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">Type: ${this.escapeHtml(product.product_type)}</span>`;
        const strengthBadge = product.strength && product.strength !== 'Nill' ? `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">Strength: ${this.escapeHtml(product.strength)}</span>` : '';
        const vehicleBadge = product.vehicle_name ? `<span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">Vehicle: ${this.escapeHtml(product.vehicle_name)}</span>` : '';
        const mfgBadge = product.manufacturer ? `<span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">Brand: ${this.escapeHtml(product.manufacturer)}</span>` : '';

        this.shiftSelectedProductPreview.innerHTML = `
            <div class="w-full space-y-3">
                <!-- Top Header: Display Name & Badges -->
                <div class="border-b border-gray-100 pb-2.5">
                    <div class="text-[10px] uppercase font-bold text-sky-600 tracking-wider">Active Selected Product:</div>
                    <h4 class="text-base sm:text-lg font-extrabold text-slate-900 leading-snug" title="${this.escapeHtml(displayName)}">
                        ${this.escapeHtml(displayName)}
                    </h4>
                    <div class="flex flex-wrap items-center gap-1.5 mt-2">
                        ${categoryBadge}
                        ${typeBadge}
                        ${strengthBadge}
                        ${bundleBadge}
                        ${vehicleBadge}
                        ${mfgBadge}
                    </div>
                </div>

                <!-- ALL Images Showcase Container -->
                <div>
                    ${photosHtml}
                </div>
            </div>
        `;

        if (hasImages) {
            // Attach click event to each photo card to open Lightbox at that image index
            this.shiftSelectedProductPreview.querySelectorAll('[data-showcase-idx]').forEach(el => {
                el.addEventListener('click', () => {
                    const idx = parseInt(el.getAttribute('data-showcase-idx'), 10) || 0;
                    this.openLightbox(product, idx);
                });
            });
        }
    }

    handleShiftProductSearch(query) {
        if (!this.shiftProductDropdown) return;
        const q = (query || '').trim().toLowerCase();

        if (!q) {
            this.shiftProductDropdown.classList.add('hidden');
            this.shiftProductDropdown.innerHTML = '';
            this.selectedShiftProduct = null;
            this.renderSelectedShiftProductPreview(null);
            return;
        }

        const matches = this.products.filter(p => this.matchesProductSearch(p, q)).slice(0, 10);

        if (matches.length === 0) {
            this.shiftProductDropdown.innerHTML = `<div class="p-3 text-xs text-gray-500 italic text-center">No matching products found</div>`;
            this.shiftProductDropdown.classList.remove('hidden');
            this.selectedShiftProduct = null;
            this.renderSelectedShiftProductPreview(null);
            return;
        }

        this.shiftProductDropdown.innerHTML = matches.map(p => {
            const fullDisp = this.getProductDisplayName(p);
            const bundleInfo = p.bundle_qty ? `<span class="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-bold">${p.bundle_qty} pcs/bdl</span>` : '';
            const catInfo = p.category ? `<span class="text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded font-bold">${this.escapeHtml(p.category)}</span>` : '';
            
            let itemImages = [];
            try { itemImages = JSON.parse(p.images || '[]'); } catch (e) { itemImages = []; }
            const hasImg = Array.isArray(itemImages) && itemImages.length > 0;
            const thumbImg = hasImg
                ? `<img src="${itemImages[0]}" alt="${this.escapeHtml(fullDisp)}" class="w-9 h-9 rounded-lg object-cover border border-gray-200 shrink-0">`
                : `<div class="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>`;

            return `
                <button type="button" data-product-id="${p.id}" class="w-full text-left px-3.5 py-2.5 hover:bg-sky-50 transition flex items-center justify-between group cursor-pointer">
                    <div class="flex items-center space-x-3 min-w-0">
                        ${thumbImg}
                        <div class="min-w-0">
                            <div class="font-bold text-gray-900 text-xs group-hover:text-sky-700 truncate">${this.escapeHtml(fullDisp)}</div>
                            <div class="text-[10px] text-gray-500">${this.escapeHtml(p.product_type)} | ${this.escapeHtml(p.strength || 'Nill')}</div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-1.5 shrink-0 ml-2">
                        ${catInfo}
                        ${bundleInfo}
                    </div>
                </button>
            `;
        }).join('');

        this.shiftProductDropdown.classList.remove('hidden');

        // Automatically set first match as active selection and show preview immediately
        this.selectedShiftProduct = matches[0];
        this.renderSelectedShiftProductPreview(matches[0]);
        if (matches[0].bundle_qty && this.shiftQuickQty) {
            this.shiftQuickQty.value = matches[0].bundle_qty;
        }

        // Attach click listener on dropdown items
        this.shiftProductDropdown.querySelectorAll('button[data-product-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-product-id'), 10);
                const prod = this.products.find(p => p.id === id);
                if (prod) {
                    this.selectedShiftProduct = prod;
                    if (this.shiftProductSearch) this.shiftProductSearch.value = this.getProductDisplayName(prod);
                    if (prod.bundle_qty && this.shiftQuickQty) this.shiftQuickQty.value = prod.bundle_qty;
                    this.renderSelectedShiftProductPreview(prod);
                    this.shiftProductDropdown.classList.add('hidden');
                }
            });
        });
    }

    addProductToCurrentShift(product, dispatchQty) {
        if (!product) return;
        const displayName = this.getProductDisplayName(product);
        const qty = parseInt(dispatchQty, 10) || 10;

        // Check if already in current sheet
        const existing = this.currentShiftItems.find(item => item.product_id === product.id);
        if (existing) {
            existing.dispatch_qty += qty;
            const saleVal = (existing.sale_qty !== null && existing.sale_qty !== undefined && existing.sale_qty !== '') ? parseInt(existing.sale_qty, 10) : 0;
            existing.return_qty = Math.max(0, existing.dispatch_qty - saleVal);
            this.showToast(`Updated dispatch qty to ${existing.dispatch_qty} for ${displayName}`, 'info');
        } else {
            this.currentShiftItems.push({
                product_id: product.id,
                display_name: displayName,
                dispatch_qty: qty,
                sale_qty: null,
                return_qty: qty
            });
            this.showToast(`Added "${displayName}" with ${qty} pcs to shift!`, 'success');
        }

        if (this.shiftProductSearch) this.shiftProductSearch.value = '';
        if (this.shiftProductDropdown) this.shiftProductDropdown.classList.add('hidden');
        this.selectedShiftProduct = null;
        this.renderSelectedShiftProductPreview(null);

        this.renderShiftItemsTable();
        if (this.shiftProductSearch) this.shiftProductSearch.focus();
    }

    removeShiftItem(index) {
        if (index >= 0 && index < this.currentShiftItems.length) {
            const item = this.currentShiftItems[index];
            this.currentShiftItems.splice(index, 1);
            this.showToast(`Removed "${item.display_name}" from sheet`, 'info');
            this.renderShiftItemsTable();
        }
    }

    renderShiftItemsTable() {
        if (!this.shiftItemsTbody) return;

        if (this.currentShiftItems.length === 0) {
            this.shiftItemsTbody.innerHTML = '';
            if (this.shiftItemsEmpty) this.shiftItemsEmpty.classList.remove('hidden');
            this.updateShiftSummaryTotals();
            return;
        }

        if (this.shiftItemsEmpty) this.shiftItemsEmpty.classList.add('hidden');

        this.shiftItemsTbody.innerHTML = this.currentShiftItems.map((item, idx) => {
            const dispatch = item.dispatch_qty || 0;
            const sale = (item.sale_qty !== null && item.sale_qty !== undefined && item.sale_qty !== '') ? parseInt(item.sale_qty, 10) : null;
            const saleNum = sale !== null ? sale : 0;
            const returnQty = Math.max(0, dispatch - saleNum);
            const isMismatch = sale !== null && sale > dispatch;

            const prod = this.products.find(p => p.id === item.product_id);
            let rowImages = [];
            if (prod) {
                try { rowImages = JSON.parse(prod.images || '[]'); } catch (e) { rowImages = []; }
            }
            const hasRowImg = Array.isArray(rowImages) && rowImages.length > 0;
            const rowThumb = hasRowImg
                ? `<div class="relative w-8 h-8 rounded-lg border border-gray-200 overflow-hidden bg-slate-100 shrink-0 cursor-pointer hover:opacity-80 transition" data-shift-prod-id="${item.product_id}">
                        <img src="${rowImages[0]}" alt="${this.escapeHtml(item.display_name)}" class="w-full h-full object-cover">
                    </div>`
                : `<div class="w-8 h-8 rounded-lg bg-slate-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                        <svg class="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                    </div>`;

            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-3 py-3 text-center text-gray-400 font-mono text-xs">${idx + 1}</td>
                    
                    <!-- Product Display Name & Thumbnail -->
                    <td class="px-4 py-3">
                        <div class="flex items-center space-x-2.5">
                            ${rowThumb}
                            <div class="font-bold text-gray-900 text-xs tracking-tight">${this.escapeHtml(item.display_name)}</div>
                        </div>
                    </td>

                    <!-- Dispatch Goods Quantity (Editable input) -->
                    <td class="px-4 py-2.5 text-center bg-indigo-50/30">
                        <div class="inline-flex items-center justify-center">
                            <input type="number" min="0" step="1" data-field="dispatch" data-idx="${idx}" value="${dispatch}" class="shift-dispatch-input w-24 px-2 py-1.5 border border-indigo-200 rounded-lg text-xs font-bold text-center font-mono text-indigo-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs">
                            <span class="text-[11px] text-indigo-600 font-medium ml-1.5">pcs</span>
                        </div>
                    </td>

                    <!-- Sales Quantity (Editable spot input, default empty) -->
                    <td class="px-4 py-2.5 text-center bg-emerald-50/30">
                        <div class="inline-flex items-center justify-center">
                            <input type="number" min="0" step="1" data-field="sale" data-idx="${idx}" value="${sale !== null ? sale : ''}" placeholder="— (empty)" class="shift-sale-input w-24 px-2 py-1.5 border border-emerald-300 rounded-lg text-xs font-bold text-center font-mono text-emerald-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs">
                            <span class="text-[11px] text-emerald-600 font-medium ml-1.5">pcs</span>
                        </div>
                    </td>

                    <!-- Return After Sale (Auto Computed: Dispatch - Sale) -->
                    <td class="px-4 py-2.5 text-center bg-amber-50/30">
                        <div class="inline-flex items-center justify-center">
                            <span id="shift-return-badge-${idx}" class="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold ${isMismatch ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-amber-100 text-amber-900 border border-amber-300'} font-mono">
                                ${returnQty} <span class="text-[10px] text-amber-700 font-normal ml-0.5">pcs</span>
                            </span>
                            ${isMismatch ? '<span class="text-[10px] text-red-600 font-bold ml-1.5" title="Sale exceeds morning dispatch!">⚠️ Mismatch</span>' : ''}
                        </div>
                    </td>

                    <!-- Remove Item -->
                    <td class="px-3 py-2.5 text-center">
                        <button type="button" data-action="remove-item" data-idx="${idx}" class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition" title="Remove Product">
                            <svg class="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach thumbnail click to open lightbox
        this.shiftItemsTbody.querySelectorAll('[data-shift-prod-id]').forEach(el => {
            el.addEventListener('click', () => {
                const prodId = parseInt(el.getAttribute('data-shift-prod-id'), 10);
                const p = this.products.find(item => item.id === prodId);
                if (p) this.openLightbox(p, 0);
            });
        });

        // Attach live input listeners for dispatch and sale
        this.shiftItemsTbody.querySelectorAll('input[data-field]').forEach(input => {
            input.addEventListener('input', () => {
                const idx = parseInt(input.getAttribute('data-idx'), 10);
                const field = input.getAttribute('data-field');
                const val = input.value.trim();

                if (field === 'dispatch') {
                    this.currentShiftItems[idx].dispatch_qty = val !== '' ? (parseInt(val, 10) || 0) : 0;
                } else if (field === 'sale') {
                    this.currentShiftItems[idx].sale_qty = val !== '' ? (parseInt(val, 10) || 0) : null;
                }

                const dispVal = this.currentShiftItems[idx].dispatch_qty || 0;
                const saleVal = this.currentShiftItems[idx].sale_qty !== null ? this.currentShiftItems[idx].sale_qty : 0;
                const retVal = Math.max(0, dispVal - saleVal);
                this.currentShiftItems[idx].return_qty = retVal;

                // Update return cell badge in-place
                const returnBadge = document.getElementById(`shift-return-badge-${idx}`);
                if (returnBadge) {
                    returnBadge.innerHTML = `${retVal} <span class="text-[10px] text-amber-700 font-normal ml-0.5">pcs</span>`;
                }

                this.updateShiftSummaryTotals();
            });
        });

        // Attach remove item clicks
        this.shiftItemsTbody.querySelectorAll('[data-action="remove-item"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-idx'), 10);
                this.removeShiftItem(idx);
            });
        });

        this.updateShiftSummaryTotals();
    }

    updateShiftSummaryTotals() {
        let totalDispatch = 0;
        let totalSales = 0;
        let totalReturn = 0;

        this.currentShiftItems.forEach(item => {
            const d = item.dispatch_qty || 0;
            const s = (item.sale_qty !== null && item.sale_qty !== undefined && item.sale_qty !== '') ? parseInt(item.sale_qty, 10) : 0;
            totalDispatch += d;
            totalSales += s;
            totalReturn += Math.max(0, d - s);
        });

        if (this.shiftSummaryItems) this.shiftSummaryItems.textContent = this.currentShiftItems.length;
        if (this.shiftSummaryDispatch) this.shiftSummaryDispatch.textContent = totalDispatch;
        if (this.shiftSummarySales) this.shiftSummarySales.textContent = totalSales;
        if (this.shiftSummaryReturn) this.shiftSummaryReturn.textContent = totalReturn;
    }

    saveShiftSheet(isFinalize = false) {
        const truckId = this.shiftSelectTruck ? parseInt(this.shiftSelectTruck.value, 10) : null;
        if (!truckId) {
            this.showToast('Please select a truck / vehicle for this shift', 'error');
            if (this.shiftSelectTruck) this.shiftSelectTruck.focus();
            return;
        }

        const shiftDate = this.shiftInputDate ? this.shiftInputDate.value.trim() : '';
        if (!shiftDate) {
            this.showToast('Please select shift date', 'error');
            if (this.shiftInputDate) this.shiftInputDate.focus();
            return;
        }

        if (this.currentShiftItems.length === 0) {
            this.showToast('Please add at least 1 product to the shift sheet', 'error');
            if (this.shiftProductSearch) this.shiftProductSearch.focus();
            return;
        }

        const truckOpt = this.shiftSelectTruck.options[this.shiftSelectTruck.selectedIndex];
        const truckName = truckOpt ? (truckOpt.getAttribute('data-truck-name') || truckOpt.textContent.trim()) : 'Truck';
        const driverName = this.shiftInputDriver ? this.shiftInputDriver.value.trim() : '';
        if (!driverName) {
            this.showToast('Please select a driver from the system for this shift', 'error');
            if (this.shiftInputDriver) this.shiftInputDriver.focus();
            return;
        }
        const shiftCode = this.shiftInputCode ? this.shiftInputCode.value.trim() : `SH-${shiftDate.replace(/-/g, '')}-01`;
        const notes = this.shiftInputNotes ? this.shiftInputNotes.value.trim() : '';

        // Calculate totals
        let totalDispatch = 0;
        let totalSales = 0;
        let totalReturn = 0;

        this.currentShiftItems.forEach(item => {
            const d = item.dispatch_qty || 0;
            const s = (item.sale_qty !== null && item.sale_qty !== undefined && item.sale_qty !== '') ? parseInt(item.sale_qty, 10) : 0;
            totalDispatch += d;
            totalSales += s;
            totalReturn += Math.max(0, d - s);
        });

        let status = 'Open';
        if (isFinalize) {
            status = 'Completed';
            if (this.shiftInputStatus) this.shiftInputStatus.value = 'Completed';
        } else if (this.shiftInputStatus) {
            status = this.shiftInputStatus.value || 'Open';
        }

        try {
            if (this.currentShiftId) {
                // Update shift header
                dbManager.run(`
                    UPDATE daily_shifts SET
                        shift_code = ?,
                        shift_date = ?,
                        truck_id = ?,
                        truck_name = ?,
                        driver_name = ?,
                        status = ?,
                        total_dispatch = ?,
                        total_sales = ?,
                        total_return = ?,
                        notes = ?,
                        updated_at = datetime('now', 'localtime')
                    WHERE id = ?
                `, [shiftCode, shiftDate, truckId, truckName, driverName, status, totalDispatch, totalSales, totalReturn, notes, this.currentShiftId]);

                // Delete old items and insert updated items
                dbManager.run('DELETE FROM shift_items WHERE shift_id = ?', [this.currentShiftId]);

                this.currentShiftItems.forEach(item => {
                    dbManager.run(`
                        INSERT INTO shift_items (shift_id, product_id, display_name, dispatch_qty, sale_qty, return_qty)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [this.currentShiftId, item.product_id, item.display_name, item.dispatch_qty, item.sale_qty, item.return_qty]);
                });

                if (status === 'Completed') {
                    this.showToast(`✓ Daily Shift "${shiftCode}" Finalized & Closed successfully! (Din Khatam)`, 'success');
                } else {
                    this.showToast(`Daily Shift "${shiftCode}" saved as Open/In-Progress.`, 'success');
                }
            } else {
                // Insert new shift header
                const res = dbManager.run(`
                    INSERT INTO daily_shifts (
                        shift_code, shift_date, truck_id, truck_name, driver_name,
                        status, total_dispatch, total_sales, total_return, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [shiftCode, shiftDate, truckId, truckName, driverName, status, totalDispatch, totalSales, totalReturn, notes]);

                const newShiftId = res.lastInsertRowId;

                this.currentShiftItems.forEach(item => {
                    dbManager.run(`
                        INSERT INTO shift_items (shift_id, product_id, display_name, dispatch_qty, sale_qty, return_qty)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [newShiftId, item.product_id, item.display_name, item.dispatch_qty, item.sale_qty, item.return_qty]);
                });

                if (status === 'Completed') {
                    this.showToast(`✓ Daily Shift "${shiftCode}" created and Finalized as Closed!`, 'success');
                } else {
                    this.showToast(`Daily Shift "${shiftCode}" created with ${this.currentShiftItems.length} products!`, 'success');
                }
            }

            this.closeShiftSheetView();
        } catch (err) {
            console.error('Save shift error:', err);
            this.showToast('Failed to save shift report: ' + err.message, 'error');
        }
    }

    deleteShift(id) {
        const shift = this.shifts.find(s => s.id === id);
        if (!shift) return;

        if (confirm(`Are you sure you want to delete shift report "${shift.shift_code || ('SH-' + shift.id)}" (${shift.shift_date})?`)) {
            try {
                dbManager.run('DELETE FROM shift_items WHERE shift_id = ?;', [id]);
                dbManager.run('DELETE FROM daily_shifts WHERE id = ?;', [id]);
                this.showToast(`Shift report deleted.`, 'info');
                this.loadShifts();
            } catch (err) {
                this.showToast('Failed to delete shift: ' + err.message, 'error');
            }
        }
    }

    // ================= TRUCKS & DRIVERS METHODS =================
    switchSubtab(subtab) {
        this.currentSubtab = subtab;
        if (subtab === 'trucks') {
            if (this.subtabTrucksBtn) {
                this.subtabTrucksBtn.className = 'flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs bg-white text-sky-900 cursor-pointer';
            }
            if (this.subtabDriversBtn) {
                this.subtabDriversBtn.className = 'flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all text-gray-600 hover:text-gray-900 cursor-pointer';
            }
            if (this.subtabTrucksContent) this.subtabTrucksContent.classList.remove('hidden');
            if (this.subtabDriversContent) this.subtabDriversContent.classList.add('hidden');
            this.loadTrucks();
        } else {
            if (this.subtabDriversBtn) {
                this.subtabDriversBtn.className = 'flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs bg-white text-emerald-900 cursor-pointer';
            }
            if (this.subtabTrucksBtn) {
                this.subtabTrucksBtn.className = 'flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all text-gray-600 hover:text-gray-900 cursor-pointer';
            }
            if (this.subtabDriversContent) this.subtabDriversContent.classList.remove('hidden');
            if (this.subtabTrucksContent) this.subtabTrucksContent.classList.add('hidden');
            this.loadDrivers();
        }
    }

    // --- TRUCKS CRUD ---
    loadTrucks() {
        try {
            this.trucks = dbManager.query('SELECT * FROM trucks ORDER BY id DESC');
            this.renderTrucksTable();
            if (this.truckTotalBadge) this.truckTotalBadge.textContent = this.trucks.length;
            this.populateShiftTruckFilterDropdown();
        } catch (err) {
            console.warn('Error loading trucks:', err);
            dbManager.initDriversTrucksSchema();
            this.trucks = dbManager.query('SELECT * FROM trucks ORDER BY id DESC');
            this.renderTrucksTable();
            if (this.truckTotalBadge) this.truckTotalBadge.textContent = this.trucks.length;
            this.populateShiftTruckFilterDropdown();
        }
    }

    renderTrucksTable() {
        if (!this.trucksTableBody) return;

        const query = (this.truckSearchInput ? this.truckSearchInput.value : '').trim().toLowerCase();
        const filtered = this.trucks.filter(t => {
            const reg = (t.registration_number || '').toLowerCase();
            const name = (t.name || '').toLowerCase();
            return !query || reg.includes(query) || name.includes(query);
        });

        if (this.truckTotalBadge) this.truckTotalBadge.textContent = this.trucks.length;

        if (filtered.length === 0) {
            this.trucksTableBody.innerHTML = '';
            if (this.truckEmptyState) this.truckEmptyState.classList.remove('hidden');
            return;
        }

        if (this.truckEmptyState) this.truckEmptyState.classList.add('hidden');

        this.trucksTableBody.innerHTML = filtered.map((t, index) => {
            const dateStr = t.created_at ? t.created_at.split(' ')[0] : '—';
            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-4 py-3.5 text-center text-gray-400 font-mono text-xs">${filtered.length - index}</td>
                    
                    <!-- Truck Number / Plate -->
                    <td class="px-4 py-3.5 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-sky-50 text-sky-900 border border-sky-200 uppercase tracking-wide">
                            <svg class="w-3.5 h-3.5 mr-1 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
                            </svg>
                            ${this.escapeHtml(t.registration_number || 'TRK-' + t.id)}
                        </span>
                    </td>

                    <!-- Truck Name / Model -->
                    <td class="px-4 py-3.5 whitespace-nowrap">
                        <div class="font-bold text-gray-900 text-xs">${this.escapeHtml(t.name)}</div>
                    </td>

                    <!-- Date Added -->
                    <td class="px-4 py-3.5 whitespace-nowrap text-gray-500 font-mono text-xs">${this.escapeHtml(dateStr)}</td>

                    <!-- Actions -->
                    <td class="px-4 py-3.5 whitespace-nowrap text-right space-x-2">
                        <button type="button" data-action="edit-truck" data-id="${t.id}" class="text-sky-600 hover:text-sky-800 font-bold text-xs cursor-pointer">Edit</button>
                        <button type="button" data-action="delete-truck" data-id="${t.id}" class="text-red-600 hover:text-red-800 font-bold text-xs ml-2 cursor-pointer">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

        this.trucksTableBody.querySelectorAll('[data-action="edit-truck"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                this.openEditTruckModal(id);
            });
        });

        this.trucksTableBody.querySelectorAll('[data-action="delete-truck"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                this.deleteTruck(id);
            });
        });
    }

    openAddTruckModal() {
        this.editingTruckId = null;
        if (this.truckForm) this.truckForm.reset();
        if (this.formTruckId) this.formTruckId.value = '';
        if (this.truckModalTitle) this.truckModalTitle.textContent = 'Add New Truck';
        if (this.btnSaveTruck) this.btnSaveTruck.textContent = 'Save Truck';

        this.showTruckModal();
        if (this.truckRegInput) this.truckRegInput.focus();
    }

    openEditTruckModal(id) {
        const truck = this.trucks.find(t => t.id === id);
        if (!truck) return;

        this.editingTruckId = id;
        if (this.formTruckId) this.formTruckId.value = id;
        if (this.truckModalTitle) this.truckModalTitle.textContent = 'Edit Truck';
        if (this.btnSaveTruck) this.btnSaveTruck.textContent = 'Update Truck';

        if (this.truckRegInput) this.truckRegInput.value = truck.registration_number || '';
        if (this.truckNameInput) this.truckNameInput.value = truck.name || '';

        this.showTruckModal();
        if (this.truckRegInput) this.truckRegInput.focus();
    }

    showTruckModal() {
        if (!this.truckModal || !this.truckModalCard) return;
        this.truckModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            this.truckModal.classList.remove('opacity-0');
            this.truckModal.classList.add('opacity-100');
            this.truckModalCard.classList.remove('scale-95');
            this.truckModalCard.classList.add('scale-100');
        });
    }

    closeTruckModal() {
        if (!this.truckModal || !this.truckModalCard) return;
        this.truckModal.classList.remove('opacity-100');
        this.truckModal.classList.add('opacity-0');
        this.truckModalCard.classList.remove('scale-100');
        this.truckModalCard.classList.add('scale-95');
        setTimeout(() => {
            this.truckModal.classList.add('hidden');
        }, 150);
    }

    handleTruckFormSubmit(e) {
        e.preventDefault();
        const reg = (this.truckRegInput ? this.truckRegInput.value : '').trim();
        const name = (this.truckNameInput ? this.truckNameInput.value : '').trim();

        if (!reg) {
            this.showToast('Truck number / plate # is required', 'error');
            if (this.truckRegInput) this.truckRegInput.focus();
            return;
        }
        if (!name) {
            this.showToast('Truck name / model is required', 'error');
            if (this.truckNameInput) this.truckNameInput.focus();
            return;
        }

        try {
            if (this.editingTruckId) {
                dbManager.run(`
                    UPDATE trucks SET
                        registration_number = ?,
                        name = ?,
                        updated_at = datetime('now', 'localtime')
                    WHERE id = ?
                `, [reg, name, this.editingTruckId]);
                this.showToast(`Truck "${reg} - ${name}" updated successfully!`, 'success');
            } else {
                dbManager.run(`
                    INSERT INTO trucks (registration_number, name, active)
                    VALUES (?, ?, 1)
                `, [reg, name]);
                this.showToast(`Truck "${reg} - ${name}" added successfully!`, 'success');
            }

            this.closeTruckModal();
            this.loadTrucks();
            this.populateShiftTruckFilterDropdown();
        } catch (err) {
            console.error('Error saving truck:', err);
            this.showToast('Failed to save truck: ' + err.message, 'error');
        }
    }

    deleteTruck(id) {
        const truck = this.trucks.find(t => t.id === id);
        if (!truck) return;

        if (confirm(`Are you sure you want to delete truck "${truck.registration_number || truck.name}"?`)) {
            try {
                dbManager.run('DELETE FROM trucks WHERE id = ?', [id]);
                this.showToast(`Truck "${truck.registration_number || truck.name}" deleted.`, 'info');
                this.loadTrucks();
                this.populateShiftTruckFilterDropdown();
            } catch (err) {
                this.showToast('Failed to delete truck: ' + err.message, 'error');
            }
        }
    }

    // --- DRIVERS CRUD ---
    loadDrivers() {
        try {
            this.drivers = dbManager.query('SELECT * FROM drivers ORDER BY id DESC');
            this.renderDriversTable();
            if (this.driverTotalBadge) this.driverTotalBadge.textContent = this.drivers.length;
            if (this.sidebarDriverCount) this.sidebarDriverCount.textContent = this.drivers.length;
            this.populateShiftTruckFilterDropdown();
        } catch (err) {
            console.warn('Error loading drivers:', err);
            dbManager.initDriversTrucksSchema();
            this.drivers = dbManager.query('SELECT * FROM drivers ORDER BY id DESC');
            this.renderDriversTable();
            if (this.driverTotalBadge) this.driverTotalBadge.textContent = this.drivers.length;
            if (this.sidebarDriverCount) this.sidebarDriverCount.textContent = this.drivers.length;
            this.populateShiftTruckFilterDropdown();
        }
    }

    renderDriversTable() {
        if (!this.driverTableBody) return;

        const query = (this.driverSearchInput ? this.driverSearchInput.value : '').trim().toLowerCase();
        const filtered = this.drivers.filter(d => {
            const name = (d.name || '').toLowerCase();
            const phone = (d.phone || '').toLowerCase();
            return !query || name.includes(query) || phone.includes(query);
        });

        if (this.driverTotalBadge) this.driverTotalBadge.textContent = this.drivers.length;
        if (this.sidebarDriverCount) this.sidebarDriverCount.textContent = this.drivers.length;

        if (filtered.length === 0) {
            this.driverTableBody.innerHTML = '';
            if (this.driverEmptyState) this.driverEmptyState.classList.remove('hidden');
            return;
        }

        if (this.driverEmptyState) this.driverEmptyState.classList.add('hidden');

        this.driverTableBody.innerHTML = filtered.map((d, index) => {
            const dateStr = d.created_at ? d.created_at.split(' ')[0] : '—';
            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-4 py-3.5 text-center text-gray-400 font-mono text-xs">${filtered.length - index}</td>
                    
                    <!-- Driver Name with Avatar -->
                    <td class="px-4 py-3.5 whitespace-nowrap">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                                ${this.escapeHtml((d.name || 'D').substring(0, 2))}
                            </div>
                            <div class="font-bold text-gray-900 text-xs">${this.escapeHtml(d.name)}</div>
                        </div>
                    </td>

                    <!-- Phone Number -->
                    <td class="px-4 py-3.5 whitespace-nowrap font-mono text-gray-800 text-xs font-semibold">
                        <div class="flex items-center space-x-1.5">
                            <svg class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                            </svg>
                            <span>${this.escapeHtml(d.phone || '—')}</span>
                        </div>
                    </td>

                    <!-- Date Added -->
                    <td class="px-4 py-3.5 whitespace-nowrap text-gray-500 font-mono text-xs">${this.escapeHtml(dateStr)}</td>

                    <!-- Actions -->
                    <td class="px-4 py-3.5 whitespace-nowrap text-right space-x-2">
                        <button type="button" data-action="edit-driver" data-id="${d.id}" class="text-emerald-600 hover:text-emerald-800 font-bold text-xs cursor-pointer">Edit</button>
                        <button type="button" data-action="delete-driver" data-id="${d.id}" class="text-red-600 hover:text-red-800 font-bold text-xs ml-2 cursor-pointer">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

        this.driverTableBody.querySelectorAll('[data-action="edit-driver"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                this.openEditDriverModal(id);
            });
        });

        this.driverTableBody.querySelectorAll('[data-action="delete-driver"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                this.deleteDriver(id);
            });
        });
    }

    openAddDriverModal() {
        this.editingDriverId = null;
        if (this.driverForm) this.driverForm.reset();
        if (this.formDriverId) this.formDriverId.value = '';
        if (this.driverModalTitle) this.driverModalTitle.textContent = 'Add New Driver';
        if (this.btnSaveDriver) this.btnSaveDriver.textContent = 'Save Driver';

        this.showDriverModal();
        if (this.driverNameInput) this.driverNameInput.focus();
    }

    openEditDriverModal(id) {
        const driver = this.drivers.find(d => d.id === id);
        if (!driver) return;

        this.editingDriverId = id;
        if (this.formDriverId) this.formDriverId.value = id;
        if (this.driverModalTitle) this.driverModalTitle.textContent = 'Edit Driver';
        if (this.btnSaveDriver) this.btnSaveDriver.textContent = 'Update Driver';

        if (this.driverNameInput) this.driverNameInput.value = driver.name || '';
        if (this.driverPhoneInput) this.driverPhoneInput.value = driver.phone || '';

        this.showDriverModal();
        if (this.driverNameInput) this.driverNameInput.focus();
    }

    showDriverModal() {
        if (!this.driverModal || !this.driverModalCard) return;
        this.driverModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            this.driverModal.classList.remove('opacity-0');
            this.driverModal.classList.add('opacity-100');
            this.driverModalCard.classList.remove('scale-95');
            this.driverModalCard.classList.add('scale-100');
        });
    }

    closeDriverModal() {
        if (!this.driverModal || !this.driverModalCard) return;
        this.driverModal.classList.remove('opacity-100');
        this.driverModal.classList.add('opacity-0');
        this.driverModalCard.classList.remove('scale-100');
        this.driverModalCard.classList.add('scale-95');
        setTimeout(() => {
            this.driverModal.classList.add('hidden');
        }, 150);
    }

    handleDriverFormSubmit(e) {
        e.preventDefault();
        const name = (this.driverNameInput ? this.driverNameInput.value : '').trim();
        const phone = (this.driverPhoneInput ? this.driverPhoneInput.value : '').trim();

        if (!name) {
            this.showToast('Driver name is required', 'error');
            if (this.driverNameInput) this.driverNameInput.focus();
            return;
        }

        try {
            if (this.editingDriverId) {
                dbManager.run(`
                    UPDATE drivers SET
                        name = ?,
                        phone = ?,
                        updated_at = datetime('now', 'localtime')
                    WHERE id = ?
                `, [name, phone, this.editingDriverId]);
                this.showToast(`Driver "${name}" updated successfully!`, 'success');
            } else {
                dbManager.run(`
                    INSERT INTO drivers (name, phone, active)
                    VALUES (?, ?, 1)
                `, [name, phone]);
                this.showToast(`Driver "${name}" added successfully!`, 'success');
            }

            this.closeDriverModal();
            this.loadDrivers();
            this.populateShiftTruckFilterDropdown();
        } catch (err) {
            console.error('Error saving driver:', err);
            this.showToast('Failed to save driver: ' + err.message, 'error');
        }
    }

    deleteDriver(id) {
        const driver = this.drivers.find(d => d.id === id);
        if (!driver) return;

        if (confirm(`Are you sure you want to delete driver "${driver.name}"?`)) {
            try {
                dbManager.run('DELETE FROM drivers WHERE id = ?', [id]);
                this.showToast(`Driver "${driver.name}" deleted.`, 'info');
                this.loadDrivers();
                this.populateShiftTruckFilterDropdown();
            } catch (err) {
                this.showToast('Failed to delete driver: ' + err.message, 'error');
            }
        }
    }

    // ================= WARRANTY CLAIMS & RETURNS METHODS =================

    async loadClaims() {
        try {
            this.claims = dbManager.query(`
                SELECT 
                    c.*,
                    d.name as live_driver_name,
                    t.name as live_truck_name
                FROM claims c
                LEFT JOIN drivers d ON c.driver_id = d.id
                LEFT JOIN trucks t ON c.truck_id = t.id
                ORDER BY c.claim_date DESC, c.id DESC;
            `);

            if (this.sidebarClaimCount) {
                this.sidebarClaimCount.textContent = this.claims.length;
            }

            this.populateClaimFilterDrivers();
            this.populateClaimPrintDrivers();
            this.renderDailyClaimsLog();
            this.applyCompanySummaryFilters();
        } catch (err) {
            console.error('Error loading claims:', err);
        }
    }

    switchClaimsSubtab(tab) {
        this.claimsSubtab = tab;
        if (tab === 'summary') {
            if (this.tabBtnClaimLog) {
                this.tabBtnClaimLog.className = 'px-4 py-2 rounded-lg font-bold text-xs transition flex items-center space-x-2 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 cursor-pointer';
            }
            if (this.tabBtnClaimSummary) {
                this.tabBtnClaimSummary.className = 'px-4 py-2 rounded-lg font-bold text-xs transition flex items-center space-x-1.5 bg-sky-600 text-white shadow-xs cursor-pointer';
            }
            if (this.containerClaimsLogTable) this.containerClaimsLogTable.classList.add('hidden');
            if (this.containerClaimsSummaryTable) this.containerClaimsSummaryTable.classList.remove('hidden');
            this.applyCompanySummaryFilters();
        } else {
            if (this.tabBtnClaimLog) {
                this.tabBtnClaimLog.className = 'px-4 py-2 rounded-lg font-bold text-xs transition flex items-center space-x-2 bg-sky-600 text-white shadow-xs cursor-pointer';
            }
            if (this.tabBtnClaimSummary) {
                this.tabBtnClaimSummary.className = 'px-4 py-2 rounded-lg font-bold text-xs transition flex items-center space-x-1.5 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 cursor-pointer';
            }
            if (this.containerClaimsSummaryTable) this.containerClaimsSummaryTable.classList.add('hidden');
            if (this.containerClaimsLogTable) this.containerClaimsLogTable.classList.remove('hidden');
            this.renderDailyClaimsLog();
        }
    }

    renderDailyClaimsLog() {
        const allClaims = this.claims || [];
        const latestDate = allClaims.length > 0 ? allClaims[0].claim_date : null;
        const latestClaims = latestDate ? allClaims.filter(c => c.claim_date === latestDate) : [];

        if (this.badgeClaimsTableCount) {
            this.badgeClaimsTableCount.textContent = latestClaims.length;
        }

        if (latestDate && latestClaims.length > 0) {
            const formattedDate = this.formatDate(latestDate);
            if (this.claimLatestDateBadge) this.claimLatestDateBadge.textContent = formattedDate;
            if (this.claimsLogDateLabel) this.claimsLogDateLabel.textContent = formattedDate;

            let latestDayPcs = 0;
            latestClaims.forEach(c => {
                latestDayPcs += (parseInt(c.total_items, 10) || 0);
            });

            if (this.claimLatestTotalPcs) this.claimLatestTotalPcs.textContent = this.formatNumber(latestDayPcs);
            if (this.claimLatestTotalRecords) this.claimLatestTotalRecords.textContent = latestClaims.length;

            // Group driver totals on the latest date
            if (this.claimsLatestDriversGrid) {
                const driverMap = new Map();
                latestClaims.forEach(c => {
                    const dName = c.driver_name || 'Driver';
                    const dTruck = c.truck_name || 'Vehicle';
                    const pcs = parseInt(c.total_items, 10) || 0;
                    if (!driverMap.has(dName)) {
                        driverMap.set(dName, { name: dName, truck: dTruck, pcs: 0, chits: 0 });
                    }
                    const rec = driverMap.get(dName);
                    rec.pcs += pcs;
                    rec.chits += 1;
                });

                const colorThemes = [
                    { bg: 'bg-sky-500/20', border: 'border-sky-400/30', text: 'text-sky-300', bar: 'bg-sky-400', icon: '🚚' },
                    { bg: 'bg-emerald-500/20', border: 'border-emerald-400/30', text: 'text-emerald-300', bar: 'bg-emerald-400', icon: '🚛' },
                    { bg: 'bg-purple-500/20', border: 'border-purple-400/30', text: 'text-purple-300', bar: 'bg-purple-400', icon: '🚐' },
                    { bg: 'bg-amber-500/20', border: 'border-amber-400/30', text: 'text-amber-300', bar: 'bg-amber-400', icon: '📦' }
                ];

                this.claimsLatestDriversGrid.innerHTML = Array.from(driverMap.values()).map((d, idx) => {
                    const pct = latestDayPcs > 0 ? Math.round((d.pcs / latestDayPcs) * 100) : 0;
                    const theme = colorThemes[idx % colorThemes.length];

                    return `
                        <div class="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border ${theme.border} flex flex-col justify-between space-y-2.5 shadow-sm">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-2.5">
                                    <div class="w-8 h-8 rounded-lg ${theme.bg} flex items-center justify-center text-sm font-bold">
                                        ${theme.icon}
                                    </div>
                                    <div>
                                        <h4 class="text-xs font-bold text-white">${this.escapeHtml(d.name)}</h4>
                                        <p class="text-[10px] text-slate-400 truncate max-w-[130px]">${this.escapeHtml(d.truck)}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="font-mono font-black text-sm ${theme.text}">${d.pcs} <span class="text-[10px] font-normal text-slate-400">pcs</span></div>
                                    <div class="text-[9px] text-slate-400">${d.chits} chit${d.chits > 1 ? 's' : ''}</div>
                                </div>
                            </div>
                            <!-- Graphical Progress Bar -->
                            <div class="space-y-1">
                                <div class="flex justify-between text-[9px] text-slate-400 font-medium">
                                    <span>Contribution</span>
                                    <span class="font-bold text-white">${pct}%</span>
                                </div>
                                <div class="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                                    <div class="${theme.bar} h-1.5 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } else {
            if (this.claimLatestDateBadge) this.claimLatestDateBadge.textContent = 'No claims recorded';
            if (this.claimsLogDateLabel) this.claimsLogDateLabel.textContent = '';
            if (this.claimLatestTotalPcs) this.claimLatestTotalPcs.textContent = '0';
            if (this.claimLatestTotalRecords) this.claimLatestTotalRecords.textContent = '0';
            if (this.claimsLatestDriversGrid) {
                this.claimsLatestDriversGrid.innerHTML = `
                    <div class="col-span-full text-center py-6 text-xs text-slate-400 font-medium">
                        No warranty claims recorded in the system yet. Click "+ Record Daily Claim" to add entries.
                    </div>
                `;
            }
        }

        this.renderClaimsTable(latestClaims);
    }

    setCompanySummaryFilterPeriod(period) {
        const updatePillStyles = (activeBtn) => {
            [this.btnClaimPeriodAll, this.btnClaimPeriodMonth, this.btnClaimPeriodLast].forEach(b => {
                if (b) {
                    if (b === activeBtn) {
                        b.className = 'px-2.5 py-1 rounded bg-slate-800 text-white font-bold text-[11px] cursor-pointer';
                    } else {
                        b.className = 'px-2.5 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold text-[11px] cursor-pointer';
                    }
                }
            });
        };

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        if (period === 'month') {
            updatePillStyles(this.btnClaimPeriodMonth);
            const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
            const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
            if (this.claimFilterFrom) this.claimFilterFrom.value = firstDay;
            if (this.claimFilterTo) this.claimFilterTo.value = lastDay;
        } else if (period === 'last') {
            updatePillStyles(this.btnClaimPeriodLast);
            const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0];
            const lastDay = new Date(year, month, 0).toISOString().split('T')[0];
            if (this.claimFilterFrom) this.claimFilterFrom.value = firstDay;
            if (this.claimFilterTo) this.claimFilterTo.value = lastDay;
        } else {
            updatePillStyles(this.btnClaimPeriodAll);
            if (this.claimFilterFrom) this.claimFilterFrom.value = '';
            if (this.claimFilterTo) this.claimFilterTo.value = '';
        }

        this.applyCompanySummaryFilters();
    }

    resetCompanySummaryFilters() {
        if (this.claimFilterFrom) this.claimFilterFrom.value = '';
        if (this.claimFilterTo) this.claimFilterTo.value = '';
        if (this.claimFilterDriver) this.claimFilterDriver.value = 'all';
        this.setCompanySummaryFilterPeriod('all');
    }

    populateClaimFilterDrivers() {
        if (!this.claimFilterDriver) return;
        const currentVal = this.claimFilterDriver.value;
        const activeDrivers = this.drivers && this.drivers.length > 0
            ? this.drivers
            : dbManager.query('SELECT * FROM drivers ORDER BY name ASC');

        let optionsHtml = '<option value="all">All Drivers (Combined)</option>';
        activeDrivers.forEach(d => {
            optionsHtml += `<option value="${d.id}">${this.escapeHtml(d.name)}</option>`;
        });
        this.claimFilterDriver.innerHTML = optionsHtml;
        if (currentVal) this.claimFilterDriver.value = currentVal;
    }

    populateClaimPrintDrivers() {
        if (!this.printClaimDriverSelect) return;
        const activeDrivers = this.drivers && this.drivers.length > 0
            ? this.drivers
            : dbManager.query('SELECT * FROM drivers ORDER BY name ASC');

        let optionsHtml = '';
        activeDrivers.forEach(d => {
            optionsHtml += `<option value="${d.id}">${this.escapeHtml(d.name)} (${this.escapeHtml(d.phone || 'Driver')})</option>`;
        });
        this.printClaimDriverSelect.innerHTML = optionsHtml;
    }

    applyCompanySummaryFilters() {
        const fromDate = this.claimFilterFrom ? this.claimFilterFrom.value : '';
        const toDate = this.claimFilterTo ? this.claimFilterTo.value : '';
        const driverId = this.claimFilterDriver ? this.claimFilterDriver.value : 'all';

        const filteredClaims = (this.claims || []).filter(c => {
            if (fromDate && c.claim_date < fromDate) return false;
            if (toDate && c.claim_date > toDate) return false;
            if (driverId !== 'all' && String(c.driver_id) !== String(driverId)) return false;
            return true;
        });

        if (this.claimsSummaryFilterBadge) {
            let driverLabel = 'All Drivers (Combined)';
            if (driverId !== 'all') {
                const sel = this.claimFilterDriver ? this.claimFilterDriver.options[this.claimFilterDriver.selectedIndex] : null;
                driverLabel = sel ? sel.textContent : 'Driver';
            }
            const periodLabel = (fromDate && toDate)
                ? `${this.formatDate(fromDate)} to ${this.formatDate(toDate)}`
                : (fromDate ? `From ${this.formatDate(fromDate)}` : (toDate ? `Up to ${this.formatDate(toDate)}` : 'All Time'));
            this.claimsSummaryFilterBadge.textContent = `${driverLabel} • ${periodLabel}`;
        }

        const allItems = dbManager.query('SELECT * FROM claim_items');
        this.renderClaimsSummaryTable(filteredClaims, allItems);
    }

    handleShareClaimsReport() {
        const fromDate = this.claimFilterFrom ? this.claimFilterFrom.value : '';
        const toDate = this.claimFilterTo ? this.claimFilterTo.value : '';
        const driverId = this.claimFilterDriver ? this.claimFilterDriver.value : 'all';

        let url = `report-preview.html?type=claims&mode=combined`;
        if (fromDate) url += `&from=${encodeURIComponent(fromDate)}`;
        if (toDate) url += `&to=${encodeURIComponent(toDate)}`;
        if (driverId && driverId !== 'all') {
            url += `&driver_id=${encodeURIComponent(driverId)}`;
        }

        window.open(url, '_blank');
    }

    renderClaimsTable(filteredClaims) {
        if (!this.claimsTableTbody) return;

        if (this.badgeClaimsTableCount) {
            this.badgeClaimsTableCount.textContent = filteredClaims.length;
        }

        if (filteredClaims.length === 0) {
            this.claimsTableTbody.innerHTML = '';
            if (this.claimsEmptyState) this.claimsEmptyState.classList.remove('hidden');
            return;
        }

        if (this.claimsEmptyState) this.claimsEmptyState.classList.add('hidden');

        this.claimsTableTbody.innerHTML = filteredClaims.map((c, index) => {
            return `
                <tr class="hover:bg-amber-50/30 transition border-b border-gray-100">
                    <!-- # -->
                    <td class="py-3 px-3 text-center text-gray-400 font-mono text-xs">${index + 1}</td>

                    <!-- Date -->
                    <td class="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap text-xs font-mono">
                        ${this.formatDate(c.claim_date)}
                    </td>

                    <!-- Claim Code -->
                    <td class="py-3 px-3 whitespace-nowrap">
                        <span class="px-2 py-0.5 rounded font-mono font-bold text-xs bg-amber-100 text-amber-900 border border-amber-300">
                            ${this.escapeHtml(c.claim_code || `CLM-${c.id}`)}
                        </span>
                    </td>

                    <!-- Driver & Truck -->
                    <td class="py-3 px-3">
                        <div class="font-bold text-gray-900 text-xs">${this.escapeHtml(c.driver_name)}</div>
                        <div class="text-[11px] text-gray-500">${this.escapeHtml(c.truck_name || 'No Truck')}</div>
                    </td>

                    <!-- Customer / Shop -->
                    <td class="py-3 px-3">
                        <div class="font-medium text-gray-800 text-xs">${this.escapeHtml(c.customer_shop || '—')}</div>
                        ${c.notes ? `<div class="text-[10px] text-gray-400 truncate max-w-xs">${this.escapeHtml(c.notes)}</div>` : ''}
                    </td>

                    <!-- Total Items -->
                    <td class="py-3 px-3 text-center whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
                            ${c.total_items || 0} pcs
                        </span>
                    </td>

                    <!-- Status -->
                    <td class="py-3 px-3 text-center whitespace-nowrap">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                            ${this.escapeHtml(c.status || 'Received')}
                        </span>
                    </td>

                    <!-- Actions -->
                    <td class="py-3 px-3 text-right whitespace-nowrap space-x-1">
                        <button type="button" data-action="view-claim" data-id="${c.id}"
                            class="inline-flex items-center px-2.5 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition cursor-pointer">
                            View Items
                        </button>
                        <button type="button" data-action="delete-claim" data-id="${c.id}"
                            class="inline-flex items-center px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition cursor-pointer">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Bind Row Buttons
        this.claimsTableTbody.querySelectorAll('[data-action="view-claim"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                this.viewClaimDetails(id);
            });
        });

        this.claimsTableTbody.querySelectorAll('[data-action="delete-claim"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                this.deleteClaim(id);
            });
        });
    }

    renderClaimsSummaryTable(filteredClaims, allItems) {
        if (!this.claimsSummaryTableTbody) return;

        if (filteredClaims.length === 0) {
            this.claimsSummaryTableTbody.innerHTML = `
                <tr>
                    <td colspan="7" class="p-4 text-center text-gray-500 font-semibold text-xs">
                        No claim records available for the selected period to summarize.
                    </td>
                </tr>
            `;
            if (this.claimsSummaryFootPcs) this.claimsSummaryFootPcs.textContent = '0';
            return;
        }

        const validClaimIds = new Set(filteredClaims.map(c => c.id));
        const filteredItems = (allItems || dbManager.query('SELECT * FROM claim_items'))
            .filter(item => validClaimIds.has(item.claim_id));

        // Group by Brand/Manufacturer and Product Name
        const summaryMap = new Map();
        let grandTotal = 0;

        filteredItems.forEach(item => {
            const key = `${item.manufacturer || 'Other'}|||${item.display_name}`;
            const qty = parseInt(item.quantity, 10) || 1;
            grandTotal += qty;

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

        if (sortedRecords.length === 0) {
            this.claimsSummaryTableTbody.innerHTML = `
                <tr>
                    <td colspan="6" class="p-4 text-center text-gray-500 font-semibold text-xs">
                        No defective product items found in the selected claims.
                    </td>
                </tr>
            `;
            if (this.claimsSummaryFootPcs) this.claimsSummaryFootPcs.textContent = '0';
            return;
        }

        this.claimsSummaryTableTbody.innerHTML = sortedRecords.map((rec, index) => {
            const percent = grandTotal > 0 ? ((rec.totalQty / grandTotal) * 100).toFixed(1) : 0;
            return `
                <tr class="hover:bg-slate-50">
                    <td class="p-2 border border-black text-center font-mono">${index + 1}</td>
                    <td class="p-2 border border-black font-bold uppercase">${this.escapeHtml(rec.manufacturer)}</td>
                    <td class="p-2 border border-black">${this.escapeHtml(rec.product_type)}</td>
                    <td class="p-2 border border-black font-semibold text-black">${this.escapeHtml(rec.display_name)}</td>
                    <td class="p-2 border border-black text-right font-mono font-bold text-sm">${rec.totalQty}</td>
                    <td class="p-2 border border-black text-right font-mono">${percent}%</td>
                </tr>
            `;
        }).join('');

        if (this.claimsSummaryFootPcs) {
            this.claimsSummaryFootPcs.textContent = this.formatNumber(grandTotal);
        }
    }

    openAddClaimModal(claimId = null) {
        if (this.claimForm) this.claimForm.reset();
        if (this.formClaimId) this.formClaimId.value = '';
        this.selectedClaimProduct = null;
        this.currentClaimItems = [];

        if (this.claimProductSearch) this.claimProductSearch.value = '';
        if (this.claimProductDropdown) {
            this.claimProductDropdown.classList.add('hidden');
            this.claimProductDropdown.innerHTML = '';
        }
        if (this.claimQuickQty) this.claimQuickQty.value = '1';
        if (this.claimSelectedProductBox) this.claimSelectedProductBox.classList.add('hidden');

        // Default date to today
        if (this.formClaimDate) {
            this.formClaimDate.value = this.getTodayDateStr();
        }

        // Populate Driver Dropdown
        if (this.formClaimDriver) {
            const activeDrivers = this.drivers && this.drivers.length > 0
                ? this.drivers
                : dbManager.query('SELECT * FROM drivers ORDER BY name ASC');
            let dHtml = '<option value="">-- Select Driver --</option>';
            activeDrivers.forEach(d => {
                dHtml += `<option value="${d.id}" data-name="${this.escapeHtml(d.name)}">${this.escapeHtml(d.name)} (${this.escapeHtml(d.phone || 'Driver')})</option>`;
            });
            this.formClaimDriver.innerHTML = dHtml;
        }

        // Populate Truck Dropdown
        if (this.formClaimTruck) {
            const activeTrucks = this.trucks && this.trucks.length > 0
                ? this.trucks
                : dbManager.query('SELECT * FROM trucks ORDER BY name ASC');
            let tHtml = '<option value="">-- Select Truck (Optional) --</option>';
            activeTrucks.forEach(t => {
                tHtml += `<option value="${t.id}" data-driver-id="${t.driver_id || ''}">${this.escapeHtml(t.name)} (${this.escapeHtml(t.registration_number || '')})</option>`;
            });
            this.formClaimTruck.innerHTML = tHtml;
        }

        if (claimId) {
            // Edit existing claim
            const claim = this.claims.find(c => c.id === claimId);
            if (claim) {
                if (this.formClaimId) this.formClaimId.value = claim.id;
                if (this.claimModalTitle) this.claimModalTitle.textContent = `Edit Claim: ${claim.claim_code || ('CLM-' + claim.id)}`;
                if (this.formClaimDate) this.formClaimDate.value = claim.claim_date;
                if (this.formClaimDriver) this.formClaimDriver.value = claim.driver_id;
                if (this.formClaimTruck) this.formClaimTruck.value = claim.truck_id || '';
                if (this.formClaimShop) this.formClaimShop.value = claim.customer_shop || '';
                if (this.formClaimNotes) this.formClaimNotes.value = claim.notes || '';

                const items = dbManager.query('SELECT * FROM claim_items WHERE claim_id = ?', [claimId]);
                this.currentClaimItems = items.map(i => ({
                    product_id: i.product_id,
                    display_name: i.display_name,
                    manufacturer: i.manufacturer || '',
                    product_type: i.product_type || '',
                    quantity: parseInt(i.quantity, 10) || 1
                }));
            }
        } else {
            if (this.claimModalTitle) this.claimModalTitle.textContent = 'Record Daily Warranty Claim';
        }

        this.renderClaimItemsTable();

        if (this.claimModal) {
            this.claimModal.classList.remove('hidden');
            setTimeout(() => {
                this.claimModal.classList.remove('opacity-0');
                if (this.claimModalCard) {
                    this.claimModalCard.classList.remove('scale-95');
                    this.claimModalCard.classList.add('scale-100');
                }
                if (this.claimProductSearch) this.claimProductSearch.focus();
            }, 10);
        }
    }

    closeAddClaimModal() {
        if (!this.claimModal) return;
        this.claimModal.classList.add('opacity-0');
        if (this.claimModalCard) {
            this.claimModalCard.classList.remove('scale-100');
            this.claimModalCard.classList.add('scale-95');
        }
        setTimeout(() => {
            this.claimModal.classList.add('hidden');
        }, 200);
    }

    handleClaimDriverChange() {
        if (!this.formClaimDriver || !this.formClaimTruck) return;
        const driverId = this.formClaimDriver.value;
        if (!driverId) return;

        // Auto-select assigned truck if matched
        const options = Array.from(this.formClaimTruck.options);
        const matchingTruck = options.find(opt => opt.getAttribute('data-driver-id') === String(driverId));
        if (matchingTruck) {
            this.formClaimTruck.value = matchingTruck.value;
        }
    }

    handleClaimProductSearch(query) {
        if (!this.claimProductDropdown) return;
        const q = (query || '').trim().toLowerCase();

        if (!q) {
            this.claimProductDropdown.classList.add('hidden');
            this.claimProductDropdown.innerHTML = '';
            this.selectedClaimProduct = null;
            if (this.claimSelectedProductBox) this.claimSelectedProductBox.classList.add('hidden');
            return;
        }

        const matches = this.products.filter(p => this.matchesProductSearch(p, q)).slice(0, 10);

        if (matches.length === 0) {
            this.claimProductDropdown.innerHTML = `<div class="p-3 text-xs text-gray-500 italic text-center">No matching products found</div>`;
            this.claimProductDropdown.classList.remove('hidden');
            this.selectedClaimProduct = null;
            if (this.claimSelectedProductBox) this.claimSelectedProductBox.classList.add('hidden');
            return;
        }

        this.claimProductDropdown.innerHTML = matches.map(p => {
            const fullDisp = this.getProductDisplayName(p);
            const mfgInfo = p.manufacturer ? `<span class="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-bold">${this.escapeHtml(p.manufacturer)}</span>` : '';
            const catInfo = p.category ? `<span class="text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded font-bold">${this.escapeHtml(p.category)}</span>` : '';
            
            let itemImages = [];
            try { itemImages = JSON.parse(p.images || '[]'); } catch (e) { itemImages = []; }
            const hasImg = Array.isArray(itemImages) && itemImages.length > 0;
            const thumbImg = hasImg
                ? `<img src="${itemImages[0]}" alt="${this.escapeHtml(fullDisp)}" class="w-8 h-8 rounded-lg object-cover border border-gray-200 shrink-0">`
                : `<div class="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0 text-xs">🛡️</div>`;

            return `
                <button type="button" data-product-id="${p.id}" class="w-full text-left px-3 py-2 hover:bg-sky-50 transition flex items-center justify-between group cursor-pointer">
                    <div class="flex items-center space-x-2.5 min-w-0">
                        ${thumbImg}
                        <div class="min-w-0">
                            <div class="font-bold text-gray-900 text-xs group-hover:text-sky-700 truncate">${this.escapeHtml(fullDisp)}</div>
                            <div class="text-[10px] text-gray-500">${this.escapeHtml(p.product_type)} | ${this.escapeHtml(p.strength || 'Nill')}</div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-1 shrink-0 ml-2">
                        ${catInfo}
                        ${mfgInfo}
                    </div>
                </button>
            `;
        }).join('');

        this.claimProductDropdown.classList.remove('hidden');

        // Automatically set first match
        this.selectedClaimProduct = matches[0];
        if (this.claimSelectedProductBox && this.claimSelectedProductLabel) {
            this.claimSelectedProductLabel.textContent = `Selected: ${this.getProductDisplayName(matches[0])}`;
            this.claimSelectedProductBox.classList.remove('hidden');
        }

        // Attach click listener on dropdown items
        this.claimProductDropdown.querySelectorAll('button[data-product-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-product-id'), 10);
                const prod = this.products.find(p => p.id === id);
                if (prod) {
                    this.selectedClaimProduct = prod;
                    if (this.claimProductSearch) this.claimProductSearch.value = this.getProductDisplayName(prod);
                    if (this.claimSelectedProductBox && this.claimSelectedProductLabel) {
                        this.claimSelectedProductLabel.textContent = `Selected: ${this.getProductDisplayName(prod)}`;
                        this.claimSelectedProductBox.classList.remove('hidden');
                    }
                    this.claimProductDropdown.classList.add('hidden');
                    if (this.claimQuickQty) {
                        this.claimQuickQty.focus();
                        this.claimQuickQty.select();
                    }
                }
            });
        });
    }

    addSelectedProductToClaim() {
        if (!this.selectedClaimProduct) {
            const query = (this.claimProductSearch ? this.claimProductSearch.value : '').trim();
            if (query) {
                const match = this.products.find(p => this.matchesProductSearch(p, query));
                if (match) {
                    this.selectedClaimProduct = match;
                }
            }
        }

        if (!this.selectedClaimProduct) {
            this.showToast('Please search and select a product first', 'warning');
            if (this.claimProductSearch) this.claimProductSearch.focus();
            return;
        }

        const qty = parseInt(this.claimQuickQty ? this.claimQuickQty.value : 1, 10) || 1;
        if (qty <= 0) {
            this.showToast('Quantity must be at least 1', 'warning');
            return;
        }

        const prod = this.selectedClaimProduct;
        const displayName = this.getProductDisplayName(prod);

        const existing = this.currentClaimItems.find(item => item.product_id === prod.id);
        if (existing) {
            existing.quantity += qty;
            this.showToast(`Updated quantity to ${existing.quantity} for ${displayName}`, 'info');
        } else {
            this.currentClaimItems.push({
                product_id: prod.id,
                display_name: displayName,
                manufacturer: prod.manufacturer || 'General',
                product_type: prod.product_type || 'Part',
                quantity: qty
            });
            this.showToast(`Added "${displayName}" (${qty} pcs) to claim!`, 'success');
        }

        this.selectedClaimProduct = null;
        if (this.claimProductSearch) this.claimProductSearch.value = '';
        if (this.claimSelectedProductBox) this.claimSelectedProductBox.classList.add('hidden');
        if (this.claimQuickQty) this.claimQuickQty.value = '1';
        if (this.claimProductDropdown) this.claimProductDropdown.classList.add('hidden');

        this.renderClaimItemsTable();
        if (this.claimProductSearch) this.claimProductSearch.focus();
    }

    renderClaimItemsTable() {
        if (!this.claimItemsTbody) return;

        if (this.currentClaimItems.length === 0) {
            this.claimItemsTbody.innerHTML = `
                <tr>
                    <td colspan="6" class="p-4 text-center text-gray-400 italic text-xs">
                        No defective products added yet. Use the search bar above to add products.
                    </td>
                </tr>
            `;
            if (this.formClaimTotalPieces) this.formClaimTotalPieces.textContent = '0';
            if (this.formClaimItemsCountBadge) this.formClaimItemsCountBadge.textContent = '0 items';
            return;
        }

        this.claimItemsTbody.innerHTML = this.currentClaimItems.map((item, index) => {
            return `
                <tr class="hover:bg-slate-50 transition">
                    <td class="p-2 text-center font-mono text-gray-400">${index + 1}</td>
                    <td class="p-2 font-bold text-gray-900">${this.escapeHtml(item.display_name)}</td>
                    <td class="p-2 font-semibold text-gray-600">${this.escapeHtml(item.manufacturer || '—')}</td>
                    <td class="p-2 text-gray-500">${this.escapeHtml(item.product_type || '—')}</td>
                    <td class="p-2 text-center">
                        <input type="number" min="1" step="1" value="${item.quantity}" data-item-index="${index}"
                            class="claim-row-qty-input w-20 px-2 py-1 border border-gray-300 rounded text-xs font-bold text-center font-mono focus:ring-2 focus:ring-sky-500 outline-none">
                    </td>
                    <td class="p-2 text-center">
                        <button type="button" data-remove-index="${index}" class="btn-remove-claim-item text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition cursor-pointer" title="Remove row">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach quantity change listeners
        this.claimItemsTbody.querySelectorAll('.claim-row-qty-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.getAttribute('data-item-index'), 10);
                const val = parseInt(e.target.value, 10) || 1;
                if (this.currentClaimItems[idx]) {
                    this.currentClaimItems[idx].quantity = Math.max(1, val);
                    this.updateClaimFormPiecesTotal();
                }
            });
        });

        // Attach remove button listeners
        this.claimItemsTbody.querySelectorAll('.btn-remove-claim-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.getAttribute('data-remove-index'), 10);
                const item = this.currentClaimItems[idx];
                if (item) {
                    this.currentClaimItems.splice(idx, 1);
                    this.showToast(`Removed "${item.display_name}"`, 'info');
                    this.renderClaimItemsTable();
                }
            });
        });

        this.updateClaimFormPiecesTotal();
    }

    updateClaimFormPiecesTotal() {
        let totalPcs = 0;
        this.currentClaimItems.forEach(i => {
            totalPcs += (parseInt(i.quantity, 10) || 0);
        });

        if (this.formClaimTotalPieces) {
            this.formClaimTotalPieces.textContent = totalPcs;
        }
        if (this.formClaimItemsCountBadge) {
            this.formClaimItemsCountBadge.textContent = `${this.currentClaimItems.length} ${this.currentClaimItems.length === 1 ? 'item' : 'items'}`;
        }
    }

    handleClaimFormSubmit(e) {
        e.preventDefault();

        const date = this.formClaimDate ? this.formClaimDate.value : '';
        const driverId = this.formClaimDriver ? this.formClaimDriver.value : '';
        const driverName = this.formClaimDriver && this.formClaimDriver.selectedOptions[0]
            ? this.formClaimDriver.selectedOptions[0].getAttribute('data-name')
            : 'Driver';
        const truckId = this.formClaimTruck && this.formClaimTruck.value ? parseInt(this.formClaimTruck.value, 10) : null;
        const truckName = this.formClaimTruck && this.formClaimTruck.selectedOptions[0]
            ? this.formClaimTruck.selectedOptions[0].text
            : '';
        const customerShop = this.formClaimShop ? this.formClaimShop.value.trim() : '';
        const notes = this.formClaimNotes ? this.formClaimNotes.value.trim() : '';

        if (!date || !driverId) {
            this.showToast('Please select a Date and Driver.', 'error');
            return;
        }

        if (this.currentClaimItems.length === 0) {
            this.showToast('Please search and add at least one defective product.', 'error');
            if (this.claimProductSearch) this.claimProductSearch.focus();
            return;
        }

        let totalPcs = 0;
        this.currentClaimItems.forEach(i => {
            totalPcs += (parseInt(i.quantity, 10) || 0);
        });

        try {
            const editId = this.formClaimId ? this.formClaimId.value : '';
            let claimCode = '';

            if (editId) {
                const existing = this.claims.find(c => c.id === parseInt(editId, 10));
                claimCode = existing ? existing.claim_code : `CLM-${editId}`;

                dbManager.run(`
                    UPDATE claims
                    SET claim_date = ?, driver_id = ?, driver_name = ?, truck_id = ?, truck_name = ?, customer_shop = ?, total_items = ?, notes = ?, updated_at = datetime('now', 'localtime')
                    WHERE id = ?
                `, [date, parseInt(driverId, 10), driverName, truckId, truckName, customerShop, totalPcs, notes, parseInt(editId, 10)]);

                dbManager.run('DELETE FROM claim_items WHERE claim_id = ?', [parseInt(editId, 10)]);

                this.currentClaimItems.forEach(item => {
                    dbManager.run(`
                        INSERT INTO claim_items (claim_id, product_id, display_name, manufacturer, product_type, quantity)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [parseInt(editId, 10), item.product_id, item.display_name, item.manufacturer, item.product_type, item.quantity]);
                });

                this.showToast(`Claim "${claimCode}" updated successfully (${totalPcs} pcs)!`, 'success');
            } else {
                const dateClean = (date || this.getTodayDateStr()).replace(/-/g, '');
                let seq = 1;
                let candidateCode = `CLM-${dateClean}-${String(seq).padStart(2, '0')}`;
                while (
                    (this.claims && this.claims.some(c => c.claim_code === candidateCode)) ||
                    dbManager.query('SELECT id FROM claims WHERE claim_code = ?', [candidateCode]).length > 0
                ) {
                    seq++;
                    candidateCode = `CLM-${dateClean}-${String(seq).padStart(2, '0')}`;
                }
                claimCode = candidateCode;

                const insertResult = dbManager.run(`
                    INSERT INTO claims (claim_code, claim_date, driver_id, driver_name, truck_id, truck_name, customer_shop, total_items, status, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Received', ?)
                `, [claimCode, date, parseInt(driverId, 10), driverName, truckId, truckName, customerShop, totalPcs, notes]);

                const claimId = insertResult.lastInsertRowId;

                this.currentClaimItems.forEach(item => {
                    dbManager.run(`
                        INSERT INTO claim_items (claim_id, product_id, display_name, manufacturer, product_type, quantity)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [claimId, item.product_id || null, item.display_name, item.manufacturer || '', item.product_type || '', item.quantity || 1]);
                });

                this.showToast(`Claim record ${claimCode} saved successfully (${totalPcs} pcs)!`, 'success');
            }

            this.closeAddClaimModal();
            this.loadClaims();
        } catch (err) {
            console.error('Error saving claim:', err);
            this.showToast('Failed to save claim: ' + err.message, 'error');
        }
    }

    deleteClaim(claimId) {
        const claim = this.claims.find(c => c.id === claimId);
        if (!claim) return;

        const code = claim.claim_code || `CLM-${claim.id}`;
        if (confirm(`Are you sure you want to delete claim record "${code}" (${claim.total_items} pcs)?\nThis will remove all item details permanently.`)) {
            try {
                dbManager.run('DELETE FROM claims WHERE id = ?', [claimId]);
                this.showToast(`Claim record "${code}" deleted.`, 'info');
                this.loadClaims();
            } catch (err) {
                console.error('Error deleting claim:', err);
                this.showToast('Failed to delete claim: ' + err.message, 'error');
            }
        }
    }

    viewClaimDetails(claimId) {
        const claim = this.claims.find(c => c.id === claimId);
        if (!claim) return;

        const items = dbManager.query('SELECT * FROM claim_items WHERE claim_id = ?', [claimId]);

        if (this.viewClaimCode) this.viewClaimCode.textContent = claim.claim_code || `CLM-${claim.id}`;
        if (this.viewClaimDate) this.viewClaimDate.textContent = this.formatDate(claim.claim_date);
        if (this.viewClaimDriver) this.viewClaimDriver.textContent = claim.driver_name || 'Driver';
        if (this.viewClaimTruck) this.viewClaimTruck.textContent = claim.truck_name || 'No Vehicle';
        if (this.viewClaimShop) this.viewClaimShop.textContent = claim.customer_shop || '—';
        if (this.viewClaimTotalPcs) this.viewClaimTotalPcs.textContent = claim.total_items || items.length;

        if (this.viewClaimNotesText) {
            this.viewClaimNotesText.textContent = claim.notes || 'No route remarks entered.';
        }

        if (this.viewClaimItemsTbody) {
            this.viewClaimItemsTbody.innerHTML = items.map((item, index) => {
                return `
                    <tr class="hover:bg-slate-50">
                        <td class="p-2.5 text-center font-mono text-gray-400">${index + 1}</td>
                        <td class="p-2.5 font-bold text-gray-900">${this.escapeHtml(item.display_name)}</td>
                        <td class="p-2.5 font-semibold text-gray-600">${this.escapeHtml(item.manufacturer || 'General')}</td>
                        <td class="p-2.5 text-gray-500">${this.escapeHtml(item.product_type || 'Part')}</td>
                        <td class="p-2.5 text-right font-mono font-bold text-gray-900">${item.quantity} pcs</td>
                    </tr>
                `;
            }).join('');
        }

        if (this.claimViewModal) {
            this.claimViewModal.classList.remove('hidden');
            setTimeout(() => {
                this.claimViewModal.classList.remove('opacity-0');
                if (this.claimViewModalCard) {
                    this.claimViewModalCard.classList.remove('scale-95');
                    this.claimViewModalCard.classList.add('scale-100');
                }
            }, 10);
        }
    }

    closeClaimViewModal() {
        if (!this.claimViewModal) return;
        this.claimViewModal.classList.add('opacity-0');
        if (this.claimViewModalCard) {
            this.claimViewModalCard.classList.remove('scale-100');
            this.claimViewModalCard.classList.add('scale-95');
        }
        setTimeout(() => {
            this.claimViewModal.classList.add('hidden');
        }, 200);
    }

    openClaimPrintModal() {
        this.populateClaimPrintDrivers();
        this.setClaimPrintRange('month');

        // Reset radio to combined by default
        const combinedRadio = document.querySelector('input[name="claim_report_mode"][value="combined"]');
        if (combinedRadio) {
            combinedRadio.checked = true;
            this.handleClaimPrintModeChange('combined');
        }

        if (this.claimPrintModal) {
            this.claimPrintModal.classList.remove('hidden');
            setTimeout(() => {
                this.claimPrintModal.classList.remove('opacity-0');
                if (this.claimPrintModalCard) {
                    this.claimPrintModalCard.classList.remove('scale-95');
                    this.claimPrintModalCard.classList.add('scale-100');
                }
            }, 10);
        }
    }

    closeClaimPrintModal() {
        if (!this.claimPrintModal) return;
        this.claimPrintModal.classList.add('opacity-0');
        if (this.claimPrintModalCard) {
            this.claimPrintModalCard.classList.remove('scale-100');
            this.claimPrintModalCard.classList.add('scale-95');
        }
        setTimeout(() => {
            this.claimPrintModal.classList.add('hidden');
        }, 200);
    }

    handleClaimPrintModeChange(mode) {
        // Toggle driver dropdown container
        if (this.printDriverSelectContainer) {
            if (mode === 'driver') {
                this.printDriverSelectContainer.classList.remove('hidden');
            } else {
                this.printDriverSelectContainer.classList.add('hidden');
            }
        }

        // Highlight active radio card
        document.querySelectorAll('.print-mode-card').forEach(card => {
            const radio = card.querySelector('input[name="claim_report_mode"]');
            if (radio && radio.checked) {
                card.className = 'print-mode-card flex items-start p-3.5 border-2 border-sky-500 bg-sky-50/40 rounded-xl cursor-pointer transition';
            } else {
                card.className = 'print-mode-card flex items-start p-3.5 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition';
            }
        });
    }

    setClaimPrintRange(range) {
        const updateChips = (activeChip) => {
            [this.printRangeMonth, this.printRangeLast, this.printRangeAll].forEach(c => {
                if (c) {
                    if (c === activeChip) {
                        c.className = 'px-2 py-0.5 rounded bg-sky-600 text-white font-bold text-[10px] cursor-pointer';
                    } else {
                        c.className = 'px-2 py-0.5 rounded bg-white text-gray-700 border border-gray-300 font-bold text-[10px] cursor-pointer';
                    }
                }
            });
        };

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        if (range === 'month') {
            updateChips(this.printRangeMonth);
            const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
            const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
            if (this.printClaimFromDate) this.printClaimFromDate.value = firstDay;
            if (this.printClaimToDate) this.printClaimToDate.value = lastDay;
        } else if (range === 'last') {
            updateChips(this.printRangeLast);
            const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0];
            const lastDay = new Date(year, month, 0).toISOString().split('T')[0];
            if (this.printClaimFromDate) this.printClaimFromDate.value = firstDay;
            if (this.printClaimToDate) this.printClaimToDate.value = lastDay;
        } else {
            updateChips(this.printRangeAll);
            if (this.printClaimFromDate) this.printClaimFromDate.value = '';
            if (this.printClaimToDate) this.printClaimToDate.value = '';
        }
    }

    executePrintClaims() {
        const selectedRadio = document.querySelector('input[name="claim_report_mode"]:checked');
        const mode = selectedRadio ? selectedRadio.value : 'combined';
        const fromDate = this.printClaimFromDate ? this.printClaimFromDate.value : '';
        const toDate = this.printClaimToDate ? this.printClaimToDate.value : '';

        let url = `report-preview.html?type=claims&mode=${encodeURIComponent(mode)}`;
        if (fromDate) url += `&from=${encodeURIComponent(fromDate)}`;
        if (toDate) url += `&to=${encodeURIComponent(toDate)}`;

        if (mode === 'driver') {
            const driverId = this.printClaimDriverSelect ? this.printClaimDriverSelect.value : '';
            if (!driverId) {
                this.showToast('Please select a driver to generate individual report.', 'error');
                return;
            }
            url += `&driver_id=${encodeURIComponent(driverId)}`;
        }

        this.closeClaimPrintModal();
        window.open(url, '_blank');
    }

    // ================= UTILITIES =================
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        const bg = type === 'error' ? 'bg-red-600 text-white' : (type === 'info' ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white');
        toast.className = `pointer-events-auto px-4 py-3 rounded-xl shadow-xl text-xs font-bold transition-all duration-200 transform translate-y-[10px] opacity-0 flex items-center space-x-2.5 ${bg} border border-white/20`;
        
        const iconSvg = type === 'error'
            ? `<svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
            : `<svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;

        toast.innerHTML = `${iconSvg}<span>${this.escapeHtml(message)}</span>`;

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.remove('opacity-0', 'translate-y-[10px]');
            toast.classList.add('opacity-100', 'translate-y-0');
        });

        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-[10px]');
            setTimeout(() => toast.remove(), 200);
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

    getTodayDateStr() {
        return getTodayDateStr();
    }

    formatDate(dateStr) {
        return formatDate(dateStr);
    }

    formatNumber(num) {
        return formatNumber(num);
    }

    formatReportProductName(prodOrItem) {
        return formatReportProductName(prodOrItem, this.products);
    }


    // ================= DATABASE BACKUP & RESTORE =================
    exportDatabaseFile() {
        try {
            const binary = dbManager.exportDatabase();
            const blob = new Blob([binary], { type: 'application/x-sqlite3' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `warehouse_database_${timestamp}.sqlite`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showToast('Database exported successfully (.sqlite)!', 'success');
        } catch (err) {
            console.error('Export DB error:', err);
            this.showToast('Failed to export database: ' + err.message, 'error');
        }
    }

    async handleDatabaseImport(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const confirmMsg = `Are you sure you want to import "${file.name}"?\nThis will restore the database from this file.`;
        if (!confirm(confirmMsg)) {
            e.target.value = '';
            return;
        }

        try {
            if (file.name.endsWith('.json')) {
                const text = await file.text();
                const jsonData = JSON.parse(text);
                if (Array.isArray(jsonData)) {
                    for (const item of jsonData) {
                        dbManager.insertProduct(item);
                    }
                }
            } else {
                const arrayBuffer = await file.arrayBuffer();
                await dbManager.importDatabase(arrayBuffer);
            }

            this.showToast('Database imported and restored successfully!', 'success');

            // Refresh UI data
            await this.loadProducts();
            await this.loadShifts();
            await this.loadTrucks();
            await this.loadDrivers();

            e.target.value = '';
        } catch (err) {
            console.error('Import DB error:', err);
            this.showToast('Failed to import database: ' + err.message, 'error');
            e.target.value = '';
        }
    }
}

// Start app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new WarehouseApp();
    app.init();
});
