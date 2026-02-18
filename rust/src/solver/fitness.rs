use crate::solver::types::{ActivityId, GlobalConstraint, Problem, TimeScope, TimeSlot};
use genetic_algorithm::chromosome::Chromosome;
use genetic_algorithm::fitness::{Fitness, FitnessValue};
use genetic_algorithm::genotype::RangeGenotype;
use std::collections::HashMap;

#[derive(Clone, Debug, Default)]
struct DurationPrefixIndex {
    ends: Vec<TimeSlot>,
    prefix_sum: Vec<u32>,
}

impl DurationPrefixIndex {
    fn from_events(mut events: Vec<(TimeSlot, u16)>) -> Self {
        if events.is_empty() {
            return Self::default();
        }

        events.sort_unstable_by_key(|(end, _)| *end);
        let mut ends = Vec::with_capacity(events.len());
        let mut prefix_sum = Vec::with_capacity(events.len());
        let mut running_total = 0u32;
        for (end, duration) in events {
            ends.push(end);
            running_total += duration as u32;
            prefix_sum.push(running_total);
        }

        Self { ends, prefix_sum }
    }

    fn sum_leq(&self, deadline: TimeSlot) -> u32 {
        let idx = self.ends.partition_point(|&end| end <= deadline);
        if idx == 0 {
            0
        } else {
            self.prefix_sum[idx - 1]
        }
    }
}

fn count_ends_leq(sorted_ends: &[TimeSlot], deadline: TimeSlot) -> u32 {
    sorted_ends.partition_point(|&end| end <= deadline) as u32
}

#[derive(Clone, Debug)]
pub struct DiemFitness {
    pub problem: Problem,
    pub candidate_start_slots: Vec<TimeSlot>,
    pub no_activity_allele: u16,
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
    const FREQUENCY_OVERSHOOT_MULTIPLIER: f32 = 6.0;
    const REWARD_NO_ACTIVITY: f32 = 0.01;
    const PRIORITY_REPEAT_DECAY: f32 = 0.65;

    const MARKOV_GAP_TOLERANCE: u16 = 2; // 30 minutes

