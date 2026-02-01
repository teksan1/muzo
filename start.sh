#!/bin/bash

# Muzo Unified Start Script
# Launches both the FastAPI backend and Expo frontend

# Colors for logging
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Muzo DJ Application...${NC}"

# Function to handle script termination
cleanup() {
    echo -e "\n${BLUE}🛑 Shutting down Muzo...${NC}"
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# 1. Start Backend
echo -e "${GREEN}📡 Starting Backend API (Port 8000)...${NC}"
cd backend
python3 server.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to initialize
sleep 2

# 2. Start Frontend
echo -e "${GREEN}📱 Starting Frontend Web (Expo)...${NC}"
cd frontend
# Using --web to ensure it starts in the browser environment
npx expo start --web &
FRONTEND_PID=$!
cd ..

echo -e "${BLUE}✨ Muzo is running!${NC}"
echo -e "Backend: http://localhost:8000"
echo -e "Frontend: http://localhost:8081 (default Expo web port)"
echo -e "Press ${BLUE}Ctrl+C${NC} to stop all services."

# Keep script running to maintain processes
wait
