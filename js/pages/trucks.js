/**
 * Trucks & Drivers Management Screen
 */
import { truckService } from '../services/truckService.js';
import { escapeHtml } from '../utils.js';
import { modal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export const trucksPage = {
    render(container, workingDate, urlParams = {}) {
        const activeTab = urlParams.tab || 'trucks';
        const trucks = truckService.getTrucks(true);
        const drivers = truckService.getDrivers(true);

        let tabContentHtml = '';

        if (activeTab === 'drivers') {
            tabContentHtml = `
                <!-- Drivers Table -->
                <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                    <div class="p-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wider">Route Drivers List</h3>
                            <p class="text-xs text-gray-500">Manage delivery drivers and route assignments</p>
                        </div>
                        <button type="button" id="btn-add-driver" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                            + Add Driver
                        </button>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                            <thead class="bg-gray-50 text-gray-500 uppercase font-semibold">
                                <tr>
                                    <th class="px-4 py-3">Driver Name</th>
                                    <th class="px-4 py-3">Phone Number</th>
                                    <th class="px-4 py-3">Assigned Truck</th>
                                    <th class="px-4 py-3 text-center">Status</th>
                                    <th class="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 bg-white">
                                ${drivers.map(d => `
                                    <tr class="table-row-hover">
                                        <td class="px-4 py-3.5 whitespace-nowrap font-bold text-gray-900 text-sm">${d.name}</td>
                                        <td class="px-4 py-3.5 whitespace-nowrap text-gray-600 font-mono">${d.phone || '—'}</td>
                                        <td class="px-4 py-3.5 whitespace-nowrap text-gray-700 font-medium">${d.assigned_truck_name || '<span class="text-gray-400 italic">None</span>'}</td>
                                        <td class="px-4 py-3.5 whitespace-nowrap text-center">
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${d.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}">
                                                ${d.active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3.5 whitespace-nowrap text-right space-x-2">
                                            <button type="button" data-action="edit-driver" data-id="${d.id}" class="text-xs font-semibold text-sky-600 hover:underline">Edit</button>
                                            <button type="button" data-action="toggle-driver" data-id="${d.id}" class="text-xs font-semibold text-gray-500 hover:text-gray-800">
                                                ${d.active ? 'Deactivate' : 'Activate'}
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
            // Trucks Table
            tabContentHtml = `
                <!-- Trucks Table -->
                <div class="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                    <div class="p-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wider">Fleet Delivery Trucks</h3>
                            <p class="text-xs text-gray-500">Manage warehouse trucks, license registrations, and primary drivers</p>
                        </div>
                        <button type="button" id="btn-add-truck" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition">
                            + Add New Truck
                        </button>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 text-left text-xs">
                            <thead class="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                                <tr>
                                    <th class="px-4 py-3.5">Truck Name / Number</th>
                                    <th class="px-4 py-3.5">Registration Number</th>
                                    <th class="px-4 py-3.5">Assigned Primary Driver</th>
                                    <th class="px-4 py-3.5">Driver Contact</th>
                                    <th class="px-4 py-3.5 text-center">Status</th>
                                    <th class="px-4 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 bg-white">
                                ${trucks.map(t => `
                                    <tr class="table-row-hover">
                                        <td class="px-4 py-3.5 whitespace-nowrap font-bold text-gray-900 text-sm">${t.name}</td>
                                        <td class="px-4 py-3.5 whitespace-nowrap font-mono text-gray-700 font-semibold">${t.registration_number || '—'}</td>
                                        <td class="px-4 py-3.5 whitespace-nowrap text-gray-800 font-medium">${t.driver_name || '<span class="text-gray-400 italic">Unassigned</span>'}</td>
                                        <td class="px-4 py-3.5 whitespace-nowrap text-gray-500 font-mono">${t.driver_phone || '—'}</td>
                                        <td class="px-4 py-3.5 whitespace-nowrap text-center">
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${t.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}">
                                                ${t.active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3.5 whitespace-nowrap text-right space-x-2">
                                            <button type="button" data-action="edit-truck" data-id="${t.id}" class="text-xs font-semibold text-sky-600 hover:underline">Edit</button>
                                            <button type="button" data-action="toggle-truck" data-id="${t.id}" class="text-xs font-semibold text-gray-500 hover:text-gray-800">
                                                ${t.active ? 'Deactivate' : 'Activate'}
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
                        <h2 class="text-2xl font-bold text-gray-900">Fleet & Drivers Management</h2>
                        <p class="text-sm text-gray-500">Configure delivery trucks and route drivers</p>
                    </div>

                    <!-- Tab Switcher -->
                    <div class="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold">
                        <a href="#trucks?tab=trucks" class="px-3 py-1.5 rounded-lg transition ${activeTab === 'trucks' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}">
                            Trucks (${trucks.length})
                        </a>
                        <a href="#trucks?tab=drivers" class="px-3 py-1.5 rounded-lg transition ${activeTab === 'drivers' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}">
                            Drivers (${drivers.length})
                        </a>
                    </div>
                </div>

                <!-- Main Content Tab -->
                ${tabContentHtml}
            </div>
        `;

        this.bindEvents(container, activeTab, trucks, drivers);
    },

    bindEvents(container, activeTab, trucks, drivers) {
        if (activeTab === 'drivers') {
            const addDriverBtn = container.querySelector('#btn-add-driver');
            if (addDriverBtn) addDriverBtn.addEventListener('click', () => this.openDriverModal());

            container.querySelectorAll('[data-action="edit-driver"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const driverId = parseInt(btn.getAttribute('data-id'), 10);
                    const driver = truckService.getDriverById(driverId);
                    this.openDriverModal(driver);
                });
            });

            container.querySelectorAll('[data-action="toggle-driver"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const driverId = parseInt(btn.getAttribute('data-id'), 10);
                    truckService.toggleDriverActive(driverId);
                    toast.info('Driver status updated');
                    window.location.reload();
                });
            });
        } else {
            const addTruckBtn = container.querySelector('#btn-add-truck');
            if (addTruckBtn) addTruckBtn.addEventListener('click', () => this.openTruckModal(null, drivers));

            container.querySelectorAll('[data-action="edit-truck"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const truckId = parseInt(btn.getAttribute('data-id'), 10);
                    const truck = truckService.getTruckById(truckId);
                    this.openTruckModal(truck, drivers);
                });
            });

            container.querySelectorAll('[data-action="toggle-truck"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const truckId = parseInt(btn.getAttribute('data-id'), 10);
                    truckService.toggleTruckActive(truckId);
                    toast.info('Truck status updated');
                    window.location.reload();
                });
            });
        }
    },

    openDriverModal(driver = null) {
        modal.show({
            title: driver ? 'Edit Driver' : 'Add New Driver',
            content: `
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Driver Full Name <span class="text-red-500">*</span></label>
                        <input type="text" id="driver-name-input" value="${driver ? escapeHtml(driver.name) : ''}" placeholder="e.g. Ali Khan" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                        <input type="text" id="driver-phone-input" value="${driver ? escapeHtml(driver.phone || '') : ''}" placeholder="e.g. +1 (555) 019-2834" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Notes / License Details</label>
                        <input type="text" id="driver-notes-input" value="${driver ? escapeHtml(driver.notes || '') : ''}" placeholder="e.g. Commercial Driver License Class A" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs">
                    </div>
                    <div class="flex justify-end space-x-2 pt-3 border-t">
                        <button type="button" id="modal-cancel-driver" class="px-4 py-2 border rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="button" id="modal-save-driver" class="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs">${driver ? 'Update Driver' : 'Add Driver'}</button>
                    </div>
                </div>
            `,
            onOpen: (modalEl, close) => {
                modalEl.querySelector('#modal-cancel-driver').addEventListener('click', close);
                modalEl.querySelector('#modal-save-driver').addEventListener('click', () => {
                    const name = modalEl.querySelector('#driver-name-input').value;
                    const phone = modalEl.querySelector('#driver-phone-input').value;
                    const notes = modalEl.querySelector('#driver-notes-input').value;

                    try {
                        if (driver) {
                            truckService.updateDriver(driver.id, { name, phone, notes });
                            toast.success('Driver updated');
                        } else {
                            truckService.createDriver({ name, phone, notes });
                            toast.success('Driver added');
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

    openTruckModal(truck = null, drivers = []) {
        modal.show({
            title: truck ? 'Edit Truck' : 'Add Delivery Truck',
            content: `
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Truck Name / Identifier <span class="text-red-500">*</span></label>
                        <input type="text" id="truck-name-input" value="${truck ? escapeHtml(truck.name) : ''}" placeholder="e.g. Truck 1, Truck 2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Registration / Plate Number</label>
                        <input type="text" id="truck-reg-input" value="${truck ? escapeHtml(truck.registration_number || '') : ''}" placeholder="e.g. WH-TRK-01" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono font-bold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Primary Assigned Driver</label>
                        <select id="truck-driver-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white">
                            <option value="">-- Unassigned --</option>
                            ${drivers.map(d => `<option value="${d.id}" ${truck && truck.driver_id === d.id ? 'selected' : ''}>${d.name} (${d.phone || 'No phone'})</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Vehicle Notes / Specs</label>
                        <input type="text" id="truck-notes-input" value="${truck ? escapeHtml(truck.notes || '') : ''}" placeholder="e.g. 5-Ton Delivery Truck" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs">
                    </div>
                    <div class="flex justify-end space-x-2 pt-3 border-t">
                        <button type="button" id="modal-cancel-truck" class="px-4 py-2 border rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="button" id="modal-save-truck" class="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs">${truck ? 'Update Truck' : 'Add Truck'}</button>
                    </div>
                </div>
            `,
            onOpen: (modalEl, close) => {
                modalEl.querySelector('#modal-cancel-truck').addEventListener('click', close);
                modalEl.querySelector('#modal-save-truck').addEventListener('click', () => {
                    const name = modalEl.querySelector('#truck-name-input').value;
                    const registration_number = modalEl.querySelector('#truck-reg-input').value;
                    const driver_id = modalEl.querySelector('#truck-driver-select').value ? parseInt(modalEl.querySelector('#truck-driver-select').value, 10) : null;
                    const notes = modalEl.querySelector('#truck-notes-input').value;

                    try {
                        if (truck) {
                            truckService.updateTruck(truck.id, { name, registration_number, driver_id, notes });
                            toast.success('Truck updated');
                        } else {
                            truckService.createTruck({ name, registration_number, driver_id, notes });
                            toast.success('Truck added');
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
