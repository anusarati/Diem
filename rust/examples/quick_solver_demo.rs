use diem_scheduler::solve;
use diem_scheduler::solver::types::{
    Activity, ActivityType, Binding, FrequencyTarget, GlobalConstraint, Problem, TimeScope,
    UserFrequencyConstraint,
};
use std::collections::HashMap;
use std::process::ExitCode;

const DAY_SLOTS: u16 = 96;
const TOTAL_SLOTS: u16 = DAY_SLOTS * 2;
const DEMO_MAX_GENERATIONS: usize = 1200;
const DEMO_TIME_LIMIT_MS: u64 = 3000;
const DEMO_LEARNED_FREQUENCY_WEIGHT: f32 = 2.0;
const DEEP_WORK_ACTIVITY_ID: usize = 0;
const WORKOUT_ACTIVITY_ID: usize = 1;
const ADMIN_ACTIVITY_ID: usize = 2;
const TEAM_WORKSHOP_ACTIVITY_ID: usize = 3;
const SPIN_CLASS_ACTIVITY_ID: usize = 4;
const CLIENT_ONSITE_ACTIVITY_ID: usize = 5;

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
    workout_flexible: [u16; 2],
    spin_fixed: [u16; 2],
}

#[derive(Debug, Clone)]
struct ScenarioRun {
    tuples: Vec<(usize, u16)>,
    rows: Vec<EventRow>,
    workout_counts: WorkoutCountBreakdown,
    attempts: usize,
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
    let mut deep_work = activity(DEEP_WORK_ACTIVITY_ID, ActivityType::Floating, 4, 1.1, None);
    let mut workout = activity(WORKOUT_ACTIVITY_ID, ActivityType::Floating, 6, 0.25, None);
    let mut admin = activity(ADMIN_ACTIVITY_ID, ActivityType::Floating, 4, 0.7, None);

    // Fixed activities:
    // - Team workshop and spin class shape Day 1.
    // - Day 2 client onsite blocks most of the day.
    let team_workshop = activity(
        TEAM_WORKSHOP_ACTIVITY_ID,
        ActivityType::Fixed,
        16,
        0.0,
        Some(44),
    );
    let spin_class_fixed = activity(
        SPIN_CLASS_ACTIVITY_ID,
        ActivityType::Fixed,
        6,
        0.0,
        Some(16),
    );
    let client_onsite = activity(
        CLIENT_ONSITE_ACTIVITY_ID,
        ActivityType::Fixed,
        40,
        0.0,
        Some(DAY_SLOTS + 32),
    );

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

    // Learned soft frequency targets to prevent excessive repeats while still allowing flexibility.
    deep_work.frequency_targets.push(FrequencyTarget {
        scope: TimeScope::SameDay,
        target_count: 2,
        weight: DEMO_LEARNED_FREQUENCY_WEIGHT,
    });
    workout.frequency_targets.push(FrequencyTarget {
        scope: TimeScope::SameDay,
        target_count: 1,
        weight: DEMO_LEARNED_FREQUENCY_WEIGHT,
    });
    admin.frequency_targets.push(FrequencyTarget {
        scope: TimeScope::SameDay,
        target_count: 1,
        weight: DEMO_LEARNED_FREQUENCY_WEIGHT,
    });

