use super::serialization::{deserialize_problem, serialize_result};
use crate::solver;
use std::slice;

/// Main entry point for the JSI/Nitro bridge.
#[no_mangle]
pub unsafe extern "C" fn diem_solve(
    data_ptr: *const u8,
    len: usize,
    max_generations: usize,
    time_limit_ms: u64,
) -> *mut u8 {
    if data_ptr.is_null() || len == 0 {
        return std::ptr::null_mut();
    }

    let data_slice = slice::from_raw_parts(data_ptr, len);

    let problem = match deserialize_problem(data_slice) {
        Ok(p) => p,
        Err(e) => {
            log::error!("Deserialization failed: {:?}", e);
            return std::ptr::null_mut();
        }
    };

    match solver::solve(problem, max_generations, time_limit_ms) {
        Ok(results) => {
            match serialize_result(&results) {
                Ok(mut msgpack_bytes) => {
                    let total_len = msgpack_bytes.len() as u32;
                    // Return [u32 length] + [bytes]
                    let mut output = Vec::with_capacity(4 + msgpack_bytes.len());
                    output.extend_from_slice(&total_len.to_le_bytes());
                    output.append(&mut msgpack_bytes);

                    let ptr = output.as_mut_ptr();
                    std::mem::forget(output);
                    ptr
                }
                Err(e) => {
                    log::error!("Serialization failed: {:?}", e);
                    std::ptr::null_mut()
                }
            }
        }
        Err(e) => {
            log::error!("Solver failed: {:?}", e);
            std::ptr::null_mut()
        }
    }
}
