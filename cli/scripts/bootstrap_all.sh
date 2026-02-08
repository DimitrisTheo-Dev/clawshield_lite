#!/usr/bin/env bash
set -euo pipefail

NETWORK="testnet"
WITH_WALRUS="0"
SKIP_PUBLISH="0"
SKIP_SCAN="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --network)
      NETWORK="${2:-}"
      shift 2
      ;;
    --with-walrus)
      WITH_WALRUS="1"
      shift
      ;;
    --skip-publish)
      SKIP_PUBLISH="1"
      shift
      ;;
    --skip-scan)
      SKIP_SCAN="1"
      shift
      ;;
    -h|--help)
      cat <<'USAGE'
Usage:
  ./scripts/bootstrap_all.sh [options]

Options:
  --network <testnet|devnet>  Sui network to use (default: testnet)
  --with-walrus               Install/configure Walrus and enable receipt blob logging
  --skip-publish              Skip Move publish and package-id export generation
  --skip-scan                 Skip post-setup malicious sample scan
  -h, --help                  Show this help
USAGE
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "$NETWORK" != "testnet" && "$NETWORK" != "devnet" ]]; then
  echo "Unsupported network: $NETWORK (use testnet or devnet)" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$CLI_DIR/.clawshield.env"

if [[ "$NETWORK" == "testnet" ]]; then
  RPC_URL="https://fullnode.testnet.sui.io:443"
else
  RPC_URL="https://fullnode.devnet.sui.io:443"
fi

log() {
  printf '[clawshield-bootstrap] %s\n' "$*"
}

