# App (React Native UI)

This folder contains the mobile app UI: screens, components, theme, and navigation.

## Structure

- **`screens/`** – Home and Analysis & Insight screens (from the HTML mockups)
- **`components/`** – Reusable UI (ProgressCircle, TaskRow, SegmentedControl, etc.)
- **`theme/`** – Colors and spacing
- **`navigation/`** – Simple state-based navigator (swap for `@react-navigation/native` when ready)
- **`constants/`** – Route names

## Using the app in your React Native project

1. **Dependencies** (if not already in your app):
   - `react-native-svg` – used by `ProgressCircle` for the circular progress ring

2. **Mount the app** in your root (e.g. `App.tsx`):

   ```tsx
   import { App } from './src/app';

   export default function Main() {
     return <App />;
   }
   ```

3. **Icons**: `IconButton` and nav items use emoji/unicode. Replace with `@expo/vector-icons` or `react-native-vector-icons` (e.g. MaterialCommunityIcons) for the original Material-style icons.

## Screens

- **Home** – Greeting, today’s focus (progress circle), task list with checkboxes, FAB, bottom nav
- **Analysis** – Insights header, score card, Focus/Flow stat cards, Day/Week/Month toggle, activity breakdown, “Magic Hours” block, tip card

Navigation between Home and Analysis is wired; tap the chart icon on the home bottom nav to open Analysis, and the home icon in the analysis header to go back.
