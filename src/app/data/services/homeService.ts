import {
	toActivityEntity,
	toScheduledEventEntity,
} from "../../../data/mappers/model_to_dto";
import type ActivityModel from "../../../data/models/Activity";
import type ActivityHistory from "../../../data/models/ActivityHistory";
import { HistoryWriteService } from "../../../mining";
import { EventStatus, RecurrenceFrequency } from "../../../types/domain";
import type { ActivityFormData } from "../../hooks/useActivityValidation";
import type {
	ActivityItem,
	RecurrencePattern,
	ScheduledActivity,
} from "../../types";
import { rebuildMarkovTransitionCountsFromHistory } from "./markovService";
import {
	currentTimeZone,
	DEFAULT_ACTIVITY_COLOR,
	DEFAULT_ACTIVITY_DURATION,
	DEFAULT_ACTIVITY_PRIORITY,
	DEFAULT_CATEGORY_ID,
	dayRange,
	makeRepositories,
	type RepoBundle,
	resolveCurrentScope,
	withScopedRepositories,
} from "./repositoryContext";

export interface HomeData {
	activities: ActivityItem[];
	scheduled: ScheduledActivity[];
}

function toActivityItem(
	activity: ActivityModel,
	history: ActivityHistory | null,
	isRecurring?: boolean,
	recurrencePattern?: RecurrencePattern,
): ActivityItem {
	const base = toActivityEntity(activity);
	return {
		...base,
		completed: history?.wasCompleted ?? false,
		completedDuration: history?.actualDuration ?? undefined,
		isRecurring,
		recurrencePattern,
	};
}

async function listActivitiesForDateWithRepositories(
	repositories: RepoBundle,
	date: Date,
): Promise<ActivityItem[]> {
	const { start, end } = dayRange(date);
	const historyRows = await repositories.history.listForRange(start, end);
	const recurringRows = await repositories.recurringActivity.listAll();

	const out: ActivityItem[] = [];
	for (const history of historyRows) {
		const activity = await repositories.activity.findById(history.activityId);
		if (!activity) {
			continue;
		}
		const recurring = recurringRows.find((r) => r.templateId === activity.id);
		const isRecurring = !!recurring;
		const recurrencePattern: RecurrencePattern | undefined = recurring
			? {
					frequency: recurring.frequency as RecurrenceFrequency,
					interval: recurring.interval,
					daysOfWeek: recurring.daysOfWeek,
				}
			: undefined;
		out.push(toActivityItem(activity, history, isRecurring, recurrencePattern));
	}

	return out.sort((left, right) =>
		left.createdAt.localeCompare(right.createdAt),
	);
}

async function listScheduledForDateWithRepositories(
	repositories: RepoBundle,
	date: Date,
): Promise<ScheduledActivity[]> {
	const { start, end } = dayRange(date);
	const rows = await repositories.schedule.listForRange(start, end);
	return rows
		.map(toScheduledEventEntity)
		.sort(
			(left, right) =>
				new Date(left.startTime).getTime() -
				new Date(right.startTime).getTime(),
		);
}

export async function loadHomeData(date: Date): Promise<HomeData> {
	return withScopedRepositories(async (repositories) => ({
		activities: await listActivitiesForDateWithRepositories(repositories, date),
		scheduled: await listScheduledForDateWithRepositories(repositories, date),
	}));
}

