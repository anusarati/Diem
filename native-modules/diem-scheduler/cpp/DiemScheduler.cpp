#include "DiemScheduler.hpp"
#include <cstring>

namespace margelo::nitro::diem::scheduler {

std::shared_ptr<ArrayBuffer> DiemScheduler::solve(
    const std::shared_ptr<ArrayBuffer>& problemData,
    double maxGenerations,
    double timeLimitMs
) {
    if (!problemData) {
        return ArrayBuffer::allocate(0);
    }

    DiemResult result = diem_solve(
        problemData->data(),
        problemData->size(),
        static_cast<size_t>(maxGenerations),
        static_cast<uint64_t>(timeLimitMs)
    );

    auto output = ArrayBuffer::allocate(result.len);
    if (result.len > 0) {
        std::memcpy(output->data(), result.ptr, result.len);
        diem_result_free(result.ptr, result.len);
    }

    return output;
}

} // namespace margelo::nitro::diem::scheduler
