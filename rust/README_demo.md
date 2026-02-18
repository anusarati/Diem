# Solver Demo

## Quick Run

From repo root:

```bash
npm run demo:solver
```

Direct cargo command:

```bash
cargo run --manifest-path rust/Cargo.toml --example quick_solver_demo
```

## What It Demonstrates

The demo runs two scenarios:

1. Scenario A (`Hard + Soft`): hard user frequency constraint plus soft learned signals.
2. Scenario B (`Soft-only`): same setup, but hard user frequency removed.

Scenario activities are intentionally realistic:

1. `Deep Work: API Design` (floating)
2. `Workout Session (Flexible)` (floating)
3. `Inbox & Admin` (floating)
4. `Team Workshop (Fixed)` (fixed)
5. `Spin Class (Fixed)` (fixed)
6. `Client Onsite (Fixed)` (fixed, Day 2)

The scenario also prints hard/soft rules in plain English, including:

1. `ForbiddenZone` windows as day/time ranges (for example: `D1 00:00 -> D1 02:00` means no activity may start in that interval).
2. Fixed events as locked placements.
3. Whether the hard user frequency rule is enabled for that scenario.
4. Soft Markov and heatmap preferences.
5. Learned soft frequency targets per floating activity (for example: workout around 1/day).

Expected behavior:

1. Hard daily frequency for `Workout Session` is satisfied in Scenario A.
2. Day 2 has a narrow evening window due fixed + forbidden constraints; this creates a real hard-vs-soft tradeoff.
3. In Scenario A, hard mode forces a Day-2 workout.
4. In Scenario B, soft mode typically skips Day-2 workout and uses the slot for another activity.
5. Learned frequency targets keep repeated floating activity counts in a realistic range (instead of runaway repeats).
6. The output includes a floating occurrence summary so repeated template scheduling is directly visible.
7. The output prints `solve attempts`; hard mode may retry a few times to reduce GA stochastic misses while preserving the same scenario constraints.

The CLI prints per-day counts for:

1. `Workout Session (Flexible)`
2. `Spin Class (Fixed)`

## PASS/FAIL Notes

The example asserts invariants instead of exact slot snapshots.
This is intentional because the genetic solver is stochastic and exact placements can vary run to run.
