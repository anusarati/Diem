use crate::solver::types::Problem;
use std::error::Error;

pub fn deserialize_problem(data: &[u8]) -> Result<Problem, Box<dyn Error>> {
    let problem: Problem = rmp_serde::from_slice(data)?;
    Ok(problem)
}

pub fn serialize_result<T: serde::Serialize>(data: &T) -> Result<Vec<u8>, Box<dyn Error>> {
    let mut buf = Vec::new();
    let mut serializer = rmp_serde::Serializer::new(&mut buf);
    data.serialize(&mut serializer)?;
    Ok(buf)
}
