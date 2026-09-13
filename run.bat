@echo off
echo ==================================================
echo Starting Student-Mentor Educational Platform
echo ==================================================

echo [1/4] Installing / Verifying Python backend dependencies...
python -m pip install -r backend\requirements.txt

echo [2/4] Installing / Verifying Frontend dependencies...
cd frontend
call npm install
cd ..

echo [3/4] Starting FastAPI Backend on port 8000...
start cmd /k "python start_backend.py"

echo [4/4] Starting Vite Frontend on port 5173...
cd frontend
start cmd /k "npm run dev"
cd ..

echo ==================================================
echo Platform is running!
echo Frontend URL: http://localhost:5173
echo API Docs URL: http://localhost:8000/docs
echo ==================================================
