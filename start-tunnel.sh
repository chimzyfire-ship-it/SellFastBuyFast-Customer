#!/bin/bash
set -e

PORT=${EXPO_PORT:-8085}

echo "🚀 Starting Enterprise-Grade Cloudflare Tunnel on port $PORT..."

# Clean up any lingering cloudflared processes for this port
pkill -f "cloudflared tunnel --url http://localhost:$PORT" 2>/dev/null || true

CLOUDFLARE_LOG=$(mktemp)
/usr/local/bin/cloudflared tunnel --url "http://localhost:$PORT" > "$CLOUDFLARE_LOG" 2>&1 &
CF_PID=$!

trap "kill $CF_PID 2>/dev/null || true" EXIT INT TERM

echo "⏳ Establishing Cloudflare edge tunnel..."
TUNNEL_URL=""
for i in {1..40}; do
  TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$CLOUDFLARE_LOG" | head -n 1 || true)
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  sleep 0.5
done

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Could not establish Cloudflare tunnel. Output:"
  cat "$CLOUDFLARE_LOG"
  exit 1
fi

echo "=================================================="
echo "✅ CLOUDFLARE TUNNEL IS LIVE: $TUNNEL_URL"
echo "📱 EXPO GO URL: exp://${TUNNEL_URL#https://}"
echo "=================================================="
echo ""
echo "Starting Expo on port $PORT with clean cache (-c) in non-interactive mode..."

# Use --non-interactive so Metro does not exit on stdin disconnect
EXPO_PACKAGER_PROXY_URL="$TUNNEL_URL" npx expo start --lan -c --port "$PORT" --non-interactive