export async function observeHomeData(
	date: Date,
	onChange: (data: HomeData) => void,
): Promise<() => void> {
	const { scope } = await resolveCurrentScope();
	const repositories = makeRepositories(scope);
	const { start, end } = dayRange(date);

	let disposed = false;
	let refreshQueued = false;
	let nextQueued = false;

	const emit = async () => {
		if (disposed) {
			return;
		}
		if (refreshQueued) {
			nextQueued = true;
			return;
		}
		refreshQueued = true;
		try {
			const [activities, scheduled] = await Promise.all([
				listActivitiesForDateWithRepositories(repositories, date),
				listScheduledForDateWithRepositories(repositories, date),
			]);
			if (!disposed) {
				onChange({ activities, scheduled });
			}
		} finally {
			refreshQueued = false;
			if (nextQueued) {
				nextQueued = false;
				void emit();
			}
		}
	};

	const historySubscription = repositories.history
		.observeForRange(start, end)
		.subscribe(() => {
			void emit();
		});
	const activitySubscription = repositories.activity
		.observeAll()
		.subscribe(() => {
			void emit();
		});
	const scheduleSubscription = repositories.schedule
		.observeForRange(start, end)
		.subscribe(() => {
			void emit();
		});

	void emit();

	return () => {
		disposed = true;
		historySubscription.unsubscribe();
		activitySubscription.unsubscribe();
		scheduleSubscription.unsubscribe();
	};
}

export async function observeActivitiesForDate(
	date: Date,
	onChange: (activities: ActivityItem[]) => void,
): Promise<() => void> {
	return observeHomeData(date, (data) => {
		onChange(data.activities);
	});
}

export async function getAllActivities(): Promise<ActivityItem[]> {
	return withScopedRepositories(async (repositories) => {
		const rows = await repositories.activity.listAll();
		const recurringRows = await repositories.recurringActivity.listAll();
		const mapped = rows.map((a) => {
			const recurring = recurringRows.find((r) => r.templateId === a.id);
			const recurrencePattern: RecurrencePattern | undefined = recurring
				? {
						frequency: recurring.frequency as any,
						interval: recurring.interval,
						daysOfWeek: recurring.daysOfWeek,
					}
				: undefined;
			return toActivityItem(a, null, !!recurring, recurrencePattern);
		});
		return mapped.sort((l, r) => l.createdAt.localeCompare(r.createdAt));
	});
}

export async function observeAllActivities(
	onChange: (activities: ActivityItem[]) => void,
): Promise<() => void> {
	const { scope } = await resolveCurrentScope();
	const repositories = makeRepositories(scope);

	let disposed = false;
	let refreshQueued = false;
	let nextQueued = false;

	const emit = async () => {
		if (disposed) {
			return;
		}
		if (refreshQueued) {
			nextQueued = true;
			return;
		}
		refreshQueued = true;
		try {
			const [rows, recurringRows] = await Promise.all([
				repositories.activity.listAll(),
				repositories.recurringActivity.listAll(),
			]);
			const mapped = rows.map((a) => {
				const recurring = recurringRows.find((r) => r.templateId === a.id);
				const recurrencePattern: RecurrencePattern | undefined = recurring
					? {
							frequency: recurring.frequency as any,
							interval: recurring.interval,
							daysOfWeek: recurring.daysOfWeek,
						}
					: undefined;
				return toActivityItem(a, null, !!recurring, recurrencePattern);
			});
			if (!disposed) {
				onChange(mapped.sort((l, r) => l.createdAt.localeCompare(r.createdAt)));
			}
		} finally {
			refreshQueued = false;
			if (nextQueued) {
				nextQueued = false;
				void emit();
			}
		}
	};

	const sub = repositories.activity.observeAll().subscribe(() => {
		void emit();
	});

	void emit();

	return () => {
		disposed = true;
		sub.unsubscribe();
	};
}

export async function getActivitiesForDate(
	date: Date,
): Promise<ActivityItem[]> {
	return withScopedRepositories((repositories) =>
		listActivitiesForDateWithRepositories(repositories, date),
	);
}

export async function getActivitiesForDateRange(
	start: Date,
	end: Date,
): Promise<{ date: string; activities: ActivityItem[] }[]> {
	return withScopedRepositories(async (repositories) => {
		const out: { date: string; activities: ActivityItem[] }[] = [];
		const cur = new Date(start);
		while (cur < end) {
			const key = cur.toISOString().slice(0, 10);
			const activities = await listActivitiesForDateWithRepositories(
				repositories,
				cur,
			);
			out.push({ date: key, activities });
			cur.setDate(cur.getDate() + 1);
		}
		return out;
	});
}

