/**
 * Build analytics data from real task + scheduled activity data.
 * Task section = checklist (getTasksForDate). Calendar section = scheduled activities (mock or real).
 */
import { colors } from "../theme";
import type {
	ActivityBreakdownItem,
	ActivityCategory,
	CausalNetEdge,
	CausalNetNode,
	CategoryHeatmapOption,
	GoalTimeData,
	HeatmapDataByCategory,
	ScheduledActivity,
} from "../types";
import {
	getAllScheduledActivities,
	getScheduledActivitiesForWeek,
	getTasksForDateRange,
} from "./storage";

const CATEGORY_COLORS: Record<ActivityCategory, string> = {
	Work: colors.peachDark,
	Study: colors.mintDark,
	Fitness: colors.lavenderDark,
	Personal: colors.softPinkDark,
	Other: colors.slate600,
};

function dateKey(d: Date): string {
	return d.toISOString().slice(0, 10);
}

/** Start of week (Monday). */
function weekStart(d: Date): Date {
	const x = new Date(d);
	const day = x.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	x.setDate(x.getDate() + diff);
	x.setHours(0, 0, 0, 0);
	return x;
}

/** First day of month (00:00). */
function monthStart(d: Date): Date {
	const x = new Date(d.getFullYear(), d.getMonth(), 1);
	x.setHours(0, 0, 0, 0);
	return x;
}

/** Activity breakdown by category from scheduled activities (real) for the timeframe. */
export async function buildActivityBreakdown(
	timeframe: "Day" | "Week" | "Month",
): Promise<ActivityBreakdownItem[]> {
	const now = new Date();
	let scheduled: ScheduledActivity[] = [];
	if (timeframe === "Day") {
		scheduled = (await getAllScheduledActivities()).filter(
			(a) => a.date === dateKey(now),
		);
	} else if (timeframe === "Week") {
		const start = weekStart(now);
		scheduled = await getScheduledActivitiesForWeek(start);
	} else {
		const start = monthStart(now);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		const endKey = dateKey(end);
		const startKey = dateKey(start);
		scheduled = (await getAllScheduledActivities()).filter(
			(a) => a.date >= startKey && a.date <= endKey,
		);
	}

	const byCategory: Record<string, number> = {};
	for (const a of scheduled) {
		byCategory[a.category] = (byCategory[a.category] ?? 0) + a.durationMinutes;
	}
	const total = Object.values(byCategory).reduce((s, n) => s + n, 0) || 1;
	const items: ActivityBreakdownItem[] = (
		["Work", "Study", "Fitness", "Personal", "Other"] as ActivityCategory[]
	).map((cat) => ({
		label: cat,
		value: formatMinutes(byCategory[cat] ?? 0),
		color: CATEGORY_COLORS[cat],
		percent: Math.round(((byCategory[cat] ?? 0) / total) * 100),
	}));
	return items.filter((i) => i.percent > 0).length > 0 ? items : [
		{ label: "No data", value: "0m", color: colors.slate400, percent: 100 },
	];
}

function formatMinutes(m: number): string {
	if (m < 60) return `${m}m`;
	const h = Math.floor(m / 60);
	const min = m % 60;
	return min ? `${h}h ${min}m` : `${h}h`;
}

/** Elapsed fraction of the period (0–1). Used to project end-of-period from current progress. */
function elapsedFraction(timeframe: "Day" | "Week" | "Month"): number {
	const now = new Date();
	if (timeframe === "Day") return 1;
	if (timeframe === "Week") {
		const start = weekStart(now);
		const elapsedMs = now.getTime() - start.getTime();
		const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);
		return Math.min(1, Math.max(0.01, elapsedDays / 7));
	}
	// Month
	const dayOfMonth = now.getDate();
	const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	return Math.min(1, Math.max(0.01, dayOfMonth / daysInMonth));
}

