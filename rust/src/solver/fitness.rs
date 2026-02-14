use crate::solver::types::{ActivityId, GlobalConstraint, Problem, TimeScope, TimeSlot};
use genetic_algorithm::chromosome::Chromosome;
use genetic_algorithm::fitness::{Fitness, FitnessValue};
use genetic_algorithm::genotype::RangeGenotype;
use std::collections::HashMap;

#[derive(Clone, Debug)]
pub struct DiemFitness {
    pub problem: Problem,
    pub heatmap_lookup: HashMap<(ActivityId, TimeSlot), f32>,
    pub markov_lookup: HashMap<(ActivityId, ActivityId), f32>,
}

impl DiemFitness {
    // Penalties (Hard Constraints)
    const PENALTY_OVERLAP: f32 = 1_000_000.0;
    const PENALTY_FORBIDDEN: f32 = 1_000_000.0;
    const PENALTY_CUMULATIVE: f32 = 10_000.0;

    // Weights (Soft Constraints/Objectives)
    const WEIGHT_PRIORITY: f32 = 10.0;
    const WEIGHT_HEATMAP: f32 = 5.0;
    const WEIGHT_MARKOV: f32 = 5.0;

    const MARKOV_GAP_TOLERANCE: u16 = 2; // 30 minutes

    pub fn new(problem: Problem) -> Self {
        let (heatmap_lookup, markov_lookup) = problem.build_lookup_maps();
        Self {
            problem,
            heatmap_lookup,
            markov_lookup,
        }
    }
}

impl Fitness for DiemFitness {
    type Genotype = RangeGenotype<u16>;

