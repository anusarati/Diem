use diem_scheduler::solve;
use diem_scheduler::solver::types::{
    Activity, ActivityType, Binding, FrequencyTarget, GlobalConstraint, Problem, TimeScope,
    UserFrequencyConstraint,
};
use std::collections::HashMap;
use std::process::ExitCode;

const DAY_SLOTS: u16 = 96;
const TOTAL_SLOTS: u16 = DAY_SLOTS * 2;
const DEMO_MAX_GENERATIONS: usize = 220;
const DEMO_TIME_LIMIT_MS: u64 = 500;
const DEEP_WORK_ACTIVITY_ID: usize = 0;
const WORKOUT_ACTIVITY_ID: usize = 1;
const ADMIN_ACTIVITY_ID: usize = 2;

#[derive(Clone)]
struct DemoScenario {
    name: &'static str,
    problem: Problem,
    labels_by_index: Vec<&'static str>,
}

#[derive(Debug, Clone)]
struct EventRow {
    label: String,
    activity_id: usize,
    start_slot: u16,
    end_slot: u16,
    kind: &'static str,
}

#[derive(Debug, Clone, Copy)]
struct WorkoutCountBreakdown {
    all: [u16; 2],
    flexible: [u16; 2],
    fixed: [u16; 2],
}

fn activity(
    id: usize,
    activity_type: ActivityType,
    duration_slots: u16,
    priority: f32,
    assigned_start: Option<u16>,
) -> Activity {
    Activity {
        id,
        activity_type,
        duration_slots,
        priority,
        assigned_start,
        category_id: 0,
        input_bindings: Vec::<Binding>::new(),
        output_bindings: Vec::<Binding>::new(),
        frequency_targets: Vec::<FrequencyTarget>::new(),
        user_frequency_constraints: Vec::<UserFrequencyConstraint>::new(),
    }
}

fn build_scenario(name: &'static str, with_hard_frequency: bool) -> DemoScenario {
    // Floating activities in this realistic demo:
    // - Deep Work block.
    // - Flexible Workout Session.
    // - Admin/Inbox triage.
    let deep_work = activity(DEEP_WORK_ACTIVITY_ID, ActivityType::Floating, 4, 1.0, None);
    let mut workout = activity(WORKOUT_ACTIVITY_ID, ActivityType::Floating, 6, 1.0, None);
    let mut admin = activity(ADMIN_ACTIVITY_ID, ActivityType::Floating, 4, 0.6, None);

    // Fixed activities:
    // - Team workshop narrows feasible windows.
    // - A booked spin class shares Workout's id to represent one already-fixed daily occurrence.
    let team_workshop = activity(3, ActivityType::Fixed, 16, 0.0, Some(44));
    let spin_class_fixed = activity(WORKOUT_ACTIVITY_ID, ActivityType::Fixed, 6, 0.0, Some(16));

    if with_hard_frequency {
        workout
            .user_frequency_constraints
            .push(UserFrequencyConstraint {
                scope: TimeScope::SameDay,
                min_count: Some(1),
                max_count: None,
                penalty_weight: 50_000.0,
            });
    }

    // Keep a soft frequency objective to show soft goals can coexist with hard constraints.
    admin.frequency_targets.push(FrequencyTarget {
        scope: TimeScope::SameDay,
        target_count: 1,
        weight: 1.0,
    });

    DemoScenario {
        name,
        problem: Problem {
            activities: vec![deep_work, workout, admin, team_workshop, spin_class_fixed],
            floating_indices: vec![0, 1, 2],
            fixed_indices: vec![3, 4],
            global_constraints: vec![
                GlobalConstraint::ForbiddenZone { start: 0, end: 8 },
                GlobalConstraint::ForbiddenZone {
                    start: DAY_SLOTS + 80,
                    end: DAY_SLOTS + 95,
                },
            ],
            // Soft timing preference encourages Deep Work before Workout on day 1.
            heatmap: vec![
                (DEEP_WORK_ACTIVITY_ID, 20, 6.0),
                (WORKOUT_ACTIVITY_ID, 26, 8.0),
                (ADMIN_ACTIVITY_ID, DAY_SLOTS + 12, 0.7),
            ],
            // Soft sequence preference: Deep Work followed by Workout near-adjacent.
            markov_matrix: vec![(DEEP_WORK_ACTIVITY_ID, WORKOUT_ACTIVITY_ID, 1.0)],
            total_slots: TOTAL_SLOTS,
        },
        labels_by_index: vec![
            "Deep Work: API Design",
            "Workout Session (Flexible)",
            "Inbox & Admin",
            "Team Workshop (Fixed)",
            "Spin Class (Fixed)",
        ],
    }
}

