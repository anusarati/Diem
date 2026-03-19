/**
 * Build analytics data from backend-aligned activity + scheduled event data.
 */
import { EventStatus } from "../../types/domain";
import { colors } from "../theme";
import type {
	ActivityBreakdownItem,
	CategoryHeatmapOption,
	CausalNetEdge,
	CausalNetNode,
	GoalTimeData,
	HeatmapDataByCategory,
	ScheduledActivity,
} from "../types";
import { getActivitiesForDateRange } from "./services/homeService";
import { withScopedRepositories } from "./services/repositoryContext";
import {
	getAllScheduledActivities,
	getScheduledActivitiesForWeek,
} from "./services/scheduleService";

const DEFAULT_ACTIVITY_COLOR = colors.slate600;

function dateKey(d: Date): string {
	return d.toISOString().slice(0, 10);
}

const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
	Work: colors.peachDark,
	Study: colors.mintDark,
	Fitness: colors.lavenderDark,
	Personal: colors.softPinkDark,
	Other: colors.slate600,
};

// Extract dynamic categories and their colors from actual DB records
async function getCategoryMetadata() {
	return withScopedRepositories(async (repos) => {
		const activities = await repos.activity.listAll();
		const meta: Record<string, string> = {
			Other: DEFAULT_CATEGORY_COLORS.Other,
		};
		for (const a of activities) {
			const cat = a.categoryId || "Other";
			if (!meta[cat] || meta[cat] === DEFAULT_CATEGORY_COLORS.Other) {
				meta[cat] =
					a.color || DEFAULT_CATEGORY_COLORS[cat] || DEFAULT_ACTIVITY_COLOR;
			}
		}
		return meta;
	});
}

function eventStart(event: ScheduledActivity): Date {
	return new Date(event.startTime);
}

