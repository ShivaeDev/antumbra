#!/usr/bin/env bash
# Refresh the Antumbra workspace for a Cloud Agent.
#
# The repository requires Node >=24 and runs its TypeScript entrypoints
# directly (for example `node script/ready.ts`), which relies on Node 24's
# native type stripping. The base image's default `node` is the Node 22 shim
# on `/exec-daemon`, which appears ahead of nvm in PATH, so this script
# installs Node 24 and links it into the first PATH entry so it wins.
set -euo pipefail

readonly NODE_MAJOR=24
readonly PNPM_VERSION=11.15.0
readonly WIN_BIN=/usr/local/cargo/bin

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

nvm install "$NODE_MAJOR"
node_bin_dir="$NVM_DIR/versions/node/$(nvm version "$NODE_MAJOR")/bin"

# `$WIN_BIN` precedes `/exec-daemon` in PATH, so linking Node 24 here shadows
# the image's bundled Node 22 for every shell an agent opens.
ln -sf "$node_bin_dir/node" "$WIN_BIN/node"
ln -sf "$node_bin_dir/npm" "$WIN_BIN/npm"
ln -sf "$node_bin_dir/npx" "$WIN_BIN/npx"
"$node_bin_dir/corepack" enable --install-directory "$WIN_BIN"
"$node_bin_dir/corepack" prepare "pnpm@${PNPM_VERSION}" --activate

export PATH="$WIN_BIN:$PATH"
hash -r

node --version
pnpm --version

cd "$repo_root"
pnpm install --frozen-lockfile
