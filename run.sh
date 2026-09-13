#!/usr/bin/env bash
# Student-Mentor Educational Platform Runner
set -e

echo "=================================================="
echo "🚀 Starting Student-Mentor Educational Platform"
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

echo "[1/4] Installing / Verifying Python backend dependencies..."
python3 -m pip install -r backend/requirements.txt

echo "[2/4] Installing / Verifying Frontend dependencies..."
cd frontend && npm install && cd ..

echo "[3/4] Starting FastAPI Backend on port 8000..."
python3 start_backend.py &
BACKEND_PID=$!

echo "[4/4] Starting Vite Frontend on port 5173..."
cd frontend && npm run dev &
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
