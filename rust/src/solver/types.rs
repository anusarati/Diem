use std::collections::HashMap;

/// Represents a 15-minute time slot.
pub type TimeSlot = u16;

/// Using integer IDs for efficient Vec indexing (O(1)).
/// The caller must map external UUIDs to these sequential integers (0..N).
pub type ActivityId = usize;
pub type CategoryId = usize;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ActivityType {
    Fixed,    // Immutable
    Floating, // Optimization variable
}

#[derive(Debug, Clone, Copy)]
pub enum TimeScope {
    SameDay,
    SameWeek,
    SameMonth,
}

#[derive(Debug, Clone)]
pub struct FrequencyTarget {
    pub scope: TimeScope,
    pub target_count: u16,
    pub weight: f32,
}

#[derive(Debug, Clone)]
pub struct Binding {
    /// Disjunctive Normal Form (OR of ANDs)
    pub required_sets: Vec<Vec<ActivityId>>,
    pub time_scope: TimeScope,
    /// Bitmask for day-of-week validity (0=Mon, 6=Sun).
    /// If (1 << current_weekday) & valid_weekdays != 0, the binding applies.
    /// Default: 0b1111111 (127) for all days.
    pub valid_weekdays: u8,
    pub weight: f32,
}

#[derive(Debug, Clone)]
pub struct Activity {
    pub id: ActivityId,
    pub activity_type: ActivityType,
    pub duration_slots: u16,
    pub priority: f32,
    pub assigned_start: Option<TimeSlot>,
    pub category_id: CategoryId,

    // Constraints (with weights)
    pub input_bindings: Vec<Binding>,
    pub output_bindings: Vec<Binding>,

    // Objectives
    pub frequency_targets: Vec<FrequencyTarget>,
}

#[derive(Debug, Clone)]
pub enum GlobalConstraint {
    ForbiddenZone {
        start: TimeSlot,
        end: TimeSlot,
    },
    CumulativeTime {
        category_id: Option<CategoryId>,
        period_slots: u16,
        min_duration: u16,
        max_duration: u16,
    },
}

#[derive(Debug, Clone)]
pub struct Problem {
    pub activities: Vec<Activity>,
    pub floating_indices: Vec<usize>,
    pub fixed_indices: Vec<usize>,
    pub global_constraints: Vec<GlobalConstraint>,
    // Sparse map for Heatmap is better if specific slots matter.
    // Flattening to Vec<f32> might be faster if dense, but sparse is safer for memory.
    pub heatmap: HashMap<(ActivityId, TimeSlot), f32>,
    pub markov_matrix: HashMap<(ActivityId, ActivityId), f32>,
    pub total_slots: u16,
}
