# **Diem Predictive Scheduling Model (DPSM)**

## **1. Model Overview**

The Diem model treats daily scheduling as a **Constraint Optimization Problem**. Its goal is to maximize a utility function (representing user preferences and habits) subject to a rigorous set of constraints (representing logic, physics, and user rules).

The model is composed of four distinct components.

### **Component A: User-Defined Hard Constraints (The Override)**

These are explicit rules provided by the user (e.g., "No meetings on Fridays," "Gym must be after 5 PM").

* **Role:** These act as **Hard Constraints**. They define the feasible search space. Any schedule violating these is immediately rejected, regardless of historical probability.  
* **Math Representation:** A set of binary restrictions on the decision variable $x_{i,t}$.

### **Component B: The Causal Net (The Topology)**

This represents the causal dependencies between activities inferred from long-term history using a Heuristic Miner (e.g., "User cannot *Commute* before *Waking Up*").

* **Role:** These act as **Structural Constraints**. They enforce the logical sequence of events, ensuring valid input/output bindings between tasks.  
* **Math Representation:** Inequality constraints linking the start/end times of dependent activities based on the Causal Matrix.

### **Component C: The Heatmap (The Clock)**

This represents the probability of an activity occurring at a specific absolute time (e.g., "Lunch usually happens at 12:00 PM").

* **Role:** This acts as a **Soft Weight** in the objective function. It biases the solver to place tasks at their familiar times.  
* **Math Representation:** The parameter $H_{i,t}$ (a normalized score $0 \dots 1$).

### **Component D: The Markov Chain (The Flow)**

This represents the probability of one activity following another (e.g., "Coffee usually follows Waking Up").

* **Role:** This acts as a **Soft Weight** in the objective function. It biases the solver to maintain familiar sequences of tasks.  
* **Math Representation:** The parameter $M_{i,j}$ (transition probability from $i \to j$).

---

## **2. Mathematical Formulation**

### **2.1 Variables & Parameters**

We define the following:

* $x_{i,t} \in \{0, 1\}$: **Decision Variable**. Equals $1$ if Activity $i$ is scheduled at time $t$.  
* $y_{i,j,t} \in \{0, 1\}$: **Transition Variable**. Equals $1$ if Activity $j$ starts at $t$ immediately after Activity $i$ ends.  
* $P_i$: **Priority Score**. The importance of activity $i$ (User-defined).  
* $H_{i,t}$: **Heatmap Score**. The historical affinity of activity $i$ for time $t$.  
* $M_{i,j}$: **Markov Score**. The historical probability of activity $j$ following activity $i$.

### **2.2 The Objective Function**

The solver maximizes $Z$, the total utility of the schedule. Note how each component from Section 1 directly contributes to the score:

$$\text{Maximize } Z = \sum_{t} \left[ \sum_{i} x_{i,t} (\alpha P_i + \beta H_{i,t}) + \sum_{i,j} y_{i,j,t} (\gamma M_{i,j}) \right]$$

* **$\alpha P_i$ (Priority):** Ensures high-value tasks are included.  
* **$\beta H_{i,t}$ (Heatmap):** Anchors tasks to their preferred time of day.  
* **$\gamma M_{i,j}$ (Markov):** Keeps tasks in their preferred sequences.

### **2.3 The Constraints**

The optimization is subject to the following rules. If any are violated, the schedule is invalid.

**1. User-Defined Constraints (Component A)**

Explicit restrictions on specific slots.

$$x_{i,t} = 0 \quad \forall t \in \text{ForbiddenTimes}(i)$$  
**2. Causal Net / Topology Constraints (Component B)**

These constraints enforce the valid "flow" of the day based on the Heuristic Miner's output. We define a binary presence variable $z_i = \max_t(x_{i,t})$, which equals $1$ if activity $i$ is scheduled at all, and $0$ otherwise.

* **Sequential Dependency (Standard Arc):**  
  If dependency $i \to j$ exists and both are scheduled:  
  $$Start(j) \ge End(i) - M(1 - z_i) - M(1 - z_j)$$  
  *(Where $M$ is a large constant to relax the constraint if either task is missing).*  
* **XOR Split (Exclusive Choice):**  
  If Activity $i$ is an XOR-split (e.g., "Dinner" leads to "Study" OR "Movie"):  
  $$z_i \implies \sum_{j \in \text{Successors}(i)} z_j = 1$$  
  *(If $i$ happens, exactly one of its successors must happen).*  
* **AND Join (Synchronization):**  
  If Activity $j$ is an AND-join (e.g., "Submit Report" requires "Writing" AND "Editing" to be done):  
  $$Start(j) \ge \max(End(i) \mid \forall i \in \text{Predecessors}(j))$$

**3. Physical Constraints**

* **Non-Overlap (Single Resource):**  
  The user is a single resource and cannot perform multiple primary activities simultaneously.  
  $$\sum_{i} x_{i,t} \le 1 \quad \forall t$$  
* **Duration Consistency:**  
  If an activity is scheduled ($z_i=1$), it must last its full predicted duration $D_i$.  
  $$\sum_{t} x_{i,t} = D_i \cdot z_i$$

---

## **3. Logic Flow**

1. **Filter:** The system applies **User-Defined Constraints** first. This zeros out impossible variables (e.g., removing "Work" variables from "Saturday" slots), reducing the problem size.  
2. **Bound:** The system applies **Causal Net Constraints** to define the valid relationships between the remaining tasks.  
3. **Optimize:** The solver calculates the placement of $x_{i,t}$ that maximizes the **Objective Function**, balancing the user's priority ($P$), time habits ($H$), and sequence habits ($M$).

