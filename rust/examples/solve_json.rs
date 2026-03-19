use diem_scheduler::solve;
use diem_scheduler::solver::types::Problem;
use std::env;
use std::fs;

fn main() {
    let args: Vec<String> = env::args().collect();
    let file_path = if args.len() > 1 {
        &args[1]
    } else {
        "/home/xing/Diem/problem.json"
    };

    println!("Loading Problem from: {}", file_path);
    let data = fs::read_to_string(file_path).expect("Failed to read file");
    let problem: Problem = serde_json::from_str(&data).expect("Failed to parse JSON");

    let max_generations = 1200;
    let time_limit = 1000;

    println!(
        "Solving problem with {} slots and {} floating activities",
        problem.total_slots,
        problem.floating_indices.len()
    );
    let tuples = solve(problem.clone(), max_generations, time_limit).unwrap();

    println!("\n=== SOLVER OUTPUT ===");
    println!("Solver returned {} items", tuples.len());
    for (activity_id, slot) in tuples {
        let total_minutes = (slot as u32) * 15 + 12 * 60 + 15;
        let day = total_minutes / (24 * 60);
        let minutes_in_day = total_minutes % (24 * 60);
        let hours = minutes_in_day / 60;
        let minutes = minutes_in_day % 60;
        println!(
            "  - ActivityId {}: Day {} @ {:02}:{:02} (Absolute Slot: {})",
            activity_id, day, hours, minutes, slot
        );
    }
}
