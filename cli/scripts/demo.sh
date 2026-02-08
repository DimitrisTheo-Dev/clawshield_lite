#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$CLI_DIR"

echo "== ClawShield Lite demo =="
echo "Building CLI..."
npm run build >/dev/null

scan_verdict() {
  target="$1"
  expected="$2"
  json=""
  verdict=""

  json="$(node dist/main.js scan_json "$target")"
  verdict="$(node -e 'const data=JSON.parse(process.argv[1]); process.stdout.write(data.verdict);' "$json")"

  if [ "$verdict" = "$expected" ]; then
    echo "[PASS] $target => $verdict"
  else
    echo "[FAIL] $target => $verdict (expected $expected)"
    exit 1
  fi
}

scan_verdict "file:../policy/samples/benign.txt" "ALLOW"
scan_verdict "file:../policy/samples/ambiguous.txt" "SANITIZE"
scan_verdict "file:../policy/samples/malicious.txt" "BLOCK"

if [ "${CLAWSHIELD_POST_TO_WALRUS:-0}" = "1" ]; then
  echo "Walrus logging is enabled. Verifying blob storage..."
  walrus_json="$(node dist/main.js scan_json "file:../policy/samples/malicious.txt")"
  walrus_stored="$(node -e 'const d=JSON.parse(process.argv[1]); process.stdout.write(String(d.walrus.stored));' "$walrus_json")"
  walrus_blob_id="$(node -e 'const d=JSON.parse(process.argv[1]); process.stdout.write(d.walrus.blob_id || "");' "$walrus_json")"

  if [ "$walrus_stored" = "true" ] && [ -n "$walrus_blob_id" ]; then
    echo "[PASS] walrus blob id=$walrus_blob_id"
  else
    echo "[FAIL] walrus logging did not succeed"
    echo "$walrus_json"
    exit 1
  fi
else
  echo "Walrus post skipped: set CLAWSHIELD_POST_TO_WALRUS=1 to enable."
fi

if [ "${CLAWSHIELD_POST_TO_SUI:-0}" = "1" ] && [ -n "${CLAWSHIELD_SUI_PACKAGE_ID:-}" ]; then
  echo "Posting receipt to Sui is enabled. Verifying on-chain post..."
  post_json="$(node dist/main.js scan_json "file:../policy/samples/malicious.txt")"
  posted="$(node -e 'const d=JSON.parse(process.argv[1]); process.stdout.write(String(d.sui.posted));' "$post_json")"
  tx_digest="$(node -e 'const d=JSON.parse(process.argv[1]); process.stdout.write(d.sui.tx_digest || "");' "$post_json")"

  if [ "$posted" = "true" ] && [ -n "$tx_digest" ]; then
    echo "[PASS] on-chain receipt tx=$tx_digest"
  else
    echo "[FAIL] on-chain receipt was not posted"
    echo "$post_json"
    exit 1
  fi
else
  echo "Sui post skipped: set CLAWSHIELD_POST_TO_SUI=1 and CLAWSHIELD_SUI_PACKAGE_ID to enable."
fi

echo "Demo completed."