export async function saveActivitiesForDate(
	date: Date,
	activities: ActivityItem[],
): Promise<void> {
	await withScopedRepositories(async (repositories) => {
		const { start, end } = dayRange(date);
		await repositories.history.deleteForRange(start, end);

		for (const item of activities) {
			const activity = await repositories.activity.upsert({
				id: item.id,
				categoryId: item.categoryId,
				name: item.name,
				priority: item.priority,
				defaultDuration: item.defaultDuration,
				isReplaceable: item.isReplaceable,
				color: item.color,
				createdAt: new Date(item.createdAt),
			});

			await repositories.history.create({
				activityId: activity.id,
				predictedStartTime: start,
				predictedDuration: item.defaultDuration,
				actualStartTime: item.completed ? start : undefined,
				actualDuration: item.completedDuration,
				wasCompleted: item.completed,
				wasSkipped: false,
				wasReplaced: false,
				createdAt: new Date(item.createdAt),
			});
		}
	});
}

export async function toggleActivityCompletion(
	date: Date,
	activityId: string,
	options?: { completedDuration?: number },
): Promise<ActivityItem[]> {
	return withScopedRepositories(async (repositories) => {
		const history = await repositories.history.findForActivityOnDate(
			activityId,
			date,
		);

		if (history?.wasCompleted) {
			await repositories.history.update(history.id, {
				wasCompleted: false,
				actualStartTime: null,
				actualDuration: null,
				wasSkipped: false,
				wasReplaced: false,
			});
			const writeService = new HistoryWriteService(repositories.database);
			await writeService.markActivityDirty(activityId);
			await rebuildMarkovTransitionCountsFromHistory(repositories);
			return listActivitiesForDateWithRepositories(repositories, date);
		}

		const activity = await repositories.activity.findById(activityId);
		const predictedStartTime =
			history?.predictedStartTime ?? dayRange(date).start;
		const predictedDuration =
			history?.predictedDuration ??
			activity?.defaultDuration ??
			DEFAULT_ACTIVITY_DURATION;
		const actualDuration =
			options?.completedDuration ??
			history?.predictedDuration ??
			predictedDuration;

		const writeService = new HistoryWriteService(repositories.database);
		await writeService.recordCompletion({
			historyId: history?.id,
			activityId,
			predictedStartTime,
			predictedDuration,
			actualStartTime: new Date(),
			actualDuration,
			timeZone: currentTimeZone(),
			wasSkipped: false,
			wasReplaced: false,
		});

		await rebuildMarkovTransitionCountsFromHistory(repositories);

		return listActivitiesForDateWithRepositories(repositories, date);
	});
}

export async function updateActivity(
	date: Date,
	activityId: string,
	patch: Partial<
		Pick<
			ActivityItem,
			| "name"
			| "categoryId"
			| "priority"
			| "defaultDuration"
			| "isReplaceable"
			| "color"
			| "completedDuration"
		>
	>,
): Promise<ActivityItem[]> {
	return withScopedRepositories(async (repositories) => {
		await repositories.activity.update(activityId, {
			name: patch.name,
			categoryId: patch.categoryId,
			priority: patch.priority,
			defaultDuration: patch.defaultDuration,
			isReplaceable: patch.isReplaceable,
			color: patch.color,
		});

		if (patch.completedDuration !== undefined) {
			const history = await repositories.history.findForActivityOnDate(
				activityId,
				date,
			);
			if (history) {
				await repositories.history.update(history.id, {
					actualDuration: patch.completedDuration,
				});
			}
		}

		return listActivitiesForDateWithRepositories(repositories, date);
	});
}

