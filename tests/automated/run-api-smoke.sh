#!/usr/bin/env bash
# Live REST API smoke test for the Arkanoid Spring Boot backend.
# Usage:  bash tests/automated/run-api-smoke.sh [http://localhost:8080]
# Requires: curl, jq ; backend already running (cd server && mvn spring-boot:run)

set -u
BASE="${1:-http://localhost:8080}"
BODY="$(mktemp)"
FAILS=0
PASSES=0
USER="qa_$(date +%s)_$RANDOM"

pass() { PASSES=$((PASSES + 1)); printf '  \033[32m✔ PASS:\033[0m %s\n' "$1"; }
fail() { FAILS=$((FAILS + 1)); printf '  \033[31m✖ FAIL:\033[0m %s\n' "$1"; }
check_eq() { if [ "$2" = "$3" ]; then pass "$1"; else fail "$1 (expected $3, got $2)"; fi; }
check_true() { if [ "$2" = "true" ]; then pass "$1"; else fail "$1"; fi; }

request() {
  # request METHOD PATH [DATA] [TOKEN]
  local method="$1" path="$2" data="${3:-}" token="${4:-}"
  local args=(-s -o "$BODY" -w '%{http_code}' -X "$method" "$BASE$path")
  if [ -n "$data" ]; then args+=(-H 'Content-Type: application/json' -d "$data"); fi
  if [ -n "$token" ]; then args+=(-H "Authorization: Bearer $token"); fi
  curl "${args[@]}"
}

echo
echo "======================================================"
echo "   ARKANOID API SMOKE TEST - $BASE"
echo "======================================================"

CODE=$(request GET /api/health)
check_eq "Health endpoint returns 200" "$CODE" "200"
check_eq "Health status is UP" "$(jq -r .status "$BODY" 2>/dev/null)" "UP"

CODE=$(request POST /api/auth/register "{\"username\":\"$USER\",\"password\":\"test1234\"}")
check_eq "Register new player returns 200" "$CODE" "200"
TOKEN=$(jq -r '.token // empty' "$BODY" 2>/dev/null)
check_true "Register returns a JWT" "$([ -n "$TOKEN" ] && echo true)"

CODE=$(request POST /api/auth/register "{\"username\":\"$USER\",\"password\":\"test1234\"}")
check_eq "Duplicate username is rejected with 400" "$CODE" "400"

CODE=$(request POST /api/auth/register '{"username":"ab","password":"1"}')
check_eq "Bean-validation errors return 400 (not 403)" "$CODE" "400"

CODE=$(request POST /api/auth/login "{\"username\":\"$USER\",\"password\":\"wrong\"}")
check_eq "Wrong password returns 400" "$CODE" "400"

CODE=$(request POST /api/auth/login "{\"username\":\"$USER\",\"password\":\"test1234\"}")
check_eq "Correct login returns 200" "$CODE" "200"
TOKEN=$(jq -r '.token // empty' "$BODY" 2>/dev/null)

CODE=$(request GET /api/user/profile "" "")
check_eq "Protected profile without JWT returns 401" "$CODE" "401"

CODE=$(request POST /api/scores '{"score":1234,"levelReached":5,"maxCombo":7}' "$TOKEN")
check_eq "Submit best score returns 200" "$CODE" "200"

CODE=$(request POST /api/scores '{"score":999,"levelReached":3,"maxCombo":2}' "$TOKEN")
check_eq "Submit second (lower) score returns 200" "$CODE" "200"

CODE=$(request POST /api/scores '{"score":-5,"levelReached":0,"maxCombo":-1}' "$TOKEN")
check_eq "Invalid score payload returns 400" "$CODE" "400"

CODE=$(request GET "/api/leaderboard?limit=10")
check_eq "Leaderboard returns 200" "$CODE" "200"
COUNT=$(jq --arg u "$USER" '[.[] | select(.username == $u)] | length' "$BODY" 2>/dev/null)
check_eq "Leaderboard shows this player only once" "$COUNT" "1"
SCORE=$(jq -r --arg u "$USER" '.[] | select(.username == $u) | .score' "$BODY" 2>/dev/null)
check_eq "Leaderboard keeps the player's best score" "$SCORE" "1234"

CODE=$(request GET /api/user/profile "" "$TOKEN")
check_eq "Profile returns 200 with JWT" "$CODE" "200"
check_eq "Personal best score is 1234" "$(jq -r .personalBestScore "$BODY")" "1234"
check_eq "Highest unlocked level is 5" "$(jq -r .highestLevelUnlocked "$BODY")" "5"
check_eq "Games played is 2" "$(jq -r .totalGamesPlayed "$BODY")" "2"
check_eq "Global rank is 1" "$(jq -r .globalRank "$BODY")" "1"

CODE=$(request POST /api/user/progress '{"level":10}' "$TOKEN")
check_eq "Progress update to level 10 returns 200" "$CODE" "200"
check_eq "Progress reports level 10" "$(jq -r .highestLevelUnlocked "$BODY")" "10"

CODE=$(request POST /api/user/progress '{"level":2}' "$TOKEN")
check_eq "Lower progress update is accepted but ignored" "$(jq -r .highestLevelUnlocked "$BODY")" "10"

CODE=$(request POST /api/user/progress '{"level":0}' "$TOKEN")
check_eq "Progress with level 0 returns 400" "$CODE" "400"

echo "------------------------------------------------------"
echo "   PASSED: $PASSES   FAILED: $FAILS"
echo "======================================================"
echo
rm -f "$BODY"
exit $([ "$FAILS" -eq 0 ] && echo 0 || echo 1)