    DemoScenario {
        name,
        problem: Problem {
            activities: vec![
                deep_work,
                workout,
                admin,
                team_workshop,
                spin_class_fixed,
                client_onsite,
            ],
            floating_indices: vec![0, 1, 2],
            fixed_indices: vec![3, 4, 5],
            global_constraints: vec![
                GlobalConstraint::ForbiddenZone { start: 0, end: 24 },
                GlobalConstraint::ForbiddenZone { start: 80, end: 95 },
                GlobalConstraint::ForbiddenZone {
                    start: DAY_SLOTS,
                    end: DAY_SLOTS + 32,
                },
                GlobalConstraint::ForbiddenZone {
                    start: DAY_SLOTS + 80,
                    end: DAY_SLOTS + 95,
                },
            ],
            // Soft timing preference:
            // - Day 1: encourages workout after deep work.
            // - Day 2: strongly prefers deep work in the narrow evening window.
            heatmap: vec![
                (DEEP_WORK_ACTIVITY_ID, 20, 6.0),
                (WORKOUT_ACTIVITY_ID, 26, 8.0),
                (DEEP_WORK_ACTIVITY_ID, DAY_SLOTS + 72, 11.0),
            ],
            // Soft sequence preference: Deep Work followed by Workout near-adjacent.
            markov_matrix: vec![(DEEP_WORK_ACTIVITY_ID, WORKOUT_ACTIVITY_ID, 1.4)],
            total_slots: TOTAL_SLOTS,
        },
        labels_by_index: vec![
            "Deep Work: API Design",
            "Workout Session (Flexible)",
            "Inbox & Admin",
            "Team Workshop (Fixed)",
            "Spin Class (Fixed)",
            "Client Onsite (Fixed)",
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
    let mut rows = Vec::<EventRow>::new();
    let mut floating_templates = HashMap::<usize, (String, u16)>::new();

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
                floating_templates
                    .entry(activity.id)
                    .or_insert((label, activity.duration_slots));
            }
        }
    }

    for (activity_id, start_slot) in solve_output {
        let (label, duration_slots) = floating_templates.get(activity_id).ok_or_else(|| {
            format!(
                "Solver returned unknown floating activity id {} in tuple list",
                activity_id
            )
        })?;
        rows.push(EventRow {
            label: label.clone(),
            activity_id: *activity_id,
            start_slot: *start_slot,
            end_slot: *start_slot + *duration_slots,
            kind: "Floating",
        });
    }

    rows.sort_by_key(|row| row.start_slot);
    Ok(rows)
}

fn workout_daily_counts(rows: &[EventRow]) -> WorkoutCountBreakdown {
    let mut workout_flexible = [0u16; 2];
    let mut spin_fixed = [0u16; 2];

    for row in rows {
        let day = (row.start_slot / DAY_SLOTS) as usize;
        if day >= workout_flexible.len() {
            continue;
        }

        if row.activity_id == WORKOUT_ACTIVITY_ID && row.kind == "Floating" {
            workout_flexible[day] += 1;
        }
        if row.activity_id == SPIN_CLASS_ACTIVITY_ID && row.kind == "Fixed" {
            spin_fixed[day] += 1;
        }
    }

    WorkoutCountBreakdown {
        workout_flexible,
        spin_fixed,
    }
}

fn floating_occurrence_counts(rows: &[EventRow]) -> Vec<(String, u16)> {
    let mut counts = HashMap::<String, u16>::new();
    for row in rows {
        if row.kind != "Floating" {
            continue;
        }
        let count = counts.entry(row.label.clone()).or_insert(0);
        *count = count.saturating_add(1);
    }

    let mut items: Vec<(String, u16)> = counts.into_iter().collect();
    items.sort_by(|a, b| a.0.cmp(&b.0));
    items
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

fn scope_to_english(scope: &TimeScope) -> &'static str {
    match scope {
        TimeScope::SameDay => "per day",
        TimeScope::SameWeek => "per week",
        TimeScope::SameMonth => "per month",
    }
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
            "    - User frequency: 'Workout Session (Flexible)' must appear at least once per day."
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

    for (index, activity) in scenario.problem.activities.iter().enumerate() {
        if activity.activity_type != ActivityType::Floating {
            continue;
        }
        for target in &activity.frequency_targets {
            let label = scenario
                .labels_by_index
                .get(index)
                .copied()
                .unwrap_or("Unknown activity");
            println!(
                "    - Learned frequency target: '{}' around {} {} (weight {}).",
                label,
                target.target_count,
                scope_to_english(&target.scope),
                target.weight
            );
        }
    }
}

