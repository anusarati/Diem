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
    "LIBRARY_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/../../rust/target/universal/release\"",
    "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/cpp\" \"${PODS_TARGET_SRCROOT}/#{nitrogen_relative}/shared\" \"${PODS_TARGET_SRCROOT}/#{nitrogen_relative}/ios\"",
    "OTHER_LDFLAGS" => "-ldiem_scheduler"
  }

  s.dependency "NitroModules"
end
