use super::serialization::{deserialize_problem, serialize_result};
use crate::solver;
use std::slice;

#[repr(C)]
pub struct DiemResult {
    pub ptr: *mut u8,
    pub len: usize,
}

/// Main entry point for the JSI/Nitro bridge.
#[no_mangle]
pub unsafe extern "C" fn diem_solve(
    data_ptr: *const u8,
    len: usize,
    max_generations: usize,
    time_limit_ms: u64,
) -> DiemResult {
    if data_ptr.is_null() || len == 0 {
        return DiemResult {
            ptr: std::ptr::null_mut(),
            len: 0,
        };
    }

    let data_slice = slice::from_raw_parts(data_ptr, len);

    let problem = match deserialize_problem(data_slice) {
        Ok(p) => p,
        Err(e) => {
            log::error!("Deserialization failed: {:?}", e);
            return DiemResult {
                ptr: std::ptr::null_mut(),
                len: 0,
            };
        }
    };

    match solver::solve(problem, max_generations, time_limit_ms) {
        Ok(results) => match serialize_result(&results) {
            Ok(mut msgpack_bytes) => {
                let len = msgpack_bytes.len();
                let ptr = msgpack_bytes.as_mut_ptr();
                std::mem::forget(msgpack_bytes);

                DiemResult { ptr, len }
            }
            Err(e) => {
                log::error!("Serialization failed: {:?}", e);
                DiemResult {
                    ptr: std::ptr::null_mut(),
                    len: 0,
                }
            }
        },
        Err(e) => {
            log::error!("Solver failed: {:?}", e);
            DiemResult {
                ptr: std::ptr::null_mut(),
                len: 0,
            }
        }
    }
}
