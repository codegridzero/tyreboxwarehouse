#!/usr/bin/env bash
SERVICE_NAME="warehouse.service"

echo "Stopping Warehouse Management System..."
systemctl --user stop "${SERVICE_NAME}"
echo "Warehouse Service stopped."
