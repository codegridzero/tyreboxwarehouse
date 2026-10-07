#!/usr/bin/env bash
SERVICE_NAME="warehouse.service"

echo "=================================================="
echo " Warehouse Management Service Status"
echo "=================================================="
systemctl --user status "${SERVICE_NAME}" --no-pager
echo ""
echo "---------------- Recent Logs --------------------"
journalctl --user -u "${SERVICE_NAME}" -n 15 --no-pager
echo "=================================================="
