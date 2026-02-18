pub mod candidate_slots;
pub mod fitness;
pub mod types;

use candidate_slots::build_candidate_start_slots;
use fitness::DiemFitness;
use genetic_algorithm::fitness::FitnessOrdering;
use genetic_algorithm::strategy::evolve::prelude::*;
use std::error::Error;
use types::{Problem, TimeSlot};

// Default GA tuning for on-device solves with slot-indexed chromosomes.
const GA_TARGET_POPULATION_SIZE: usize = 160;
const GA_MAX_STALE_GENERATIONS: usize = 60;
const GA_MULTI_GENE_MUTATION_COUNT: usize = 2;
const GA_MUTATION_PROBABILITY: f32 = 0.28;

pub fn solve(
    problem: Problem,
    max_generations: usize,
    _time_limit_ms: u64,
) -> Result<Vec<(types::ActivityId, TimeSlot)>, Box<dyn Error>> {
    let floating_count = problem.floating_indices.len();
    if floating_count == 0 {
        return Ok(vec![]);
    }

    let candidate_start_slots = build_candidate_start_slots(&problem);
    if candidate_start_slots.is_empty() {
        return Ok(vec![]);
    }
    let no_activity_allele = u16::try_from(floating_count)
        .map_err(|_| format!("Floating activity count exceeds u16: {}", floating_count))?;

    let genotype = RangeGenotype::builder()
        .with_genes_size(candidate_start_slots.len())
        .with_allele_range(0..=no_activity_allele)
        .build()
        .map_err(|e| format!("Genotype build error: {:?}", e))?;

    let fitness = DiemFitness::new(problem.clone(), candidate_start_slots.clone());

    let evolve = Evolve::builder()
        .with_genotype(genotype)
        .with_fitness(fitness)
        .with_fitness_ordering(FitnessOrdering::Maximize)
        .with_target_population_size(GA_TARGET_POPULATION_SIZE)
        .with_max_stale_generations(GA_MAX_STALE_GENERATIONS)
        .with_max_generations(max_generations)
        .with_select(SelectTournament::new(0.8, 0.1, 4))
        .with_crossover(CrossoverUniform::new(0.5, 0.5))
        .with_mutate(MutateMultiGene::new(
            GA_MULTI_GENE_MUTATION_COUNT,
            GA_MUTATION_PROBABILITY,
        ))
        .call()
        .map_err(|e| format!("Evolve strategy failed: {:?}", e))?;

    if let Some(best_chromosome) = evolve.best_chromosome() {
        let mut result = Vec::new();
        for (gene_idx, &activity_choice) in best_chromosome.genes.iter().enumerate() {
            if activity_choice == no_activity_allele {
                continue;
            }
            let floating_choice = activity_choice as usize;
            if floating_choice >= floating_count || gene_idx >= candidate_start_slots.len() {
                continue;
            }

            let act_idx = problem.floating_indices[floating_choice];
            let activity_id = problem.activities[act_idx].id;
            let start_time = candidate_start_slots[gene_idx];
            result.push((activity_id, start_time));
        }
        result.sort_unstable_by_key(|(_, start_time)| *start_time);
        Ok(result)
    } else {
        Ok(vec![])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::solver::types::{
        Activity, ActivityType, Binding, FrequencyTarget, GlobalConstraint, UserFrequencyConstraint,
    };

    fn base_activity(id: usize, kind: ActivityType) -> Activity {
        Activity {
            id,
            activity_type: kind,
            duration_slots: 2,
            priority: 1.0,
            assigned_start: None,
            category_id: 0,
            input_bindings: Vec::<Binding>::new(),
            output_bindings: Vec::<Binding>::new(),
            frequency_targets: Vec::<FrequencyTarget>::new(),
            user_frequency_constraints: Vec::<UserFrequencyConstraint>::new(),
        }
    }

    #[test]
    fn multiple_occurrences_allowed_for_single_activity() {
        let a = base_activity(0, ActivityType::Floating);
        let b = base_activity(1, ActivityType::Floating);
        let mut problem = Problem {
            activities: vec![a, b],
            floating_indices: vec![0, 1],
            fixed_indices: vec![],
            global_constraints: vec![GlobalConstraint::ForbiddenZone { start: 0, end: 2 }],
            heatmap: vec![(0, 2, 6.0), (0, 4, 6.0), (0, 6, 6.0)],
            markov_matrix: vec![],
            total_slots: 10,
        };
        problem.activities[0].priority = 2.0;
        problem.activities[1].priority = 0.0;

        let result = solve(problem, 180, 200).expect("solver should return duplicate activity IDs");
        let count_a = result.iter().filter(|(id, _)| *id == 0).count();

        assert!(
            count_a >= 2,
            "expected repeated occurrences for activity 0, got {:?}",
            result
        );
    }

    #[test]
    fn sentinel_produces_no_event_when_only_no_activity_is_feasible_choice() {
        let mut activity = base_activity(0, ActivityType::Floating);
        activity.priority = 0.0;
        activity.duration_slots = 4;

        let problem = Problem {
            activities: vec![activity],
            floating_indices: vec![0],
            fixed_indices: vec![],
            global_constraints: vec![],
            heatmap: vec![],
            markov_matrix: vec![],
            total_slots: 1,
        };

        let result = solve(problem, 50, 100).expect("solver should succeed");
        assert!(
            result.is_empty(),
            "expected no scheduled events due to end-overrun pressure, got {:?}",
            result
        );
    }

    #[test]
    fn frequency_min_now_satisfiable_without_shared_id_hack() {
        let mut workout = base_activity(0, ActivityType::Floating);
        workout.priority = 0.0;
        workout
            .user_frequency_constraints
            .push(UserFrequencyConstraint {
                scope: types::TimeScope::SameDay,
                min_count: Some(1),
                max_count: None,
                deadline_end: None,
                penalty_weight: 50_000.0,
            });

        let problem = Problem {
            activities: vec![workout],
            floating_indices: vec![0],
            fixed_indices: vec![],
            global_constraints: vec![],
            heatmap: vec![],
            markov_matrix: vec![],
            total_slots: 192,
        };

        let result = solve(problem, 220, 300).expect("solver should satisfy daily minimum");
        let day1_count = result
            .iter()
            .filter(|(id, start)| *id == 0 && *start < 96)
            .count();
        let day2_count = result
            .iter()
            .filter(|(id, start)| *id == 0 && *start >= 96)
            .count();

        assert!(
            day1_count >= 1 && day2_count >= 1,
            "expected at least one floating workout on each day, got {:?}",
            result
        );
    }
}
