#include <jni.h>
#include "diem_schedulerOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::diem::scheduler::initialize(vm);
}
