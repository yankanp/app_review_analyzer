
#!/bin/bash

# Function to kill processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

echo "🚀 Starting App Review Analyzer..."

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found!"
    exit 1
fi

# Start Backend
echo "📈 Starting Backend Server (Port 8000)..."
source venv/bin/activate
uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!

# Start Frontend
echo "🎨 Starting Frontend Server (Port 5173)..."
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!

echo ""
echo "✅ App is running!"
echo "   -> Open: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop."

wait
