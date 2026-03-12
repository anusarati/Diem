# **Diem: Complete Modular Decomposition (Revised)**

## **Overview**

Diem is a **local-first, proactive time-management system** that automatically populates schedules using behavioral prediction. This decomposition follows a **Layered "Sandwich" Architecture** optimized for mobile performance and privacy.

---

## **1. Frontend Layer (React Native - 60fps UI)**

### **Module F1: Timeline (`/features/timeline`)**

**Purpose:** Core schedule visualization with 60fps interactions

* **Components:**
* `TimelineCanvas`: Virtualized vertical timeline using FlashList
* `TimeBlock`: Atomic schedule unit with three visual variants:
* `FixedBlock`: Solid background, non-movable (Non-replaceable)
* `FlexibleBlock`: Dashed border, draggable (Replaceable/Soft)
* `PredictedBlock`: Faded opacity, auto-generated (System predictions)


* `NowIndicator`: Animated line showing current time
* `ConflictOverlay`: Visual indication of constraint violations
* `SnapGuide`: Visual guides during drag operations


* **Hooks:**
* `useDragGesture`: Handles drag physics and snapping logic
* `useTimelineScroll`: Manages scroll position and viewport
* `useBlockAnimation`: Reanimated transitions for block movements


* **Tech:** `@shopify/flash-list`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-haptics`

### **Module F2: Activity Management (`/features/activities`)**

**Purpose:** Create, edit, and manage activities and constraints

* **Components:**
* `ActivityForm`: Complete form for task properties
* `ConstraintToggle`: Visual switch for Replaceable vs Non-replaceable
* `PrioritySelector`: Interactive priority assignment (1-5 scale)
* `RecurrenceEditor`: Complex pattern editor (MWF, every N days)
* `CategoryManager`: Color-coded category system
* `QuickAddSheet`: Bottom sheet for rapid task entry


* **Hooks:**
* `useActivityValidation`: Form validation and error handling
* `useConstraintLogic`: Manages constraint dependencies


* **Tech:** React Hook Form, Expo Bottom Sheet, NativeWind styling

### **Module F3: Intelligence Feedback (`/features/intelligence`)**

**Purpose:** Retrospective input and model correction interface

* **Components:**
* `RetrospectiveModal`: End-of-day "What actually happened?"
* `DurationAdjuster`: Slider for correcting actual task duration
* `PredictionConfidence`: Visual indicator of system confidence
* `LearningToast`: Brief notifications about model updates
* `CorrectionHistory`: List of recent manual corrections


* **Hooks:**
* `useRetrospective`: Manages retrospective data flow
* `useCorrectionImpact`: Shows how corrections affect future predictions


* **Tech:** Reanimated for smooth transitions, MMKV for temporary storage

### **Module F4: Analytics Dashboard (`/features/analytics`)**

**Purpose:** Goal tracking and adherence visualization

* **Components:**
* `GoalProgressCard`: Shows predicted vs target time allocation
* `AdherenceChart`: Line graph of prediction accuracy over time
* `CategoryBreakdown`: Pie/bar chart of time distribution
* `PatternInsights`: Shows discovered behavioral patterns
* `WeeklyReview`: Summary view with actionable insights


* **Hooks:**
* `useAdherenceStats`: Calculates adherence metrics
* `useGoalProgress`: Computes goal completion projections


* **Tech:** `react-native-svg` for charts, `victory-native` for complex visualizations

### **Module F5: Settings & Setup (`/features/settings`)**

**Purpose:** Initial setup and ongoing configuration

* **Components:**
* `TimeConstraintsWizard`: Sets baseline availability constraints
* `CalendarSyncSettings`: Google/Apple Calendar integration
* `NotificationPreferences`: Push notification configuration
* `ModelResetPanel`: Resets learning model (with confirmation)
* `DebugView`: Hidden developer panel for inspecting internal state


* **Hooks:**
* `useCalendarSync`: Manages external calendar integration
* `useNotificationSchedule`: Schedules intelligent notifications


* **Tech:** Expo Calendar API, Expo Notifications

### **Module F6: Onboarding (`/features/onboarding`)**

**Purpose:** First-time setup and user calibration

* **Components:**
* `WelcomeFlow`: Multi-step initial setup
* `PriorityCalibration`: Drag-and-drop category ranking
* `ScheduleTemplatePicker`: Choose from common patterns (student, remote worker, etc.)
* `InitialConstraints`: Set up recurring commitments
* `PermissionsSetup`: Request necessary permissions


* **Tech:** Expo Router for multi-screen flow, AsyncStorage for completion state

---

## **2. Logic Layer (TypeScript - Learning & Orchestration)**

### **Module L1: Data Persistence (`/data`)**

**Purpose:** Single source of truth using WatermelonDB.

* **Repositories:**
* `ActivityRepository`: CRUD operations for activities.
* `HistoryRepository`: Efficient queries for process mining logs.
* `ScheduleRepository`: Manages current/future schedule state.
* `ConstraintRepository`: Manages user-defined constraints (Static Rules).
* `UserBehaviorRepository`: Manages learned statistical profiles (Dynamic Models).


* **Observers:** WatermelonDB observers for reactive updates.

### **Module L2: Behavioral Mining (`/mining`)**

**Purpose:** Quantifies user behavior into statistical metrics and updates entity properties.

* **Log Processor (`/mining/processor`)**:
* `HistoryAnalyzer`: Ingests `ActivityHistory` logs.
* `MetricUpdater`: Generic utility for statistical updates.


* **Pattern Recognizers (The Learning Engines)**:
1. **DependencyMiner**:
* **Metric**: `HEURISTIC_DEPENDENCY` (UserBehavior)
* **Logic**: Updates probability of *Activity B* following *Activity A*.


2. **HeatmapBuilder**:
* **Metric**: `HEATMAP_PROBABILITY` (UserBehavior)
* **Logic**: Updates probability of *Activity A* occurring at *Time T*.


3. **FrequencyCounter**:
* **Metric**: `OBSERVED_FREQUENCY` (UserBehavior)
* **Logic**: Updates count of *Activity A* per *Period*.


4. **DurationLearner** (Added):
* **Target**: `Activity.default_duration` (Entity Update)
* **Logic**: Calculates a **Weighted Moving Average** (WMA) of `actual_duration` from history.
* **Implementation**:
* Fetches recent `ActivityHistory` for the completed task.
* Applies formula: `NewDuration = (OldDuration * 0.7) + (ActualDuration * 0.3)`.
* Updates the `default_duration` column in the `Activity` table.

### **Module L3: Optimization Bridge (`/bridge`)**

**Purpose:** Assembles the `Problem` struct for Rust by merging static data, user rules, and learned patterns.

* **Problem Assembly (`/bridge/assembly`)**:
* `ProblemBuilder`: The master coordinator. Fetches data, runs mappers, and produces the final object.
* **ConstraintMapper (Static Rules -> Hard Logic)**:
* Converts DB `Constraint` rows into Rust structures.
* `ForbiddenZone` -> Rust `GlobalConstraint::ForbiddenZone` (Hard penalty).
* `CumulativeTime` -> Rust `GlobalConstraint::CumulativeTime` (Hard penalty).
* `UserSequence` -> Rust `Binding` (Hard weight).


* **HeuristicInjector (Learned Patterns -> Soft Logic)**:
* Converts `UserBehavior` rows into Rust structures.
* `HEURISTIC_DEPENDENCY` -> Rust `Binding` (Soft weight). Represents "A usually follows B".
* `OBSERVED_FREQUENCY` -> Rust `FrequencyTarget` (Soft weight). Represents "Target N times per day".
* `HEATMAP_PROBABILITY` -> Rust `heatmap` HashMap (Soft weight). Represents "Preferred time of day".




* **Serialization (`/bridge/serialization`)**:
* `RustSerializer`: Flattens the assembled `Problem` object into the exact memory layout expected by the JSI bridge (Float32Arrays, integer IDs).


* **JSI Interface (`/bridge/jsi`)**:
* `NativeScheduler`: Main Nitro Module interface.
* `ResultParser`: Converts Rust output `(ActivityId, TimeSlot)` back to WatermelonDB objects.



### **Module L4: Orchestration Services (`/services`)**

**Purpose:** Coordinates system components and manages business logic

* **Scheduling Service (`/services/scheduling`)**:
* `OptimizationTrigger`: Decides when to run solver (debounced, intelligent).
* `ConflictResolver`: Applies FR-06 logic for Soft vs Hard conflicts.
* `PropagationEngine`: Handles ripple effects of schedule changes.
* `RecurrenceExpander`: Expands recurring patterns into concrete instances.


* **Adherence Service (`/services/adherence`)**:
* `PredictionTracker`: Monitors prediction accuracy.
* `GoalCalculator`: Computes goal progress based on projected schedule.
* `InsightGenerator`: Creates actionable insights from adherence data.


* **Integration Service (`/services/integration`)**:
* `CalendarImporter`: Syncs external calendar events.
* `ContextFetcher`: (Optional) Fetches weather/traffic.
* `BackupManager`: Handles local backup/restore of user data.



---

## **3. Native Layer (Rust - Optimization Engine)**

### **Module N1: Solver Core (`/native/src/solver`)**

**Purpose:** High-performance constraint optimization using `genetic_algorithm`.

* **Fitness Evaluation (`/native/src/solver/fitness`)**:
* `DiemFitness`: The core scoring logic.
* **Penalties (Hard)**: Overlaps, Forbidden Zones, Cumulative Time limits.
* **Rewards (Soft)**:
* Priority scores.
* Heatmap probability sums.
* Markov transition rewards (Sequence Bindings).
* Frequency Target adherence (e.g., did we schedule 3 meals today?).

### **Module N2: JSI Bridge (`/native/src/bridge`)**

**Purpose:** Zero-copy communication via Nitro Modules.

* **Nitro Exports (`/native/src/bridge/jsi`)**:
* `schedule_solve`: Main optimization function exposed to JavaScript.
* `validate_move`: Quick validation for individual moves.
* `get_solver_stats`: Returns performance metrics for debugging.


* **Memory Management (`/native/src/bridge/memory`)**:
* `BufferAllocator`: Reuses memory buffers between calls.
* `TypeConverter`: Handles Rust ↔ JavaScript type conversions.



---

## **4. Infrastructure Layer (Cross-cutting Concerns)**

### **Module I1: State Management (`/store`)**
**Purpose:** UI state and ephemeral data management using Zustand
- **Stores:**
  - `useTimelineStore`: Current scroll position, zoom level, selected day
  - `useDragStore`: Drag gesture state (current block, offset, target slot)
  - `useAppModeStore`: Current mode (planning, review, editing)
  - `useSelectionStore`: Currently selected activity/block
  - `useLoadingStore`: Loading states for async operations
- **Persistent Preferences:** MMKV for user settings (theme, defaults, etc.)

### **Module I2: Design System (`/design`)**
**Purpose:** Consistent UI components and theming
- **Typography System:**
  - `TextHeader`, `TextBody`, `TextLabel`, `TextCaption`
  - Consistent font sizes, weights, and line heights
- **Color System:**
  - Category colors: Work, Health, Learning, Social, etc.
  - Semantic colors: Success, Warning, Error, Information
  - Theme support: Light/Dark mode with system detection
- **Layout Primitives:**
  - `Spacer`: Flexible spacing component
  - `Card`: Consistent card styling with shadows
  - `ScreenWrapper`: Handles SafeAreaView and common padding
  - `Divider`: Visual separation elements
- **Icon Library:** Unified icon set with size variants

### **Module I3: Utilities (`/utils`)**
**Purpose:** Shared helper functions and utilities
- **Date/Time (`/utils/dates`):**
  - `formatTime`: Consistent time formatting
  - `roundToNearest`: Snaps times to 15-minute intervals
  - `getTimeSlotIndex`: Converts Date to timeline position
  - `scheduleMath`: Handles duration calculations and overlaps
- **Validation (`/utils/validation`):**
  - `validateActivity`: Ensures activity properties are valid
  - `validateSchedule`: Checks for physical impossibilities
  - `constraintChecker`: Validates user constraint definitions
- **Performance (`/utils/performance`):**
  - `profiler`: Performance measurement and logging
  - `debounce`: Utility for debouncing frequent events
  - `throttle`: Rate-limiting for high-frequency updates
- **Logging (`/utils/logging`):**
  - Structured logging with severity levels
  - Conditional logging for development vs production
  - Error boundary integration

### **Module I4: Navigation (`/navigation`)**

**Purpose:** App navigation structure using Expo Router
- **Route Definitions:** File-based routing structure
- **Deep Linking:** Support for URL-based navigation to specific schedules
- **Transition Animations:** Custom screen transitions
- **Authentication Guards:** (Future) If cloud sync added


---

## **5. Directory Structure**

```
diem-mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── index.tsx             # Timeline view
│   │   ├── analytics.tsx         # Analytics dashboard
│   │   └── settings.tsx          # Settings screen
│   ├── activity/[id].tsx         # Activity detail/edit
│   ├── onboarding/               # Onboarding flow
│   └── +not-found.tsx            # 404 page
├── src/
│   ├── components/               # Shared UI components
│   │   ├── atoms/                # Basic building blocks (Button, Input, etc.)
│   │   ├── molecules/            # Compound components (FormField, CardHeader)
│   │   └── organisms/            # Complex sections (DayHeader, StatsPanel)
│   │
│   ├── features/                 # Feature modules (UI)
│   │   ├── timeline/             # Module F1
│   │   ├── activities/           # Module F2
│   │   ├── intelligence/         # Module F3
│   │   ├── analytics/            # Module F4
│   │   ├── settings/             # Module F5
│   │   └── onboarding/           # Module F6
│   │
│   ├── data/                     # Module L1 (WatermelonDB)
│   │   ├── models/               # Model classes (Activity, Constraint, UserBehavior)
│   │   ├── repositories/         # Data access patterns
│   │   ├── schema.ts             # Database schema definition
│   │   └── migrations/           # Database migration scripts
│   │
│   ├── mining/                   # Module L2 (Behavioral Mining)
│   │   ├── processor/            # Log processing pipeline
│   │   │   ├── history_analyzer.ts # Entry point for log analysis
│   │   │   └── metric_updater.ts   # Generic statistical update utility
│   │   ├── dependency/           # Sequence Mining
│   │   │   └── miner.ts          # Updates HEURISTIC_DEPENDENCY
│   │   ├── heatmap/              # Time Profiling
│   │   │   └── builder.ts        # Updates HEATMAP_PROBABILITY
│   │   ├── frequency/            # Count/Period Mining
│   │   │   └── counter.ts        # Updates OBSERVED_FREQUENCY
│   │   ├── duration/             # Adaptive Duration Learning
│   │   │   └── learner.ts        # Updates Activity.default_duration
│   │   └── types.ts              # Mining-specific types
│   │
│   ├── bridge/                   # Module L3 (Optimization Bridge)
│   │   ├── assembly/             # Problem Construction
│   │   │   ├── problem_builder.ts    # Master coordinator
│   │   │   ├── constraint_mapper.ts  # Static Rules -> Hard Constraints
│   │   │   └── heuristic_injector.ts # Learned Patterns -> Soft Bindings
│   │   ├── serialization/        # Data conversion
│   │   │   └── rust_serializer.ts    # Flattens objects for JSI
│   │   ├── jsi/                  # Native Interface
│   │   │   └── native_scheduler.ts   # Nitro Module wrapper
│   │   └── types/                # Bridge type definitions
│   │
│   ├── services/                 # Module L4 (Orchestration)
│   │   ├── scheduling/           # Schedule orchestration
│   │   ├── adherence/            # Goal and adherence tracking
│   │   ├── integration/          # External service integration
│   │   └── notification/         # Intelligent notification scheduling
│   │
│   ├── store/                    # Module I1 (State Management)
│   │   ├── timeline.ts           # Timeline UI state
│   │   ├── drag.ts               # Drag gesture state
│   │   ├── preferences.ts        # User preferences (MMKV-backed)
│   │   └── index.ts              # Store exports
│   │
│   ├── design/                   # Module I2 (Design System)
│   │   ├── typography.ts         # Text styles and components
│   │   ├── colors.ts             # Color system and theming
│   │   ├── spacing.ts            # Layout constants
│   │   └── icons/                # Icon library
│   │
│   ├── utils/                    # Module I3 (Utilities)
│   │   ├── dates.ts              # Date/time utilities
│   │   ├── validation.ts         # Validation helpers
│   │   ├── performance.ts        # Performance utilities
│   │   └── logging.ts            # Structured logging
│   │
│   └── types/                    # Global TypeScript types
│       ├── domain.ts             # Core domain types
│       ├── api.ts                # API/interface types
│       └── navigation.ts         # Navigation types
│
├── rust/                         # Native Rust modules
│   ├── src/
│   │   ├── solver/               # Module N1
│   │   │   ├── genetic/          # Genetic algorithm implementation
│   │   │   ├── fitness/          # Objective function and constraints
│   │   │   ├── convergence/      # Convergence monitoring
│   │   │   └── lib.rs            # Solver exports
│   │   └── bridge/               # Module N2
│   │   │   ├── jsi/              # Nitro module exports
│   │   │   ├── memory/           # Memory management
│   │   │   └── lib.rs            # Bridge exports
│   ├── Cargo.toml
│   └── build.rs
│
├── native-modules/               # Native module bindings
│   ├── diem-scheduler/           # Nitro module package
│   │   ├── ios/                  # iOS native implementation
│   │   ├── android/              # Android native implementation
│   │   └── index.ts              # TypeScript declaration
│   └── package.json
│
├── assets/                       # Static assets
│   ├── fonts/                    # Custom fonts
│   ├── images/                   # App images
│   └── icons/                    # SVG icons
│
├── scripts/                      # Build and utility scripts
│   ├── build-rust.sh             # Rust compilation script
│   ├── codegen.ts                # TypeScript code generation
│   └── test-setup.js             # Test environment setup
│
└── tests/                        # Test suites
    ├── unit/                     # Unit tests
    ├── integration/              # Integration tests
    └── e2e/                      # End-to-end tests (Maestro)

