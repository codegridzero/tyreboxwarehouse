/**
 * Settings & Data Management Screen
 */
import { backupService } from '../services/backupService.js';
import { seedData } from '../services/seedData.js';
import { dbManager } from '../db.js';
import { readUploadedFile, formatDateTime, formatNumber } from '../utils.js';
import { modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export const settingsPage = {
    render(container, workingDate) {
        // Collect database table stats
        const tables = [
            { name: 'products', label: 'Products' },
            { name: 'categories', label: 'Categories' },
            { name: 'trucks', label: 'Trucks' },
            { name: 'drivers', label: 'Drivers' },
            { name: 'dispatches', label: 'Morning Dispatches' },
            { name: 'dispatch_items', label: 'Loaded Items' },
            { name: 'sales', label: 'Sales Records' },
            { name: 'sale_items', label: 'Sold Items' },
            { name: 'sale_edits', label: 'Sale Audit Logs' },
            { name: 'returns', label: 'Evening Returns' },
            { name: 'return_items', label: 'Return Items' },
            { name: 'inventory_transactions', label: 'Inventory Ledger Records' }
        ];

        const stats = tables.map(t => {
            const countRes = dbManager.queryOne(`SELECT COUNT(*) AS cnt FROM ${t.name}`);
            return {
                ...t,
                count: countRes ? countRes.cnt : 0
            };
        });

        container.innerHTML = `
            <div class="space-y-6 animate-fade-in max-w-4xl mx-auto">
                <!-- Header -->
                <div>
                    <h2 class="text-2xl font-bold text-gray-900">System Settings & Data Management</h2>
                    <p class="text-sm text-gray-500">Backup, restore, and verify local-first SQLite warehouse database</p>
                </div>

                <!-- Backup & Restore Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <!-- Export JSON Backup -->
                    <div class="bg-white p-5 rounded-xl shadow-xs border border-gray-200 flex flex-col justify-between">
                        <div>
                            <div class="w-10 h-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center mb-3">
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            </div>
                            <h3 class="text-base font-bold text-gray-900">Export Full JSON Backup</h3>
                            <p class="text-xs text-gray-500 mt-1">
                                Download a complete portable JSON archive containing all inventory records, products, fleet dispatches, sales, and audit trails.
                            </p>
                        </div>
                        <div class="mt-5 pt-4 border-t border-gray-100">
                            <button type="button" id="btn-export-backup-json" class="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs shadow-xs transition">
                                Download Full Backup (.json)
                            </button>
                        </div>
                    </div>

                    <!-- Restore Backup -->
                    <div class="bg-white p-5 rounded-xl shadow-xs border border-gray-200 flex flex-col justify-between">
                        <div>
                            <div class="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                            </div>
                            <h3 class="text-base font-bold text-gray-900">Restore from Backup</h3>
                            <p class="text-xs text-gray-500 mt-1">
                                Import a previously exported JSON backup file. Validates schemas and creates an automatic safety snapshot before restoring.
                            </p>
                        </div>
                        <div class="mt-5 pt-4 border-t border-gray-100">
                            <input type="file" id="restore-file-input" accept=".json" class="hidden">
                            <button type="button" id="btn-trigger-restore" class="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs transition">
                                Select JSON File to Restore...
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Demo Data Management & Reset Card -->
                <div class="bg-white p-5 rounded-xl shadow-xs border border-gray-200">
                    <h3 class="text-base font-bold text-gray-900">Demo Data & Quick Initialization</h3>
                    <p class="text-xs text-gray-500 mt-1">
                        Populate realistic tire warehouse demo data (3 trucks, tires & tubes catalog, opening inventory, matched and mismatched daily operations).
                    </p>

                    <div class="mt-4 flex flex-wrap gap-3">
                        <button type="button" id="btn-seed-master" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-xs transition">
                            Seed Master Catalog & Trucks
                        </button>
                        <button type="button" id="btn-seed-sample-day" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs transition">
                            Seed Realistic Working Day Scenario
                        </button>
                        <button type="button" id="btn-reset-db" class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-lg text-xs transition">
                            Reset Database Completely
                        </button>
                    </div>
                </div>

                <!-- Database Diagnostics & Table Stats -->
                <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                    <div class="p-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wider">Local SQLite Database Storage Stats</h3>
                            <p class="text-xs text-gray-500">IndexedDB binary storage with instant persistence</p>
                        </div>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            Storage: Persistent
                        </span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-gray-200">
                        ${stats.map(s => `
                            <div class="bg-white p-3.5">
                                <span class="text-[11px] text-gray-500 block">${s.label}</span>
                                <span class="text-lg font-bold text-gray-900 font-mono">${formatNumber(s.count)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(container, workingDate);
    },

    bindEvents(container, workingDate) {
        // Export Backup
        const exportBtn = container.querySelector('#btn-export-backup-json');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const res = backupService.downloadFullBackup();
                toast.success(`Backup file "${res.filename}" downloaded successfully!`);
            });
        }

        // Restore Backup
        const triggerRestoreBtn = container.querySelector('#btn-trigger-restore');
        const fileInput = container.querySelector('#restore-file-input');

        if (triggerRestoreBtn && fileInput) {
            triggerRestoreBtn.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const confirmed = await modal.confirm({
                    title: 'Confirm Database Restore',
                    message: `Are you sure you want to restore data from "${file.name}"? Current database tables will be replaced with backup contents. An automatic safety snapshot will be kept in memory during the operation.`,
                    confirmText: 'Restore Data',
                    type: 'danger'
                });

                if (!confirmed) {
                    fileInput.value = '';
                    return;
                }

                try {
                    const text = await readUploadedFile(file);
                    const jsonObj = JSON.parse(text);
                    await backupService.restoreFromJSON(jsonObj);
                    toast.success('Database successfully restored from backup!');
                    setTimeout(() => window.location.reload(), 800);
                } catch (err) {
                    toast.error(`Restore failed: ${err.message}`);
                } finally {
                    fileInput.value = '';
                }
            });
        }

        // Seed Master Data
        const seedMasterBtn = container.querySelector('#btn-seed-master');
        if (seedMasterBtn) {
            seedMasterBtn.addEventListener('click', async () => {
                const confirmed = await modal.confirm({
                    title: 'Seed Master Data',
                    message: 'This will seed initial tire/tube products, categories, 3 trucks, and drivers with initial opening stock.',
                    confirmText: 'Seed Catalog',
                    type: 'info'
                });

                if (confirmed) {
                    try {
                        seedData.seedMasterData();
                        toast.success('Master catalog & trucks seeded successfully!');
                        setTimeout(() => window.location.reload(), 500);
                    } catch (err) {
                        toast.error(err.message);
                    }
                }
            });
        }

        // Seed Sample Working Day Scenario
        const seedSampleDayBtn = container.querySelector('#btn-seed-sample-day');
        if (seedSampleDayBtn) {
            seedSampleDayBtn.addEventListener('click', async () => {
                const confirmed = await modal.confirm({
                    title: 'Seed Demo Working Day',
                    message: `Populate complete 3-truck daily operations scenario for ${workingDate}? (Truck 1: Closed & Matched, Truck 2: Discrepancy Mismatch, Truck 3: On Route)`,
                    confirmText: 'Seed Demo Day',
                    type: 'info'
                });

                if (confirmed) {
                    try {
                        if (!seedData.hasData()) {
                            seedData.seedMasterData();
                        }
                        seedData.seedDemoDay(workingDate);
                        toast.success(`Demo working day data populated for ${workingDate}!`);
                        setTimeout(() => {
                            window.location.hash = '#daily-control';
                            window.location.reload();
                        }, 500);
                    } catch (err) {
                        toast.error(err.message);
                    }
                }
            });
        }

        // Reset Database
        const resetBtn = container.querySelector('#btn-reset-db');
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                const confirmed = await modal.confirm({
                    title: 'CRITICAL: Reset Database?',
                    message: 'Are you completely sure you want to erase all warehouse data? This will clear all products, dispatches, sales, and ledger transactions.',
                    confirmText: 'Yes, Erase All Data',
                    type: 'danger'
                });

                if (confirmed) {
                    try {
                        await dbManager.resetDatabase();
                        toast.warning('Database has been completely cleared.');
                        setTimeout(() => window.location.reload(), 500);
                    } catch (err) {
                        toast.error(err.message);
                    }
                }
            });
        }
    }
};
