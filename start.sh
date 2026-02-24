#!/bin/bash
# Start the FastAPI call server in the background
uvicorn api_server:app --host 0.0.0.0 --port 8000 &
API_PID=$!

# Start the LiveKit agent worker in the foreground
python agent.py start &
AGENT_PID=$!

# Wait for either to exit; if one crashes, stop the other
wait -n $API_PID $AGENT_PID
EXIT_CODE=$?
kill $API_PID $AGENT_PID 2>/dev/null
exit $EXIT_CODE