export async function removeActivity(
	date: Date,
	activityId: string,
): Promise<ActivityItem[]> {
	return withScopedRepositories(async (repositories) => {
		await repositories.history.deleteForActivity(activityId);
		const schedules = await repositories.schedule.listAll();
		await repositories.database.write(async () => {
			for (const schedule of schedules.filter(
				(s) => s.activityId === activityId,
			)) {
				await schedule.destroyPermanently();
			}
		});
		await repositories.activity.remove(activityId);
		await rebuildMarkovTransitionCountsFromHistory(repositories);
		return listActivitiesForDateWithRepositories(repositories, date);
	});
}

export async function deleteActivityGlobal(activityId: string): Promise<void> {
	return withScopedRepositories(async (repositories) => {
		await repositories.history.deleteForActivity(activityId);
		const schedules = await repositories.schedule.listAll(); // Can optimize if we add findForActivity to schedule repo
		await repositories.database.write(async () => {
			for (const schedule of schedules.filter(
				(s) => s.activityId === activityId,
			)) {
				await schedule.destroyPermanently();
			}
		});
		await repositories.activity.remove(activityId);
		await rebuildMarkovTransitionCountsFromHistory(repositories);
	});
}

export async function toggleScheduledCompletion(
	eventId: string,
	currentStatus: EventStatus,
): Promise<ScheduledActivity | null> {
	return withScopedRepositories(async (repositories) => {
		const event = await repositories.schedule.findById(eventId);
		if (!event) return null;

		const nextStatus =
			currentStatus === EventStatus.COMPLETED
				? EventStatus.CONFIRMED
				: EventStatus.COMPLETED;

		const updated = await repositories.schedule.update(eventId, {
			status: nextStatus,
			updatedAt: new Date(),
		});

		if (!updated) return null;

		const history =
			await repositories.history.findForActivityAndPredictedStartTime(
				updated.activityId,
				updated.startTime,
			);

		const writeService = new HistoryWriteService(repositories.database);

		if (nextStatus === EventStatus.COMPLETED) {
			await writeService.recordCompletion({
				historyId: history?.id,
				activityId: updated.activityId,
				predictedStartTime: updated.startTime,
				predictedDuration: updated.duration,
				actualStartTime: updated.startTime,
				actualDuration: updated.duration,
				timeZone: currentTimeZone(),
				wasSkipped: false,
				wasReplaced: false,
			});
		} else if (history) {
			await repositories.history.update(history.id, {
				wasCompleted: false,
				actualStartTime: null,
				actualDuration: null,
				wasSkipped: false,
				wasReplaced: false,
			});
			await writeService.markActivityDirty(updated.activityId);
		}

		await rebuildMarkovTransitionCountsFromHistory(repositories);

		return toScheduledEventEntity(updated);
	});
}

export async function renameActivity(
	date: Date,
	activityId: string,
	name: string,
): Promise<ActivityItem[]> {
	return withScopedRepositories(async (repositories) => {
		await repositories.activity.update(activityId, {
			name: name.trim(),
		});
		return listActivitiesForDateWithRepositories(repositories, date);
	});
}

