/**
 * Server Auto-Merge Script
 * Automatically detects incoming updates and merges them non-destructively on server start.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mergeDatabaseFiles } from './db_merge_engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export async function runServerAutoMerge(silent = false) {
    const log = (...args) => { if (!silent) console.log(...args); };

    const targetDbPath = path.join(ROOT_DIR, 'warehouse.sqlite');
    const backupDir = path.join(ROOT_DIR, 'backups');
    const incomingFiles = [
        path.join(ROOT_DIR, 'incoming_update.sqlite'),
        path.join(ROOT_DIR, 'build_database.sqlite'),
        path.join(ROOT_DIR, 'warehouse_incoming.sqlite')
    ];

    let foundIncoming = null;
    for (const p of incomingFiles) {
        if (fs.existsSync(p)) {
            foundIncoming = p;
            break;
        }
    }

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    if (foundIncoming) {
        log(`\n======================================================`);
        log(` [DATABASE AUTO-MERGE] Incoming update detected: ${path.basename(foundIncoming)}`);
        log(` [DATABASE AUTO-MERGE] Performing non-destructive sync...`);
        log(`======================================================`);

        try {
            const result = await mergeDatabaseFiles(targetDbPath, foundIncoming, backupDir);
            log(` ✓ ${result.message}`);
            if (result.stats) {
                log(`   - Products: ${result.stats.products.added} added, ${result.stats.products.updated} updated, ${result.stats.products.preserved} preserved`);
                log(`   - Drivers:  ${result.stats.drivers.added} added, ${result.stats.drivers.preserved} preserved`);
                log(`   - Trucks:   ${result.stats.trucks.added} added, ${result.stats.trucks.preserved} preserved`);
                log(`   - Shifts:   ${result.stats.shifts.added} added, ${result.stats.shifts.preserved} preserved (0% loss)`);
            }

            // Archive the processed incoming file into backups
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const archivePath = path.join(backupDir, `applied_update_${timestamp}.sqlite`);
            fs.renameSync(foundIncoming, archivePath);
            log(` ✓ Archived incoming package to: ${path.relative(ROOT_DIR, archivePath)}`);
            log(`======================================================\n`);
            return result;
        } catch (err) {
            console.error(` [DATABASE AUTO-MERGE ERROR]:`, err);
            return { status: 'ERROR', error: err.message };
        }
    } else {
        // No incoming update file. Ensure target database exists
        if (!fs.existsSync(targetDbPath)) {
            log(` [DATABASE AUTO-MERGE] Initializing fresh warehouse database...`);
            const result = await mergeDatabaseFiles(targetDbPath, '', backupDir);
            return result;
        }
    }

    return { status: 'ALREADY_CURRENT' };
}

// If run directly from CLI (e.g. node scripts/server_auto_merge.js)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runServerAutoMerge().then(res => {
        console.log('Auto-merge check complete:', res.status || 'OK');
        process.exit(0);
    }).catch(err => {
        console.error('Auto-merge failed:', err);
        process.exit(1);
    });
}