    fn calculate_for_chromosome(
        &mut self,
        chromosome: &Chromosome<u16>,
        _genotype: &Self::Genotype,
    ) -> Option<FitnessValue> {
        let genes = &chromosome.genes;

        let mut score: f32 = 0.0;
        let mut penalties: f32 = 0.0;

        let num_activities = self.problem.activities.len();
        let num_days = (self.problem.total_slots / 96) as usize + 1;
        let num_weeks = (self.problem.total_slots / 672) as usize + 1;

        // --- 0. SETUP CUMULATIVE TRACKING ---
        // Identify which (Category, Period) pairs need tracking to avoid O(C*N) lookups later.
        // Map: CategoryId -> Vec<PeriodSlots>
        let mut category_tracking: HashMap<usize, Vec<u16>> = HashMap::new();
        // Map: (CategoryId, PeriodSlots) -> HashMap<BucketIndex, TotalDuration>
        let mut duration_accumulators: HashMap<(usize, u16), HashMap<usize, u32>> = HashMap::new();

        for constraint in &self.problem.global_constraints {
            if let GlobalConstraint::CumulativeTime {
                category_id,
                period_slots,
                ..
            } = constraint
            {
                if let Some(cat_id) = category_id {
                    let periods = category_tracking.entry(*cat_id).or_default();
                    if !periods.contains(period_slots) {
                        periods.push(*period_slots);
                        duration_accumulators.insert((*cat_id, *period_slots), HashMap::new());
                    }
                }
            }
        }

        // --- 1. PRE-PROCESSING TOTALS (O(N)) ---
        // We calculate Total Counts first to handle Output bindings (Future = Total - Seen).
        let mut total_day_counts = vec![vec![0u16; num_activities]; num_days];
        let mut total_week_counts = vec![vec![0u16; num_activities]; num_weeks];
        let mut total_month_counts = vec![0u16; num_activities];

        #[derive(Debug)]
        struct ScheduledItem {
            act_idx: usize,
            start: u16,
            end: u16,
            day: usize,
            week: usize,
            weekday: usize,
        }

        let total_items_cap =
            self.problem.floating_indices.len() + self.problem.fixed_indices.len();
        let mut schedule_items: Vec<ScheduledItem> = Vec::with_capacity(total_items_cap);

        let mut register_item = |act_idx: usize, start_time: u16| {
            let activity = &self.problem.activities[act_idx];
            let end_time = start_time + activity.duration_slots;

            if end_time > self.problem.total_slots {
                penalties += Self::PENALTY_FORBIDDEN;
            }

            let day = (start_time / 96) as usize;
            let week = (start_time / 672) as usize;
            let weekday = day % 7;

            // Update Totals for Output Bindings
            if day < num_days {
                total_day_counts[day][activity.id] += 1;
            }
            if week < num_weeks {
                total_week_counts[week][activity.id] += 1;
            }
            total_month_counts[activity.id] += 1;

            // Score: Priority & Heatmap
            score += activity.priority * Self::WEIGHT_PRIORITY;
            if let Some(prob) = self.heatmap_lookup.get(&(activity.id, start_time)) {
                score += prob * Self::WEIGHT_HEATMAP;
            }

            schedule_items.push(ScheduledItem {
                act_idx,
                start: start_time,
                end: end_time,
                day,
                week,
                weekday,
            });
        };

        // Process Genes
        for (gene_idx, &start_time) in genes.iter().enumerate() {
            if gene_idx >= self.problem.floating_indices.len() {
                break;
            }
            register_item(self.problem.floating_indices[gene_idx], start_time);
        }

        // Process Fixed
        for &act_idx in &self.problem.fixed_indices {
            if let Some(start) = self.problem.activities[act_idx].assigned_start {
                register_item(act_idx, start);
            }
        }

        // --- 2. SORT (O(N log N)) ---
        schedule_items.sort_unstable_by_key(|k| k.start);

        // --- 3. SEQUENTIAL SWEEP (O(N)) ---
        let mut running_day_counts = vec![0u16; num_activities];
        let mut running_week_counts = vec![0u16; num_activities];
        let mut running_month_counts = vec![0u16; num_activities];

        let mut prev_day = usize::MAX;
        let mut prev_week = usize::MAX;

        for i in 0..schedule_items.len() {
            let curr = &schedule_items[i];
            let activity = &self.problem.activities[curr.act_idx];

            // Reset running counts on scope boundaries
            if curr.day != prev_day {
                running_day_counts.fill(0);
                prev_day = curr.day;
            }
            if curr.week != prev_week {
                running_week_counts.fill(0);
                prev_week = curr.week;
            }

            // --- A. ACCUMULATE DURATION FOR CUMULATIVE CONSTRAINTS ---
            if let Some(periods) = category_tracking.get(&activity.category_id) {
                for &p in periods {
                    // Generic bucket calculation
                    let bucket = if p >= self.problem.total_slots {
                        0
                    } else {
                        (curr.start / p) as usize
                    };

                    if let Some(map) = duration_accumulators.get_mut(&(activity.category_id, p)) {
                        *map.entry(bucket).or_insert(0) += activity.duration_slots as u32;
                    }
                }
            }

            // --- B. Global Constraints (Forbidden Zones) ---
            for constraint in &self.problem.global_constraints {
                if let GlobalConstraint::ForbiddenZone { start, end } = constraint {
                    if curr.start < *end && curr.end > *start {
                        penalties += Self::PENALTY_FORBIDDEN;
                    }
                }
            }

            // --- C. Overlaps & Markov ---
            if i > 0 {
                let prev = &schedule_items[i - 1];
                if curr.start < prev.end {
                    penalties += Self::PENALTY_OVERLAP;
                } else if curr.start - prev.end <= Self::MARKOV_GAP_TOLERANCE {
                    // Markov Reward
                    let prev_id = self.problem.activities[prev.act_idx].id;
                    let curr_id = activity.id;
                    if let Some(prob) = self.markov_lookup.get(&(prev_id, curr_id)) {
                        score += prob * Self::WEIGHT_MARKOV;
                    }
                }
            }

            // --- D. INPUT BINDINGS (Strictly Before) ---
            for binding in &activity.input_bindings {
                if (binding.valid_weekdays & (1 << curr.weekday)) == 0 {
                    continue;
                }

                let mut binding_met = false;
                for req_set in &binding.required_sets {
                    let set_met = req_set.iter().all(|&req_id| match binding.time_scope {
                        TimeScope::SameDay => running_day_counts[req_id] > 0,
                        TimeScope::SameWeek => running_week_counts[req_id] > 0,
                        TimeScope::SameMonth => running_month_counts[req_id] > 0,
                    });
                    if set_met {
                        binding_met = true;
                        break;
                    }
                }
                if !binding_met {
                    penalties += binding.weight;
                }
            }

            // --- E. OUTPUT BINDINGS ---
            for binding in &activity.output_bindings {
                if (binding.valid_weekdays & (1 << curr.weekday)) == 0 {
                    continue;
                }

                let mut binding_met = false;
                for req_set in &binding.required_sets {
                    let set_met = req_set.iter().all(|&req_id| {
                        let total = match binding.time_scope {
                            TimeScope::SameDay => {
                                if curr.day < num_days {
                                    total_day_counts[curr.day][req_id]
                                } else {
                                    0
                                }
                            }
                            TimeScope::SameWeek => {
                                if curr.week < num_weeks {
                                    total_week_counts[curr.week][req_id]
                                } else {
                                    0
                                }
                            }
                            TimeScope::SameMonth => total_month_counts[req_id],
                        };

                        let running = match binding.time_scope {
                            TimeScope::SameDay => running_day_counts[req_id],
                            TimeScope::SameWeek => running_week_counts[req_id],
                            TimeScope::SameMonth => running_month_counts[req_id],
                        };

                        let current_is_req = if req_id == activity.id { 1 } else { 0 };
                        // Future = Total - Past - Present
                        let future = total.saturating_sub(running + current_is_req);
                        future > 0
                    });
                    if set_met {
                        binding_met = true;
                        break;
                    }
                }
                if !binding_met {
                    penalties += binding.weight;
                }
            }

            // --- UPDATE RUNNING COUNTS ---
            running_day_counts[activity.id] += 1;
            running_week_counts[activity.id] += 1;
            running_month_counts[activity.id] += 1;
        }

        // --- 4. SOFT FREQUENCY TARGETS (Reward) ---
        for activity in &self.problem.activities {
            for target in &activity.frequency_targets {
                match target.scope {
                    TimeScope::SameDay => {
                        for d in 0..num_days {
                            let actual = total_day_counts[d][activity.id];
                            if actual <= target.target_count {
                                score += (actual as f32) * target.weight;
                            }
                            // No reward if higher
                        }
                    }
                    TimeScope::SameWeek => {
                        for w in 0..num_weeks {
                            let actual = total_week_counts[w][activity.id];
                            if actual <= target.target_count {
                                score += (actual as f32) * target.weight;
                            }
                        }
                    }
                    TimeScope::SameMonth => {
                        let actual = total_month_counts[activity.id];
                        if actual <= target.target_count {
                            score += (actual as f32) * target.weight;
                        }
                    }
                }
            }
        }

        // --- 5. CHECK CUMULATIVE TIME CONSTRAINTS ---
        // O(C * B_active) where B_active is number of buckets with data
        for constraint in &self.problem.global_constraints {
            if let GlobalConstraint::CumulativeTime {
                category_id,
                period_slots,
                min_duration,
                max_duration,
            } = constraint
            {
                if let Some(cat_id) = category_id {
                    if let Some(totals) = duration_accumulators.get(&(*cat_id, *period_slots)) {
                        for &total in totals.values() {
                            if total < (*min_duration as u32) {
                                penalties += Self::PENALTY_CUMULATIVE
                                    * ((*min_duration as u32 - total) as f32);
                            }
                            if total > (*max_duration as u32) {
                                penalties += Self::PENALTY_CUMULATIVE
                                    * ((total - *max_duration as u32) as f32);
                            }
                        }
                    }
                }
            }
        }

        let final_score = score - penalties;
        Some(final_score as isize)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::solver::types::{
        Activity, ActivityType, Binding, FrequencyTarget, Problem, TimeScope,
    };
    use genetic_algorithm::chromosome::Chromosome;
    use genetic_algorithm::genotype::{Genotype, RangeGenotype};

    fn base_activity(id: usize) -> Activity {
        Activity {
            id,
            activity_type: ActivityType::Floating,
            duration_slots: 2,
            priority: 1.0,
            assigned_start: None,
            category_id: 0,
            input_bindings: vec![],
            output_bindings: vec![],
            frequency_targets: Vec::<FrequencyTarget>::new(),
        }
    }

    fn genotype_for(genes_size: usize, total_slots: u16) -> RangeGenotype<u16> {
        RangeGenotype::builder()
            .with_genes_size(genes_size)
            .with_allele_range(0..=total_slots)
            .build()
            .expect("genotype should build for tests")
    }

    #[test]
    fn input_binding_penalizes_when_predecessor_not_seen() {
        let mut a = base_activity(0);
        let mut b = base_activity(1);
        a.priority = 0.0;
        b.priority = 0.0;

        b.input_bindings.push(Binding {
            required_sets: vec![vec![0]],
            time_scope: TimeScope::SameDay,
            valid_weekdays: 0b1111111,
            weight: 100.0,
        });

        let problem = Problem {
            activities: vec![a, b],
            floating_indices: vec![0, 1],
            fixed_indices: vec![],
            global_constraints: vec![],
            heatmap: vec![],
            markov_matrix: vec![],
            total_slots: 96,
        };

        let genotype = genotype_for(2, problem.total_slots);
        let mut fitness = DiemFitness::new(problem.clone());
        let valid = Chromosome::new(vec![5, 20]);
        let invalid = Chromosome::new(vec![20, 5]);

        let valid_score = fitness
            .calculate_for_chromosome(&valid, &genotype)
            .expect("fitness should be computed");

        let mut fitness = DiemFitness::new(problem);
        let invalid_score = fitness
            .calculate_for_chromosome(&invalid, &genotype)
            .expect("fitness should be computed");

        assert!(
            valid_score > invalid_score,
            "input binding should penalize invalid ordering"
        );
    }

    #[test]
    fn weekday_mask_skips_binding_outside_applicable_day() {
        let mut a = base_activity(0);
        let mut b = base_activity(1);
        a.priority = 0.0;
        b.priority = 0.0;

        b.input_bindings.push(Binding {
            required_sets: vec![vec![0]],
            time_scope: TimeScope::SameDay,
            valid_weekdays: 1 << 0, // Monday only
            weight: 200.0,
        });

        let problem = Problem {
            activities: vec![a, b],
            floating_indices: vec![0, 1],
            fixed_indices: vec![],
            global_constraints: vec![],
            heatmap: vec![],
            markov_matrix: vec![],
            total_slots: 96 * 2,
        };

        // Day 1 (Tuesday in solver's weekday mapping), so Monday-only binding is ignored.
        let genotype = genotype_for(2, problem.total_slots);
        let chromosome = Chromosome::new(vec![96 + 20, 96 + 5]);

        let mut with_mask = DiemFitness::new(problem.clone());
        let masked_score = with_mask
            .calculate_for_chromosome(&chromosome, &genotype)
            .expect("fitness should be computed");

        // Same binding but applicable every weekday should apply penalty.
        let mut no_mask_problem = problem;
        no_mask_problem.activities[1].input_bindings[0].valid_weekdays = 0b1111111;
        let mut without_mask = DiemFitness::new(no_mask_problem);
        let unmasked_score = without_mask
            .calculate_for_chromosome(&chromosome, &genotype)
            .expect("fitness should be computed");

        assert!(
            masked_score > unmasked_score,
            "weekday mask should prevent penalty on non-applicable days"
        );
    }

    #[test]
    fn markov_reward_applies_within_gap_tolerance() {
        let mut a = base_activity(0);
        let mut b = base_activity(1);
        a.priority = 0.0;
        b.priority = 0.0;

        let problem = Problem {
            activities: vec![a, b],
            floating_indices: vec![0, 1],
            fixed_indices: vec![],
            global_constraints: vec![],
            heatmap: vec![],
            markov_matrix: vec![(0, 1, 1.0)],
            total_slots: 96,
        };

        let genotype = genotype_for(2, problem.total_slots);
        let within_gap = Chromosome::new(vec![0, 4]); // gap = 2 slots after A ends
        let outside_gap = Chromosome::new(vec![0, 5]); // gap = 3 slots

        let mut fitness = DiemFitness::new(problem.clone());
        let within_score = fitness
            .calculate_for_chromosome(&within_gap, &genotype)
            .expect("fitness should be computed");

        let mut fitness = DiemFitness::new(problem);
        let outside_score = fitness
            .calculate_for_chromosome(&outside_gap, &genotype)
            .expect("fitness should be computed");

        assert!(
            within_score > outside_score,
            "markov reward should be applied only within gap tolerance"
        );
    }
}