append_path_if_missing() {
  local target_file="$1"
  local line='export PATH="$HOME/.local/bin:$PATH"'
  if [[ ! -f "$target_file" ]]; then
    touch "$target_file"
  fi
  if ! grep -Fq "$line" "$target_file"; then
    echo "$line" >> "$target_file"
    log "Added ~/.local/bin PATH export to $target_file"
  fi
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

install_suiup_if_needed() {
  if command -v suiup >/dev/null 2>&1; then
    log "suiup already installed"
    return
  fi
  log "Installing suiup..."
  curl -sSfL https://raw.githubusercontent.com/Mystenlabs/suiup/main/install.sh | sh
}

ensure_sui_installed() {
  log "Ensuring Sui binary for network profile: $NETWORK"
  suiup install "sui@$NETWORK"
  suiup default set "sui@$NETWORK"

  if [[ -x "$HOME/.local/bin/sui" ]]; then
    export PATH="$HOME/.local/bin:$PATH"
  fi

  if ! command -v sui >/dev/null 2>&1; then
    local discovered
    discovered="$(find "$HOME/.local/share/suiup/binaries" -type f -name 'sui*' 2>/dev/null | head -n1 || true)"
    if [[ -n "$discovered" && -x "$discovered" ]]; then
      ln -sf "$discovered" "$HOME/.local/bin/sui"
      export PATH="$HOME/.local/bin:$PATH"
      log "Linked discovered Sui binary into ~/.local/bin/sui"
    fi
  fi

  require_command sui
  sui --version
}

ensure_sui_client_config() {
  log "Configuring Sui client environment: $NETWORK"
  if ! sui client switch --env "$NETWORK" >/dev/null 2>&1; then
    if ! sui client new-env --alias "$NETWORK" --rpc "$RPC_URL" >/dev/null 2>&1; then
      log "Could not create env automatically; you may already have a conflicting alias."
    fi
    sui client switch --env "$NETWORK" >/dev/null 2>&1 || true
  fi

  local active_addr
  active_addr="$(sui client active-address 2>/dev/null || true)"
  if [[ -z "$active_addr" ]]; then
    log "No active address detected. Running first-time 'sui client' setup."
    sui client || true
    active_addr="$(sui client active-address 2>/dev/null || true)"
  fi

  if [[ -z "$active_addr" ]]; then
    echo "Sui client is not initialized yet." >&2
    echo "Run 'sui client' once, fund your address from faucet, then rerun this script." >&2
    exit 1
  fi

  log "Active Sui address: $active_addr"
  log "Attempting best-effort balance check..."
  sui client balance || true
}

install_walrus_if_needed() {
  if command -v walrus >/dev/null 2>&1; then
    log "walrus already installed"
    return
  fi
  log "Installing walrus client..."
  curl -sSf https://install.wal.app | sh -s -- -n "$NETWORK"
}

configure_walrus_if_enabled() {
  if [[ "$WITH_WALRUS" != "1" ]]; then
    return
  fi

  install_walrus_if_needed
  if ! command -v walrus >/dev/null 2>&1; then
    echo "Walrus install did not produce a 'walrus' binary in PATH." >&2
    exit 1
  fi

  mkdir -p "$HOME/.config/walrus"
  if [[ ! -f "$HOME/.config/walrus/client_config.yaml" ]]; then
    log "Downloading default Walrus client config..."
    curl --create-dirs -sSf https://docs.wal.app/setup/client_config.yaml \
      -o "$HOME/.config/walrus/client_config.yaml"
  fi

  log "Walrus info:"
  walrus info || true
}

write_env_file() {
  local package_id="$1"
  {
    echo "export CLAWSHIELD_SUI_NETWORK=$NETWORK"
    echo "export CLAWSHIELD_SUI_PACKAGE_ID=$package_id"
    echo "export CLAWSHIELD_POST_TO_SUI=1"
    if [[ "$WITH_WALRUS" == "1" ]]; then
      echo "export CLAWSHIELD_POST_TO_WALRUS=1"
      echo "export CLAWSHIELD_WALRUS_EPOCHS=1"
    fi
  } > "$ENV_FILE"
  log "Wrote environment exports to $ENV_FILE"
}

publish_move_and_capture_package() {
  if [[ "$SKIP_PUBLISH" == "1" ]]; then
    log "Skipping publish as requested (--skip-publish)"
    return
  fi

  log "Publishing ClawShield Move package..."
  local output
  if ! output="$(cd "$CLI_DIR" && node dist/main.js publish_sui 2>&1)"; then
    echo "$output" >&2
    echo "Publish failed. Ensure your Sui address is funded, then rerun." >&2
    exit 1
  fi
  echo "$output"

  local package_id
  package_id="$(printf '%s\n' "$output" | awk -F= '/^package_id=/{print $2}' | tail -n1)"
  if [[ -z "$package_id" ]]; then
    echo "Could not parse package_id from publish output." >&2
    exit 1
  fi

  write_env_file "$package_id"
}

run_scan_if_requested() {
  if [[ "$SKIP_SCAN" == "1" ]]; then
    log "Skipping scan as requested (--skip-scan)"
    return
  fi

  if [[ ! -f "$ENV_FILE" ]]; then
    log "No env file found; running scan without posting."
    (cd "$CLI_DIR" && node dist/main.js scan file:../policy/samples/malicious.txt)
    return
  fi

  # shellcheck disable=SC1090
  source "$ENV_FILE"
  log "Running malicious sample scan with configured posting toggles..."
  (cd "$CLI_DIR" && node dist/main.js scan file:../policy/samples/malicious.txt)
}

main() {
  export PATH="$HOME/.local/bin:$PATH"
  append_path_if_missing "$HOME/.zshrc"
  append_path_if_missing "$HOME/.zprofile"

  install_suiup_if_needed
  require_command suiup
  ensure_sui_installed
  ensure_sui_client_config

  log "Installing npm dependencies and building CLI..."
  (cd "$CLI_DIR" && npm install && npm run build)

  configure_walrus_if_enabled
  publish_move_and_capture_package
  run_scan_if_requested

  cat <<DONE_MSG

Done.
If you open a new terminal, load env vars with:
  source "$ENV_FILE"

Quick demo:
  cd "$CLI_DIR"
  ./scripts/demo.sh
DONE_MSG
}

main
