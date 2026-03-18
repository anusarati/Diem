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

    let result = std::panic::catch_unwind(|| {
        log::info!("Entering catch_unwind");
        let data_slice = slice::from_raw_parts(data_ptr, len);

        log::info!("Deserializing problem");
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

        log::info!("Calling solver::solve");
        match solver::solve(problem, max_generations, time_limit_ms) {
            Ok(results) => {
                log::info!("Solver complete. Serializing result.");
                match serialize_result(&results) {
                    Ok(msgpack_bytes) => {
                        log::info!("Serialization complete");
                        let boxed = msgpack_bytes.into_boxed_slice();
                        let len = boxed.len();
                        let ptr = Box::into_raw(boxed) as *mut u8;
                        log::info!("Returning success with len {}", len);
                        DiemResult { ptr, len }
                    }
                    Err(e) => {
                        log::error!("Serialization failed: {:?}", e);
                        DiemResult {
                            ptr: std::ptr::null_mut(),
                            len: 0,
                        }
                    }
                }
            }
            Err(e) => {
                log::error!("Solver failed: {:?}", e);
                DiemResult {
                    ptr: std::ptr::null_mut(),
                    len: 0,
                }
            }
        }
    });

    match result {
        Ok(res) => {
            log::info!("Successfully returning out of diem_solve");
            res
        }
        Err(e) => {
            log::error!("Rust panicked in diem_solve: {:?}", e);
            DiemResult {
                ptr: std::ptr::null_mut(),
                len: 0,
            }
        }
    }
}
