#include "DiemScheduler.hpp"
#include <NitroModules/HybridObjectRegistry.hpp>
#include <cstring>

namespace margelo::nitro::diem::scheduler {

std::shared_ptr<ArrayBuffer>
DiemScheduler::solve(const std::shared_ptr<ArrayBuffer> &problemData,
                     double maxGenerations, double timeLimitMs) {
  if (!problemData) {
    return ArrayBuffer::allocate(0);
  }

  DiemResult result = diem_solve(problemData->data(), problemData->size(),
                                 static_cast<size_t>(maxGenerations),
                                 static_cast<uint64_t>(timeLimitMs));

  auto output = ArrayBuffer::allocate(result.len);
  if (result.len > 0 && result.ptr != nullptr) {
    std::memcpy(output->data(), result.ptr, result.len);
    diem_result_free(result.ptr, result.len);
  }

  return output;
}

} // namespace margelo::nitro::diem::scheduler

// Manual JSI registration using a C++ constructor attribute.
// This ensures the module is registered even if autolinking +load is skipped.
static __attribute__((constructor)) void registerDiemScheduler() {
  margelo::nitro::HybridObjectRegistry::registerHybridObjectConstructor(
      "DiemScheduler", []() -> std::shared_ptr<margelo::nitro::HybridObject> {
        return std::make_shared<
            margelo::nitro::diem::scheduler::DiemScheduler>();
      });
}
