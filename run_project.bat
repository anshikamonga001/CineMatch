@echo off
echo ===================================================
echo CineMatch Server Runner
echo ===================================================
echo Starting Backend Server...
start cmd /k "cd backend && npm run dev"
echo Starting Frontend...
start "" "frontend\index.html"
echo ===================================================
echo CineMatch is now running!
echo ===================================================
