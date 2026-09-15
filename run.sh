#!/usr/bin/env bash
# Student-Mentor Educational Platform Runner
set -e

echo "=================================================="
echo "🚀 Starting Synapse Educational Platform"
echo "=================================================="

# Check Python and Node.js
if ! command -v python3 &> /dev/null; then
    echo "❌ python3 not found. Please install Python 3.10+."
    exit 1
fi
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js 18+."
    exit 1
fi

echo "[1/4] Preparing Python Virtual Environment..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv 2>/dev/null || true
fi

if [ -f ".venv/bin/python" ]; then
    PYTHON_BIN=".venv/bin/python"
    PIP_BIN=".venv/bin/pip"
else
    PYTHON_BIN="python3"
    PIP_BIN="pip3"
fi

echo "[2/4] Installing / Verifying Python backend dependencies..."
if [ -f ".venv/bin/pip" ]; then
    $PIP_BIN install -r backend/requirements.txt
else
    $PIP_BIN install -r backend/requirements.txt --break-system-packages 2>/dev/null || $PIP_BIN install -r backend/requirements.txt --user
fi

echo "[3/4] Installing / Verifying Frontend dependencies..."
cd frontend && npm install && cd ..

echo "[4/4] Starting FastAPI Backend on port 8000..."
$PYTHON_BIN start_backend.py &
BACKEND_PID=$!

echo "[4/4] Starting Vite Frontend on port 5173..."
cd frontend && npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

trap "echo 'Stopping platform...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit" SIGINT SIGTERM EXIT

echo ""
echo "=================================================="
echo "✅ Platform is running successfully!"
echo "🌐 Frontend URL: http://localhost:5173"
echo "🔌 API Docs URL: http://localhost:8000/docs"
echo "=================================================="
echo "Press Ctrl+C to stop both servers."
wait
