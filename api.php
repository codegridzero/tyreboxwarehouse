<?php
/**
 * Warehouse Database Cloud Sync Endpoint (Hostinger PHP & LiteSpeed Compatible)
 * Automatically receives live database updates from browser clients and persists to disk.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$dbFile = __DIR__ . '/warehouse.sqlite';
$backupDir = __DIR__ . '/backups';

// 1. GET Requests: Return Version and Status
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');

    if (file_exists($dbFile)) {
        $size = filesize($dbFile);
        $mtime = filemtime($dbFile);
        $hash = substr(hash_file('sha256', $dbFile), 0, 12);

        echo json_encode([
            'exists' => true,
            'version' => $mtime * 1000,
            'lastModified' => date('c', $mtime),
            'size' => $size,
            'hash' => $hash
        ]);
    } else {
        echo json_encode([
            'exists' => false,
            'version' => 0,
            'size' => 0,
            'hash' => ''
        ]);
    }
    exit;
}

// 2. POST Requests: Persist Live SQLite Binary from Browser to Disk
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');

    $rawData = file_get_contents('php://input');

    if (strlen($rawData) < 100) {
        http_response_code(400);
        echo json_encode(['error' => 'Payload too small or invalid SQLite binary']);
        exit;
    }

    // Verify SQLite 3 header
    if (substr($rawData, 0, 15) !== 'SQLite format 3') {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid SQLite format signature']);
        exit;
    }

    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0755, true);
    }

    // Take timestamped safety backup before overwriting
    if (file_exists($dbFile)) {
        $backupName = $backupDir . '/auto_backup_' . time() . '.sqlite';
        copy($dbFile, $backupName);

        // Prune old backups (keep last 20)
        $backups = glob($backupDir . '/auto_backup_*.sqlite');
        if (count($backups) > 20) {
            usort($backups, function($a, $b) { return filemtime($b) - filemtime($a); });
            foreach (array_slice($backups, 20) as $oldBackup) {
                @unlink($oldBackup);
            }
        }
    }

    // Write live SQLite binary to disk
    $saved = file_put_contents($dbFile, $rawData);

    if ($saved !== false) {
        $hash = substr(hash('sha256', $rawData), 0, 12);
        echo json_encode([
            'success' => true,
            'message' => 'Live database successfully saved to server disk',
            'size' => $saved,
            'hash' => $hash,
            'timestamp' => date('c')
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to write warehouse.sqlite to disk. Check directory permissions.']);
    }
    exit;
}
