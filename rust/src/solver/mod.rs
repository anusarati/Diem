pub mod fitness;
pub mod types;

use fitness::DiemFitness;
use genetic_algorithm::fitness::FitnessOrdering;
use genetic_algorithm::strategy::evolve::prelude::*;
use std::error::Error;
use types::{Problem, TimeSlot};

pub fn solve(
    problem: Problem,
    max_generations: usize,
    _time_limit_ms: u64,
) -> Result<Vec<(types::ActivityId, TimeSlot)>, Box<dyn Error>> {
    let floating_count = problem.floating_indices.len();
    if floating_count == 0 {
        return Ok(vec![]);
    }

    let total_slots = problem.total_slots;

    let genotype = RangeGenotype::builder()
        .with_genes_size(floating_count)
        .with_allele_range(0..=total_slots)
        .build()
        .map_err(|e| format!("Genotype build error: {:?}", e))?;

    let fitness = DiemFitness::new(problem.clone());

    let evolve = Evolve::builder()
        .with_genotype(genotype)
        .with_fitness(fitness)
        .with_fitness_ordering(FitnessOrdering::Maximize)
        .with_target_population_size(100)
        .with_max_stale_generations(50)
        .with_max_generations(max_generations)
        .with_select(SelectTournament::new(0.8, 0.1, 4))
        .with_crossover(CrossoverUniform::new(0.5, 0.5))
        .with_mutate(MutateSingleGene::new(0.2))
        .call()
        .map_err(|e| format!("Evolve strategy failed: {:?}", e))?;

    if let Some(best_chromosome) = evolve.best_chromosome() {
        let mut result = Vec::new();
        for (i, &start_time) in best_chromosome.genes.iter().enumerate() {
            if i < problem.floating_indices.len() {
                let act_idx = problem.floating_indices[i];
                let activity_id = problem.activities[act_idx].id;
                result.push((activity_id, start_time));
            }
        }
        Ok(result)
    } else {
        Ok(vec![])
    }
}
