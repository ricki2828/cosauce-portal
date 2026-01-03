#!/bin/bash
# Worker Control Script
# Usage: ./worker_control.sh [start|stop|status|restart]

WORKER_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$WORKER_DIR/worker.pid"
LOG_FILE="$WORKER_DIR/outreach_worker.log"
PYTHON_PATH="${HOME}/.pyenv/versions/3.11.9/bin/python3"

start_worker() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "Worker already running (PID: $PID)"
            return 1
        fi
    fi

    echo "Starting outreach worker..."
    cd "$WORKER_DIR/.."
    source venv/bin/activate 2>/dev/null || true

    nohup "$PYTHON_PATH" "$WORKER_DIR/outreach_worker.py" >> "$LOG_FILE" 2>&1 &

    sleep 2
    if [ -f "$PID_FILE" ]; then
        echo "Worker started (PID: $(cat $PID_FILE))"
    else
        echo "Failed to start worker. Check $LOG_FILE for errors."
        return 1
    fi
}

stop_worker() {
    if [ ! -f "$PID_FILE" ]; then
        echo "Worker not running (no PID file)"
        return 0
    fi

    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Stopping worker (PID: $PID)..."
        kill "$PID"
        sleep 2
        if kill -0 "$PID" 2>/dev/null; then
            echo "Force killing..."
            kill -9 "$PID"
        fi
        rm -f "$PID_FILE"
        echo "Worker stopped"
    else
        echo "Worker not running (stale PID file)"
        rm -f "$PID_FILE"
    fi
}

login_linkedin() {
    echo "Starting LinkedIn login flow..."
    cd "$WORKER_DIR/.."
    source venv/bin/activate 2>/dev/null || true
    "$PYTHON_PATH" "$WORKER_DIR/outreach_worker.py" --login
}

check_login() {
    echo "Checking LinkedIn session..."
    cd "$WORKER_DIR/.."
    source venv/bin/activate 2>/dev/null || true
    "$PYTHON_PATH" "$WORKER_DIR/outreach_worker.py" --check-login
}

status_worker() {
    if [ ! -f "$PID_FILE" ]; then
        echo "Worker: NOT RUNNING"
        return 1
    fi

    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Worker: RUNNING (PID: $PID)"
        echo ""
        echo "Last 5 log entries:"
        tail -5 "$LOG_FILE" 2>/dev/null || echo "(no logs)"
        return 0
    else
        echo "Worker: NOT RUNNING (stale PID file)"
        rm -f "$PID_FILE"
        return 1
    fi
}

case "$1" in
    start)
        start_worker
        ;;
    stop)
        stop_worker
        ;;
    restart)
        stop_worker
        sleep 1
        start_worker
        ;;
    status)
        status_worker
        ;;
    login)
        login_linkedin
        ;;
    check-login)
        check_login
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|login|check-login}"
        exit 1
        ;;
esac
