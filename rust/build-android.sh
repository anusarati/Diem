#!/bin/bash
# build-android.sh - Cross-compile Rust library for Android

set -e

# Configuration
NDK_PATH="/Users/arshiyasalehi/Library/Android/sdk/ndk/27.1.12297006"
TOOLCHAIN="$NDK_PATH/toolchains/llvm/prebuilt/darwin-x86_64/bin"
TARGET="aarch64-linux-android"
API=24  # Minimum SDK version supported by the NDK toolchain

# Environment variables for cross-compilation
export AR="$TOOLCHAIN/llvm-ar"
export CC="$TOOLCHAIN/${TARGET}${API}-clang"
export AS="$CC"
export CXX="$TOOLCHAIN/${TARGET}${API}-clang++"
export LD="$TOOLCHAIN/ld"
export RANLIB="$TOOLCHAIN/llvm-ranlib"
export STRIP="$TOOLCHAIN/llvm-strip"

# Configure Cargo to use the NDK linker
export CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER="$CC"

# Ensure we use rustup-managed toolchain
export PATH="$HOME/.cargo/bin:$PATH"

echo "Building Rust library for $TARGET (Release mode)..."

# Ensure we are in the rust directory
cd "$(dirname "$0")"

cargo build --target "$TARGET" --release

echo "Build complete: target/$TARGET/release/libdiem_scheduler.a"