/** Date range [start, end) for timeframe. */
function getRange(timeframe: "Day" | "Week" | "Month"): { start: Date; end: Date } {
	const now = new Date();
	if (timeframe === "Day") {
		const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const end = new Date(start);
		end.setDate(end.getDate() + 1);
		return { start, end };
	}
	if (timeframe === "Week") {
		const start = weekStart(now);
		const end = new Date(start);
		end.setDate(end.getDate() + 7);
		return { start, end };
	}
	const start = monthStart(now);
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	end.setDate(end.getDate() + 1);
	return { start, end };
}

/**
 * Goal time by category.
 * Done = time you logged when marking tasks done (checklist + completed scheduled).
 * Target = planned time for that category (sum of scheduled activity durations in the period). So 1 task of 1 hr → Target 1 hr.
 * Projected = Done / elapsed fraction (extrapolated to end of period).
 */
export async function buildGoalTimeData(
	timeframe: "Day" | "Week" | "Month",
): Promise<GoalTimeData[]> {
	const { start, end } = getRange(timeframe);
	const fraction = elapsedFraction(timeframe);
	const startKey = dateKey(start);
	const endKey = dateKey(end);

	const categories = ["Work", "Study", "Fitness", "Personal", "Other"] as ActivityCategory[];
	const completedByCategory: Record<string, number> = {};
	const plannedByCategory: Record<string, number> = {};
	for (const c of categories) {
		completedByCategory[c] = 0;
		plannedByCategory[c] = 0;
	}

	// Planned = total scheduled duration in range (expected time)
	const allScheduled = await getAllScheduledActivities();
	const scheduledInRange = allScheduled.filter(
		(a) => a.date >= startKey && a.date < endKey,
	);
	for (const a of scheduledInRange) {
		plannedByCategory[a.category] = (plannedByCategory[a.category] ?? 0) + a.durationMinutes;
	}

	// Done = completed checklist (with logged time) + completed scheduled (actual or duration)
	const taskRanges = await getTasksForDateRange(start, end);
	for (const { tasks } of taskRanges) {
		for (const t of tasks) {
			if (!t.completed || t.completedMinutes == null) continue;
			const cat = t.category ?? "Other";
			completedByCategory[cat] = (completedByCategory[cat] ?? 0) + t.completedMinutes;
		}
	}
	for (const a of scheduledInRange.filter((x) => x.completed)) {
		const mins = a.actualMinutesSpent ?? a.durationMinutes;
		completedByCategory[a.category] = (completedByCategory[a.category] ?? 0) + mins;
	}

	return categories.map((label, i) => {
		const completedMinutes = completedByCategory[label] ?? 0;
		const plannedMinutes = plannedByCategory[label] ?? 0;
		const targetMinutes =
			plannedMinutes > 0 ? plannedMinutes : (completedMinutes > 0 ? completedMinutes : 60);
		const projectedMinutes =
			fraction > 0 ? Math.round(completedMinutes / fraction) : completedMinutes;
		return {
			id: String(i + 1),
			label,
			targetMinutes,
			completedMinutes,
			projectedMinutes,
			onTrack: targetMinutes === 0 || completedMinutes >= targetMinutes * 0.8,
		};
	});
}

function parseMinutes(value: string): number {
	if (value === "0m") return 0;
	const h = /(\d+)h/.exec(value);
	const m = /(\d+)m/.exec(value);
	return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
}

/** Causal net: mock from categories (calendar not fully implemented). */
export function buildCausalNet(
	scheduled: ScheduledActivity[],
): { nodes: CausalNetNode[]; edges: CausalNetEdge[] } {
	const categories = [...new Set(scheduled.map((a) => a.category))];
	if (categories.length === 0) {
		return {
			nodes: [
				{ id: "placeholder", activityLabel: "Add activities", x: 120, y: 80 },
			],
			edges: [],
		};
	}
	const nodes: CausalNetNode[] = categories.map((c, i) => ({
		id: c.toLowerCase(),
		activityLabel: c,
		x: 80 + i * 70,
		y: 80 + (i % 2) * 40,
	}));
	const edges: CausalNetEdge[] = [];
	for (let i = 0; i < nodes.length - 1; i++) {
		edges.push({ from: nodes[i].id, to: nodes[i + 1].id });
	}
	return { nodes, edges };
}

