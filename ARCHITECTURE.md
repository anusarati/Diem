# Diem: Complete Modular Decomposition (Revised)

## Overview

Diem is a **local-first, proactive time-management system** that automatically populates schedules using behavioral prediction. This decomposition follows a **Layered "Sandwich" Architecture** optimized for mobile performance and privacy.

---

## 1. Frontend Layer (React Native - 60fps UI)

### Module F1: Timeline (`/features/timeline`)
**Status:** In Progress
**Purpose:** Core schedule visualization with 60fps interactions

*   **Components:**
    *   `TimelineCanvas`: Virtualized vertical timeline using FlashList (Partially Implemented)
    *   `TimeBlock`: Atomic schedule unit (Implemented: Fixed, Flexible, Predicted variants)
    *   `NowIndicator`: Animated line showing current time
    *   `ConflictOverlay`: Visual indication of constraint violations
    *   `SnapGuide`: Visual guides during drag operations

*   **Hooks:**
    *   `useDragGesture`: Handles drag physics and snapping logic (Implemented)
    *   `useTimelineScroll`: Manages scroll position and viewport (Implemented)
    *   `useBlockAnimation`: Reanimated transitions for block movements

*   **Tech:** `@shopify/flash-list`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-haptics`

### Module F2: Activity Management (`/features/activities`)
**Status:** Pending
**Purpose:** Create, edit, and manage activities and constraints

*   **Components:**
    *   `ActivityForm`: Complete form for task properties
    *   `ConstraintToggle`: Visual switch for Replaceable vs Non-replaceable
    *   `PrioritySelector`: Interactive priority assignment (1-5 scale) (Implemented in ScheduleScreen)
    *   `RecurrenceEditor`: Complex pattern editor
    *   `CategoryManager`: Color-coded category system (Implemented)
    *   `QuickAddSheet`: Bottom sheet for rapid task entry (Implemented)

### Module F3: Intelligence Feedback (`/features/intelligence`)
**Status:** Pending
**Purpose:** Retrospective input and model correction interface

### Module F4: Analytics Dashboard (`/features/analytics`)
**Status:** Pending
**Purpose:** Goal tracking and adherence visualization

### Module F5: Settings & Setup (`/features/settings`)
**Status:** Implemented (Basic Version)
**Purpose:** Initial setup and ongoing configuration

*   **Components:**
    *   `TimeConstraintsWizard`: Sets baseline availability constraints
    *   `CalendarSyncSettings`: Google/Apple Calendar integration (UI Stubbed)
    *   `NotificationPreferences`: Push notification configuration (Implemented)
    *   `ModelResetPanel`: Resets learning model (Implemented)
    *   `DebugView`: Hidden developer panel (Implemented)

*   **Tech:** Expo Calendar API, Expo Notifications

### Module F6: Onboarding (`/features/onboarding`)
**Status:** Pending
**Purpose:** First-time setup and user calibration

---

## 2. Logic Layer (TypeScript - Learning & Orchestration)

### Module L1: Data Persistence (`/data`)
**Status:** Pending
**Purpose:** Single source of truth using WatermelonDB.

### Module L2: Behavioral Mining (`/mining`)
**Status:** Pending
**Purpose:** Quantifies user behavior into statistical metrics.

### Module L3: Optimization Bridge (`/bridge`)
**Status:** Pending
**Purpose:** Assembles the `Problem` struct for Rust.

### Module L4: Orchestration Services (`/services`)
**Status:** Pending
**Purpose:** Coordinates system components and manages business logic.

---

## Implementation Notes

- **Settings Screen (F5):**
    - Implemented basic toggle for Notifications and Location.
    - Added "Test Notification" button to simulate "Intelligence Check-in" with location context.
    - Added "Debug View" log to verify system events.
    - Added "Reset Model" stub.

- **Notification System Testing:**
    - The "Test Notification" button in Settings trigger a local notification.
    - It captures the current GPS coordinates (if permission granted) and displays them in the notification body, fulfilling the requirement to "check activity based on location".
