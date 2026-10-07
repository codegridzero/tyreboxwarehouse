/**
 * Truck and Driver Management Service
 */
import { dbManager } from '../db.js';

export const truckService = {
    // --- Drivers ---
    getDrivers(includeInactive = false) {
        const sql = includeInactive
            ? `SELECT d.*, t.name AS assigned_truck_name, t.id AS assigned_truck_id
               FROM drivers d
               LEFT JOIN trucks t ON t.driver_id = d.id
               ORDER BY d.name ASC`
            : `SELECT d.*, t.name AS assigned_truck_name, t.id AS assigned_truck_id
               FROM drivers d
               LEFT JOIN trucks t ON t.driver_id = d.id AND t.active = 1
               WHERE d.active = 1
               ORDER BY d.name ASC`;
        return dbManager.query(sql);
    },

    getDriverById(id) {
        return dbManager.queryOne(`
            SELECT d.*, t.name AS assigned_truck_name, t.id AS assigned_truck_id
            FROM drivers d
            LEFT JOIN trucks t ON t.driver_id = d.id
            WHERE d.id = ?
        `, [id]);
    },

    createDriver({ name, phone = '', active = 1, notes = '' }) {
        if (!name || !name.trim()) throw new Error('Driver name is required');
        const trimmed = name.trim();

        const result = dbManager.run(
            'INSERT INTO drivers (name, phone, active, notes, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now", "localtime"), datetime("now", "localtime"))',
            [trimmed, phone ? phone.trim() : '', active ? 1 : 0, notes ? notes.trim() : '']
        );
        dbManager.notifyChange('DRIVER_CREATED', { id: result.lastInsertRowId });
        return result.lastInsertRowId;
    },

    updateDriver(id, { name, phone, active, notes }) {
        const existing = this.getDriverById(id);
        if (!existing) throw new Error('Driver not found');

        dbManager.run(`
            UPDATE drivers SET
                name = ?,
                phone = ?,
                active = ?,
                notes = ?,
                updated_at = datetime("now", "localtime")
            WHERE id = ?
        `, [
            name ? name.trim() : existing.name,
            phone !== undefined ? phone.trim() : existing.phone,
            active !== undefined ? (active ? 1 : 0) : existing.active,
            notes !== undefined ? notes.trim() : existing.notes,
            id
        ]);
        dbManager.notifyChange('DRIVER_UPDATED', { id });
    },

    toggleDriverActive(id) {
        const driver = this.getDriverById(id);
        if (!driver) throw new Error('Driver not found');
        const newStatus = driver.active ? 0 : 1;
        dbManager.run('UPDATE drivers SET active = ?, updated_at = datetime("now", "localtime") WHERE id = ?', [newStatus, id]);
        dbManager.notifyChange('DRIVER_UPDATED', { id });
        return newStatus;
    },

    // --- Trucks ---
    getTrucks(includeInactive = false) {
        const sql = includeInactive
            ? `SELECT t.*, d.name AS driver_name, d.phone AS driver_phone
               FROM trucks t
               LEFT JOIN drivers d ON t.driver_id = d.id
               ORDER BY t.name ASC`
            : `SELECT t.*, d.name AS driver_name, d.phone AS driver_phone
               FROM trucks t
               LEFT JOIN drivers d ON t.driver_id = d.id
               WHERE t.active = 1
               ORDER BY t.name ASC`;
        return dbManager.query(sql);
    },

    getTruckById(id) {
        return dbManager.queryOne(`
            SELECT t.*, d.name AS driver_name, d.phone AS driver_phone
            FROM trucks t
            LEFT JOIN drivers d ON t.driver_id = d.id
            WHERE t.id = ?
        `, [id]);
    },

    createTruck({ name, registration_number = '', driver_id = null, active = 1, notes = '' }) {
        if (!name || !name.trim()) throw new Error('Truck name/number is required');
        const trimmed = name.trim();

        const result = dbManager.run(
            'INSERT INTO trucks (name, registration_number, driver_id, active, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now", "localtime"), datetime("now", "localtime"))',
            [trimmed, registration_number ? registration_number.trim() : '', driver_id || null, active ? 1 : 0, notes ? notes.trim() : '']
        );
        dbManager.notifyChange('TRUCK_CREATED', { id: result.lastInsertRowId });
        return result.lastInsertRowId;
    },

    updateTruck(id, { name, registration_number, driver_id, active, notes }) {
        const existing = this.getTruckById(id);
        if (!existing) throw new Error('Truck not found');

        dbManager.run(`
            UPDATE trucks SET
                name = ?,
                registration_number = ?,
                driver_id = ?,
                active = ?,
                notes = ?,
                updated_at = datetime("now", "localtime")
            WHERE id = ?
        `, [
            name ? name.trim() : existing.name,
            registration_number !== undefined ? registration_number.trim() : existing.registration_number,
            driver_id !== undefined ? (driver_id || null) : existing.driver_id,
            active !== undefined ? (active ? 1 : 0) : existing.active,
            notes !== undefined ? notes.trim() : existing.notes,
            id
        ]);
        dbManager.notifyChange('TRUCK_UPDATED', { id });
    },

    toggleTruckActive(id) {
        const truck = this.getTruckById(id);
        if (!truck) throw new Error('Truck not found');
        const newStatus = truck.active ? 0 : 1;
        dbManager.run('UPDATE trucks SET active = ?, updated_at = datetime("now", "localtime") WHERE id = ?', [newStatus, id]);
        dbManager.notifyChange('TRUCK_UPDATED', { id });
        return newStatus;
    }
};