fn slot_to_label(slot: u16) -> String {
    let day = slot / DAY_SLOTS;
    let slot_in_day = slot % DAY_SLOTS;
    let minutes = slot_in_day as u32 * 15;
    let hours = minutes / 60;
    let mins = minutes % 60;
    format!("D{} {:02}:{:02}", day + 1, hours, mins)
}

fn slot_to_clock(slot: u16) -> String {
    let slot_in_day = slot % DAY_SLOTS;
    let minutes = slot_in_day as u32 * 15;
    let hours = minutes / 60;
    let mins = minutes % 60;
    format!("{:02}:{:02}", hours, mins)
}

fn build_event_rows(
    scenario: &DemoScenario,
    solve_output: &[(usize, u16)],
) -> Result<Vec<EventRow>, String> {
    let mut floating_starts = HashMap::<usize, u16>::new();
    for (activity_id, start) in solve_output {
        floating_starts.insert(*activity_id, *start);
    }

    let mut rows = Vec::<EventRow>::new();
    for (index, activity) in scenario.problem.activities.iter().enumerate() {
        let label = scenario
            .labels_by_index
            .get(index)
            .copied()
            .unwrap_or("Unknown")
            .to_string();
        match activity.activity_type {
            ActivityType::Fixed => {
                if let Some(start) = activity.assigned_start {
                    rows.push(EventRow {
                        label,
                        activity_id: activity.id,
                        start_slot: start,
                        end_slot: start + activity.duration_slots,
                        kind: "Fixed",
                    });
                }
            }
            ActivityType::Floating => {
                let start = floating_starts.get(&activity.id).copied().ok_or_else(|| {
                    format!(
                        "Missing floating result for activity index {} (id {})",
                        index, activity.id
                    )
                })?;
                rows.push(EventRow {
                    label,
                    activity_id: activity.id,
                    start_slot: start,
                    end_slot: start + activity.duration_slots,
                    kind: "Floating",
                });
            }
        }
    }

    rows.sort_by_key(|row| row.start_slot);
    Ok(rows)
}

fn workout_daily_counts(rows: &[EventRow]) -> WorkoutCountBreakdown {
    let mut all = [0u16; 2];
    let mut flexible = [0u16; 2];
    let mut fixed = [0u16; 2];

    for row in rows {
        if row.activity_id != WORKOUT_ACTIVITY_ID {
            continue;
        }
        let day = (row.start_slot / DAY_SLOTS) as usize;
        if day >= all.len() {
            continue;
        }

        all[day] += 1;
        if row.kind == "Floating" {
            flexible[day] += 1;
        } else if row.kind == "Fixed" {
            fixed[day] += 1;
        }
    }

    WorkoutCountBreakdown {
        all,
        flexible,
        fixed,
    }
}

fn first_floating_workout_start(rows: &[EventRow]) -> Option<u16> {
    rows.iter()
        .find(|row| row.kind == "Floating" && row.activity_id == WORKOUT_ACTIVITY_ID)
        .map(|row| row.start_slot)
}

fn activity_name_for_id(scenario: &DemoScenario, activity_id: usize) -> &'static str {
    for (index, activity) in scenario.problem.activities.iter().enumerate() {
        if activity.id == activity_id && activity.activity_type == ActivityType::Floating {
            return scenario
                .labels_by_index
                .get(index)
                .copied()
                .unwrap_or("Unknown activity");
        }
    }

    for (index, activity) in scenario.problem.activities.iter().enumerate() {
        if activity.id == activity_id {
            return scenario
                .labels_by_index
                .get(index)
                .copied()
                .unwrap_or("Unknown activity");
        }
    }

    "Unknown activity"
}