/** Heatmap categories = activity categories. */
export function buildHeatmapCategories(): CategoryHeatmapOption[] {
	return [
		{ id: "Work", label: "Work" },
		{ id: "Study", label: "Study" },
		{ id: "Fitness", label: "Fitness" },
		{ id: "Personal", label: "Personal" },
		{ id: "Other", label: "Other" },
	];
}

/** Heatmap: 7 days x 12 time slots (2h each), value 0–1 from scheduled minutes. */
export async function buildHeatmapByCategory(): Promise<HeatmapDataByCategory> {
	const scheduled = await getAllScheduledActivities();
	const categories = ["Work", "Study", "Fitness", "Personal", "Other"] as const;
	const out: HeatmapDataByCategory = {};
	for (const cat of categories) {
		const grid: number[][] = Array.from({ length: 7 }, () =>
			Array.from({ length: 12 }, () => 0),
		);
		for (const a of scheduled.filter((x) => x.category === cat)) {
			const [h, m] = a.startTime.split(":").map(Number);
			const slot = Math.min(11, Math.floor((h * 60 + m) / 120));
			const dayIdx = new Date(a.date).getDay();
			const row = dayIdx === 0 ? 6 : dayIdx - 1;
			grid[row][slot] += a.durationMinutes;
		}
		const max = Math.max(1, ...grid.flat());
		out[cat] = grid.map((row) => row.map((v) => Math.min(1, v / max)));
	}
	return out;
}

/** Magic hours: 12 slots (2h each), opacity 0–1 from scheduled minutes. */
export async function buildMagicHours(
	timeframe: "Day" | "Week" | "Month",
): Promise<number[]> {
	const now = new Date();
	let scheduled: ScheduledActivity[] = [];
	if (timeframe === "Day") {
		scheduled = (await getAllScheduledActivities()).filter(
			(a) => a.date === dateKey(now),
		);
	} else if (timeframe === "Week") {
		const start = weekStart(now);
		scheduled = await getScheduledActivitiesForWeek(start);
	} else {
		const start = monthStart(now);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		scheduled = (await getAllScheduledActivities()).filter(
			(a) => a.date >= dateKey(start) && a.date <= dateKey(end),
		);
	}
	const slots = Array(12).fill(0);
	for (const a of scheduled) {
		const [h] = a.startTime.split(":").map(Number);
		const slot = Math.min(11, Math.floor(h / 2));
		slots[slot] += a.durationMinutes;
	}
	const max = Math.max(1, ...slots);
	return slots.map((s) => Math.min(1, s / max));
}

/** Description for magic hours from actual slot data. Slots 0–5 ≈ morning, 6–8 ≈ afternoon, 9–11 ≈ evening/night. */
export function getMagicHoursDescription(slots: number[]): string {
	if (slots.length < 12) return "Add scheduled activities to see when you're most active.";
	const total = slots.reduce((s, v) => s + v, 0);
	if (total === 0) return "Add scheduled activities to see when you're most active.";
	const morning = slots.slice(0, 6).reduce((s, v) => s + v, 0);
	const afternoon = slots.slice(6, 9).reduce((s, v) => s + v, 0);
	const evening = slots.slice(9, 12).reduce((s, v) => s + v, 0);
	const max = Math.max(morning, afternoon, evening);
	if (max === 0) return "Add scheduled activities to see when you're most active.";
	if (evening === max && evening > morning && evening > afternoon) {
		return "You schedule most in the evening. Use these slots for focused work or wind-down tasks.";
	}
	if (afternoon === max && afternoon > morning && afternoon > evening) {
		return "Your activity peaks in the afternoon. Plan deep work then.";
	}
	if (morning === max && morning > afternoon && morning > evening) {
		return "You tend to schedule more in the morning. Use these slots for important tasks.";
	}
	return "Your scheduled time is spread across the day. Consider grouping similar tasks in your peak slots.";
}

