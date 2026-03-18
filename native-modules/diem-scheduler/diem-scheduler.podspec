require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "diem-scheduler"
  s.version      = package["version"]
  s.summary      = "Rust-powered Scheduler"
  s.author       = "Diem"
  s.homepage     = "https://github.com/diem/scheduler"
  s.license      = package["license"]
  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => ".", :tag => "#{s.version}" }

  # Use relative paths for Nitrogen files to comply with CocoaPods validation
  nitrogen_relative = "../../nitrogen/generated"
  
  s.source_files = [
    "cpp/**/*.{h,hpp,cpp}",
    "#{nitrogen_relative}/shared/**/*.{h,hpp,c,cpp,swift}",
    "#{nitrogen_relative}/ios/**/*.{h,hpp,c,cpp,mm,swift}",
  ]
  
  s.public_header_files = [
    "cpp/**/*.hpp",
    "#{nitrogen_relative}/shared/**/*.{h,hpp}",
    "#{nitrogen_relative}/ios/DiemScheduler-Swift-Cxx-Bridge.hpp"
  ]

  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    "SWIFT_OBJC_INTEROP_MODE" => "objcxx",
    "DEFINES_MODULE" => "YES",
    "LIBRARY_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/../../rust/target/universal/$(CONFIGURATION)\"",
    "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/cpp\" \"${PODS_TARGET_SRCROOT}/#{nitrogen_relative}/shared\" \"${PODS_TARGET_SRCROOT}/#{nitrogen_relative}/ios\"",
    "OTHER_LDFLAGS" => "-ldiem_scheduler"
  }

  s.script_phase = {
    :name => 'Build Rust Library',
    :execution_position => :before_compile,
    :script => <<-SCRIPT
      set -e
      # Default to building release mode unless Xcode says Debug
      MODE="--release"
      DIR="Release"
      if [ "$CONFIGURATION" == "Debug" ]; then
        MODE=""
        DIR="Debug"
      fi
      
      cd "${PODS_TARGET_SRCROOT}/../../rust"
      export PATH="$HOME/.cargo/bin:$PATH"
      
      # Determine Rust target based on Xcode architecture
      if [ "$EXECUTABLE_ARCHITECTURE" == "arm64" ]; then
        if [ "$PLATFORM_NAME" == "iphonesimulator" ]; then
          TARGET="aarch64-apple-ios-sim"
        else
          TARGET="aarch64-apple-ios"
        fi
      else
        TARGET="x86_64-apple-ios"
      fi
      
      # Build the rust library
      cargo build $MODE --target $TARGET
      
      # Create universal output directory and copy the binary
      # (Because we dynamically target the exact architecture, we don't necessarily need lipo unless building universal frameworks, but we mimic the path for safety)
      mkdir -p "target/universal/$DIR"
      cp "target/$TARGET/${DIR,,}/libdiem_scheduler.a" "target/universal/$DIR/"
    SCRIPT
  }
  s.dependency "NitroModules"
end