fn print_plain_english_rules(scenario: &DemoScenario) {
    println!();
    println!("Scenario rules (plain English)");
    println!("  Hard rules:");

    for constraint in &scenario.problem.global_constraints {
        match constraint {
            GlobalConstraint::ForbiddenZone { start, end } => {
                println!(
                    "    - ForbiddenZone: no activity can start between {} and {}.",
                    slot_to_label(*start),
                    slot_to_label(*end)
                );
            }
            GlobalConstraint::CumulativeTime {
                category_id,
                period_slots,
                min_duration,
                max_duration,
            } => {
                println!(
                    "    - CumulativeTime: in each {}-slot window, category {:?} total duration must stay within {}..={} slots.",
                    period_slots, category_id, min_duration, max_duration
                );
            }
        }
    }

    for (index, activity) in scenario.problem.activities.iter().enumerate() {
        if activity.activity_type != ActivityType::Fixed {
            continue;
        }
        if let Some(start) = activity.assigned_start {
            let end = start + activity.duration_slots;
            let label = scenario
                .labels_by_index
                .get(index)
                .copied()
                .unwrap_or("Unknown fixed event");
            println!(
                "    - Fixed event: '{}' is locked at {}-{}.",
                label,
                slot_to_label(start),
                slot_to_label(end)
            );
        }
    }

    if has_hard_frequency_constraints(&scenario.problem) {
        println!(
            "    - User frequency: workout family (fixed + flexible) must appear at least once per day."
        );
    } else {
        println!("    - User frequency: no hard daily workout minimum in this scenario.");
    }

    println!("  Soft preferences:");
    for (from, to, weight) in &scenario.problem.markov_matrix {
        println!(
            "    - Markov preference: '{}' followed by '{}' (weight {}).",
            activity_name_for_id(scenario, *from),
            activity_name_for_id(scenario, *to),
            weight
        );
    }
    for (activity_id, preferred_start, weight) in &scenario.problem.heatmap {
        println!(
            "    - Heatmap preference: '{}' near {} (weight {}).",
            activity_name_for_id(scenario, *activity_id),
            slot_to_label(*preferred_start),
            weight
        );
    }
}

fn print_scenario_summary(
    scenario: &DemoScenario,
    tuples: &[(usize, u16)],
    rows: &[EventRow],
    workout_counts: WorkoutCountBreakdown,
) {
    println!();
    println!("============================================================");
    println!("{}", scenario.name);
    println!("============================================================");
    println!(
        "Planning context: 2-day personal plan with a fixed spin class + fixed team workshop. Hard mode requires >=1 workout/day. Soft mode prefers Deep Work -> Workout."
    );

    println!();
    println!("Inputs");
    println!(
        "  horizon slots    : {} (2 days)",
        scenario.problem.total_slots,
    );
    println!(
        "  floating/fixed   : {}/{}",
        scenario.problem.floating_indices.len(),
        scenario.problem.fixed_indices.len()
    );
    println!(
        "  user freq hard   : {}",
        has_hard_frequency_constraints(&scenario.problem)
    );

    print_plain_english_rules(scenario);

    println!();
    println!("Solver tuples (activity_id, start_slot)");
    println!("  {:?}", tuples);

    println!();
    println!("Timeline");
    for day in 0..2 {
        println!("  Day {}:", day + 1);
        let mut printed_any = false;
        for row in rows
            .iter()
            .filter(|row| (row.start_slot / DAY_SLOTS) as usize == day)
        {
            printed_any = true;
            println!(
                "    {:<28} {}-{}  {:<8} id={}",
                row.label,
                slot_to_clock(row.start_slot),
                slot_to_clock(row.end_slot),
                row.kind,
                row.activity_id
            );
        }
        if !printed_any {
            println!("    (none)");
        }
    }

    println!();
    println!("Workout counts per day");
    println!(
        "  fixed + flexible : D1={} D2={}",
        workout_counts.all[0], workout_counts.all[1]
    );
    println!(
        "  flexible only    : D1={} D2={}",
        workout_counts.flexible[0], workout_counts.flexible[1]
    );
    println!(
        "  fixed only       : D1={} D2={}",
        workout_counts.fixed[0], workout_counts.fixed[1]
    );
}

