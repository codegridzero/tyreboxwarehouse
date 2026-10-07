#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

echo "=================================================="
echo " Packaging Warehouse Management System for Deploy"
echo "=================================================="

node scripts/build_system.js