```

---

## **6. Critical Data Flows**

### **Flow 1: Automatic Schedule Generation (Optimization)**

**Trigger**: `SchedulingService` detects empty slots, user request, or significant context change.

1. **Orchestration**: `SchedulingService` requests a new schedule from `ProblemBuilder`.
2. **Fetch Data**:
* `ActivityRepository` fetches all active `Activity` entities (including updated `default_duration`).
* `ConstraintRepository` fetches static `Constraint` rows (User Rules).
* `UserBehaviorRepository` fetches learned `UserBehavior` rows (Dynamic Patterns).


3. **Assembly (The Bridge)**:
* **Hard Logic**: `ConstraintMapper` converts `Constraint` rows (Forbidden Zones, Sequences) into Rust `GlobalConstraint` or `Binding` structs with **Hard Weights**.
* **Soft Logic**: `HeuristicInjector` converts `UserBehavior` rows:
* `HEURISTIC_DEPENDENCY` → Rust `Binding` (Soft Weight).
* `OBSERVED_FREQUENCY` → Rust `FrequencyTarget` (Soft Weight).
* `HEATMAP_PROBABILITY` → Rust `heatmap` HashMap (Soft Weight).


* `ProblemBuilder` merges these into a single `Problem` struct.


4. **Serialization**: `RustSerializer` flattens the `Problem` into `Float32Arrays`.
5. **Solve**: `NativeScheduler` (JSI) passes the data to the Rust environment.
6. **Optimization**: The Rust Genetic Algorithm runs (max 200ms), minimizing penalties (Hard Constraints) and maximizing rewards (Soft Heuristics).
7. **Result**: Rust returns a vector of optimal `(ActivityId, StartTime)` tuples.
8. **Persist**: `SchedulingService` converts the result into `ScheduledEvent` records and saves them to WatermelonDB.
9. **Render**: UI updates via reactive FlashList.

### **Flow 2: Retrospective Learning (Feedback Loop)**

**Trigger**: User marks a task as "Done", modifies a past block, or completes the End-of-Day Review.

1. **User Input**: User drags a block to extend it (e.g., from 30m to 45m) and confirms completion.
2. **Log Creation**: `HistoryRepository` creates a `HistoryLog` entry with `actual_duration: 45` and timestamp.
3. **Mining (Parallel Updates)**:
* **Duration Learning**: `DurationLearner` reads the log, calculates the new Weighted Moving Average, and **updates the `Activity` table** directly (`default_duration` becomes ~34m).
* **Pattern Mining**:
* `DependencyMiner` increments the sequence probability in `UserBehavior`.
* `HeatmapBuilder` increments the time-slot probability in `UserBehavior`.
* `FrequencyCounter` increments the daily/weekly count in `UserBehavior`.




4. **Effect**:
* Next time **Flow 1** runs, the `ProblemBuilder` sees the **new duration** (34m) from the `Activity` table and the **strengthened patterns** from the `UserBehavior` table, automatically adjusting the schedule to match reality.



### **Flow 3: Conflict Resolution (Real-time)**

**Trigger**: User drags a `FlexibleBlock` (Soft Constraint) onto a `FixedBlock` (Hard Constraint/Non-replaceable).

1. **Detection**: `useDragGesture` detects an overlap during the move.
2. **Evaluation**: `ConflictResolver` checks the properties of both blocks:
* Block A (Moving): `is_replaceable: true`, `priority: 3`
* Block B (Stationary): `is_replaceable: false` (Hard Constraint)


3. **Decision**:
* **Result**: Rejection. The Stationary block is "Hard", so it acts like a wall.


4. **Feedback**: `SnapGuide` visualizes the rejection (red glow), and `Haptics` triggers an error vibration pattern.
5. **Fallback**: The moving block snaps back to its original position or the nearest valid empty slot.

### **Flow 4: Adherence & Goal Tracking**

**Trigger**: Background periodic task or User opens Analytics tab.

1. **Aggregation**: `AdherenceService` queries `ActivityHistory` (Past) and `ScheduledEvent` (Future).
2. **Calculation**:
* **Adherence**: Compares `predicted_start_time` vs `actual_start_time` to compute an accuracy score.
* **Goal Progress**: Sums `actual_duration` (from History) + `duration` (from Future Schedule) for specific categories.


3. **Status Update**: Updates `GoalProgress` table (e.g., "75% of Exercise Goal met").
4. **Visualization**: `AdherenceChart` and `GoalProgressCard` re-render with the new data.

