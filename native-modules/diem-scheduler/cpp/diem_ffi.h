#pragma once
#include <cstdint>
#include <cstddef>

extern "C" {
    struct DiemResult {
        uint8_t* ptr;
        size_t len;
    };

    // Matches rust/src/bridge/ffi.rs
    DiemResult diem_solve(
        const uint8_t* data_ptr,
        size_t len,
        size_t max_generations,
        uint64_t time_limit_ms
    );

    uint8_t* diem_alloc(size_t size);
    void diem_free(uint8_t* ptr, size_t size);
    void diem_result_free(uint8_t* ptr, size_t len);
}
