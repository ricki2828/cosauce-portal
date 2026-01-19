#!/bin/bash
# Backend health check script

echo "========================================"
echo "Backend Health Check"
echo "========================================"
echo ""

cd /home/ricki28/cosauce-portal/backend

echo "1. Python Import Check:"
echo "--------------------------------------------"
source venv/bin/activate
python -c "from app.main import app; print('✓ App imports successfully')" 2>&1
IMPORT_STATUS=$?
echo ""

echo "2. Service Status:"
echo "--------------------------------------------"
systemctl --user status cosauce-portal --no-pager | head -8
echo ""

echo "3. Health Endpoint:"
echo "--------------------------------------------"
curl -s http://localhost:8004/health | jq . 2>/dev/null || curl -s http://localhost:8004/health
echo ""

echo "4. Recent Logs (last 15 lines):"
echo "--------------------------------------------"
journalctl --user -u cosauce-portal -n 15 --no-pager | tail -15
echo ""

echo "========================================"
if [ $IMPORT_STATUS -eq 0 ]; then
    echo "✓ Backend is healthy"
else
    echo "✗ Backend has import errors - check logs"
fi
echo "========================================"