/** Globally updates an activity */
export async function updateActivityGlobal(
	activityId: string,
	patch: {
		name?: string;
		categoryId?: string;
		priority?: number;
		defaultDuration?: number;
		isReplaceable?: boolean;
		isRecurring?: boolean;
		recurrencePattern?: RecurrencePattern;
		minFrequency?: number;
		maxFrequency?: number;
		minDuration?: number;
		maxDuration?: number;
		timeRestrictions?: {
			id: string;
			startTime: string;
			endTime: string;
			type: "ALLOW" | "DENY";
		}[];
	},
): Promise<void> {
	return withScopedRepositories(async (repositories) => {
		await repositories.activity.update(activityId, patch);

		const hasConstraints =
			patch.minFrequency !== undefined ||
			patch.maxFrequency !== undefined ||
			patch.minDuration !== undefined ||
			patch.maxDuration !== undefined ||
			patch.timeRestrictions !== undefined;

		if (hasConstraints) {
			await saveActivityConstraints(repositories, activityId, {
				minFrequency: patch.minFrequency,
				maxFrequency: patch.maxFrequency,
				minDuration: patch.minDuration,
				maxDuration: patch.maxDuration,
				timeRestrictions: patch.timeRestrictions,
			});
		}

		if (patch.isRecurring !== undefined) {
			if (patch.isRecurring) {
				const existing =
					await repositories.recurringActivity.findByTemplateId(activityId);
				if (!existing) {
					const activity = await repositories.activity.findById(activityId);
					if (activity) {
						await repositories.recurringActivity.create({
							templateId: activityId,
							categoryId: activity.categoryId,
							title: activity.name,
							frequency:
								(patch.recurrencePattern?.frequency as RecurrenceFrequency) ||
								RecurrenceFrequency.WEEKLY,
							interval: patch.recurrencePattern?.interval || 1,
							daysOfWeek: patch.recurrencePattern?.daysOfWeek || [],
							startDate: new Date(),
							preferredStartTime: "09:00",
							typicalDuration: activity.defaultDuration,
							priority: activity.priority,
							isActive: true,
						});
					}
				} else if (patch.recurrencePattern) {
					await repositories.database.write(async () => {
						await existing.update((record) => {
							record.frequency = patch.recurrencePattern
								?.frequency as RecurrenceFrequency;
							record.interval = patch.recurrencePattern?.interval ?? 1;
							record.daysOfWeek = patch.recurrencePattern?.daysOfWeek || [];
						});
					});
				}
			} else {
				await repositories.recurringActivity.deleteByTemplateId(activityId);
			}
		}
	});
}

export async function createActivity(
	date: Date,
	name: string,
	options?: {
		categoryId?: string;
		priority?: number;
		defaultDuration?: number;
	},
): Promise<ActivityItem> {
	return withScopedRepositories(async (repositories) => {
		const trimmedName = name.trim();
		const { start } = dayRange(date);
		const createdAt = new Date();

		const activity = await repositories.activity.create({
			categoryId: options?.categoryId ?? DEFAULT_CATEGORY_ID,
			name: trimmedName,
			priority: options?.priority ?? DEFAULT_ACTIVITY_PRIORITY,
			defaultDuration: options?.defaultDuration ?? DEFAULT_ACTIVITY_DURATION,
			isReplaceable: true,
			color: DEFAULT_ACTIVITY_COLOR,
			createdAt,
		});

		await repositories.history.create({
			activityId: activity.id,
			predictedStartTime: start,
			predictedDuration: DEFAULT_ACTIVITY_DURATION,
			wasCompleted: false,
			wasSkipped: false,
			wasReplaced: false,
			createdAt,
		});

		return toActivityItem(activity, null);
	});
}

/** Globally creates an activity without instantiating history for a specific date */
export async function createActivityGlobal(
	name: string,
	categoryId: string = DEFAULT_CATEGORY_ID,
	priority: number = DEFAULT_ACTIVITY_PRIORITY,
	duration: number = DEFAULT_ACTIVITY_DURATION,
	isReplaceable: boolean = true,
	isRecurring: boolean = false,
	recurrencePattern?: RecurrencePattern,
	constraints?: Partial<ActivityFormData>,
): Promise<void> {
	return withScopedRepositories(async (repositories) => {
		const activity = await repositories.activity.create({
			categoryId,
			name: name.trim(),
			priority,
			defaultDuration: duration,
			isReplaceable,
			color: DEFAULT_ACTIVITY_COLOR,
			createdAt: new Date(),
		});

		if (constraints) {
			await saveActivityConstraints(repositories, activity.id, constraints);
		}

		if (isRecurring) {
			await repositories.recurringActivity.create({
				templateId: activity.id,
				categoryId,
				title: name.trim(),
				frequency:
					(recurrencePattern?.frequency as RecurrenceFrequency) ||
					RecurrenceFrequency.WEEKLY,
				interval: recurrencePattern?.interval || 1,
				daysOfWeek: recurrencePattern?.daysOfWeek || [],
				startDate: new Date(),
				preferredStartTime: "09:00",
				typicalDuration: duration,
				priority,
				isActive: true,
			});
		}
	});
}

