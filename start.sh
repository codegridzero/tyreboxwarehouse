#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="warehouse.service"
USER_SYSTEMD_DIR="${HOME}/.config/systemd/user"

echo "=================================================="
echo " Starting Warehouse Management System Service"
echo "=================================================="

# Ensure user systemd directory exists
mkdir -p "${USER_SYSTEMD_DIR}"

# Copy/update service file
cp "${SCRIPT_DIR}/${SERVICE_NAME}" "${USER_SYSTEMD_DIR}/${SERVICE_NAME}"

# Reload systemd user daemon
systemctl --user daemon-reload

# Enable service for auto-start on boot/login
systemctl --user enable "${SERVICE_NAME}"

# Start or restart the service
systemctl --user restart "${SERVICE_NAME}"

# Enable linger if loginctl is available so it stays running in background
if command -v loginctl >/dev/null 2>&1; then
    loginctl enable-linger "$USER" 2>/dev/null || true
fi

# Sleep briefly to ensure startup
sleep 1.5

# Check status
if systemctl --user is-active --quiet "${SERVICE_NAME}"; then
    echo ""
    echo " [SUCCESS] Warehouse Service is RUNNING and AUTO-RESTART is ACTIVE!"
    echo ""
    echo " App URLs: 
   - Primary:   http://localhost:8000
   - Secondary: http://localhost:8080"
    echo " Auto-Restart Policy: Always restarts within 3 seconds if stopped or killed."
    echo " Auto-Start on Boot: ENABLED"
    echo ""
    echo " Commands:"
    echo "   - View status:  ./status.sh  (or: systemctl --user status warehouse)"
    echo "   - View logs:    journalctl --user -u warehouse -f"
    echo "   - Restart app:  ./restart.sh (or: systemctl --user restart warehouse)"
    echo "   - Stop app:     ./stop.sh    (or: systemctl --user stop warehouse)"
    echo "=================================================="
else
    echo " [ERROR] Failed to start warehouse service. Checking logs..."
    journalctl --user -u "${SERVICE_NAME}" -n 20 --no-pager
    exit 1
fi
