#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUST_ROOT="${PROJECT_ROOT}/rust"
API_LEVEL="${ANDROID_API_LEVEL:-26}"

detect_ndk() {
  if [[ -n "${ANDROID_NDK_HOME:-}" && -d "${ANDROID_NDK_HOME}" ]]; then
    echo "${ANDROID_NDK_HOME}"
    return
  fi
  if [[ -n "${ANDROID_NDK_ROOT:-}" && -d "${ANDROID_NDK_ROOT}" ]]; then
    echo "${ANDROID_NDK_ROOT}"
    return
  fi

  local sdk_root=""
  if [[ -n "${ANDROID_SDK_ROOT:-}" && -d "${ANDROID_SDK_ROOT}" ]]; then
    sdk_root="${ANDROID_SDK_ROOT}"
  elif [[ -n "${ANDROID_HOME:-}" && -d "${ANDROID_HOME}" ]]; then
    sdk_root="${ANDROID_HOME}"
  elif [[ -d "${HOME}/Android/Sdk" ]]; then
    sdk_root="${HOME}/Android/Sdk"
  fi

  if [[ -n "${sdk_root}" && -d "${sdk_root}/ndk" ]]; then
    ls -1d "${sdk_root}"/ndk/* 2>/dev/null | sort -V | tail -n1
    return
  fi

  return 1
}

detect_host_tag() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"
  case "${os}-${arch}" in
    Linux-x86_64) echo "linux-x86_64" ;;
    Darwin-arm64) echo "darwin-arm64" ;;
    Darwin-x86_64) echo "darwin-x86_64" ;;
    *)
      echo "Unsupported host: ${os}-${arch}" >&2
      return 1
      ;;
  esac
}

NDK_ROOT="$(detect_ndk)" || {
  echo "Could not locate Android NDK. Set ANDROID_NDK_HOME or ANDROID_NDK_ROOT." >&2
  exit 1
}
HOST_TAG="$(detect_host_tag)"
TOOLCHAIN_BIN="${NDK_ROOT}/toolchains/llvm/prebuilt/${HOST_TAG}/bin"

if [[ ! -d "${TOOLCHAIN_BIN}" ]]; then
  echo "NDK toolchain not found: ${TOOLCHAIN_BIN}" >&2
  exit 1
fi

export CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER="${TOOLCHAIN_BIN}/aarch64-linux-android${API_LEVEL}-clang"
export CARGO_TARGET_X86_64_LINUX_ANDROID_LINKER="${TOOLCHAIN_BIN}/x86_64-linux-android${API_LEVEL}-clang"

cd "${RUST_ROOT}"
rustup target add aarch64-linux-android x86_64-linux-android
cargo build --release --target aarch64-linux-android
cargo build --release --target x86_64-linux-android

echo "Rust Android build complete."
