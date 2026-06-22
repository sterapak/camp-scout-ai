#!/usr/bin/env bash
# Camp Scout AI — repeatable project verification
# Runs available quality checks from package.json, then a production build.
# Exits non-zero on the first failure. Performs no git or deployment actions.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

has_npm_script() {
  node -e "
    const scripts = require('./package.json').scripts || {};
    process.exit(Object.prototype.hasOwnProperty.call(scripts, process.argv[1]) ? 0 : 1);
  " "$1"
}

get_npm_script() {
  node -e "console.log((require('./package.json').scripts || {})[process.argv[1]] || '')" "$1"
}

section() {
  echo ""
  echo "========================================"
  echo "  $1"
  echo "========================================"
}

pass() {
  echo ""
  echo "✓ PASS: $1"
}

fail() {
  echo ""
  echo "✗ FAIL: $1"
  exit 1
}

run_if_available() {
  local script_name="$1"
  local label="$2"

  if ! has_npm_script "$script_name"; then
    section "$label (skipped)"
    echo "  npm script '$script_name' not found — skipped"
    return 0
  fi

  section "$label"
  echo "  npm run $script_name"
  if npm run "$script_name"; then
    pass "$label"
  else
    fail "$label"
  fi
}

resolve_unit_test_script() {
  for script_name in test:unit unit test; do
    if has_npm_script "$script_name"; then
      echo "$script_name"
      return 0
    fi
  done
  return 1
}

resolve_coverage_script() {
  for script_name in coverage test:coverage test:ci; do
    if has_npm_script "$script_name"; then
      echo "$script_name"
      return 0
    fi
  done
  return 1
}

echo "Camp Scout AI — Project Verification"
echo "Project root: $ROOT"
echo ""

# --- Lint ---
run_if_available "lint" "Lint"

# --- Unit tests ---
UNIT_SCRIPT=""
if UNIT_SCRIPT="$(resolve_unit_test_script)"; then
  section "Unit Tests"
  echo "  npm run $UNIT_SCRIPT"
  if npm run "$UNIT_SCRIPT"; then
    pass "Unit Tests"
  else
    fail "Unit Tests"
  fi
else
  section "Unit Tests (skipped)"
  echo "  No test:unit, unit, or test script found — skipped"
fi

# --- Coverage ---
COVERAGE_SCRIPT=""
if COVERAGE_SCRIPT="$(resolve_coverage_script)"; then
  section "Coverage"
  echo "  npm run $COVERAGE_SCRIPT"
  if npm run "$COVERAGE_SCRIPT"; then
    pass "Coverage"
  else
    fail "Coverage"
  fi
elif has_npm_script "test"; then
  TEST_CMD="$(get_npm_script test)"
  if [[ "$TEST_CMD" == *coverage* ]]; then
    section "Coverage (included in Unit Tests)"
    echo "  npm run test already includes coverage — no separate step"
  else
    section "Coverage (skipped)"
    echo "  No coverage script found — skipped"
  fi
else
  section "Coverage (skipped)"
  echo "  No coverage script found — skipped"
fi

# --- Production build (required) ---
if ! has_npm_script "build"; then
  fail "Production Build — npm script 'build' is required but not found"
fi

section "Production Build"
echo "  npm run build"
if npm run build; then
  pass "Production Build"
else
  fail "Production Build"
fi

section "Verification Complete"
echo ""
echo "✓ ALL CHECKS PASSED"
