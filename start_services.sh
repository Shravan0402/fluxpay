#!/bin/bash

# Start Services Script for Smart Agent System
echo "Starting Smart Agent System..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python3 is not installed. Please install Python3 first."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "pip3 is not installed. Please install pip3 first."
    exit 1
fi

# Install Python dependencies
echo "Installing Python dependencies..."
pip3 install -r requirements.txt

# Start the backend API
echo "Starting backend API on port 8000..."
cd backend
python3 main.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start the smart agent
echo "Starting smart agent on port 8001..."
cd ..
python3 smart_agent.py &
AGENT_PID=$!

# Wait a moment for agent to start
sleep 3

# Start the frontend (if using Next.js)
echo "Starting frontend..."
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!

echo "All services started!"
echo "Backend API: http://localhost:8000"
echo "Smart Agent: http://localhost:8001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $AGENT_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT

# Wait for all background processes
wait
