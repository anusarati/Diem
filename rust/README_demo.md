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

The scenario also prints hard/soft rules in plain English, including:

1. `ForbiddenZone` windows as day/time ranges (for example: `D1 00:00 -> D1 02:00` means no activity may start in that interval).
2. Fixed events as locked placements.
3. Whether the hard user frequency rule is enabled for that scenario.
4. Soft Markov and heatmap preferences.

Expected behavior:

1. Hard daily frequency for `Workout Session` is satisfied in Scenario A.
2. In most runs, `Workout Session` placement differs between Scenario A and B, showing hard constraints dominate when enabled.

The CLI prints workout counts in three channels so the output is unambiguous:

1. `fixed + flexible`
2. `flexible only`
3. `fixed only`

In this scenario, `Spin Class (Fixed)` and `Workout Session (Flexible)` share the workout activity id, so both contribute to the hard daily count.

## PASS/FAIL Notes

The example asserts invariants instead of exact slot snapshots.
This is intentional because the genetic solver is stochastic and exact placements can vary run to run.
