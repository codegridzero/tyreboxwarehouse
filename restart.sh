#!/usr/bin/env bash
SERVICE_NAME="warehouse.service"

echo "Restarting Warehouse Management System..."
systemctl --user restart "${SERVICE_NAME}"
sleep 1
systemctl --user status "${SERVICE_NAME}" --no-pager
echo ""
echo "App is available at: http://localhost:8080"
