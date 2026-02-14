# App (React Native UI)

Reusable mobile UI: screens, components, theme, and types. Aligned with main (Activity naming, domain types).

## Structure

- **`types/`** – App-level types: `AppRoute`, `ActivityItem`, `GoalTimeData`, `ActivityBreakdownItem`, Petri net and heatmap types. Use these for props and when wiring to DB/API.
- **`components/`** – Reusable UI: `ActivityRow`, `ProgressCircle`, `ActivityBarRow`, `GoalTimeRow`, `SegmentedControl`, `PetriNetView`, `BehaviorHeatmap`, `IconButton`.
- **`screens/`** – Home and Analysis screens. Accept optional data props; fall back to sample data when omitted.
- **`data/sampleData.ts`** – Sample/demo data for development. Replace with WatermelonDB or API when wiring the app.
- **`theme/`** – Colors and spacing
- **`navigation/`** – Simple state-based navigator (swap for `@react-navigation/native` when ready)
- **`constants/`** – Route names

## Using as a library

1. **Types**: Import from `src/app/types` for consistent shapes (e.g. `ActivityItem`, `GoalTimeData`, `AppRoute`).
2. **Screens**: Pass data via props to override sample data:
   - `HomeScreen`: optional `activities?: ActivityItem[]`
   - `AnalysisScreen`: optional `activityBreakdown`, `goalTimeData`, `petriPlaces` / `petriTransitions` / `petriArcs`, `heatmapData`
3. **Sample data**: Import from `src/app/data/sampleData` when you need defaults or fixtures.

## Mounting the app

1. **Dependencies**: `react-native-svg` (for `ProgressCircle`).
2. **Root** (e.g. `App.tsx`):

   ```tsx
   import { App } from './src/app';
   export default function Main() {
     return <App />;
   }
   ```

3. **Icons**: `IconButton` uses emoji; replace with `@expo/vector-icons` or `react-native-vector-icons` for Material-style icons.

## Screens

- **Home** – Greeting, today’s focus (progress circle), activity list with checkboxes, FAB, bottom nav. Uses `ActivityItem[]` (activities, not tasks).
- **Analysis** – Insights header, score card, Focus/Flow stats, Day/Week/Month toggle, activity breakdown, time per goal & projected, Petri net, behavior heatmap, tip card.

Navigation: chart icon (Home) → Analysis; home pill (Analysis) → Home.