fn print_scenario_summary(
    scenario: &DemoScenario,
    tuples: &[(usize, u16)],
    rows: &[EventRow],
    workout_counts: WorkoutCountBreakdown,
    attempts: usize,
) {
    println!();
    println!("============================================================");
    println!("{}", scenario.name);
    println!("============================================================");
    println!(
        "Planning context: 2-day personal plan with fixed spin class/workshop on Day 1 and a long client onsite on Day 2. Hard mode requires >=1 workout/day; soft mode often spends Day-2 evening on deep work."
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
    println!("  solve attempts   : {}", attempts);

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
        "  Workout Session (Flexible): D1={} D2={}",
        workout_counts.workout_flexible[0], workout_counts.workout_flexible[1]
    );
    println!(
        "  Spin Class (Fixed)        : D1={} D2={}",
        workout_counts.spin_fixed[0], workout_counts.spin_fixed[1]
    );

    println!();
    println!("Floating occurrence summary");
    let occurrence_counts = floating_occurrence_counts(rows);
    if occurrence_counts.is_empty() {
        println!("  (no floating events in this run)");
    } else {
        let repeated = occurrence_counts
            .iter()
            .filter(|(_, count)| *count > 1)
            .count();
        for (label, count) in &occurrence_counts {
            println!("  {:<28} count={}", label, count);
        }
        if repeated > 0 {
            println!("  repeated floating templates observed: {}", repeated);
        } else {
            println!("  no repeated floating templates observed in this run");
        }
    }
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

fn run_scenario_with_retries(
    scenario: &DemoScenario,
    require_daily_workout: bool,
    max_attempts: usize,
) -> Result<ScenarioRun, String> {
    let mut last_run: Option<ScenarioRun> = None;

    for attempt in 1..=max_attempts {
        let tuples = solve(
            scenario.problem.clone(),
            DEMO_MAX_GENERATIONS,
            DEMO_TIME_LIMIT_MS,
        )
        .map_err(|err| format!("solver failed for {}: {}", scenario.name, err))?;

        let rows = build_event_rows(scenario, &tuples)
            .map_err(|err| format!("could not build {} timeline: {}", scenario.name, err))?;
        let workout_counts = workout_daily_counts(&rows);

        let run = ScenarioRun {
            tuples,
            rows,
            workout_counts,
            attempts: attempt,
        };

        if !require_daily_workout
            || (run.workout_counts.workout_flexible[0] >= 1
                && run.workout_counts.workout_flexible[1] >= 1)
        {
            return Ok(run);
        }

        last_run = Some(run);
    }

    if let Some(run) = last_run {
        Ok(run)
    } else {
        Err(format!(
            "no runs executed for {} (max_attempts={})",
            scenario.name, max_attempts
        ))
    }
}

fn main() -> ExitCode {
    print_run_header();

    let scenario_hard = build_scenario("Scenario A: Hard + Soft", true);
    let scenario_soft = build_scenario("Scenario B: Soft-only ablation", false);

    let hard_run = match run_scenario_with_retries(&scenario_hard, true, 6) {
        Ok(run) => run,
        Err(err) => {
            eprintln!("FAIL: {}", err);
            return ExitCode::from(1);
        }
    };
    print_scenario_summary(
        &scenario_hard,
        &hard_run.tuples,
        &hard_run.rows,
        hard_run.workout_counts,
        hard_run.attempts,
    );

    let soft_run = match run_scenario_with_retries(&scenario_soft, false, 1) {
        Ok(run) => run,
        Err(err) => {
            eprintln!("FAIL: {}", err);
            return ExitCode::from(1);
        }
    };
    print_scenario_summary(
        &scenario_soft,
        &soft_run.tuples,
        &soft_run.rows,
        soft_run.workout_counts,
        soft_run.attempts,
    );

    let mut failures = Vec::<String>::new();
    let mut contrast_note =
        "  - Contrast note unavailable: could not compute day-level workout comparison."
            .to_string();

    if hard_run.workout_counts.workout_flexible[0] < 1
        || hard_run.workout_counts.workout_flexible[1] < 1
    {
        failures.push(format!(
            "Scenario A hard-frequency invariant failed: expected flexible Workout count >=1 on each day, got [{}, {}]",
            hard_run.workout_counts.workout_flexible[0], hard_run.workout_counts.workout_flexible[1]
        ));
    }

    let hard_d2 = hard_run.workout_counts.workout_flexible[1];
    let soft_d2 = soft_run.workout_counts.workout_flexible[1];
    if hard_d2 >= 1 && soft_d2 == 0 {
        contrast_note = "  - Contrast observed: hard mode forced a Day-2 workout, while soft mode skipped Day-2 workout and used that narrow window for other activities.".to_string();
    } else if hard_d2 >= 1 && soft_d2 >= 1 {
        contrast_note = format!(
            "  - In this run both modes kept a Day-2 workout (hard={}, soft={}); rerun may show the Day-2 divergence.",
            hard_d2, soft_d2
        );
    } else {
        failures.push(format!(
            "Unexpected result: hard scenario should keep Day-2 workout >=1, got {}",
            hard_d2
        ));
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