export async function saveActivityConstraints(
	repositories: RepoBundle,
	activityId: string,
	data: Partial<ActivityFormData>,
) {
	const { ConstraintType, TimeScope } = await import("../../../types/domain");

	// 1. Clear existing constraints for this activity
	const existing = await repositories.constraint.listForActivity(activityId);
	if (existing.length > 0) {
		await repositories.database.write(async () => {
			for (const c of existing) {
				await c.destroyPermanently();
			}
		});
	}

	// 2. Frequency Goal
	if (data.minFrequency !== undefined || data.maxFrequency !== undefined) {
		await repositories.constraint.create({
			type: ConstraintType.USER_FREQUENCY_GOAL,
			activityId,
			isActive: true,
			createdAt: new Date(),
			value: {
				scope: TimeScope.SAME_WEEK,
				minCount: data.minFrequency || undefined,
				maxCount: data.maxFrequency || undefined,
			} as any,
		});
	}

	// 3. Cumulative Time / Duration
	if (data.minDuration !== undefined || data.maxDuration !== undefined) {
		await repositories.constraint.create({
			type: ConstraintType.GLOBAL_CUMULATIVE_TIME,
			activityId,
			isActive: true,
			createdAt: new Date(),
			value: {
				periodSlots: 0,
				minDuration: data.minDuration || 0,
				maxDuration: data.maxDuration || 0,
			} as any,
		});
	}

	// 4. Time Restrictions
	if (data.timeRestrictions && data.timeRestrictions.length > 0) {
		for (const res of data.timeRestrictions) {
			const [sh, sm] = res.startTime.split(":").map(Number);
			const [eh, em] = res.endTime.split(":").map(Number);
			const startSlot = Math.floor((sh * 60 + sm) / 15);
			const endSlot = Math.floor((eh * 60 + em) / 15);

			await repositories.constraint.create({
				type: ConstraintType.GLOBAL_FORBIDDEN_ZONE,
				activityId,
				isActive: true,
				createdAt: new Date(),
				value: {
					startSlot,
					endSlot,
				} as any,
			});
		}
	}
}

export async function getActivityConstraints(
	activityId: string,
): Promise<Partial<ActivityFormData>> {
	return withScopedRepositories(async (repositories) => {
		const constraints =
			await repositories.constraint.listForActivity(activityId);
		const out: Partial<ActivityFormData> = {};

		for (const c of constraints) {
			const val = c.value as any;
			if (c.type === "USER_FREQUENCY_GOAL") {
				out.minFrequency = val.minCount;
				out.maxFrequency = val.maxCount;
			} else if (c.type === "GLOBAL_CUMULATIVE_TIME") {
				out.minDuration = val.minDuration;
				out.maxDuration = val.maxDuration;
			} else if (c.type === "GLOBAL_FORBIDDEN_ZONE") {
				if (!out.timeRestrictions) out.timeRestrictions = [];
				const toStr = (h: number, m: number) =>
					`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
				const sh = Math.floor((val.startSlot * 15) / 60);
				const sm = (val.startSlot * 15) % 60;
				const eh = Math.floor((val.endSlot * 15) / 60);
				const em = (val.endSlot * 15) % 60;
				out.timeRestrictions.push({
					id: c.id,
					startTime: toStr(sh, sm),
					endTime: toStr(eh, em),
					type: "DENY",
				});
			}
		}
		return out;
	});
}