fn has_hard_frequency_constraints(problem: &Problem) -> bool {
    problem
        .activities
        .iter()
        .any(|a| !a.user_frequency_constraints.is_empty())
}

fn print_run_header() {
    println!("Quick Solver Demo: Hard vs Soft Frequency");
    println!("============================================================");
}

fn main() -> ExitCode {
    print_run_header();

    let scenario_hard = build_scenario("Scenario A: Hard + Soft", true);
    let scenario_soft = build_scenario("Scenario B: Soft-only ablation", false);

    let solution_hard = match solve(
        scenario_hard.problem.clone(),
        DEMO_MAX_GENERATIONS,
        DEMO_TIME_LIMIT_MS,
    ) {
        Ok(s) => s,
        Err(err) => {
            eprintln!("FAIL: solver failed for Scenario A: {}", err);
            return ExitCode::from(1);
        }
    };
    let rows_hard = match build_event_rows(&scenario_hard, &solution_hard) {
        Ok(rows) => rows,
        Err(err) => {
            eprintln!("FAIL: could not build Scenario A timeline: {}", err);
            return ExitCode::from(1);
        }
    };
    let workout_counts_hard = workout_daily_counts(&rows_hard);
    print_scenario_summary(
        &scenario_hard,
        &solution_hard,
        &rows_hard,
        workout_counts_hard,
    );

    let solution_soft = match solve(
        scenario_soft.problem.clone(),
        DEMO_MAX_GENERATIONS,
        DEMO_TIME_LIMIT_MS,
    ) {
        Ok(s) => s,
        Err(err) => {
            eprintln!("FAIL: solver failed for Scenario B: {}", err);
            return ExitCode::from(1);
        }
    };
    let rows_soft = match build_event_rows(&scenario_soft, &solution_soft) {
        Ok(rows) => rows,
        Err(err) => {
            eprintln!("FAIL: could not build Scenario B timeline: {}", err);
            return ExitCode::from(1);
        }
    };
    let workout_counts_soft = workout_daily_counts(&rows_soft);
    print_scenario_summary(
        &scenario_soft,
        &solution_soft,
        &rows_soft,
        workout_counts_soft,
    );

    let mut failures = Vec::<String>::new();
    let mut contrast_note =
        "  - Contrast note unavailable: could not compute flexible workout comparison.".to_string();

    if workout_counts_hard.all[0] < 1 || workout_counts_hard.all[1] < 1 {
        failures.push(format!(
            "Scenario A hard-frequency invariant failed: expected Workout family count >=1 on each day (fixed + flexible), got [{}, {}]",
            workout_counts_hard.all[0], workout_counts_hard.all[1]
        ));
    }

    let workout_hard_start = first_floating_workout_start(&rows_hard);
    let workout_soft_start = first_floating_workout_start(&rows_soft);
    if workout_hard_start.is_none() || workout_soft_start.is_none() {
        failures.push(
            "Could not locate floating Workout Session start in one of the scenarios".to_string(),
        );
    } else {
        let hard_start = workout_hard_start.unwrap_or(0);
        let soft_start = workout_soft_start.unwrap_or(0);
        let hard_day = (hard_start / DAY_SLOTS) + 1;
        let soft_day = (soft_start / DAY_SLOTS) + 1;
        if hard_day != soft_day {
            contrast_note = format!(
                "  - In this run, removing hard frequency moved flexible workout from D{} ({}) to D{} ({}).",
                hard_day,
                slot_to_label(hard_start),
                soft_day,
                slot_to_label(soft_start)
            );
        } else {
            contrast_note = format!(
                "  - In this run, flexible workout stayed on D{} in both scenarios (hard={}, soft={}). Rerun to sample other stochastic outcomes.",
                hard_day,
                slot_to_label(hard_start),
                slot_to_label(soft_start)
            );
        }
    }

    if failures.is_empty() {
        println!();
        println!("RESULT: PASS");
        println!("  - Hard daily workout requirement is satisfied in Scenario A.");
        println!("{}", contrast_note);
        ExitCode::from(0)
    } else {
        println!();
        println!("RESULT: FAIL");
        for failure in failures {
            println!("  - {}", failure);
        }
        ExitCode::from(1)
    }
}