/** Productivity score 0–100 from checklist completion + scheduled. */
export async function buildProductivityScore(
	timeframe: "Day" | "Week" | "Month",
): Promise<{ score: number; message: string; sub: string }> {
	const now = new Date();
	let start: Date;
	let end: Date;
	if (timeframe === "Day") {
		start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		end = new Date(start);
		end.setDate(end.getDate() + 1);
	} else if (timeframe === "Week") {
		start = weekStart(now);
		end = new Date(start);
		end.setDate(end.getDate() + 7);
	} else {
		start = new Date(now.getFullYear(), now.getMonth(), 1);
		end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		end.setDate(end.getDate() + 1);
	}

	const taskRanges = await getTasksForDateRange(start, end);
	let completed = 0;
	let total = 0;
	for (const { tasks } of taskRanges) {
		for (const t of tasks) {
			total++;
			if (t.completed) completed++;
		}
	}
	const scheduled = await getAllScheduledActivities();
	const inRange = scheduled.filter(
		(a) => a.date >= dateKey(start) && a.date < dateKey(end),
	);
	total += inRange.length;
	completed += inRange.filter((a) => a.completed).length;
	const scheduledMinutes = inRange.reduce((s, a) => s + a.durationMinutes, 0);
	const completionRatio = total > 0 ? completed / total : 0.5;
	const score = Math.round(
		Math.min(100, 40 + completionRatio * 40 + Math.min(20, scheduledMinutes / 60)),
	);
	const message =
		score >= 80 ? "You're doing amazing!" : score >= 60 ? "Good progress!" : "Keep going!";
	const sub =
		total > 0
			? `${completed} of ${total} tasks done (checklist + scheduled). ${formatMinutes(scheduledMinutes)} scheduled.`
			: "Add tasks to see your score.";
	return { score, message, sub };
}

/** Focus % and flow time from tasks + scheduled. */
export async function buildStats(
	timeframe: "Day" | "Week" | "Month",
): Promise<{ focusPercent: number; flowMinutes: number }> {
	const now = new Date();
	let start: Date;
	let end: Date;
	if (timeframe === "Day") {
		start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		end = new Date(start);
		end.setDate(end.getDate() + 1);
	} else if (timeframe === "Week") {
		start = weekStart(now);
		end = new Date(start);
		end.setDate(end.getDate() + 7);
	} else {
		start = new Date(now.getFullYear(), now.getMonth(), 1);
		end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		end.setDate(end.getDate() + 1);
	}
	const taskRanges = await getTasksForDateRange(start, end);
	let completed = 0;
	let total = 0;
	for (const { tasks } of taskRanges) {
		for (const t of tasks) {
			total++;
			if (t.completed) completed++;
		}
	}
	const scheduled = await getAllScheduledActivities();
	const inRange = scheduled.filter(
		(a) => a.date >= dateKey(start) && a.date < dateKey(end),
	);
	total += inRange.length;
	completed += inRange.filter((a) => a.completed).length;
	const flowMinutes = inRange.reduce((s, a) => s + a.durationMinutes, 0);
	const focusPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
	return { focusPercent, flowMinutes };
}

/** Single load for Analysis screen: real task + scheduled, mock causal/heatmap where needed. */
export async function loadAnalyticsData(timeframe: "Day" | "Week" | "Month") {
	const [
		activityBreakdown,
		goalTimeData,
		heatmapCategories,
		heatmapByCategory,
		magicHours,
		scoreData,
		stats,
	] = await Promise.all([
		buildActivityBreakdown(timeframe),
		buildGoalTimeData(timeframe),
		Promise.resolve(buildHeatmapCategories()),
		buildHeatmapByCategory(),
		buildMagicHours(timeframe),
		buildProductivityScore(timeframe),
		buildStats(timeframe),
	]);
	const magicHoursDescription = getMagicHoursDescription(magicHours);
	const scheduled = await getAllScheduledActivities();
	const { nodes: causalNetNodes, edges: causalNetEdges } =
		buildCausalNet(scheduled);
	return {
		activityBreakdown,
		goalTimeData,
		causalNetNodes,
		causalNetEdges,
		heatmapCategories,
		heatmapByCategory,
		magicHours,
		magicHoursDescription,
		score: scoreData.score,
		scoreMessage: scoreData.message,
		scoreSub: scoreData.sub,
		focusPercent: stats.focusPercent,
		flowMinutes: stats.flowMinutes,
	};
}
