# Coloring & Calendar System Guide

This document explains the logic behind the colors and styles used in the calendar system. Understanding this helps distinguish between different types of tasks (e.g., predicted vs. manual) and their importance.

## 1. Color System (Priority & Categories)

Colors are primarily assigned based on the **Priority** of the task. When you add or edit an activity, selecting a priority level automatically assigns a color.

| Priority Level | Color Name | Hex Code | Visual Meaning |
| :--- | :--- | :--- | :--- |
| **High** | `Red / Rose` | `#E11D48` | **Critical / Urgent**. Items that must be done. |
| **Medium** | `Orange / Peach`| `#C2410C` | **Important but flexible**. Standard work blocks or meetings. |
| **Low** | `Green / Mint` | `#047857` | **Routine / Health**. Gym, errands, low-stress activities. |
| **None / Default** | `Teal` | `#0D9488` | **General**. Lectures, standard events without specific priority. |

*> Note: Some pre-loaded events (like "Lunch" or "Study") might have specific category colors assigned manually for visual distinction, but user-created events follow the priority logic above.*

## 2. Event Types & Visual Styles

The calendar distinguishes between *how* an event was created (Manual vs. AI) and its flexibility using visual styles (borders and opacity).

### A. Fixed Events (Manual Input)
*   **Style:** Solid Background, Solid Border.
*   **Meaning:** These are hard constraints. You manually added them, or they are fixed appointments (e.g., "CS 125 Lecture").
*   **Example:**
    *   *A distinct, solid block of color.*

### B. Flexible Events
*   **Style:** Dashed Border.
*   **Meaning:** These are tasks you want to do, but the exact time is flexible. You can drag them around easily without invalidating the event.
*   **Example:**
    *   *A block with a dashed outline.*

### C. Predicted Events (AI Generated)
*   **Style:** Translucent (Faded) Background, Dotted Border.
*   **Meaning:** These are suggestions from the AI. The system "predicts" you might want to study or do a task at this time.
*   **Example:**
    *   *A faded, lighter block (e.g., light purple for study) with a dotted outline.*

## 3. Summary of Visual Cues

*   **Red Block** = **High Priority** (Do this first!)
*   **Green Block** = **Low Priority** (Relaxing/Routine)
*   **Faded/See-through Block** = **AI Prediction** (Confirm if you want to keep it)
*   **Dashed Border** = **Flexible** (Feel free to move it)

## 4. Current Color Palette Reference

These are the strict color codes used in the application theme:

*   **Teal (Primary):** `#0D9488`
*   **Rose (High Priority):** `#E11D48`
*   **Orange (Medium Priority):** `#F97316` / `#C2410C`
*   **Green (Low Priority):** `#10B981` / `#047857`
*   **Indigo (Study/Focus):** `#6366F1`
*   **Pink (Soft/Personal):** `#EC4899`
