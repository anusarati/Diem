#pragma once

#include <vector>
#include "HybridDiemSchedulerSpec.hpp"
#include "diem_ffi.h"

namespace margelo::nitro::diem::scheduler {

class DiemScheduler : public HybridDiemSchedulerSpec {
public:
  DiemScheduler() : HybridObject(HybridDiemSchedulerSpec::TAG) {}

  std::shared_ptr<ArrayBuffer> solve(
      const std::shared_ptr<ArrayBuffer>& problemData,
      double maxGenerations,
      double timeLimitMs
  ) override;
};

} // namespace margelo::nitro::diem::scheduler