function eventInRange(
	event: ScheduledActivity,
	start: Date,
	end: Date,
): boolean {
	const at = eventStart(event);
	return at >= start && at < end;
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

/** Activity breakdown by category from scheduled events for the timeframe. */
export async function buildActivityBreakdown(
	timeframe: "Day" | "Week" | "Month",
): Promise<ActivityBreakdownItem[]> {
	const now = new Date();
	let scheduled: ScheduledActivity[] = [];
	if (timeframe === "Day") {
		const day = dateKey(now);
		scheduled = (await getAllScheduledActivities()).filter(
			(event) => dateKey(eventStart(event)) === day,
		);
	} else if (timeframe === "Week") {
		const start = weekStart(now);
		scheduled = await getScheduledActivitiesForWeek(start);
	} else {
		const start = monthStart(now);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
		scheduled = (await getAllScheduledActivities()).filter((event) =>
			eventInRange(event, start, end),
		);
	}

	const meta = await getCategoryMetadata();
	const activeCategories = Object.keys(meta);
	const byCategory: Record<string, number> = {};

	for (const cat of activeCategories) {
		byCategory[cat] = 0;
	}

	for (const event of scheduled) {
		const category = event.categoryId || "Other";
		byCategory[category] = (byCategory[category] || 0) + event.duration;
	}
	const total =
		Object.values(byCategory).reduce((sum, value) => sum + value, 0) || 1;

	const items: ActivityBreakdownItem[] = activeCategories.map((category) => ({
		label: category,
		value: formatMinutes(byCategory[category]),
		color: meta[category] || DEFAULT_ACTIVITY_COLOR,
		percent: Math.round((byCategory[category] / total) * 100),
	}));

	return items.filter((item) => item.percent > 0).length > 0
		? items.sort((a, b) => b.percent - a.percent)
		: [{ label: "No data", value: "0m", color: colors.slate400, percent: 100 }];
}

function formatMinutes(minutes: number): string {
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return mins ? `${hours}h ${mins}m` : `${hours}h`;
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
	const dayOfMonth = now.getDate();
	const daysInMonth = new Date(
		now.getFullYear(),
		now.getMonth() + 1,
		0,
	).getDate();
	return Math.min(1, Math.max(0.01, dayOfMonth / daysInMonth));
}

/** Date range [start, end) for timeframe. */
function getRange(timeframe: "Day" | "Week" | "Month"): {
	start: Date;
	end: Date;
} {
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
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	return { start, end };
}

/**
 * Goal time by category.
 * Done = completedDuration from activities + completed scheduled event duration.
 * Target = planned scheduled duration.
 * Projected = Done / elapsed fraction.
 */
export async function buildGoalTimeData(
	timeframe: "Day" | "Week" | "Month",
): Promise<GoalTimeData[]> {
	const { start, end } = getRange(timeframe);
	const fraction = elapsedFraction(timeframe);

	const meta = await getCategoryMetadata();
	const activeCategories = Object.keys(meta);

	const completedByCategory: Record<string, number> = {};
	const plannedByCategory: Record<string, number> = {};

	for (const cat of activeCategories) {
		completedByCategory[cat] = 0;
		plannedByCategory[cat] = 0;
	}

	const allScheduled = await getAllScheduledActivities();
	const scheduledInRange = allScheduled.filter((event) =>
		eventInRange(event, start, end),
	);
	for (const event of scheduledInRange) {
		const category = event.categoryId || "Other";
		if (plannedByCategory[category] === undefined)
			plannedByCategory[category] = 0;
		plannedByCategory[category] += event.duration;
	}

	const activityRanges = await getActivitiesForDateRange(start, end);
	for (const { activities } of activityRanges) {
		for (const activity of activities) {
			if (!activity.completed || activity.completedDuration == null) continue;
			const category = activity.categoryId || "Other";
			if (completedByCategory[category] === undefined)
				completedByCategory[category] = 0;
			completedByCategory[category] += activity.completedDuration;
		}
	}

	for (const event of scheduledInRange) {
		if (event.status !== EventStatus.COMPLETED) continue;
		const category = event.categoryId || "Other";
		if (completedByCategory[category] === undefined)
			completedByCategory[category] = 0;
		completedByCategory[category] += event.duration;
	}

	return activeCategories
		.map((category, index) => {
			const completedMinutes = completedByCategory[category] || 0;
			const plannedMinutes = plannedByCategory[category] || 0;
			const targetMinutes =
				plannedMinutes > 0
					? plannedMinutes
					: completedMinutes > 0
						? completedMinutes
						: 60;
			const projectedMinutes =
				fraction > 0
					? Math.round(completedMinutes / fraction)
					: completedMinutes;
			return {
				id: String(index + 1),
				label: category,
				targetMinutes,
				completedMinutes,
				projectedMinutes,
				onTrack: targetMinutes === 0 || completedMinutes >= targetMinutes * 0.8,
			};
		})
		.sort((a, b) => b.completedMinutes - a.completedMinutes);
}

/** Causal net built from historical markov transitions. */
export async function buildCausalNet(): Promise<{
	nodes: CausalNetNode[];
	edges: CausalNetEdge[];
}> {
	return withScopedRepositories(async (repositories) => {
		const transitions = await repositories.markov.listAll();
		const allActivities = await repositories.activity.listAll();
		const activityMap = new Map(allActivities.map((a) => [a.id, a.name]));

		if (transitions.length === 0) {
			return {
				nodes: [
					{
						id: "placeholder",
						activityLabel: "Complete activities to see flow",
						x: 120,
						y: 80,
					},
				],
				edges: [],
			};
		}

		// Sort by most frequent transitions to avoid an unreadable ball of yarn
		const sortedEdges = [...transitions]
			.sort((a, b) => b.count - a.count)
			.slice(0, 15); // Top 15 transitions

		const activeIds = new Set<string>();
		for (const edge of sortedEdges) {
			activeIds.add(edge.fromActivityId);
			activeIds.add(edge.toActivityId);
		}

		const nodes: CausalNetNode[] = [];
		let index = 0;
		for (const id of activeIds) {
			nodes.push({
				id,
				activityLabel: activityMap.get(id) || "Unknown",
				x: 80 + (index % 3) * 110,
				y: 80 + Math.floor(index / 3) * 60,
			});
			index++;
		}

		const edges: CausalNetEdge[] = sortedEdges.map((t) => ({
			from: t.fromActivityId,
			to: t.toActivityId,
		}));

		return { nodes, edges };
	});
}

/** Heatmap categories = activity categories. */
export async function buildHeatmapCategories(): Promise<
	CategoryHeatmapOption[]
> {
	const meta = await getCategoryMetadata();
	return Object.keys(meta).map((category) => ({
		id: category,
		label: category,
	}));
}

/** Heatmap: 7 days x 12 time slots (2h each), value 0–1 from scheduled minutes. */
export async function buildHeatmapByCategory(): Promise<HeatmapDataByCategory> {
	const scheduled = await getAllScheduledActivities();
	const meta = await getCategoryMetadata();
	const activeCategories = Object.keys(meta);

	const out: HeatmapDataByCategory = {};
	for (const category of activeCategories) {
		const grid: number[][] = Array.from({ length: 7 }, () =>
			Array.from({ length: 12 }, () => 0),
		);
		for (const event of scheduled.filter(
			(item) => (item.categoryId || "Other") === category,
		)) {
			const start = eventStart(event);
			const slot = Math.min(
				11,
				Math.floor((start.getHours() * 60 + start.getMinutes()) / 120),
			);
			const dayIdx = start.getDay();
			const row = dayIdx === 0 ? 6 : dayIdx - 1;
			grid[row][slot] += event.duration;
		}
		const max = Math.max(1, ...grid.flat());
		out[category] = grid.map((row) =>
			row.map((value) => Math.min(1, value / max)),
		);
	}
	return out;
}

/** Magic hours: 12 slots (2h each), opacity 0–1 from scheduled minutes. */
export async function buildMagicHours(
	timeframe: "Day" | "Week" | "Month",
): Promise<number[]> {
	const { start, end } = getRange(timeframe);
	const scheduled = (await getAllScheduledActivities()).filter((event) =>
		eventInRange(event, start, end),
	);

	const slots = Array(12).fill(0) as number[];
	for (const event of scheduled) {
		const at = eventStart(event);
		const slot = Math.min(
			11,
			Math.floor((at.getHours() * 60 + at.getMinutes()) / 120),
		);
		slots[slot] += event.duration;
	}
	const max = Math.max(1, ...slots);
	return slots.map((slotValue) => Math.min(1, slotValue / max));
}

/** Description for magic hours from slot data. */
export function getMagicHoursDescription(slots: number[]): string {
	if (slots.length < 12) {
		return "Add scheduled activities to see when you're most active.";
	}
	const total = slots.reduce((sum, value) => sum + value, 0);
	if (total === 0) {
		return "Add scheduled activities to see when you're most active.";
	}

	const morning = slots.slice(0, 6).reduce((sum, value) => sum + value, 0);
	const afternoon = slots.slice(6, 9).reduce((sum, value) => sum + value, 0);
	const evening = slots.slice(9, 12).reduce((sum, value) => sum + value, 0);
	const max = Math.max(morning, afternoon, evening);

	if (max === 0) {
		return "Add scheduled activities to see when you're most active.";
	}
	if (evening === max && evening > morning && evening > afternoon) {
		return "You schedule most in the evening. Use these slots for focused work or wind-down activities.";
	}
	if (afternoon === max && afternoon > morning && afternoon > evening) {
		return "Your activity peaks in the afternoon. Plan deep work then.";
	}
	if (morning === max && morning > afternoon && morning > evening) {
		return "You tend to schedule more in the morning. Use these slots for important activities.";
	}
	return "Your scheduled time is spread across the day. Consider grouping similar activities in your peak slots.";
}

/** Productivity score 0–100 from activity completion + scheduled events. */
export async function buildProductivityScore(
	timeframe: "Day" | "Week" | "Month",
): Promise<{ score: number; message: string; sub: string }> {
	const { start, end } = getRange(timeframe);
	const activityRanges = await getActivitiesForDateRange(start, end);
	let completed = 0;
	let total = 0;
	for (const { activities } of activityRanges) {
		for (const activity of activities) {
			total += 1;
			if (activity.completed) {
				completed += 1;
			}
		}
	}

	const scheduled = (await getAllScheduledActivities()).filter((event) =>
		eventInRange(event, start, end),
	);
	total += scheduled.length;
	completed += scheduled.filter(
		(event) => event.status === EventStatus.COMPLETED,
	).length;
	const scheduledMinutes = scheduled.reduce(
		(sum, event) => sum + event.duration,
		0,
	);

	const completionRatio = total > 0 ? completed / total : 0.5;
	const score = Math.round(
		Math.min(
			100,
			40 + completionRatio * 40 + Math.min(20, scheduledMinutes / 60),
		),
	);
	const message =
		score >= 80
			? "You're doing amazing!"
			: score >= 60
				? "Good progress!"
				: "Keep going!";
	const sub =
		total > 0
			? `${completed} of ${total} activities done. ${formatMinutes(scheduledMinutes)} scheduled.`
			: "Add activities to see your score.";
	return { score, message, sub };
}

/** Focus % and flow time from activities + scheduled events. */
export async function buildStats(
	timeframe: "Day" | "Week" | "Month",
): Promise<{ focusPercent: number; flowMinutes: number }> {
	const { start, end } = getRange(timeframe);
	const activityRanges = await getActivitiesForDateRange(start, end);
	let completed = 0;
	let total = 0;
	for (const { activities } of activityRanges) {
		for (const activity of activities) {
			total += 1;
			if (activity.completed) {
				completed += 1;
			}
		}
	}

	const scheduled = (await getAllScheduledActivities()).filter((event) =>
		eventInRange(event, start, end),
	);
	total += scheduled.length;
	completed += scheduled.filter(
		(event) => event.status === EventStatus.COMPLETED,
	).length;
	const flowMinutes = scheduled.reduce((sum, event) => sum + event.duration, 0);
	const focusPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
	return { focusPercent, flowMinutes };
}

/** Single load for Analysis screen. */
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
	const { nodes: causalNetNodes, edges: causalNetEdges } =
		await buildCausalNet();
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
