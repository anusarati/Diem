use super::types::{GlobalConstraint, Problem, TimeSlot};

fn build_forbidden_slot_mask(problem: &Problem) -> Vec<bool> {
    let total_slots = problem.total_slots as usize;
    let mut mask = vec![false; total_slots];

    for constraint in &problem.global_constraints {
        if let GlobalConstraint::ForbiddenZone { start, end } = constraint {
            let start_idx = (*start as usize).min(total_slots);
            let end_idx = (*end as usize).min(total_slots);
            if start_idx >= end_idx {
                continue;
            }
            for slot in &mut mask[start_idx..end_idx] {
                *slot = true;
            }
        }
    }

    mask
}

fn build_fixed_occupancy_mask(problem: &Problem) -> Vec<bool> {
    let total_slots = problem.total_slots as usize;
    let mut mask = vec![false; total_slots];

    for &act_idx in &problem.fixed_indices {
        let activity = match problem.activities.get(act_idx) {
            Some(activity) => activity,
            None => continue,
        };
        let start_time = match activity.assigned_start {
            Some(start) => start as usize,
            None => continue,
        };
        if start_time >= total_slots {
            continue;
        }
        let end_time = start_time
            .saturating_add(activity.duration_slots as usize)
            .min(total_slots);
        if start_time >= end_time {
            continue;
        }
        for slot in &mut mask[start_time..end_time] {
            *slot = true;
        }
    }

    mask
}

pub(crate) fn build_candidate_start_slots(problem: &Problem) -> Vec<TimeSlot> {
    let total_slots = problem.total_slots as usize;
    if total_slots == 0 {
        return vec![];
    }

    let forbidden_mask = build_forbidden_slot_mask(problem);
    let fixed_mask = build_fixed_occupancy_mask(problem);
    let mut candidates = Vec::with_capacity(total_slots);

    for slot in 0..total_slots {
        if forbidden_mask[slot] || fixed_mask[slot] {
            continue;
        }
        candidates.push(slot as TimeSlot);
    }

    candidates
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::solver::types::{
        Activity, ActivityType, Binding, FrequencyTarget, Problem, UserFrequencyConstraint,
    };

    fn base_activity(id: usize, kind: ActivityType, start: Option<u16>, duration: u16) -> Activity {
        Activity {
            id,
            activity_type: kind,
            duration_slots: duration,
            priority: 1.0,
            assigned_start: start,
            category_id: 0,
            input_bindings: Vec::<Binding>::new(),
            output_bindings: Vec::<Binding>::new(),
            frequency_targets: Vec::<FrequencyTarget>::new(),
            user_frequency_constraints: Vec::<UserFrequencyConstraint>::new(),
        }
    }

    #[test]
    fn candidate_slots_exclude_forbidden_and_fixed_start_slots() {
        let floating = base_activity(0, ActivityType::Floating, None, 2);
        let fixed = base_activity(1, ActivityType::Fixed, Some(4), 3);

        let problem = Problem {
            activities: vec![floating, fixed],
            floating_indices: vec![0],
            fixed_indices: vec![1],
            global_constraints: vec![GlobalConstraint::ForbiddenZone { start: 1, end: 3 }],
            heatmap: vec![],
            markov_matrix: vec![],
            total_slots: 10,
        };

        let candidates = build_candidate_start_slots(&problem);
        // Excluded: forbidden [1,2] and fixed occupancy [4,5,6].
        assert_eq!(candidates, vec![0, 3, 7, 8, 9]);
    }
}