    pub fn new(problem: Problem, candidate_start_slots: Vec<TimeSlot>) -> Self {
        let no_activity_allele = u16::try_from(problem.floating_indices.len()).unwrap_or(u16::MAX);
        let (heatmap_lookup, markov_lookup) = problem.build_lookup_maps();
        Self {
            problem,
            candidate_start_slots,
            no_activity_allele,
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
        let floating_count = self.problem.floating_indices.len();
        let forbidden_zones: Vec<(u16, u16)> = self
            .problem
            .global_constraints
            .iter()
            .filter_map(|constraint| {
                if let GlobalConstraint::ForbiddenZone { start, end } = constraint {
                    Some((*start, *end))
                } else {
                    None
                }
            })
            .collect();

        // --- 1. PRE-PROCESSING TOTALS (O(N)) ---
        // We calculate Total Counts first to handle Output bindings (Future = Total - Seen).
        let mut total_day_counts = vec![vec![0u16; num_activities]; num_days];
        let mut total_week_counts = vec![vec![0u16; num_activities]; num_weeks];
        let mut total_month_counts = vec![0u16; num_activities];
        let mut priority_occurrence_counts = vec![0u16; num_activities];

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
        let mut no_activity_count: u32 = 0;

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

            // Score: Priority (with diminishing returns) & Heatmap.
            let occurrence_index = priority_occurrence_counts[activity.id] as i32;
            let repeat_multiplier = Self::PRIORITY_REPEAT_DECAY.powi(occurrence_index);
            score += activity.priority * Self::WEIGHT_PRIORITY * repeat_multiplier;
            priority_occurrence_counts[activity.id] =
                priority_occurrence_counts[activity.id].saturating_add(1);
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

        // Process Genes (slot-indexed; activity choice encoded as allele).
        for (gene_idx, &activity_choice) in genes.iter().enumerate() {
            if gene_idx >= self.candidate_start_slots.len() {
                break;
            }
            if activity_choice == self.no_activity_allele {
                no_activity_count = no_activity_count.saturating_add(1);
                continue;
            }
            let floating_choice = activity_choice as usize;
            if floating_choice >= floating_count {
                continue;
            }
            let start_time = self.candidate_start_slots[gene_idx];
            let act_idx = self.problem.floating_indices[floating_choice];
            register_item(act_idx, start_time);
        }

        // Process Fixed
        for &act_idx in &self.problem.fixed_indices {
            if let Some(start) = self.problem.activities[act_idx].assigned_start {
                register_item(act_idx, start);
            }
        }
        drop(register_item);
        score += (no_activity_count as f32) * Self::REWARD_NO_ACTIVITY;

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

            // --- A. Global Constraints (Forbidden Zones) ---
            for (start, end) in &forbidden_zones {
                if curr.start < *end && curr.end > *start {
                    penalties += Self::PENALTY_FORBIDDEN;
                }
            }

            // --- B. Overlaps & Markov ---
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

            // --- C. INPUT BINDINGS (Strictly Before) ---
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

            // --- D. OUTPUT BINDINGS ---
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

        // --- 4. BUILD DEADLINE/PERIOD INDICES ---
        // Prefix-style indices over event end-times for fast deadline queries.
        let mut activity_month_end_slots = vec![Vec::<TimeSlot>::new(); num_activities];
        let mut activity_day_end_slots = HashMap::<(usize, usize), Vec<TimeSlot>>::new();
        let mut activity_week_end_slots = HashMap::<(usize, usize), Vec<TimeSlot>>::new();

        let mut activity_duration_events = vec![Vec::<(TimeSlot, u16)>::new(); num_activities];
        let mut category_duration_events = HashMap::<usize, Vec<(TimeSlot, u16)>>::new();
        let mut global_duration_events =
            Vec::<(TimeSlot, u16)>::with_capacity(schedule_items.len());

        for item in &schedule_items {
            let activity = &self.problem.activities[item.act_idx];
            let activity_id = activity.id;
            let end_slot = item.end.min(self.problem.total_slots);
            let duration_slots = activity.duration_slots;

            activity_month_end_slots[activity_id].push(end_slot);
            activity_day_end_slots
                .entry((activity_id, item.day))
                .or_default()
                .push(end_slot);
            activity_week_end_slots
                .entry((activity_id, item.week))
                .or_default()
                .push(end_slot);

            activity_duration_events[activity_id].push((end_slot, duration_slots));
            category_duration_events
                .entry(activity.category_id)
                .or_default()
                .push((end_slot, duration_slots));
            global_duration_events.push((end_slot, duration_slots));
        }

        for ends in &mut activity_month_end_slots {
            ends.sort_unstable();
        }
        for ends in activity_day_end_slots.values_mut() {
            ends.sort_unstable();
        }
        for ends in activity_week_end_slots.values_mut() {
            ends.sort_unstable();
        }

        let activity_duration_prefix = activity_duration_events
            .into_iter()
            .map(DurationPrefixIndex::from_events)
            .collect::<Vec<_>>();
        let mut category_duration_prefix = HashMap::<usize, DurationPrefixIndex>::new();
        for (category_id, events) in category_duration_events {
            category_duration_prefix.insert(category_id, DurationPrefixIndex::from_events(events));
        }
        let global_duration_prefix = DurationPrefixIndex::from_events(global_duration_events);

        // Precompute bucket totals for periodic (non-deadline) cumulative constraints.
        let mut activity_periods = HashMap::<usize, Vec<u16>>::new();
        let mut category_periods = HashMap::<usize, Vec<u16>>::new();
        let mut global_periods = Vec::<u16>::new();

        for constraint in &self.problem.global_constraints {
            if let GlobalConstraint::CumulativeTime {
                activity_id,
                category_id,
                period_slots,
                deadline_end,
                ..
            } = constraint
            {
                if deadline_end.is_some() {
                    continue;
                }
                match (activity_id, category_id) {
                    (Some(aid), _) => {
                        let periods = activity_periods.entry(*aid).or_default();
                        if !periods.contains(period_slots) {
                            periods.push(*period_slots);
                        }
                    }
                    (None, Some(cid)) => {
                        let periods = category_periods.entry(*cid).or_default();
                        if !periods.contains(period_slots) {
                            periods.push(*period_slots);
                        }
                    }
                    (None, None) => {
                        if !global_periods.contains(period_slots) {
                            global_periods.push(*period_slots);
                        }
                    }
                }
            }
        }

        let mut activity_period_totals = HashMap::<(usize, u16), HashMap<usize, u32>>::new();
        for (activity_id, periods) in &activity_periods {
            for period_slots in periods {
                activity_period_totals.insert((*activity_id, *period_slots), HashMap::new());
            }
        }
        let mut category_period_totals = HashMap::<(usize, u16), HashMap<usize, u32>>::new();
        for (category_id, periods) in &category_periods {
            for period_slots in periods {
                category_period_totals.insert((*category_id, *period_slots), HashMap::new());
            }
        }
        let mut global_period_totals = HashMap::<u16, HashMap<usize, u32>>::new();
        for period_slots in &global_periods {
            global_period_totals.insert(*period_slots, HashMap::new());
        }

        for item in &schedule_items {
            let activity = &self.problem.activities[item.act_idx];
            let duration = activity.duration_slots as u32;
            let start = item.start;

            if let Some(periods) = activity_periods.get(&activity.id) {
                for period_slots in periods {
                    let bucket = if *period_slots >= self.problem.total_slots {
                        0
                    } else {
                        (start / *period_slots) as usize
                    };
                    if let Some(bucket_totals) =
                        activity_period_totals.get_mut(&(activity.id, *period_slots))
                    {
                        *bucket_totals.entry(bucket).or_insert(0) += duration;
                    }
                }
            }

            if let Some(periods) = category_periods.get(&activity.category_id) {
                for period_slots in periods {
                    let bucket = if *period_slots >= self.problem.total_slots {
                        0
                    } else {
                        (start / *period_slots) as usize
                    };
                    if let Some(bucket_totals) =
                        category_period_totals.get_mut(&(activity.category_id, *period_slots))
                    {
                        *bucket_totals.entry(bucket).or_insert(0) += duration;
                    }
                }
            }

            for period_slots in &global_periods {
                let bucket = if *period_slots >= self.problem.total_slots {
                    0
                } else {
                    (start / *period_slots) as usize
                };
                if let Some(bucket_totals) = global_period_totals.get_mut(period_slots) {
                    *bucket_totals.entry(bucket).or_insert(0) += duration;
                }
            }
        }

        // --- 5. SOFT FREQUENCY TARGETS (Reward + Overshoot Penalty) ---
        let horizon_days = (self.problem.total_slots as f32 / 96.0).max(1.0);
        for activity in &self.problem.activities {
            for target in &activity.frequency_targets {
                let reward_for_count = |actual: u16| -> f32 {
                    if target.target_count == 0 {
                        return 0.0;
                    }
                    let covered = actual.min(target.target_count) as f32;
                    let target_count = target.target_count as f32;
                    target.weight * (covered / target_count)
                };

                match target.scope {
                    TimeScope::SameDay => {
                        for d in 0..num_days {
                            let actual = total_day_counts[d][activity.id];
                            score += reward_for_count(actual);
                            if actual > target.target_count {
                                let excess = (actual - target.target_count) as f32;
                                penalties +=
                                    target.weight * Self::FREQUENCY_OVERSHOOT_MULTIPLIER * excess;
                            }
                        }
                    }
                    TimeScope::SameWeek => {
                        for w in 0..num_weeks {
                            let actual = total_week_counts[w][activity.id];
                            score += reward_for_count(actual);
                            if actual > target.target_count {
                                let excess = (actual - target.target_count) as f32;
                                penalties += target.weight
                                    * Self::FREQUENCY_OVERSHOOT_MULTIPLIER
                                    * (excess / 7.0);
                            }
                        }
                    }
                    TimeScope::SameMonth => {
                        let actual = total_month_counts[activity.id];
                        score += reward_for_count(actual);
                        if actual > target.target_count {
                            let excess = (actual - target.target_count) as f32;
                            penalties += target.weight
                                * Self::FREQUENCY_OVERSHOOT_MULTIPLIER
                                * (excess / horizon_days);
                        }
                    }
                }
            }
        }

        // --- 6. USER FREQUENCY CONSTRAINTS (RELATIVELY HARD PENALTY) ---
        for activity in &self.problem.activities {
            for constraint in &activity.user_frequency_constraints {
                match constraint.scope {
                    TimeScope::SameDay => {
                        for d in 0..num_days {
                            let bucket_start = (d as u16) * 96;
                            let actual = if let Some(deadline_end) = constraint.deadline_end {
                                if bucket_start > deadline_end {
                                    continue;
                                }
                                activity_day_end_slots
                                    .get(&(activity.id, d))
                                    .map_or(0, |ends| count_ends_leq(ends, deadline_end))
                            } else {
                                total_day_counts[d][activity.id] as u32
                            };
                            if let Some(min_count) = constraint.min_count {
                                let min_count = min_count as u32;
                                if actual < min_count {
                                    penalties +=
                                        (min_count - actual) as f32 * constraint.penalty_weight;
                                }
                            }
                            if let Some(max_count) = constraint.max_count {
                                let max_count = max_count as u32;
                                if actual > max_count {
                                    penalties +=
                                        (actual - max_count) as f32 * constraint.penalty_weight;
                                }
                            }
                        }
                    }
                    TimeScope::SameWeek => {
                        for w in 0..num_weeks {
                            let bucket_start = (w as u16) * 672;
                            let actual = if let Some(deadline_end) = constraint.deadline_end {
                                if bucket_start > deadline_end {
                                    continue;
                                }
                                activity_week_end_slots
                                    .get(&(activity.id, w))
                                    .map_or(0, |ends| count_ends_leq(ends, deadline_end))
                            } else {
                                total_week_counts[w][activity.id] as u32
                            };
                            if let Some(min_count) = constraint.min_count {
                                let min_count = min_count as u32;
                                if actual < min_count {
                                    penalties +=
                                        (min_count - actual) as f32 * constraint.penalty_weight;
                                }
                            }
                            if let Some(max_count) = constraint.max_count {
                                let max_count = max_count as u32;
                                if actual > max_count {
                                    penalties +=
                                        (actual - max_count) as f32 * constraint.penalty_weight;
                                }
                            }
                        }
                    }
                    TimeScope::SameMonth => {
                        let actual = if let Some(deadline_end) = constraint.deadline_end {
                            count_ends_leq(&activity_month_end_slots[activity.id], deadline_end)
                        } else {
                            total_month_counts[activity.id] as u32
                        };
                        if let Some(min_count) = constraint.min_count {
                            let min_count = min_count as u32;
                            if actual < min_count {
                                penalties +=
                                    (min_count - actual) as f32 * constraint.penalty_weight;
                            }
                        }
                        if let Some(max_count) = constraint.max_count {
                            let max_count = max_count as u32;
                            if actual > max_count {
                                penalties +=
                                    (actual - max_count) as f32 * constraint.penalty_weight;
                            }
                        }
                    }
                }
            }
        }

        // --- 7. CHECK CUMULATIVE TIME CONSTRAINTS ---
        // Deadline mode uses end-time prefix sums; periodic mode uses prebuilt bucket totals.
        for constraint in &self.problem.global_constraints {
            if let GlobalConstraint::CumulativeTime {
                activity_id,
                category_id,
                period_slots,
                min_duration,
                max_duration,
                deadline_end,
            } = constraint
            {
                if let Some(deadline) = deadline_end {
                    let total_before_deadline: u32 = match (activity_id, category_id) {
                        (Some(aid), Some(cid)) => {
                            let activity_category_matches = self
                                .problem
                                .activities
                                .get(*aid)
                                .is_some_and(|activity| activity.category_id == *cid);
                            if activity_category_matches {
                                activity_duration_prefix
                                    .get(*aid)
                                    .map_or(0, |index| index.sum_leq(*deadline))
                            } else {
                                0
                            }
                        }
                        (Some(aid), None) => activity_duration_prefix
                            .get(*aid)
                            .map_or(0, |index| index.sum_leq(*deadline)),
                        (None, Some(cid)) => category_duration_prefix
                            .get(cid)
                            .map_or(0, |index| index.sum_leq(*deadline)),
                        (None, None) => global_duration_prefix.sum_leq(*deadline),
                    };

                    if total_before_deadline < (*min_duration as u32) {
                        penalties += Self::PENALTY_CUMULATIVE
                            * ((*min_duration as u32 - total_before_deadline) as f32);
                    }
                    if total_before_deadline > (*max_duration as u32) {
                        penalties += Self::PENALTY_CUMULATIVE
                            * ((total_before_deadline - *max_duration as u32) as f32);
                    }
                    continue;
                }

                let bucket_totals = match (activity_id, category_id) {
                    (Some(aid), Some(cid)) => {
                        let activity_category_matches = self
                            .problem
                            .activities
                            .get(*aid)
                            .is_some_and(|activity| activity.category_id == *cid);
                        if activity_category_matches {
                            activity_period_totals.get(&(*aid, *period_slots))
                        } else {
                            None
                        }
                    }
                    (Some(aid), None) => activity_period_totals.get(&(*aid, *period_slots)),
                    (None, Some(cid)) => category_period_totals.get(&(*cid, *period_slots)),
                    (None, None) => global_period_totals.get(period_slots),
                };

                if let Some(bucket_totals) = bucket_totals {
                    for total in bucket_totals.values() {
                        if *total < (*min_duration as u32) {
                            penalties +=
                                Self::PENALTY_CUMULATIVE * ((*min_duration as u32 - *total) as f32);
                        }
                        if *total > (*max_duration as u32) {
                            penalties +=
                                Self::PENALTY_CUMULATIVE * ((*total - *max_duration as u32) as f32);
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
    use crate::solver::candidate_slots::build_candidate_start_slots;
    use crate::solver::types::{
        Activity, ActivityType, Binding, FrequencyTarget, GlobalConstraint, Problem, TimeScope,
        UserFrequencyConstraint,
    };
    use genetic_algorithm::chromosome::Chromosome;
    use genetic_algorithm::genotype::{Genotype, RangeGenotype};
    use std::collections::HashMap;

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
            user_frequency_constraints: Vec::<UserFrequencyConstraint>::new(),
        }
    }

    fn no_activity_allele(problem: &Problem) -> u16 {
        u16::try_from(problem.floating_indices.len())
            .expect("floating activity count must fit in u16 for tests")
    }

    fn genotype_for(problem: &Problem, candidate_slots: &[u16]) -> RangeGenotype<u16> {
        RangeGenotype::builder()
            .with_genes_size(candidate_slots.len())
            .with_allele_range(0..=no_activity_allele(problem))
            .build()
            .expect("genotype should build for tests")
    }

    fn chromosome_from_assignments(
        problem: &Problem,
        candidate_slots: &[u16],
        assignments: &[(u16, u16)],
    ) -> Chromosome<u16> {
        let sentinel = no_activity_allele(problem);
        let mut genes = vec![sentinel; candidate_slots.len()];
        let mut slot_to_index = HashMap::<u16, usize>::new();
        for (idx, slot) in candidate_slots.iter().enumerate() {
            slot_to_index.insert(*slot, idx);
        }
        for (slot, floating_choice) in assignments {
            let idx = *slot_to_index
                .get(slot)
                .unwrap_or_else(|| panic!("slot {} is not in candidate slot set", slot));
            genes[idx] = *floating_choice;
        }
        Chromosome::new(genes)
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

        let candidate_slots = build_candidate_start_slots(&problem);
        let genotype = genotype_for(&problem, &candidate_slots);
        let valid = chromosome_from_assignments(&problem, &candidate_slots, &[(5, 0), (20, 1)]);
        let invalid = chromosome_from_assignments(&problem, &candidate_slots, &[(20, 0), (5, 1)]);

        let mut fitness = DiemFitness::new(problem.clone(), candidate_slots.clone());

        let valid_score = fitness
            .calculate_for_chromosome(&valid, &genotype)
            .expect("fitness should be computed");

        let mut fitness = DiemFitness::new(problem, candidate_slots);
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
        let candidate_slots = build_candidate_start_slots(&problem);
        let genotype = genotype_for(&problem, &candidate_slots);
        let chromosome =
            chromosome_from_assignments(&problem, &candidate_slots, &[(96 + 20, 0), (96 + 5, 1)]);

        let mut with_mask = DiemFitness::new(problem.clone(), candidate_slots.clone());
        let masked_score = with_mask
            .calculate_for_chromosome(&chromosome, &genotype)
            .expect("fitness should be computed");

        // Same binding but applicable every weekday should apply penalty.
        let mut no_mask_problem = problem;
        no_mask_problem.activities[1].input_bindings[0].valid_weekdays = 0b1111111;
        let mut without_mask = DiemFitness::new(no_mask_problem, candidate_slots);
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

        let candidate_slots = build_candidate_start_slots(&problem);
        let genotype = genotype_for(&problem, &candidate_slots);
        let within_gap = chromosome_from_assignments(&problem, &candidate_slots, &[(0, 0), (4, 1)]);
        let outside_gap =
            chromosome_from_assignments(&problem, &candidate_slots, &[(0, 0), (5, 1)]);

        let mut fitness = DiemFitness::new(problem.clone(), candidate_slots.clone());
        let within_score = fitness
            .calculate_for_chromosome(&within_gap, &genotype)
            .expect("fitness should be computed");

        let mut fitness = DiemFitness::new(problem, candidate_slots);
        let outside_score = fitness
            .calculate_for_chromosome(&outside_gap, &genotype)
            .expect("fitness should be computed");

        assert!(
            within_score > outside_score,
            "markov reward should be applied only within gap tolerance"
        );
    }

    #[test]
    fn user_frequency_min_penalizes_shortfall() {
        let mut a = base_activity(0);
        a.priority = 0.0;
        a.user_frequency_constraints.push(UserFrequencyConstraint {
            scope: TimeScope::SameDay,
            min_count: Some(1),
            max_count: None,
            deadline_end: None,
            penalty_weight: 500.0,
        });

        let problem = Problem {
            activities: vec![a],
            floating_indices: vec![0],
            fixed_indices: vec![],
            global_constraints: vec![],
            heatmap: vec![],
            markov_matrix: vec![],
            total_slots: 96,
        };

        let candidate_slots = build_candidate_start_slots(&problem);
        let genotype = genotype_for(&problem, &candidate_slots);
        let chromosome = chromosome_from_assignments(&problem, &candidate_slots, &[(2, 0)]);

        let mut fitness = DiemFitness::new(problem.clone(), candidate_slots.clone());
        let constrained_score = fitness
            .calculate_for_chromosome(&chromosome, &genotype)
            .expect("fitness should be computed");

        let mut unconstrained = problem;
        unconstrained.activities[0]
            .user_frequency_constraints
            .clear();
        let mut fitness = DiemFitness::new(unconstrained, candidate_slots);
        let unconstrained_score = fitness
            .calculate_for_chromosome(&chromosome, &genotype)
            .expect("fitness should be computed");

        assert!(
            constrained_score < unconstrained_score,
            "minimum frequency constraint should reduce score when unmet"
        );
    }

    #[test]
    fn user_frequency_max_penalizes_overshoot() {
        let mut a = base_activity(0);
        a.priority = 0.0;
        a.user_frequency_constraints.push(UserFrequencyConstraint {
            scope: TimeScope::SameDay,
            min_count: None,
            max_count: Some(0),
            deadline_end: None,
            penalty_weight: 500.0,
        });

        let problem = Problem {
            activities: vec![a],
            floating_indices: vec![0],
            fixed_indices: vec![],
            global_constraints: vec![],
            heatmap: vec![],
            markov_matrix: vec![],
            total_slots: 96,
        };

        let candidate_slots = build_candidate_start_slots(&problem);
        let genotype = genotype_for(&problem, &candidate_slots);
        let chromosome = chromosome_from_assignments(&problem, &candidate_slots, &[(0, 0)]);

        let mut fitness = DiemFitness::new(problem.clone(), candidate_slots.clone());
        let constrained_score = fitness
            .calculate_for_chromosome(&chromosome, &genotype)
            .expect("fitness should be computed");

        let mut unconstrained = problem;
        unconstrained.activities[0]
            .user_frequency_constraints
            .clear();
        let mut fitness = DiemFitness::new(unconstrained, candidate_slots);
        let unconstrained_score = fitness
            .calculate_for_chromosome(&chromosome, &genotype)
            .expect("fitness should be computed");

        assert!(
            constrained_score < unconstrained_score,
            "maximum frequency constraint should penalize overshoot"
        );
    }

    #[test]
    fn soft_frequency_target_penalizes_overshoot() {
        let mut a = base_activity(0);
        a.priority = 0.0;
        a.frequency_targets.push(FrequencyTarget {
            scope: TimeScope::SameDay,
            target_count: 1,
            weight: 10.0,
        });

        let problem = Problem {
            activities: vec![a],
            floating_indices: vec![0],
            fixed_indices: vec![],
            global_constraints: vec![],
            heatmap: vec![],
            markov_matrix: vec![],
            total_slots: 96,
        };

        let candidate_slots = build_candidate_start_slots(&problem);
        let genotype = genotype_for(&problem, &candidate_slots);
        let at_target = chromosome_from_assignments(&problem, &candidate_slots, &[(0, 0)]);
        let overshoot =
            chromosome_from_assignments(&problem, &candidate_slots, &[(0, 0), (4, 0), (8, 0)]);

        let mut fitness = DiemFitness::new(problem.clone(), candidate_slots.clone());
        let at_target_score = fitness
            .calculate_for_chromosome(&at_target, &genotype)
            .expect("fitness should be computed");

        let mut fitness = DiemFitness::new(problem, candidate_slots);
        let overshoot_score = fitness
            .calculate_for_chromosome(&overshoot, &genotype)
            .expect("fitness should be computed");

        assert!(
            at_target_score > overshoot_score,
            "soft frequency targets should penalize overshoot beyond target"
        );
    }

    #[test]
    fn frequency_deadline_counts_only_occurrences_ending_before_deadline() {
        let mut a = base_activity(0);
        a.priority = 0.0;
        a.duration_slots = 2;
        a.user_frequency_constraints.push(UserFrequencyConstraint {
            scope: TimeScope::SameMonth,
            min_count: Some(1),
            max_count: None,
            deadline_end: Some(10),
            penalty_weight: 500.0,
        });

        let problem = Problem {
            activities: vec![a],
            floating_indices: vec![0],
            fixed_indices: vec![],
            global_constraints: vec![],
            heatmap: vec![],
            markov_matrix: vec![],
            total_slots: 96,
        };

        let candidate_slots = build_candidate_start_slots(&problem);
        let genotype = genotype_for(&problem, &candidate_slots);
        let by_deadline = chromosome_from_assignments(&problem, &candidate_slots, &[(8, 0)]); // ends at 10
        let after_deadline = chromosome_from_assignments(&problem, &candidate_slots, &[(20, 0)]); // ends at 22

        let mut fitness = DiemFitness::new(problem.clone(), candidate_slots.clone());
        let by_deadline_score = fitness
            .calculate_for_chromosome(&by_deadline, &genotype)
            .expect("fitness should be computed");

        let mut fitness = DiemFitness::new(problem, candidate_slots);
        let after_deadline_score = fitness
            .calculate_for_chromosome(&after_deadline, &genotype)
            .expect("fitness should be computed");

        assert!(
            by_deadline_score > after_deadline_score,
            "frequency deadline mode should only count occurrences finishing by deadline_end"
        );
    }

    #[test]
    fn cumulative_deadline_enforces_min_duration_before_deadline() {
        let mut a = base_activity(0);
        a.priority = 0.0;
        a.duration_slots = 4;

        let problem = Problem {
            activities: vec![a],
            floating_indices: vec![0],
            fixed_indices: vec![],
            global_constraints: vec![GlobalConstraint::CumulativeTime {
                activity_id: Some(0),
                category_id: None,
                period_slots: 96,
                min_duration: 4,
                max_duration: 32,
                deadline_end: Some(20),
            }],
            heatmap: vec![],
            markov_matrix: vec![],
            total_slots: 96,
        };

        let candidate_slots = build_candidate_start_slots(&problem);
        let genotype = genotype_for(&problem, &candidate_slots);
        let meets_deadline = chromosome_from_assignments(&problem, &candidate_slots, &[(8, 0)]); // ends at 12
        let misses_deadline = chromosome_from_assignments(&problem, &candidate_slots, &[(24, 0)]); // ends at 28

        let mut fitness = DiemFitness::new(problem.clone(), candidate_slots.clone());
        let meets_score = fitness
            .calculate_for_chromosome(&meets_deadline, &genotype)
            .expect("fitness should be computed");

        let mut fitness = DiemFitness::new(problem, candidate_slots);
        let misses_score = fitness
            .calculate_for_chromosome(&misses_deadline, &genotype)
            .expect("fitness should be computed");

        assert!(
            meets_score > misses_score,
            "cumulative deadline mode should enforce minimum duration before deadline_end"
        );
    }

    #[test]
    fn priority_decay_reduces_repeat_incentive() {
        let mut a = base_activity(0);
        a.priority = 1.0;

        let problem = Problem {
            activities: vec![a],
            floating_indices: vec![0],
            fixed_indices: vec![],
            global_constraints: vec![],
            heatmap: vec![],
            markov_matrix: vec![],
            total_slots: 96,
        };

        let candidate_slots = build_candidate_start_slots(&problem);
        let genotype = genotype_for(&problem, &candidate_slots);
        let one_occurrence = chromosome_from_assignments(&problem, &candidate_slots, &[(0, 0)]);
        let two_occurrences =
            chromosome_from_assignments(&problem, &candidate_slots, &[(0, 0), (10, 0)]);

        let mut fitness = DiemFitness::new(problem.clone(), candidate_slots.clone());
        let one_score = fitness
            .calculate_for_chromosome(&one_occurrence, &genotype)
            .expect("fitness should be computed");

        let mut fitness = DiemFitness::new(problem, candidate_slots);
        let two_score = fitness
            .calculate_for_chromosome(&two_occurrences, &genotype)
            .expect("fitness should be computed");

        assert!(
            two_score > one_score,
            "second occurrence should still add reward"
        );
        assert!(
            two_score - one_score < one_score,
            "marginal reward for repeat should be smaller than first reward"
        );
    }

    #[test]
    fn no_activity_sentinel_adds_small_reward() {
        let mut a = base_activity(0);
        a.priority = 1.0;
        let problem = Problem {
            activities: vec![a],
            floating_indices: vec![0],
            fixed_indices: vec![],
            global_constraints: vec![],
            heatmap: vec![],
            markov_matrix: vec![],
            total_slots: 200,
        };

        let candidate_slots = build_candidate_start_slots(&problem);
        let genotype = genotype_for(&problem, &candidate_slots);
        let sentinel = no_activity_allele(&problem);
        let all_sentinel = Chromosome::new(vec![sentinel; candidate_slots.len()]);
        let one_event = chromosome_from_assignments(&problem, &candidate_slots, &[(0, 0)]);

        let mut fitness = DiemFitness::new(problem.clone(), candidate_slots.clone());
        let sentinel_score = fitness
            .calculate_for_chromosome(&all_sentinel, &genotype)
            .expect("fitness should be computed");

        let mut fitness = DiemFitness::new(problem, candidate_slots);
        let event_score = fitness
            .calculate_for_chromosome(&one_event, &genotype)
            .expect("fitness should be computed");

        assert!(
            sentinel_score > 0,
            "no-activity chromosome should receive miniscule stability reward"
        );
        assert!(
            event_score >= sentinel_score,
            "no-activity reward must stay tiny and should not dominate actual scheduling"
        );
    }
}
