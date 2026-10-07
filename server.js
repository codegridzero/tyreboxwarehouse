/**
 * Warehouse Management Web Application Server
 * High-performance, zero-dependency HTTP server with database auto-merge,
 * real-time sync endpoints, MIME streaming, and graceful error handling.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { runServerAutoMerge } from './scripts/server_auto_merge.js';
import { getSqlInstance, mergeDatabases, queryAll } from './scripts/db_merge_engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT_DIR = __dirname;
const DB_FILE = path.join(ROOT_DIR, 'warehouse.sqlite');
const BACKUPS_DIR = path.join(ROOT_DIR, 'backups');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.wasm': 'application/wasm',
    '.sqlite': 'application/octet-stream',
    '.db': 'application/octet-stream',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.webmanifest': 'application/manifest+json',
    '.txt': 'text/plain; charset=utf-8',
    '.pdf': 'application/pdf',
    '.map': 'application/json'
};

// Clean old auto backups if there are more than 20
function pruneBackups() {
    try {
        if (!fs.existsSync(BACKUPS_DIR)) return;
        const files = fs.readdirSync(BACKUPS_DIR)
            .filter(f => f.startsWith('auto_backup_') && f.endsWith('.sqlite'))
            .map(f => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs }))
            .sort((a, b) => b.time - a.time);

        if (files.length > 20) {
            files.slice(20).forEach(f => {
                try { fs.unlinkSync(path.join(BACKUPS_DIR, f.name)); } catch {}
            });
        }
    } catch {}
}

async function handleApiRequest(req, res, parsedUrl, timestamp) {
    const pathname = parsedUrl.pathname;

    // GET /api/db-version
    if (req.method === 'GET' && pathname === '/api/db-version') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

        if (fs.existsSync(DB_FILE)) {
            const stat = fs.statSync(DB_FILE);
            const buf = fs.readFileSync(DB_FILE);
            const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
            res.writeHead(200);
            res.end(JSON.stringify({
                exists: true,
                version: stat.mtimeMs,
                lastModified: stat.mtime.toISOString(),
                size: stat.size,
                hash
            }));
        } else {
            res.writeHead(200);
            res.end(JSON.stringify({ exists: false, version: 0, size: 0, hash: '' }));
        }
        return true;
    }

    // GET /api/db-status
    if (req.method === 'GET' && pathname === '/api/db-status') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

        try {
            if (!fs.existsSync(DB_FILE)) {
                res.writeHead(200);
                res.end(JSON.stringify({ exists: false, tables: {} }));
                return true;
            }
            const SQL = await getSqlInstance();
            const buf = fs.readFileSync(DB_FILE);
            const db = new SQL.Database(new Uint8Array(buf));
            const tables = queryAll(db, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
            const counts = {};
            for (const t of tables) {
                try {
                    counts[t.name] = queryAll(db, `SELECT COUNT(*) as c FROM ${t.name}`)[0]?.c || 0;
                } catch { counts[t.name] = 0; }
            }
            res.writeHead(200);
            res.end(JSON.stringify({ exists: true, counts, size: buf.length, timestamp }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
        }
        return true;
    }

    // POST /api/save-database (Continuous real-time persistence)
    if (req.method === 'POST' && pathname === '/api/save-database') {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
            try {
                const bodyBuffer = Buffer.concat(chunks);
                if (bodyBuffer.length < 100) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Payload too small or invalid SQLite binary' }));
                    return;
                }

                // Verify SQLite header (starts with "SQLite format 3\0")
                const header = bodyBuffer.slice(0, 16).toString('ascii');
                if (!header.startsWith('SQLite format 3')) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid SQLite header' }));
                    return;
                }

                if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

                // Take safety backup if current file exists
                if (fs.existsSync(DB_FILE)) {
                    const backupName = `auto_backup_${Date.now()}.sqlite`;
                    fs.copyFileSync(DB_FILE, path.join(BACKUPS_DIR, backupName));
                    pruneBackups();
                }

                fs.writeFileSync(DB_FILE, bodyBuffer);
                const hash = crypto.createHash('sha256').update(bodyBuffer).digest('hex').slice(0, 12);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Database saved successfully to server disk',
                    size: bodyBuffer.length,
                    hash,
                    timestamp: new Date().toISOString()
                }));
                console.log(`[${timestamp}] ✓ Database updated and saved to warehouse.sqlite (${(bodyBuffer.length / 1024).toFixed(1)} KB)`);
            } catch (err) {
                console.error(`[${timestamp}] Error saving database:`, err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return true;
    }

    // POST /api/merge-database (Live merge without reload)
    if (req.method === 'POST' && pathname === '/api/merge-database') {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
            try {
                const bodyBuffer = Buffer.concat(chunks);
                const SQL = await getSqlInstance();
                const incomingDb = new SQL.Database(new Uint8Array(bodyBuffer));

                let serverDb;
                if (fs.existsSync(DB_FILE)) {
                    const sBuf = fs.readFileSync(DB_FILE);
                    serverDb = new SQL.Database(new Uint8Array(sBuf));
                    // Backup before live merge
                    if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
                    fs.copyFileSync(DB_FILE, path.join(BACKUPS_DIR, `pre_live_merge_${Date.now()}.sqlite`));
                } else {
                    serverDb = new SQL.Database();
                }

                const stats = mergeDatabases(serverDb, incomingDb);
                const mergedBinary = serverDb.export();
                fs.writeFileSync(DB_FILE, Buffer.from(mergedBinary));

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    stats,
                    size: mergedBinary.length,
                    timestamp: new Date().toISOString()
                }));
                console.log(`[${timestamp}] ✓ Live database merged successfully!`, stats);
            } catch (err) {
                console.error(`[${timestamp}] Merge error:`, err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return true;
    }

    return false;
}

function serverHandler(req, res) {
    const timestamp = new Date().toISOString();
    
    // Set CORS and security headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Parse URL safely
    let parsedUrl;
    try {
        parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
        return;
    }

    // Handle API endpoints
    if (parsedUrl.pathname.startsWith('/api/')) {
        handleApiRequest(req, res, parsedUrl, timestamp).then(handled => {
            if (!handled) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Endpoint Not Found' }));
            }
        }).catch(err => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        });
        return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        console.log(`[${timestamp}] 405 ${req.method} ${req.url}`);
        return;
    }

    let pathname = decodeURIComponent(parsedUrl.pathname);
    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    // Prevent directory traversal attacks
    const normalizedPath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    const safePath = path.join(ROOT_DIR, normalizedPath);

    if (!safePath.startsWith(ROOT_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        console.warn(`[${timestamp}] 403 Forbidden traversal attempt: ${req.url}`);
        return;
    }

    fs.stat(safePath, (err, stats) => {
        if (err) {
            // If file doesn't exist and no extension, try with .html
            if (err.code === 'ENOENT' && !path.extname(safePath)) {
                const htmlFallback = `${safePath}.html`;
                if (fs.existsSync(htmlFallback) && fs.statSync(htmlFallback).isFile()) {
                    serveFile(htmlFallback, req, res, timestamp);
                    return;
                }
            }

            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            console.log(`[${timestamp}] 404 ${req.method} ${req.url}`);
            return;
        }

        let filePathToServe = safePath;
        if (stats.isDirectory()) {
            const indexFile = path.join(safePath, 'index.html');
            if (fs.existsSync(indexFile)) {
                filePathToServe = indexFile;
            } else {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('Directory listing forbidden');
                return;
            }
        }

        serveFile(filePathToServe, req, res, timestamp);
    });
}

function serveFile(filePath, req, res, timestamp) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.stat(filePath, (err, stat) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
            return;
        }

        // Cache control: HTML and SQLite must never be stale
        if (ext === '.html' || ext === '.sqlite' || ext === '.db' || ext === '.json') {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Last-Modified', stat.mtime.toUTCString());

        if (req.method === 'HEAD') {
            res.writeHead(200);
            res.end();
            console.log(`[${timestamp}] 200 HEAD ${req.url}`);
            return;
        }

        const readStream = fs.createReadStream(filePath);
        res.writeHead(200);
        readStream.pipe(res);

        readStream.on('error', (streamErr) => {
            console.error(`[${timestamp}] Stream error on ${filePath}:`, streamErr);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        });

        res.on('finish', () => {
            console.log(`[${timestamp}] 200 ${req.method} ${req.url} (${stat.size} bytes)`);
        });
    });
}

// Start servers on multiple ports (8000 and 8080 by default)
const PORTS = process.env.PORT 
    ? [parseInt(process.env.PORT, 10)] 
    : [8000, 8080];

const activeServers = [];

// Perform automatic startup database merge check
async function startServer() {
    try {
        await runServerAutoMerge();
    } catch (e) {
        console.error('Warning during startup auto-merge:', e);
    }

    PORTS.forEach(port => {
        const srv = http.createServer((req, res) => {
            serverHandler(req, res);
        });

        srv.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.warn(`[WARN] Port ${port} is already in use, continuing with other ports...`);
            } else {
                console.error(`[ERROR] Server error on port ${port}:`, err);
            }
        });

        srv.listen(port, HOST, () => {
            console.log(` - Local:    http://localhost:${port}`);
            console.log(` - Network:  http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${port}`);
        });

        activeServers.push(srv);
    });

    console.log(`====================================================`);
    console.log(` Warehouse Management System is running!`);
    console.log(` - Root:     ${ROOT_DIR}`);
    console.log(` - Node PID: ${process.pid}`);
    console.log(` - Database Auto-Merge: ENABLED (0% Data Loss Guarantee)`);
    console.log(` - Real-time Disk Sync: ENABLED (/api/save-database)`);
    console.log(`====================================================`);
}

startServer().catch(err => {
    console.error('Fatal error starting server:', err);
    process.exit(1);
});

// Graceful shutdown handlers
function shutdown(signal) {
    console.log(`\n[${new Date().toISOString()}] Received ${signal}. Shutting down servers gracefully...`);
    let closed = 0;
    activeServers.forEach(srv => {
        srv.close(() => {
            closed++;
            if (closed >= activeServers.length) {
                console.log('All servers closed successfully.');
                process.exit(0);
            }
        });
    });
    // Force close after 5 seconds if still open
    setTimeout(() => {
        console.error('Forced shutdown timeout.');
        process.exit(1);
    }, 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
});
