cmake_minimum_required(VERSION 3.18.0)

project(diem-scheduler)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# 1) Map Android ABI (Gradle) to Rust target triple
if("${ANDROID_ABI}" STREQUAL "armeabi-v7a")
  set(RUST_TARGET "armv7-linux-androideabi")
elseif("${ANDROID_ABI}" STREQUAL "arm64-v8a")
  set(RUST_TARGET "aarch64-linux-android")
elseif("${ANDROID_ABI}" STREQUAL "x86")
  set(RUST_TARGET "i686-linux-android")
elseif("${ANDROID_ABI}" STREQUAL "x86_64")
  set(RUST_TARGET "x86_64-linux-android")
endif()

# 2) Import prebuilt Rust static library
set(RUST_LIB_PATH
  ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../../rust/target/${RUST_TARGET}/release/libdiem_scheduler.a
)
add_library(diem_scheduler_rust STATIC IMPORTED)
set_property(TARGET diem_scheduler_rust PROPERTY IMPORTED_LOCATION
  ${RUST_LIB_PATH}
)

# 3) Resolve prefab packages
find_package(ReactAndroid REQUIRED CONFIG)
find_package(fbjni REQUIRED CONFIG)
find_package(react-native-nitro-modules REQUIRED CONFIG)

# 4) Define module library and include generated Nitrogen sources
add_library(diem_scheduler SHARED
  ../../../../cpp/DiemScheduler.cpp
  ./cpp-adapter.cpp
  ../../../../../../nitrogen/generated/android/diem_schedulerOnLoad.cpp
  ../../../../../../nitrogen/generated/shared/c++/HybridDiemSchedulerSpec.cpp
)

target_include_directories(diem_scheduler PUBLIC
  ../../../../cpp
  ../../../../../../nitrogen/generated/shared/c++
  ../../../../../../nitrogen/generated/android/c++
  ../../../../../../nitrogen/generated/android
)

# From RN's app CMake defaults required by Folly headers.
target_compile_definitions(diem_scheduler PRIVATE
  -DFOLLY_NO_CONFIG=1
  -DFOLLY_HAVE_CLOCK_GETTIME=1
  -DFOLLY_USE_LIBCPP=1
  -DFOLLY_CFG_NO_COROUTINES=1
  -DFOLLY_MOBILE=1
  -DFOLLY_HAVE_RECVMMSG=1
  -DFOLLY_HAVE_PTHREAD=1
  -DFOLLY_HAVE_XSI_STRERROR_R=1
)

add_definitions(-DBUILDING_DIEMSCHEDULER_WITH_GENERATED_CMAKE_PROJECT)
add_definitions(-DRN_SERIALIZABLE_STATE)

# 5) Link dependencies
target_link_libraries(diem_scheduler
  ReactAndroid::jsi
  fbjni::fbjni
  react-native-nitro-modules::NitroModules
  diem_scheduler_rust
  log
)

# RN 0.76+ exports ReactAndroid::reactnative, older versions export react_nativemodule_core.
if(TARGET ReactAndroid::reactnative)
  target_link_libraries(diem_scheduler ReactAndroid::reactnative)
elseif(TARGET ReactAndroid::react_nativemodule_core)
  target_link_libraries(diem_scheduler ReactAndroid::react_nativemodule_core)
endif()
