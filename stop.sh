
#!/bin/bash

echo "🛑 Stopping App Review Analyzer services..."

# Function to kill process on a port
# kill_port() {
#     PORT=$1
#     # Check if any process is listening on the port
#     PID=$(lsof -t -i:$PORT)
#     if [ -n "$PID" ]; then
#         echo "   -> Stopping process on port $PORT (PID: $PID)..."
#         kill -9 $PID
#     else
#         echo "   -> No process found on port $PORT."
#     fi
# }

# Stop Backend (Port 8000)
kill_port 8000

# Stop Frontend (Port 5173)
kill_port 5173

# Clean up temp excel files
echo "🧹 Cleaning up temporary downloads..."
rm -f backend/temp/*.xlsx

echo "✅ All services stopped and temp files cleaned."
