#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUST_ROOT="${PROJECT_ROOT}/rust"

echo "Building Rust for iOS..."

cd "${RUST_ROOT}"

# Install targets if missing
rustup target add aarch64-apple-ios aarch64-apple-ios-sim

# Build for physical device
echo "Building aarch64-apple-ios (Release)..."
RUSTC=/Users/arshiyasalehi/.rustup/toolchains/stable-aarch64-apple-darwin/bin/rustc \
/Users/arshiyasalehi/.cargo/bin/cargo build --release --target aarch64-apple-ios

# Build for simulator (Apple Silicon)
echo "Building aarch64-apple-ios-sim (Release)..."
RUSTC=/Users/arshiyasalehi/.rustup/toolchains/stable-aarch64-apple-darwin/bin/rustc \
/Users/arshiyasalehi/.cargo/bin/cargo build --release --target aarch64-apple-ios-sim

# Create the universal/fat library directory structure expected by the podspec
DEST_DIR="${RUST_ROOT}/target/universal/release"
mkdir -p "${DEST_DIR}"

# For now, we'll use the simulator build as 'universal' for local testing on M1/M2
# In a real CI, we'd use lipo to combine x86_64-sim and aarch64-sim
cp "${RUST_ROOT}/target/aarch64-apple-ios-sim/release/libdiem_scheduler.a" "${DEST_DIR}/libdiem_scheduler.a"

echo "Rust iOS build complete. Universal library placed in ${DEST_DIR}"
